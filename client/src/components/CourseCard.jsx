import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import ProgressRing from "./ProgressRing";

function relativeDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.round((d - now) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 8) return `In ${diffDays} days`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function CourseCard({ course, onClick, onDelete }) {
  const assignments = course.events.filter((e) => e.type === "assignment");
  const done        = assignments.filter(
    (e) => e.completed || e.status === "completed"
  ).length;
  const now         = new Date();
  const upcoming    = course.events
    .filter((e) => !e.completed && new Date(e.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.18, ease: "easeOut" } }}
      whileTap={{ scale: 0.982 }}
      onClick={() => onClick(course)}
      className="cursor-pointer h-full group"
    >
      <GlassCard variant="interactive" className="p-5 h-full flex flex-col relative">

        {/* ── Top row: accent dot + progress ring ─────────────────────── */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-8 h-8 rounded-[10px] shadow-sm shrink-0 mt-0.5"
            style={{ background: course.gradientStyle }}
          />
          <ProgressRing value={done} max={assignments.length} size={52} strokeWidth={4.5} />
        </div>

        {/* Delete button — hover-reveal, above the ring */}
        {onDelete && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); onDelete(course); }}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center
                       rounded-full text-gray-400 hover:text-rose-500
                       hover:bg-rose-50 transition-all duration-150 cursor-pointer
                       opacity-0 group-hover:opacity-100 z-20"
            aria-label={`Delete ${course.title}`}
          >
            <TrashIcon />
          </motion.button>
        )}

        {/* ── Course identity ──────────────────────────────────────────── */}
        <p
          className="text-[11px] font-semibold text-gray-400 mb-0.5 uppercase"
          style={{ letterSpacing: "0.05em" }}
        >
          {course.code}
        </p>
        <h3
          className="text-[15px] font-semibold text-gray-900 leading-snug mb-1"
          style={{ letterSpacing: "-0.022em" }}
        >
          {course.title}
        </h3>
        {course.description && (
          <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">
            {course.description}
          </p>
        )}

        {/* ── Bottom chips ─────────────────────────────────────────────── */}
        <div className="mt-auto pt-3 flex items-center gap-2 flex-wrap">
          {upcoming[0] && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 rounded-md px-2 py-0.5 leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              {relativeDate(upcoming[0].date)}
            </span>
          )}
          <span className="text-[11px] text-gray-400 ml-auto">
            {assignments.length} tasks · {course.resources.length} files
          </span>
        </div>

      </GlassCard>
    </motion.div>
  );
}
