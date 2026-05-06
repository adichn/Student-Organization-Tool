import mongoose from "mongoose";
import Year from "../models/Academic.js";

const VALID_STATUSES = ["todo", "in-progress", "completed"];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Walk semesters to find a course subdoc. Returns null if not found. */
function findCourse(yearDoc, courseId) {
  for (const semester of yearDoc.semesters) {
    const course = semester.courses.id(courseId);
    if (course) return course;
  }
  return null;
}

/** Safe shape returned to the client — avoids sending the full Year doc. */
function toDTO(event) {
  return {
    _id:         event._id,
    title:       event.title,
    description: event.description,
    date:        event.date,
    type:        event.type,
    status:      event.status ?? (event.completed ? "completed" : "todo"),
    completed:   event.completed,
  };
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/courses/:courseId/assignments
 * Returns all events with type === "assignment" for the given course.
 */
export async function getAssignments(req, res) {
  const { courseId } = req.params;

  if (!mongoose.isValidObjectId(courseId)) {
    return res.status(400).json({ error: "Invalid course id." });
  }

  const yearDoc = await Year.findOne({
    user: req.user._id,
    "semesters.courses._id": new mongoose.Types.ObjectId(courseId),
  }).lean();

  if (!yearDoc) return res.status(404).json({ error: "Course not found." });

  for (const semester of yearDoc.semesters) {
    const course = semester.courses.find(
      (c) => c._id.toString() === courseId
    );
    if (course) {
      const assignments = course.events
        .filter((e) => e.type === "assignment")
        .map(toDTO);
      return res.json({ assignments });
    }
  }

  return res.status(404).json({ error: "Course not found." });
}

/**
 * POST /api/courses/:courseId/assignments
 * Body: { title, date, description? }
 * Creates a new assignment event and returns it.
 */
export async function createAssignment(req, res) {
  const { courseId } = req.params;
  const { title, date, description } = req.body;

  if (!mongoose.isValidObjectId(courseId)) {
    return res.status(400).json({ error: "Invalid course id." });
  }
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required." });
  }
  if (!date || isNaN(new Date(date).getTime())) {
    return res.status(400).json({ error: "Valid date is required." });
  }

  const yearDoc = await Year.findOne({
    user: req.user._id,
    "semesters.courses._id": new mongoose.Types.ObjectId(courseId),
  });

  if (!yearDoc) return res.status(404).json({ error: "Course not found." });

  const course = findCourse(yearDoc, courseId);
  if (!course) return res.status(404).json({ error: "Course not found." });

  course.events.push({
    user:        req.user._id,
    title:       title.trim(),
    description: description?.trim(),
    date:        new Date(date),
    type:        "assignment",
    status:      "todo",
    completed:   false,
  });

  await yearDoc.save();

  const saved = course.events[course.events.length - 1];
  return res.status(201).json({ assignment: toDTO(saved) });
}

/**
 * PATCH /api/courses/:courseId/assignments/:assignmentId
 * Body: { status: "todo" | "in-progress" | "completed" }
 * Updates status (and syncs the legacy `completed` boolean).
 * Uses arrayFilters to avoid loading and re-saving the entire Year document.
 */
export async function updateAssignment(req, res) {
  const { courseId, assignmentId } = req.params;
  const { status } = req.body;

  if (!mongoose.isValidObjectId(courseId) || !mongoose.isValidObjectId(assignmentId)) {
    return res.status(400).json({ error: "Invalid id." });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}.` });
  }

  const courseOid     = new mongoose.Types.ObjectId(courseId);
  const assignmentOid = new mongoose.Types.ObjectId(assignmentId);

  // $[] iterates all semesters; arrayFilters scope the course and event.
  // This avoids fetching, mutating, and re-saving the entire document.
  const updated = await Year.findOneAndUpdate(
    {
      user: req.user._id,
      "semesters.courses._id":        courseOid,
      "semesters.courses.events._id": assignmentOid,
    },
    {
      $set: {
        "semesters.$[].courses.$[crs].events.$[evt].status":    status,
        "semesters.$[].courses.$[crs].events.$[evt].completed": status === "completed",
      },
    },
    {
      arrayFilters: [
        { "crs._id": courseOid },
        { "evt._id": assignmentOid },
      ],
      new: true,
    }
  );

  if (!updated) return res.status(404).json({ error: "Assignment not found." });

  const course = findCourse(updated, courseId);
  const event  = course?.events.id(assignmentId);
  if (!event) return res.status(404).json({ error: "Assignment not found." });

  return res.json({ assignment: toDTO(event) });
}
