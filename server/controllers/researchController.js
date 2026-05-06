import mongoose from "mongoose";
import Year from "../models/Academic.js";
import Embedding from "../models/Embedding.js";
import { embed } from "../config/voyageClient.js";
import { search } from "../config/searchClient.js";

// ── Text processing ───────────────────────────────────────────────────────────

const CHUNK_SIZE    = 1200;
const CHUNK_OVERLAP = 200;
const EMBED_BATCH   = 50;

function chunkText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function embedBatched(chunks) {
  const all = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const vecs = await embed(chunks.slice(i, i + EMBED_BATCH));
    all.push(...vecs);
  }
  return all;
}

// ── AI prompts ────────────────────────────────────────────────────────────────

// Ask Claude to return ONLY a JSON object — no prose, no fences — so the
// response can be parsed without regex cleanup in the common case.
const TERMS_SYSTEM = `\
You are an academic research assistant. Given a student's research query, produce \
3 to 5 focused search queries that would surface high-quality academic results.

Vary specificity: one broad overview query, two mid-level queries targeting specific \
concepts or mechanisms, and one narrow query for a concrete application or recent development.

Respond with ONLY a JSON object — no commentary, no markdown fences:
{"terms":["query one","query two","query three"]}`;

const SYNTHESIS_SYSTEM = `\
You are an academic research assistant writing a structured summary for a university student. \
Synthesise the provided web sources into a clear, grounded report. Use inline numeric \
citations like [1] or [2, 3] that map to the numbered source list.

Structure your response exactly as follows (keep the ## headings):

## Overview
Two to three sentences introducing the topic and why it matters.

## Key Findings
Three to five bullet points with the most important insights, each with at least one citation.

## Synthesis
One to two paragraphs integrating the findings, noting agreement, tension, or gaps between sources.

## Limitations
One short paragraph on what the sources do not cover or where they may be limited.

Rules:
- Ground every claim in the provided sources. Do not invent facts, citations, or URLs.
- If sources are marked [Placeholder], note that the results are illustrative and not real papers.
- Keep tone academic but accessible to an undergraduate student.`;

function buildSourceContext(sources) {
  return sources
    .map((s, i) => `[${i + 1}] "${s.title}"\nURL: ${s.url}\n${s.snippet}`)
    .join("\n\n---\n\n");
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/research/search
 * Body: { query: string }
 *
 * Pipeline:
 *   1. Claude generates 3-5 academic search terms from the user's query
 *   2. Each term is searched in parallel via the configured provider (Tavily / Serper / placeholder)
 *   3. Results are deduplicated by URL
 *   4. Claude synthesizes a structured summary with inline source citations
 */
export async function searchResearch(req, res) {
  const { query } = req.body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required." });
  }

  const cleanQuery = query.trim();

  // ── 1. Generate search terms ───────────────────────────────────────────────
  let terms;
  try {
    const msg = await req.aiClient.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 256,
      system:     TERMS_SYSTEM,
      messages:   [{ role: "user", content: cleanQuery }],
    });

    const raw = msg.content[0].text.trim();
    // Strip accidental markdown fences even though the prompt forbids them
    const json = raw
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    ({ terms } = JSON.parse(json));

    if (!Array.isArray(terms) || terms.length === 0) {
      throw new Error("terms array is empty");
    }
    // Sanitise: keep only non-empty strings
    terms = terms.filter((t) => typeof t === "string" && t.trim()).slice(0, 5);
  } catch (err) {
    console.error("[searchResearch] Term generation failed:", err.message);
    return res.status(502).json({ error: "Failed to generate search terms." });
  }

  // ── 2. Fetch results in parallel, tolerate individual term failures ────────
  let allResults;
  let isPlaceholder = false;
  try {
    const settled = await Promise.allSettled(terms.map((t) => search(t)));

    const successful = settled
      .filter((s) => s.status === "fulfilled")
      .map((s) => s.value);

    if (successful.length === 0) {
      throw new Error("All search calls failed.");
    }

    if (successful.some((s) => s.isPlaceholder)) isPlaceholder = true;

    // Deduplicate by URL, preserving first-seen order
    const seen = new Set();
    allResults = successful
      .flatMap((s) => s.results)
      .filter((r) => {
        if (!r.url || seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });
  } catch (err) {
    console.error("[searchResearch] Search failed:", err.message);
    return res.status(502).json({ error: "Search provider unavailable." });
  }

  // ── 3. Synthesize with Claude ──────────────────────────────────────────────
  let summary;
  try {
    const context = buildSourceContext(allResults);

    const synthMsg = await req.aiClient.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 1500,
      system:     SYNTHESIS_SYSTEM,
      messages: [
        {
          role:    "user",
          content: `Research query: "${cleanQuery}"\n\n<sources>\n${context}\n</sources>`,
        },
      ],
    });

    summary = synthMsg.content[0].text;
  } catch (err) {
    console.error("[searchResearch] Synthesis failed:", err.message);
    return res.status(502).json({ error: "AI synthesis failed." });
  }

  res.json({
    summary,
    sources:     allResults,
    searchTerms: terms,
    isPlaceholder,
  });
}

