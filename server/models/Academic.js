import { Schema, model } from "mongoose";

// ── Leaf schemas ────────────────────────────────────────────────────────────

const ResourceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, trim: true },
    fileKey: { type: String, trim: true }, // storage key for uploaded files
    type: {
      type: String,
      enum: ["link", "file", "video", "document", "other"],
      default: "link",
    },
  },
  { _id: true, timestamps: { createdAt: "uploadedAt", updatedAt: false } }
);

const EventSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ["assignment", "exam", "lecture", "reminder", "other"],
      default: "other",
    },
    // Three-state status for assignments; completed mirrors status === "completed"
    // so existing queries that filter on `completed` keep working.
    status: {
      type: String,
      enum: ["todo", "in-progress", "completed"],
      default: "todo",
    },
    completed: { type: Boolean, default: false },
  },
  { _id: true, timestamps: true }
);

// ── Course ───────────────────────────────────────────────────────────────────

const CourseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    resources: [ResourceSchema],
    events: [EventSchema],
  },
  { _id: true, timestamps: true }
);

// ── Semester ─────────────────────────────────────────────────────────────────

const SemesterSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true }, // e.g. "Fall 2025"
    season: {
      type: String,
      enum: ["spring", "summer", "fall", "winter"],
      required: true,
    },
    courses: [CourseSchema],
  },
  { _id: true, timestamps: true }
);

// ── Year (top-level document) ────────────────────────────────────────────────

const YearSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true }, // e.g. 2025
    semesters: [SemesterSchema],
  },
  { timestamps: true }
);

// Prevent duplicate years per user
YearSchema.index({ user: 1, year: 1 }, { unique: true });

export default model("Year", YearSchema);
