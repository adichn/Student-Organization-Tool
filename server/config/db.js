import mongoose from "mongoose";

/**
 * Connect to MongoDB.
 *
 * Fails fast (process.exit 1) if:
 *   - Neither MONGO_URI nor MONGODB_URI is set in the environment
 *   - The initial connection attempt times out or is refused
 *
 * serverSelectionTimeoutMS is tightened to 5 s so the process exits quickly
 * in CI / local dev when the DB isn't running, rather than hanging for 30 s.
 */
export default async function connectDB() {
  const uri = process.env.MONGO_URI ?? process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "\n[db] Fatal: no MongoDB connection string found.\n" +
      "     Set MONGO_URI in server/.env (copy from server/.env.example).\n"
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5_000,
    });
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[db] Connection failed: ${err.message}\n`);
    process.exit(1);
  }
}
