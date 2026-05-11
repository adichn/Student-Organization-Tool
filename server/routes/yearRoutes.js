import { Router } from "express";
import protect from "../middleware/protect.js";
import {
  listYears,
  createYear,
  deleteYear,
  createSemester,
  deleteSemester,
  createCourse,
  deleteCourse,
} from "../controllers/yearController.js";

const router = Router();

// Every route in this file requires a valid JWT.
// protect sets req.user; every controller then scopes queries to req.user._id.
router.use(protect);

// ── Years ─────────────────────────────────────────────────────────────────────
router.get   ("/",          listYears);   // GET  /api/years
router.post  ("/",          createYear);  // POST /api/years
router.delete("/:yearId",   deleteYear);  // DEL  /api/years/:yearId

// ── Semesters ─────────────────────────────────────────────────────────────────
router.post  ("/:yearId/semesters",          createSemester);  // POST /api/years/:yearId/semesters
router.delete("/:yearId/semesters/:semId",   deleteSemester);  // DEL  /api/years/:yearId/semesters/:semId

// ── Courses ───────────────────────────────────────────────────────────────────
router.post  ("/:yearId/semesters/:semId/courses",            createCourse); // POST
router.delete("/:yearId/semesters/:semId/courses/:courseId",  deleteCourse); // DEL

export default router;
