import { Router }    from "express";
import protect       from "../middleware/protect.js";
import aiGatekeeper  from "../middleware/aiGatekeeper.js";
import { queryAI }   from "../controllers/aiController.js";

const router = Router();

/**
 * POST /api/ai/query
 *
 * Body: { courseId: string, prompt: string }
 *
 * Requires:
 *   - Authorization: Bearer <jwt>   (protect)
 *   - Optional: x-user-api-key      (aiGatekeeper — falls back to DEFAULT_AI_KEY with rate limit)
 */
router.post("/query", protect, aiGatekeeper, queryAI);

export default router;