/**
 * POST /api/research/save
 * Body: { courseId, title, summary, sources }
 *
 * Persists the research summary as a course resource and indexes it for RAG
 * so the summary is queryable via /api/courses/:id/query.
 */
export async function saveResearch(req, res) {
  const { courseId, title, summary, sources = [] } = req.body;

  if (!courseId || !mongoose.isValidObjectId(courseId)) {
    return res.status(400).json({ error: "Valid courseId is required." });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required." });
  }
  if (!summary || typeof summary !== "string" || !summary.trim()) {
    return res.status(400).json({ error: "summary is required." });
  }

  const userId        = req.user._id;
  const resourceTitle = title.trim();

  // ── Ownership check ────────────────────────────────────────────────────────
  const yearDoc = await Year.findOne({
    user: userId,
    "semesters.courses._id": new mongoose.Types.ObjectId(courseId),
  });

  if (!yearDoc) return res.status(404).json({ error: "Course not found." });

  let course = null;
  for (const semester of yearDoc.semesters) {
    course = semester.courses.id(courseId);
    if (course) break;
  }
  if (!course) return res.status(404).json({ error: "Course not found." });

  // ── Build embeddable text ──────────────────────────────────────────────────
  // Embed both the synthesis and the source snippets so the RAG pipeline can
  // surface this research when the student asks follow-up questions.
  const sourceBlock = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet ?? ""}`)
    .join("\n\n");

  const fullText = sourceBlock
    ? `${summary.trim()}\n\n---\nSources\n${sourceBlock}`
    : summary.trim();

  const chunks = chunkText(fullText);

  let vectors;
  try {
    vectors = await embedBatched(chunks);
  } catch (err) {
    console.error("[saveResearch] Embedding error:", err.message);
    return res.status(502).json({ error: "Failed to generate embeddings." });
  }

  // ── Persist embeddings ─────────────────────────────────────────────────────
  const courseOid = new mongoose.Types.ObjectId(courseId);

  await Embedding.insertMany(
    chunks.map((chunk, i) => ({
      user:       userId,
      courseId:   courseOid,
      resource:   { title: resourceTitle, type: "other" },
      content:    chunk,
      embedding:  vectors[i],
      chunkIndex: i,
    })),
    { ordered: false }
  );

  // ── Add resource subdocument ───────────────────────────────────────────────
  course.resources.push({
    user:  userId,
    title: resourceTitle,
    type:  "other",
  });

  await yearDoc.save();

  const saved = course.resources[course.resources.length - 1];

  res.status(201).json({
    resource: {
      _id:        saved._id,
      title:      saved.title,
      type:       saved.type,
      uploadedAt: saved.uploadedAt,
    },
    chunksIndexed: chunks.length,
  });
}
