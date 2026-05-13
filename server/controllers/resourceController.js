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

  // 40 000 chars covers dense full-semester schedules while staying well within
  // Claude's 200 k-token context window.
  const snippet = text.slice(0, 40_000);

  const systemPrompt = `You are a precise academic syllabus extraction engine. Your ONLY output must be a single valid JSON object that passes JSON.parse() with zero modifications. No markdown, no code fences, no prose before or after the JSON.

OUTPUT SCHEMA — use these exact field names, no others:
{
  "events": [
    {
      "title":        string  — concise but descriptive name, max 200 chars,
      "date":         string  — YYYY-MM-DD only (ISO-8601 date, always required),
      "type":         string  — exactly one of: "assignment" | "exam" | "lecture" | "reminder" | "other",
      "weight":       number  — percentage of final grade as a plain number (e.g. 10 for 10%), or 0 if not graded,
      "source_quote": string  — the exact verbatim sentence or phrase from the source text that proves this event exists and reveals its date (required, max 300 chars)
    }
  ]
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANTI-TRUNCATION DIRECTIVE — READ THIS FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You MUST process the ENTIRE document from Week 1 to the final exam. Do NOT stop early, summarise, or skip later-term content. If the schedule covers 14 weeks, extract events from all 14 weeks. Every quiz, assignment, lab, and lecture must appear individually in the output array. If you would otherwise truncate: keep going. Completeness is mandatory.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 1 — EXHAUSTIVE SCHEDULE EXTRACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extract EVERY scheduled event — not only assessments.

LECTURES & CLASS SESSIONS (type "lecture"):
- Every individual lecture, seminar, tutorial, or lab session in the schedule.
- Include the topic in the title when given. Examples:
    "Lecture: Society & Culture"
    "Seminar 3 — Postcolonial Theory"
    "Lab 5: Cell Cultures"
    "No Class — Thanksgiving"
- If a recurring pattern is described ("Lectures every Monday/Wednesday") and individual dates are NOT listed, generate one event per occurrence for the full semester by calculating each date from the course start date.
- No-class days, holidays, reading weeks, and breaks are type "lecture".

ASSESSMENTS (type "assignment" or "exam"):
- Assignments, homework sets, problem sets, essays, reports, lab reports, projects, presentations, peer reviews, response papers, readings with a due date → type "assignment"
- Quizzes (scheduled or recurring), midterms, finals, tests → type "exam"
- Project milestones (proposal, draft, check-in, final submission) → type "assignment"

ADMINISTRATIVE (type "reminder"):
- Add/drop deadlines, withdrawal deadlines, registration dates.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 2 — FLOATING & ONGOING ASSESSMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Some graded items have no fixed date. You MUST NOT omit them.

Identify these patterns anywhere in the document:
- "Class Participation", "Participation Grade", "In-Class Participation"
- "Attendance", "Random Attendance", "Attendance Checks"
- "Pop Quizzes", "Random Quizzes", "Unannounced Quizzes"
- "Weekly Reflections", "Discussion Posts", "Online Participation"
- Any graded item described as "ongoing", "throughout the semester", "at the instructor's discretion"

For each one found, create a single placeholder event:
  type    → "reminder"
  title   → item name + " (Ongoing)", e.g., "Class Participation (Ongoing)"
  date    → the LAST DAY OF CLASSES or FINAL EXAM DATE found in the document.
             If neither appears explicitly, use the latest date visible anywhere in the schedule.
             You MUST output a valid YYYY-MM-DD — never output the word "ongoing".
  weight  → the stated percentage (e.g., 10 for "worth 10%")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 3 — BONUS MARKS & EXTRA CREDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scan ALL narrative paragraphs (not just schedule tables) for:
- "Bonus", "Bonus marks", "Bonus points"
- "Extra credit", "Additional credit"
- "Course Feedback Bonus", "Teaching evaluation bonus"
- Any phrase like "completing X earns Y% bonus" or "up to N% extra"

For each one found:
  type    → "other"
  title   → descriptive name, e.g., "Course Feedback Bonus", "Extra Credit — Research Participation"
  date    → the stated deadline; if none, use the last day of classes / final exam date
  weight  → the bonus value as a POSITIVE number (e.g., 1 for "+1%"). Never 0 for a bonus with a stated value.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 4 — WEIGHT DISTRIBUTION MATH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When the syllabus states an AGGREGATE weight for a group (e.g., "5 Assignments worth 25% total"), distribute the weight across individual items.

Formula: per_item_weight = aggregate_weight ÷ item_count

Examples:
  "5 Assignments worth 25% total"   → each assignment: weight 5
  "4 Lab Reports = 20%"             → each lab report:  weight 5
  "3 Quizzes, together 15%"         → each quiz:        weight 5
  "Weekly readings (10 total, 20%)" → each reading:     weight 2
  "Midterm (30%)" [single item]     → weight 30

Rules:
- If the count is known AND individual events are listed → assign the distributed weight to every individual event.
- If the aggregate is stated but items are NOT individually listed → create ONE summary event (e.g., "Assignments (×5) — 25% total") with the full aggregate weight.
- If only a percentage is given with no count → create a summary event (e.g., "Assignments — 25% total") with weight equal to the full aggregate.
- NEVER leave weight as 0 for any graded item that has a stated percentage anywhere in the document. Search the full text before defaulting to 0.
- Include the distribution context in the title for clarity: "Assignment 2 (5% of 25% total)".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 5 — DATE HANDLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Every "date" field MUST be a valid YYYY-MM-DD string. Never output words like "ongoing", "TBD", or "varies".
- Convert all formats: "March 15", "15/03/2025", "03-15-25" → YYYY-MM-DD.
- Missing year: infer from the academic year stated in the document.
- "Week N" with no explicit date: calculate the calendar date using the course start date + (N-1) weeks.
- Recurring weekly events without individual dates: generate one event per week for the full semester.
- Date ranges ("Spring Break: March 10–14"): use the FIRST day of the range.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 6 — TYPE MAPPING (quick reference)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"assignment" → assignments, homework, problem sets, labs, lab reports, essays, reports,
               readings, response papers, projects, presentations, peer reviews
"exam"       → quizzes (any kind), midterms, finals, tests, assessments
"lecture"    → lectures, seminars, tutorials, workshops, review sessions, study sessions,
               no-class days, holidays, breaks
"reminder"   → admin deadlines, add/drop dates, ongoing/floating grade items
"other"      → bonus marks, extra credit, anything not covered above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE 7 — SOURCE QUOTES (MANDATORY FOR EVERY EVENT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every event in the output MUST include a source_quote field.

- Copy the exact, verbatim sentence or phrase from the document text that proves this event exists and contains its date or description. Do NOT paraphrase or rewrite.
- The quote must appear word-for-word in the source text so it can be located and highlighted programmatically. A single character difference will break the highlight.
- If the evidence spans two sentences, include both separated by " … " (e.g. "Quiz 2 is on March 10. … It is worth 10% of your final grade.").
- For floating/ongoing items with no explicit date, quote the sentence that names the item and states its weight.
- For bonus items, quote the exact sentence from the narrative paragraph that mentions the bonus.
- Maximum 300 characters per quote.
- Never leave source_quote as an empty string. Every event requires provenance.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETENESS CHECKLIST — verify before outputting
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Before writing the JSON, confirm:
□ Events extracted from EVERY week in the schedule?
□ ALL recurring items included individually (Quiz 1, Quiz 2, Quiz 3 … not just Quiz 1)?
□ Placeholder events created for ALL unscheduled but graded items (participation, pop quizzes, attendance)?
□ Narrative paragraphs scanned for bonus/extra credit?
□ ALL graded items have weight > 0 if a percentage was stated anywhere in the document?
□ Distributed weights calculated correctly when an aggregate is given?
□ ALL lectures/seminars included with their topics, not just assessments?
□ EVERY event has a non-empty source_quote copied verbatim from the document?

If any answer is NO, add the missing events before outputting.
If the document contains no extractable events, return { "events": [] }.`;

  try {
    const msg = await aiClient.messages.create({
      model:      "claude-sonnet-4-6",
      // 8 192 tokens — a full semester (60+ lectures + assessments + floating items)
      // serialises to ~6 000–7 000 tokens. 4 096 would truncate mid-JSON.
      max_tokens: 8192,
      system:     systemPrompt,
      messages: [{
        role:    "user",
        content: `Extract every scheduled event, assessment, floating grade item, and bonus opportunity from this syllabus. Apply all six extraction rules. Do not truncate — process the document from the first week to the final exam.\n\n${snippet}`,
      }],
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

    // Accept both "events" (current schema) and "items" (legacy fallback)
    const items = Array.isArray(parsed.events)
      ? parsed.events
      : Array.isArray(parsed.items)
        ? parsed.items
        : [];
    const VALID_TYPES = new Set(["assignment", "exam", "lecture", "reminder", "other"]);
    const result = [];

    for (const item of items) {
      if (!item.title || !item.date) continue;
      const d = new Date(item.date);
      if (isNaN(d.getTime())) continue;

      const rawType = String(item.type ?? "other").toLowerCase().trim();
      const type = VALID_TYPES.has(rawType) ? rawType : "other";

      const w = typeof item.weight === "number" && isFinite(item.weight) ? item.weight : 0;
      result.push({
        title:        String(item.title).slice(0, 200),
        date:         d,
        type,
        weight:       w,
        description:  w > 0 ? `Weight: ${w}%` : "",
        source_quote: typeof item.source_quote === "string"
          ? item.source_quote.trim().slice(0, 300)
          : "",
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
    // The same 40 k slice sent to the LLM — source_quotes are guaranteed
    // to be findable inside this string for the document highlight viewer.
    rawText: text.slice(0, 40_000),
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
