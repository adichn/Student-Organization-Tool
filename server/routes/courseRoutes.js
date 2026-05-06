import { Router } from "express";
import aiProvider from "../middleware/aiProvider.js";
import { queryCourse } from "../controllers/courseController.js";

const router = Router();

// POST /api/courses/:id/query
// aiProvider is applied per-route — only requests that reach this handler
// incur key resolution. Health checks and other routes are unaffected.
router.post("/:id/query", aiProvider, queryCourse);

export default router;
