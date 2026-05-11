import { motion } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function letterGrade(g) {
  if (g >= 93) return "A";
  if (g >= 90) return "A−";
  if (g >= 87) return "B+";
  if (g >= 83) return "B";
  if (g >= 80) return "B−";
  if (g >= 77) return "C+";
  if (g >= 73) return "C";
  if (g >= 70) return "C−";
  if (g >= 60) return "D";
  return "F";
}

function gradeColor(g) {
  if (g >= 80) return "#22c55e"; // green
  if (g >= 70) return "#f59e0b"; // amber
  return "#f43f5e";              // rose
}

function relativeDate(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.round((d - now) / 86400000); // days
  if (diff < 0)  return { label: `${Math.abs(diff)}d ago`,  urgent: true };
  if (diff === 0) return { label: "Today",                   urgent: true };
  if (diff === 1) return { label: "Tomorrow",                urgent: true };
  if (diff <= 7)  return { label: `In ${diff} days`,         urgent: false };
  return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), urgent: false };
}

// ── Difficulty dots (macOS-style filled/empty circles) ────────────────────────
function DifficultyDots({ value = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-colors duration-200"
          style={{
            background: i < value
              ? value >= 8 ? "#f43f5e"
              : value >= 5 ? "#f59e0b"
              : "#22c55e"
              : "rgba(0,0,0,0.12)",
          }}
        />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Props
 * ─────
 *   course   Course subdocument from Academic.js (includes gradient string from hook)
 */
export default function CourseOverviewCard({ course, onClick }) {
  const now = new Date();

  // Assignment stats
  const assignments  = (course.events ?? []).filter((e) => e.type === "assignment");
  const done         = assignments.filter((e) => e.status === "completed" || e.completed);
  const progress     = assignments.length > 0 ? done.length / assignments.length : 0;

  // Next upcoming event (any type)
  const nextEvent = (course.events ?? [])
    .filter((e) => !e.completed && e.status !== "completed" && new Date(e.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  const nextDue = nextEvent ? relativeDate(nextEvent.date) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={onClick ? { scale: 0.985 } : undefined}
      transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={[
        "glass-card-interactive rounded-[16px] overflow-hidden",
        onClick ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {/* Colour accent line */}
      <div
        className={`h-[3px] w-full bg-gradient-to-r ${course.gradient}`}
      />

      <div className="px-4 py-3.5">
        {/* Course identity */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {course.code && (
                <span
                  className="text-[10px] font-semibold text-gray-400 uppercase"
                  style={{ letterSpacing: "0.06em" }}
                >
                  {course.code}
                </span>
              )}
              {course.weight && (
                <span className="text-[10px] text-gray-300">
                  {course.weight} cr
                </span>
              )}
            </div>
            <p
              className="text-[13px] font-semibold text-gray-900 leading-tight mt-0.5 truncate"
              style={{ letterSpacing: "-0.016em" }}
            >
              {course.title}
            </p>
          </div>

          {/* Grade badge */}
          {course.currentGrade != null && (
            <div className="shrink-0 flex flex-col items-end">
              <span
                className="text-[17px] font-bold leading-none"
                style={{ color: gradeColor(course.currentGrade), letterSpacing: "-0.02em" }}
              >
                {letterGrade(course.currentGrade)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                {course.currentGrade}%
              </span>
            </div>
          )}
        </div>

        {/* Difficulty row */}
        <div className="flex items-center justify-between mb-2.5">
          <DifficultyDots value={course.difficultyMultiplier ?? 5} />
          <span className="text-[10px] text-gray-400">
            Difficulty {course.difficultyMultiplier ?? 5}/10
          </span>
        </div>

        {/* Assignment progress */}
        {assignments.length > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500 font-medium">Assignments</span>
              <span className="text-[10px] text-gray-500">
                {done.length}/{assignments.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-black/8 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${course.gradient}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
              />
            </div>
          </div>
        )}

        {/* Next deadline */}
        {nextDue && (
          <div className="flex items-center gap-1.5 mt-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke={nextDue.urgent ? "#f43f5e" : "#9ca3af"}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span
              className="text-[11px] font-medium truncate"
              style={{ color: nextDue.urgent ? "#f43f5e" : "#9ca3af" }}
            >
              {nextEvent.title} — {nextDue.label}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
