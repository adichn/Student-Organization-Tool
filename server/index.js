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
// import exampleRoutes from "./routes/exampleRoutes.js";
// app.use("/api/example", exampleRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
