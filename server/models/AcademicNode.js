import { Schema, model } from "mongoose";

/**
 * AcademicNode — a lightweight adjacency-list tree for academic structure.
 *
 * Tree shape:
 *   Year  (type: "year",     parent: null)
 *   └─ Semester (type: "semester", parent: <Year _id>)
 *
 * Keeping years and semesters in the same collection lets you fetch an entire
 * tree with a single { ownerId } query and reconstruct it client-side,
 * while individual lookups by _id stay O(1).
 */
const AcademicNodeSchema = new Schema(
  {
    type: {
      type:     String,
      enum:     ["year", "semester"],
      required: true,
    },

    // Human-readable label: "2025" for a year, "Fall 2025" for a semester.
    title: { type: String, required: true, trim: true },

    // null  → root year node (no parent)
    // ObjectId → semester node pointing at its parent year
    parent: {
      type:    Schema.Types.ObjectId,
      ref:     "AcademicNode",
      default: null,
    },

    ownerId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Data isolation — every query MUST filter by ownerId first.
AcademicNodeSchema.index({ ownerId: 1, type: 1 });

// Fetch all children of a node (semester list for a year).
AcademicNodeSchema.index({ ownerId: 1, parent: 1 });

// Prevent duplicate titles within the same parent + owner
// (can't have two "Fall 2025" semesters under the same year).
AcademicNodeSchema.index(
  { ownerId: 1, parent: 1, title: 1 },
  { unique: true }
);

export default model("AcademicNode", AcademicNodeSchema);
