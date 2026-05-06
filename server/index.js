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
// AI-enabled routes: pass aiProvider as route-level middleware, not globally,
// so the key resolution only runs for requests that actually need it.
//
// import aiProvider from "./middleware/aiProvider.js";
// import aiRoutes from "./routes/aiRoutes.js";
// app.use("/api/ai", aiProvider, aiRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
