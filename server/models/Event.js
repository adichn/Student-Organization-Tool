import { Schema, model } from "mongoose";

const EventSchema = new Schema(
  {
    courseId: {
      type:     Schema.Types.ObjectId,
      ref:      "Course",
      required: true,
    },

    // Denormalised for fast semester-level queries (e.g. upcoming-events view)
    // without a join through Course.
    semesterId: {
      type:     Schema.Types.ObjectId,
      ref:      "AcademicNode",
      required: true,
    },

    title: { type: String, required: true, trim: true },

    dueDate: { type: Date, required: true },

    type: {
      type:     String,
      enum:     ["assignment", "quiz", "test"],
      required: true,
    },

    isCompleted: { type: Boolean, default: false },

    ownerId: {
      type:     Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// "All events for this course" — most common per-course query
EventSchema.index({ ownerId: 1, courseId: 1 });

// Calendar / upcoming-events view — date-range sweeps
EventSchema.index({ ownerId: 1, dueDate: 1 });

// To-do and completion dashboard — filter by status then sort by due date
EventSchema.index({ ownerId: 1, isCompleted: 1, dueDate: 1 });

// Semester-level aggregation (progress rings, semester overview)
EventSchema.index({ ownerId: 1, semesterId: 1, isCompleted: 1 });

export default model("Event", EventSchema);
