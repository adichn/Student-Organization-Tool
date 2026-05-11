import { Router } from "express";
import protect from "../middleware/protect.js";
import aiGatekeeper from "../middleware/aiGatekeeper.js";
import { searchResearch, saveResearch } from "../controllers/researchController.js";

const router = Router();

// POST /api/research/search
// protect  → aiGatekeeper → searchResearch
// aiGatekeeper handles both key resolution and default-key rate limiting
// in one step; users who send x-user-api-key bypass the quota entirely.
router.post("/search", protect, aiGatekeeper, searchResearch);

// POST /api/research/save
// Persists an AI-generated summary as a course resource and embeds it for RAG.
// Embeddings are produced via Voyage AI (server-side key) — no Claude call,
// so aiGatekeeper is not needed here.
router.post("/save", protect, saveResearch);

export default router;
