// ── CJS shim — mammoth is a CommonJS module ──────────────────────────────────
// Must be before any ESM imports because ESM imports are hoisted.
import { createRequire } from "module";
const require  = createRequire(import.meta.url);
const mammoth  = require("mammoth");   // .extractRawText({ buffer }) => { value, ... }

// ── ESM imports ──────────────────────────────────────────────────────────────
// pdf-parse v2 ships native ESM — import PDFParse directly, no CJS shim needed.
import { PDFParse } from "pdf-parse";
import mongoose  from "mongoose";
import Year      from "../models/Academic.js";
import Embedding from "../models/Embedding.js";
import { embed } from "../config/geminiClient.js";

// ── Chunking constants ────────────────────────────────────────────────────────
const CHUNK_SIZE    = 1200;      // characters per chunk (~300 tokens, well within 2 048-token model limit)
const CHUNK_OVERLAP = 200;       // overlap to preserve cross-boundary context
const EMBED_BATCH   = 100;       // Gemini batchEmbedContents hard limit
const RAW_TEXT_CAP  = 50_000;   // chars stored on the resource subdoc

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function findCourse(yearDoc, courseId) {
  for (const sem of yearDoc.semesters) {
    const c = sem.courses.id(courseId);
    if (c) return c;
  }
  return null;
}

/**
 * Returns true for DOCX files regardless of whether the browser sent the
 * correct MIME type (some send application/msword or application/octet-stream).
 */
function isDocx(file) {
  const mime = file.mimetype ?? "";
  const name = (file.originalname ?? "").toLowerCase();
  return (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/msword" ||
    name.endsWith(".docx") ||
    name.endsWith(".doc")
  );
}

// ── Schema-first syllabus extraction ─────────────────────────────────────────

/**
 * Sends the full extracted text (up to 30 000 chars) to Claude Sonnet and
 * returns every assignment, deadline, exam, quiz, project, lab, presentation,
 * homework set, lecture, reading, review session, and other scheduled item.
 *
 * Returns ready-to-push Event subdoc objects, or [] on any failure (the upload
 * itself is NEVER blocked by extraction errors).
 */
