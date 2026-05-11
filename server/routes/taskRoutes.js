import { Router } from "express";
import protect from "../middleware/protect.js";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from "../controllers/taskController.js";

const router = Router();

router.use(protect);

router.get("/",     listTasks);
router.get("/:id",  getTask);
router.post("/",    createTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;
