import { Schema, model } from "mongoose";

/**
 * Resource — one uploaded file per document.
 *
 * `rawText` holds the full extracted plaintext (from pdf-parse or plain-text
 * files). `embedding` stores a single voyage-3 vector (1 024 dims) computed
 * from the whole document, suitable for small corpora.
 *
 * For large corpora where a single vector per document is insufficient, split
 * the text into chunks and store each chunk in the Embedding collection
 * (server/models/Embedding.js) which is optimised for Atlas Vector Search.
 *
 * Atlas Vector Search index (create once via scripts/createVectorIndex.js):
 *   - field      : "embedding"   type: vector   dimensions: 1024   similarity: cosine
 *   - filter fields: "courseId", "ownerId"
 */
const ResourceSchema = new Schema(
  {
    courseId: {
      type:     Schema.Types.ObjectId,
      ref:      "Course",
      required: true,
    },

    // Original filename as provided by the uploader (e.g. "lecture-3.pdf")
    fileName: { type: String, required: true, trim: true },

    // Full extracted plaintext — kept for re-embedding and keyword search
    rawText: { type: String, default: "" },

    // voyage-3 embedding of the full document (1 024-dimensional)
    // An empty array means the file was uploaded but not yet embedded.
    embedding: { type: [Number], default: [] },

    ownerId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// "All resources for this course" — primary access pattern
ResourceSchema.index({ ownerId: 1, courseId: 1 });

// Most-recent-first listing within a course
ResourceSchema.index({ ownerId: 1, courseId: 1, createdAt: -1 });

export default model("Resource", ResourceSchema);