async function extractEventsFromSyllabus(text, aiClient) {
  if (!aiClient) return [];

  // Use up to 30 000 chars — enough for a full syllabus while staying within limits
  const snippet = text.slice(0, 30_000);

  const systemPrompt = `You are an exhaustive academic syllabus / document parser. Your job is to extract EVERY time-bound item — deadlines, deliverables, and scheduled events — from the supplied text.

You MUST respond with ONLY a valid JSON object. No markdown code fences, no prose, no explanation.

Output schema:
{
  "items": [
    {
      "title":    "string — descriptive name of the item (required)",
      "date":     "YYYY-MM-DD — the due date or scheduled date (required)",
      "type":     "one of: assignment | exam | lecture | reminder | other",
      "weight":   number — percentage of final grade, 0 if unknown
    }
  ]
}

EXTRACTION RULES — be thorough, miss nothing:
1. Extract ALL of the following when a date is mentioned:
   - Assignments, homework sets, problem sets, written assignments
   - Quizzes (weekly, pop, or scheduled)
   - Midterms, midterm exams, mid-semester exams
   - Final exams, final projects, final presentations
   - Projects (individual or group), project proposals, project check-ins
   - Labs, lab reports, lab practicals
   - Presentations, demos, poster sessions
   - Readings, reading responses, response papers
   - Essays, reports, case studies, research papers
   - Participation, attendance, discussion posts
   - Lectures, class sessions, workshop sessions
   - Office hours (only if they have a specific one-time date)
   - Review sessions, study sessions, exam prep sessions
   - Deadlines (add/drop, withdrawal, registration)
   - Holidays, no-class days, spring break, reading week
   - Peer reviews, peer evaluations
   - Any other item that has a scheduled or due date

2. Type mapping:
   - Use "assignment" for: assignments, homework, problem sets, labs, lab reports, essays, reports, readings, response papers, projects, project proposals, presentations, peer reviews
   - Use "exam" for: exams, quizzes, midterms, finals, tests, assessments
   - Use "lecture" for: lectures, class sessions, workshops, review sessions, study sessions, no-class days, holidays, breaks
   - Use "reminder" for: registration deadlines, admin deadlines, add/drop dates
   - Use "other" for anything that does not fit above

3. Date handling:
   - Convert all date formats to YYYY-MM-DD.
   - If only a month and day are given (e.g. "March 15"), infer the year from context — use the academic year mentioned in the document, or the current calendar year.
   - Skip items with no specific date at all (e.g. "to be announced").
   - For date ranges (e.g. "Week 3"), use the first day of that range.

4. Title:
   - Include the item number or module name when helpful (e.g. "Homework 3 — Recursion", "Quiz 2", "Midterm Exam 1").
   - Keep titles under 200 characters.

5. If absolutely nothing is found, return { "items": [] }.`;

  try {
    const msg = await aiClient.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4096,
      system:     systemPrompt,
      messages:   [{ role: "user", content: `Extract all time-bound items from this document:\n\n${snippet}` }],
    });

    const raw     = msg.content?.[0]?.text?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[uploadResource] Claude returned non-JSON — skipping.\nRaw:", raw.slice(0, 300));
      return [];
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const VALID_TYPES = new Set(["assignment", "exam", "lecture", "reminder", "other"]);
    const result = [];

    for (const item of items) {
      if (!item.title || !item.date) continue;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) continue;

      const rawType = String(item.type ?? "other").toLowerCase().trim();
      const type = VALID_TYPES.has(rawType) ? rawType : "other";

      result.push({
        title:       String(item.title).slice(0, 200),
        date:        d,
        type,
        description: item.weight ? `Weight: ${item.weight}%` : "",
      });
    }

    console.info(`[uploadResource] Extracted ${result.length} items from document.`);
    return result;
  } catch (err) {
    console.warn("[uploadResource] Syllabus extraction failed:", err.message);
    return [];
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/courses/:id/upload
 *
 * Multipart/form-data fields:
 *   file  — PDF, TXT, MD, or DOCX (max 10 MB, enforced by multer)
 *   title — optional display name (falls back to filename)
 *
 * Pipeline:
 *   1. Validate + ownership check
 *   2. Extract text (pdf-parse / mammoth / UTF-8 decode)
 *   3. Chunk into overlapping windows
 *   4. Voyage AI embeddings (batched)
 *   5. Bulk-insert Embedding documents
 *   6. Push Resource subdoc onto course
 *   7. Schema-first syllabus extraction via Claude (best-effort)
 *   8. Save + return
 */
export async function uploadResource(req, res) {
  const { id: courseId } = req.params;

  if (req.fileValidationError) {
    return res.status(415).json({ error: req.fileValidationError });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  if (!mongoose.isValidObjectId(courseId)) {
    return res.status(400).json({ error: "Invalid course id." });
  }

  const userId        = req.user._id;
  const resourceTitle = req.body.title?.trim() || req.file.originalname;

  // ── 1. Ownership check ──────────────────────────────────────────────────────
  const yearDoc = await Year.findOne({
    user: userId,
    "semesters.courses._id": new mongoose.Types.ObjectId(courseId),
  });
  if (!yearDoc) return res.status(404).json({ error: "Course not found." });

  const course = findCourse(yearDoc, courseId);
  if (!course)  return res.status(404).json({ error: "Course not found." });

  // ── 2. Extract text ─────────────────────────────────────────────────────────
  let text;
  const { mimetype, buffer } = req.file;

  try {
    if (mimetype === "application/pdf") {
      // pdf-parse v2: class-based API, pass buffer via { data }
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text;

    } else if (isDocx(req.file)) {
      // mammoth: converts DOCX buffer to clean plain text
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      if (result.messages?.length) {
        console.info("[uploadResource] mammoth messages:", result.messages.slice(0, 3));
      }

    } else if (mimetype.startsWith("text/")) {
      text = buffer.toString("utf-8");

    } else {
      return res.status(415).json({
        error: "Unsupported file type. Upload a PDF, Word (.docx), or plain-text file.",
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

  // ── 4–5. Embed + persist (best-effort — never blocks the upload) ─────────────
  // Gemini free tier allows 100 RPM. geminiClient retries with backoff, but
  // if all retries are exhausted we still save the resource without embeddings.
  const courseOid = new mongoose.Types.ObjectId(courseId);
  let chunksIndexed = 0;
  try {
    const vectors = await embedBatched(chunks);
    await Embedding.insertMany(
      chunks.map((chunk, i) => ({
        user:       userId,
        courseId:   courseOid,
        resource:   { title: resourceTitle, type: "document" },
        content:    chunk,
        embedding:  vectors[i],
        chunkIndex: i,
      })),
      { ordered: false }
    );
    chunksIndexed = chunks.length;
  } catch (err) {
    console.warn("[uploadResource] Embedding skipped — AI search unavailable:", err.message);
    // File still saves; user can re-upload later to index it
  }

  // ── 6. Resource subdoc ──────────────────────────────────────────────────────
  course.resources.push({
    user:     userId,
    title:    resourceTitle,
    type:     "document",
    fileKey:  req.file.originalname,
    rawText:  text.slice(0, RAW_TEXT_CAP),
    fileSize: req.file.size,
  });

  // ── 7. Persist resource (without events — user must approve them first) ────────
  await yearDoc.save();

  const saved = course.resources[course.resources.length - 1];

  // ── 8. Syllabus extraction (best-effort, never blocks the response) ──────────
  // Items are returned to the client for human review; nothing is written to DB.
  const pendingExtractions = await extractEventsFromSyllabus(text, req.aiClient ?? null);

  return res.status(201).json({
    resource: {
      _id:        saved._id,
      title:      saved.title,
      type:       saved.type,
      fileKey:    saved.fileKey,
      fileSize:   saved.fileSize,
      uploadedAt: saved.uploadedAt,
      chunksIndexed,
    },
    pendingExtractions,
  });
}

/**
 * DELETE /api/courses/:id/resources/:resourceId
 */
export async function deleteResource(req, res) {
  const { id: courseId, resourceId } = req.params;

  if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(resourceId)) {
    return res.status(400).json({ error: "Invalid id." });
  }

  const courseOid = new mongoose.Types.ObjectId(courseId);

  const yearDoc = await Year.findOne({
    user: req.user._id,
    "semesters.courses._id": courseOid,
  });
  if (!yearDoc) return res.status(404).json({ error: "Course not found." });

  const course = findCourse(yearDoc, courseId);
  if (!course)  return res.status(404).json({ error: "Course not found." });

  const resource = course.resources.id(resourceId);
  if (!resource) return res.status(404).json({ error: "Resource not found." });

  const resourceTitle = resource.title;
  resource.deleteOne();
  await yearDoc.save();

  await Embedding.deleteMany({
    user:             req.user._id,
    courseId:         courseOid,
    "resource.title": resourceTitle,
  });

  return res.json({ ok: true });
}
