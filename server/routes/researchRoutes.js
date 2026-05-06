import { Router } from "express";
import auth from "../middleware/auth.js";
import aiProvider from "../middleware/aiProvider.js";
import aiRateLimit from "../middleware/aiRateLimit.js";
import { searchResearch, saveResearch } from "../controllers/researchController.js";

const router = Router();

// POST /api/research/search — term generation + search + AI synthesis
// aiRateLimit after aiProvider: users with x-user-api-key bypass the quota.
router.post("/search", auth, aiProvider, aiRateLimit, searchResearch);

// POST /api/research/save — persist summary as a course resource + embed for RAG
// aiProvider not needed here — embeddings use the Voyage key directly.
router.post("/save", auth, saveResearch);

export default router;
