import { Router } from "express";
import protect               from "../middleware/protect.js";
import aiGatekeeper, { aiOptional } from "../middleware/aiGatekeeper.js";
import upload         from "../middleware/upload.js";
import { queryCourse }                    from "../controllers/courseController.js";
import { uploadResource, deleteResource } from "../controllers/resourceController.js";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
} from "../controllers/assignmentController.js";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  batchCreateEvents,
} from "../controllers/eventController.js";

const router = Router();

// ── AI-powered routes ─────────────────────────────────────────────────────────
// protect   → validates Bearer JWT, populates req.user
// aiGatekeeper → picks the Anthropic key (user-provided or server default + rate limit)

router.post("/:id/query", protect, aiGatekeeper, queryCourse);

// ── File upload / resource management ────────────────────────────────────────
// Voyage AI embeddings are generated server-side; no Claude quota consumed here.
// upload.single("file") enforces 10 MB cap + MIME allowlist before the controller runs.

router.post  ("/:id/upload",                  protect, aiOptional, upload.single("file"), uploadResource);
router.delete("/:id/resources/:resourceId",   protect, deleteResource);

// ── Assignment tracking ───────────────────────────────────────────────────────
router.get   ("/:courseId/assignments",               protect, getAssignments);
router.post  ("/:courseId/assignments",               protect, createAssignment);
router.patch ("/:courseId/assignments/:assignmentId", protect, updateAssignment);

// ── General event CRUD (all types) ────────────────────────────────────────────
// /batch must come before /:eventId so Express doesn't match "batch" as an id
router.post  ("/:courseId/events/batch",      protect, batchCreateEvents);
router.post  ("/:courseId/events",            protect, createEvent);
router.patch ("/:courseId/events/:eventId",   protect, updateEvent);
router.delete("/:courseId/events/:eventId",   protect, deleteEvent);

export default router;
