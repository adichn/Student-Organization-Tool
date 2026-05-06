/**
 * One-time script: create the Atlas Vector Search index for the embeddings
 * collection. Run once after the Atlas cluster is provisioned:
 *
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
        // The vector field — voyage-3 emits 1024-dimensional cosine vectors
        {
          type: "numDimensions",
          path: "embedding",
          numDimensions: 1024,
          similarity: "cosine",
        },
        // Pre-filter fields — narrows ANN search before ranking
        // Both must be present so the $vectorSearch filter compiles correctly
        { type: "filter", path: "courseId" },
        { type: "filter", path: "user" },
      ],
    },
  });
  console.log("Index 'course_embeddings_index' created successfully.");
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
