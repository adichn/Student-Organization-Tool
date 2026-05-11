import { Schema, model } from "mongoose";

// ── Task Schema ───────────────────────────────────────────────────────────────
// Tasks span Academic, Professional, Personal, and Career domains.
// The ROI engine computes priorityScore = gradeBusinessValue / estimatedEffort.
// Context Mode uses warmUpPrompt (user-written) or a generated template.

const CourseRefSchema = new Schema(
  {
    yearId:      Schema.Types.ObjectId,
    semId:       Schema.Types.ObjectId,
    courseId:    Schema.Types.ObjectId,
    courseTitle: { type: String, trim: true },
    courseCode:  { type: String, trim: true, uppercase: true },
    // Stored so the ROI engine can apply the difficulty multiplier without a join
    difficultyMultiplier: { type: Number, min: 1, max: 10, default: 5 },
  },
  { _id: false }
);

export const VALID_DOMAINS = ["Academic", "Professional", "Personal", "Career"];

const TaskSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Client-side workspace id (e.g. "ws_1234567890").  Null = unassigned (legacy).
    workspaceId: { type: String, trim: true, default: null, index: true },

    title:       { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },

    domain: {
      type:     String,
      enum:     VALID_DOMAINS,
      required: true,
    },

    startDate: { type: Date },
    dueDate:   { type: Date },

    // ── ROI Engine inputs ─────────────────────────────────────────────────────
    // Grade impact (Academic) or business value (Professional / Career), 0–100.
    gradeBusinessValue: {
      type:    Number,
      min:     0,
      max:     100,
      default: 50,
      required: true,
    },
    // Estimated effort in hours (minimum 0.1 to avoid division by zero).
    estimatedEffort: {
      type:    Number,
      min:     0.1,
      default: 1,
      required: true,
    },

    // ── Context Mode ──────────────────────────────────────────────────────────
    warmUpPrompt: { type: String, trim: true, default: "" },

    // ── Optional academic link (Academic domain only) ─────────────────────────
    courseRef: { type: CourseRefSchema, default: null },

    status: {
      type:    String,
      enum:    ["todo", "in-progress", "completed"],
      default: "todo",
    },

    tags: [{ type: String, trim: true }],
  },
  {
    _id:        true,
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ── ROI Engine virtual ────────────────────────────────────────────────────────
// Base score: gradeBusinessValue / estimatedEffort
// For Academic tasks, the course's difficultyMultiplier scales urgency
// (multiplier / 5 keeps difficulty-5 courses at a neutral 1× factor).
TaskSchema.virtual("priorityScore").get(function () {
  const effort = this.estimatedEffort || 1;
  let score = this.gradeBusinessValue / effort;

  if (this.domain === "Academic" && this.courseRef?.difficultyMultiplier) {
    score *= this.courseRef.difficultyMultiplier / 5;
  }

  return Math.round(score * 100) / 100;
});

// ── Indexes ───────────────────────────────────────────────────────────────────
TaskSchema.index({ user: 1, domain: 1 });
TaskSchema.index({ user: 1, workspaceId: 1 });
TaskSchema.index({ user: 1, status: 1, dueDate: 1 });

export default model("Task", TaskSchema);
