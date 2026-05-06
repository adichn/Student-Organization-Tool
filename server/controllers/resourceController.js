import mongoose from "mongoose";
import { PDFParse } from "pdf-parse";
import Year from "../models/Academic.js";
import Embedding from "../models/Embedding.js";
import { embed } from "../config/voyageClient.js";

// ── Chunking constants ────────────────────────────────────────────────────────
const CHUNK_SIZE    = 1200; // characters per chunk
const CHUNK_OVERLAP = 200;  // overlap so context isn't lost at chunk boundaries
const EMBED_BATCH   = 50;   // Voyage AI accepts up to 128 per request; 50 is safe

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Collapse whitespace then split into overlapping windows.
 * Short texts that fit in one chunk are returned as-is.
 */
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

/** Call embed() in EMBED_BATCH-sized slices, preserving original order. */
async function embedBatched(chunks) {
  const all = [];
  for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
    const vecs = await embed(chunks.slice(i, i + EMBED_BATCH));
    all.push(...vecs);
  }
  return all;
}

// ── Controller ────────────────────────────────────────────────────────────────

/**
 * POST /api/courses/:id/resources
 *
 * Accepts multipart/form-data with:
 *   file  — PDF or plain-text file (required, max 10 MB)
 *   title — optional display name (falls back to original filename)
 *
 * Pipeline:
 *   1. Validate input and verify course ownership
 *   2. Extract text from the file (pdf-parse for PDFs, UTF-8 decode for text)
 *   3. Chunk text into overlapping windows
 *   4. Generate Voyage AI embeddings in batches
 *   5. Bulk-insert Embedding documents linked to courseId + user
 *   6. Push a Resource subdocument onto the course and persist
 */
export async function uploadResource(req, res) {
  const { id: courseId } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  if (!mongoose.isValidObjectId(courseId)) {
    return res.status(400).json({ error: "Invalid course id." });
  }

  const userId = req.user._id;
  const resourceTitle = req.body.title?.trim() || req.file.originalname;

  // ── 1. Ownership check ──────────────────────────────────────────────────────
  const yearDoc = await Year.findOne({
    user: userId,
    "semesters.courses._id": new mongoose.Types.ObjectId(courseId),
  });

  if (!yearDoc) {
    return res.status(404).json({ error: "Course not found." });
  }

  // Locate the exact course subdocument
  let course = null;
  for (const semester of yearDoc.semesters) {
    course = semester.courses.id(courseId);
    if (course) break;
  }
  if (!course) {
    return res.status(404).json({ error: "Course not found." });
  }

  // ── 2. Extract text ─────────────────────────────────────────────────────────
  let text;
  const { mimetype, buffer } = req.file;

  try {
    if (mimetype === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text;
      await parser.destroy();
    } else if (mimetype.startsWith("text/")) {
      text = buffer.toString("utf-8");
    } else {
      return res.status(415).json({
        error: "Unsupported file type. Upload a PDF or plain-text file.",
      });
    }
  } catch (err) {
    console.error("[uploadResource] Parse error:", err.message);
    return res.status(422).json({ error: "Failed to extract text from file." });
  }

  if (!text?.trim()) {
    return res.status(422).json({ error: "No readable text found in file." });
  }

  // ── 3. Chunk ────────────────────────────────────────────────────────────────
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    return res.status(422).json({ error: "No text content could be extracted." });
  }

  // ── 4. Embed ────────────────────────────────────────────────────────────────
  let vectors;
  try {
    vectors = await embedBatched(chunks);
  } catch (err) {
    console.error("[uploadResource] Embedding error:", err.message);
    return res.status(502).json({ error: "Failed to generate embeddings." });
  }

  // ── 5. Persist embeddings ───────────────────────────────────────────────────
  const courseOid = new mongoose.Types.ObjectId(courseId);
  const embeddingDocs = chunks.map((chunk, i) => ({
    user: userId,
    courseId: courseOid,
    resource: { title: resourceTitle, type: "document" },
    content: chunk,
    embedding: vectors[i],
    chunkIndex: i,
  }));

  await Embedding.insertMany(embeddingDocs, { ordered: false });

  // ── 6. Add resource subdocument and save ────────────────────────────────────
  course.resources.push({
    user: userId,
    title: resourceTitle,
    type: "document",
    fileKey: req.file.originalname,
  });

  await yearDoc.save();

  const saved = course.resources[course.resources.length - 1];

  res.status(201).json({
    resource: {
      _id:        saved._id,
      title:      saved.title,
      type:       saved.type,
      fileKey:    saved.fileKey,
      uploadedAt: saved.uploadedAt,
    },
    chunksIndexed: chunks.length,
  });
}
