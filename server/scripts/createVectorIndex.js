/**
 * One-time script: create (or recreate) the Atlas Vector Search index for the
 * embeddings collection. Run once after provisioning, and again after swapping
 * embedding models (dimension count must match exactly).
 *
 *   node scripts/createVectorIndex.js
 *
 * ── Migration note (Voyage → Gemini) ──────────────────────────────────────────
 * text-embedding-004 produces 768-dimensional vectors; voyage-3 produced 1024.
 * If you have an existing index at 1024 dims, you must drop it and all stored
 * embeddings before running this script, otherwise $vectorSearch will reject
 * query vectors with the wrong dimension count:
 *
 *   # In mongosh or Atlas Data Explorer:
 *   db.embeddings.deleteMany({})          // wipe old 1024-dim docs
 *   # Then drop the old index from the Atlas UI (Search Indexes tab) and run:
 *   node scripts/createVectorIndex.js
 *
 * Requires MONGO_URI in .env to point at a MongoDB Atlas cluster (not local).
 * $vectorSearch is Atlas-only and will not work against a local mongod.
 */
import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);
console.log("Connected to Atlas.");

const collection = mongoose.connection.collection("embeddings");

try {
  await collection.createSearchIndex({
    name: "course_embeddings_index",
    type: "vectorSearch",
    definition: {
      fields: [
        // text-embedding-004 (Gemini) emits 768-dimensional cosine vectors
        {
          type:          "vector",
          path:          "embedding",
          numDimensions: 768,
          similarity:    "cosine",
        },
        // Pre-filter fields — narrows ANN search before ranking
        { type: "filter", path: "courseId" },
        { type: "filter", path: "user" },
      ],
    },
  });
  console.log("Index 'course_embeddings_index' created successfully (768 dims, cosine).");
} catch (err) {
  if (err.codeName === "IndexAlreadyExists") {
    console.log("Index already exists — nothing to do.");
  } else {
    console.error("Failed to create index:", err.message);
    process.exit(1);
  }
} finally {
  await mongoose.disconnect();
}
