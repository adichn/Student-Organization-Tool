import "dotenv/config";
import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Semester Organizer API is running" });
});

// Routes
import authRoutes     from "./routes/authRoutes.js";
import yearRoutes     from "./routes/yearRoutes.js";
import courseRoutes   from "./routes/courseRoutes.js";
import researchRoutes from "./routes/researchRoutes.js";
import aiRoutes       from "./routes/aiRoutes.js";
import taskRoutes     from "./routes/taskRoutes.js";

app.use("/api/auth",     authRoutes);
app.use("/api/years",    yearRoutes);    // CRUD for years → semesters → courses
app.use("/api/courses",  courseRoutes);  // file upload, assignment tracking
app.use("/api/research", researchRoutes);
app.use("/api/ai",       aiRoutes);      // RAG query endpoint (vector search + Claude)
app.use("/api/tasks",    taskRoutes);    // cross-domain task management + ROI engine

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
