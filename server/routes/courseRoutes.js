import { Router } from "express";
import auth from "../middleware/auth.js";
import aiProvider from "../middleware/aiProvider.js";
import { queryCourse } from "../controllers/courseController.js";

const router = Router();

// All course routes require a valid JWT — auth sets req.user which the
// controller uses to scope every MongoDB query to the owning user.
router.post("/:id/query", auth, aiProvider, queryCourse);

export default router;
