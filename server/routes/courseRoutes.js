import { Router } from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import aiProvider from "../middleware/aiProvider.js";
import aiRateLimit from "../middleware/aiRateLimit.js";
import { queryCourse } from "../controllers/courseController.js";
import { uploadResource } from "../controllers/resourceController.js";
import {
  getAssignments,
  createAssignment,
  updateAssignment,
} from "../controllers/assignmentController.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const allowed = ["application/pdf", "text/plain", "text/markdown"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// All course routes require a valid JWT — auth sets req.user which the
// controller uses to scope every MongoDB query to the owning user.
//
// aiRateLimit sits after aiProvider so it can read req.aiKeySource and skip
// users who supply their own key via x-user-api-key.
router.post("/:id/query",     auth, aiProvider, aiRateLimit, queryCourse);
router.post("/:id/resources", auth, upload.single("file"), aiProvider, uploadResource); // Voyage AI only — no Claude quota applied

// Assignment tracking
router.get   ("/:courseId/assignments",                    auth, getAssignments);
router.post  ("/:courseId/assignments",                    auth, createAssignment);
router.patch ("/:courseId/assignments/:assignmentId",      auth, updateAssignment);

export default router;
