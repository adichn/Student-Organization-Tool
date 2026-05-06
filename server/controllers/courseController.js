import mongoose from "mongoose";
import Year from "../models/Academic.js";
import Embedding from "../models/Embedding.js";
import { embed } from "../config/voyageClient.js";

// Number of candidate vectors Atlas evaluates before ranking (HNSW tuning).
// Must be >= limit; 10× limit is a good starting point for high recall.
const VECTOR_CANDIDATES = 100;
const VECTOR_TOP_K = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Walk the nested Year document to find a course subdocument by its _id. */
function findCourse(yearDoc, courseId) {
  for (const semester of yearDoc.semesters) {
    const course = semester.courses.id(courseId);
    if (course) return course;
  }
  return null;
}

/** Format retrieved chunks into a numbered, labelled context block. */
function buildContext(chunks) {
  return chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] Source: "${chunk.resource.title}"\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}

// ── System prompt ─────────────────────────────────────────────────────────────
// Explicit grounding rules are stated up-front so the model cannot rationalise
// using outside knowledge even when course material is thin.
const SYSTEM_PROMPT = `\
You are a study assistant for a specific university course. Your sole knowledge \
source is the course material excerpts provided inside <course_materials> tags. \
You must not draw on any external knowledge, training data, or assumptions beyond \
what is explicitly present in those excerpts.

Rules:
1. If the answer is fully present in the materials, answer directly and cite the \
source in brackets, e.g. [Lecture Notes Week 3].
2. If the materials contain only partial information, share what you found and \
explicitly note what is missing.
3. If the materials contain no relevant information, respond exactly: \
"I couldn't find information about this in your course materials."
4. Never fabricate facts, citations, page numbers, or content.
5. Do not speculate or infer beyond what the text states.`;

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * POST /api/courses/:id/query
 *
 * Body   : { prompt: string }
 * Headers: x-api-key (optional — falls back to server key via aiProvider)
 *
 * Pipeline:
 *   1. Verify the course belongs to this user
 *   2. Embed the query with Voyage AI
 *   3. Retrieve top-K semantically relevant chunks via Atlas $vectorSearch
 *   4. Inject retrieved context into the system prompt
 *   5. Stream the grounded Claude response to the caller
 */
export async function queryCourse(req, res) {
  const { id: courseId } = req.params;
  const { prompt } = req.body;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "prompt is required." });
  }
  if (!mongoose.isValidObjectId(courseId)) {
    return res.status(400).json({ error: "Invalid course id." });
  }

  // req.user is set by auth middleware (JWT/session).
  // Guard here so the error is clear during development before auth is wired up.
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required." });
  }

  // ── 1. Ownership check ──────────────────────────────────────────────────────
  // Find the parent Year document that contains this course AND belongs to the
  // requesting user. This is the multi-tenant gate: a user can never query
  // embeddings for a course they don't own.
  const yearDoc = await Year.findOne({
    user: userId,
    "semesters.courses._id": new mongoose.Types.ObjectId(courseId),
  }).lean();

  if (!yearDoc) {
    return res.status(404).json({ error: "Course not found." });
  }

  // ── 2. Embed the query ──────────────────────────────────────────────────────
  let queryVector;
  try {
    [queryVector] = await embed([prompt.trim()]);
  } catch (err) {
    console.error("[queryCourse] Embedding error:", err.message);
    return res.status(502).json({ error: "Failed to process your query." });
  }

  // ── 3. Atlas Vector Search ──────────────────────────────────────────────────
  // $vectorSearch is an Atlas-only aggregation stage. The filter narrows the
  // ANN search to chunks that belong to this specific course AND this user,
  // so one user's materials can never bleed into another's results.
  //
  // Both "courseId" and "user" must be declared as filter fields in the
  // Atlas Search index (see scripts/createVectorIndex.js).
  let chunks;
  try {
    chunks = await Embedding.aggregate([
      {
        $vectorSearch: {
          index: "course_embeddings_index",
          path: "embedding",
          queryVector,
          numCandidates: VECTOR_CANDIDATES,
          limit: VECTOR_TOP_K,
          filter: {
            courseId: { $eq: new mongoose.Types.ObjectId(courseId) },
            user:     { $eq: new mongoose.Types.ObjectId(userId) },
          },
        },
      },
      {
        $project: {
          _id: 0,
          content: 1,
          resource: 1,
          chunkIndex: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
  } catch (err) {
    console.error("[queryCourse] Vector search error:", err.message);
    return res.status(500).json({ error: "Failed to retrieve course materials." });
  }

  // ── 4. Guard — no relevant material found ───────────────────────────────────
  if (chunks.length === 0) {
    return res.json({
      answer: "I couldn't find information about this in your course materials.",
      sources: [],
    });
  }

  // ── 5. Build grounded prompt and call Claude ─────────────────────────────────
  const context = buildContext(chunks);
  const userMessage = `<course_materials>\n${context}\n</course_materials>\n\n${prompt.trim()}`;

  let aiMessage;
  try {
    aiMessage = await req.aiClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    console.error("[queryCourse] AI error:", err.message);
    return res.status(502).json({ error: "AI service failed to respond." });
  }

  // Return the answer plus source metadata (titles + relevance scores).
  // Raw content and embeddings are never sent to the frontend.
  res.json({
    answer: aiMessage.content[0].text,
    sources: chunks.map((c) => ({
      title: c.resource.title,
      type:  c.resource.type,
      score: c.score,
    })),
    usage: aiMessage.usage,
  });
}
