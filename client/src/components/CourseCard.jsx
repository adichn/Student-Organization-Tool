import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import ProgressBar from "./ProgressBar";

function relativeDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.round((d - now) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1 && diffDays < 8) return `In ${diffDays} days`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function CourseCard({ course, onClick }) {
  const assignments  = course.events.filter((e) => e.type === "assignment");
  const done         = assignments.filter((e) => e.completed).length;
  const now          = new Date();
  const upcoming     = course.events
    .filter((e) => !e.completed && new Date(e.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.18, ease: "easeOut" } }}
      whileTap={{ scale: 0.982 }}
      onClick={() => onClick(course)}
      className="cursor-pointer h-full"
    >
      <GlassCard className="p-5 h-full flex flex-col">
        {/* Colour accent */}
        <div
          className={`w-8 h-8 rounded-[10px] bg-gradient-to-br ${course.gradient} mb-4 shadow-sm shrink-0`}
        />

        {/* Code + title */}
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
          <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 mb-3">
            {course.description}
          </p>
        )}

        {/* Push progress + chips to bottom */}
        <div className="mt-auto pt-3 space-y-3">
          <ProgressBar value={done} max={assignments.length} showLabel />

          <div className="flex items-center gap-2 flex-wrap">
            {upcoming[0] && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 bg-violet-50 rounded-md px-2 py-0.5 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                {relativeDate(upcoming[0].date)}
              </span>
            )}
            <span className="text-[11px] text-gray-400 ml-auto">
              {course.resources.length} files
            </span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
