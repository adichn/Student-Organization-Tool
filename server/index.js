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
import courseRoutes from "./routes/courseRoutes.js";
app.use("/api/courses", courseRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
