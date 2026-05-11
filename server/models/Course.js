import { Schema, model } from "mongoose";

const CourseSchema = new Schema(
  {
    semesterId: {
      type:     Schema.Types.ObjectId,
      ref:      "AcademicNode",
      required: true,
    },

    title: { type: String, required: true, trim: true },

    // e.g. "CS 101", "MATH 201" — uppercased for consistent lookups
    courseCode: { type: String, trim: true, uppercase: true },

    // Validated hex colour used for card accents in the UI.
    // Accepts 3- or 6-digit hex: "#abc" or "#aabbcc".
    colorHex: {
      type:    String,
      trim:    true,
      match:   [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "colorHex must be a valid hex colour."],
      default: "#6366f1",
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

// Primary access pattern: "all courses in this semester for this user"
CourseSchema.index({ ownerId: 1, semesterId: 1 });

// Prevent duplicate course codes within the same semester + owner.
// sparse: true lets courseCode be omitted without tripping the uniqueness check.
CourseSchema.index(
  { ownerId: 1, semesterId: 1, courseCode: 1 },
  { unique: true, sparse: true }
);

export default model("Course", CourseSchema);
