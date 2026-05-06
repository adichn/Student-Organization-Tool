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
import courseRoutes   from "./routes/courseRoutes.js";
import researchRoutes from "./routes/researchRoutes.js";

app.use("/api/auth",     authRoutes);
app.use("/api/courses",  courseRoutes);
app.use("/api/research", researchRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
