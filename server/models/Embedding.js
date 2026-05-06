import { Schema, model } from "mongoose";

// Each document is one text chunk from a course resource, plus its vector.
//
// Atlas Vector Search index must be created once (see scripts/createVectorIndex.js):
//   - field  : "embedding"  type: vector  dimensions: 1024  similarity: cosine
//   - fields : "courseId", "user"  type: filter
const EmbeddingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // _id of the embedded Course subdocument inside Year.semesters[].courses[]
    courseId: { type: Schema.Types.ObjectId, required: true, index: true },

    // Denormalised resource metadata — enough to cite the source in responses
    resource: {
      title: { type: String, required: true },
      type:  { type: String }, // "file" | "link" | "video" | "document" | "other"
      url:   { type: String },
    },

    // The raw text chunk that was embedded
    content: { type: String, required: true },

    // voyage-3 produces 1024-dimensional vectors
    embedding: { type: [Number], required: true },

    // Position of this chunk within the source resource (for ordering citations)
    chunkIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default model("Embedding", EmbeddingSchema);
