import { motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import ProgressBar from "../components/ProgressBar";

const SEASON = {
  spring: { gradient: "from-emerald-400 to-teal-500",   badge: "bg-emerald-50 text-emerald-700" },
  fall:   { gradient: "from-amber-400 to-orange-500",   badge: "bg-amber-50 text-amber-700" },
  summer: { gradient: "from-sky-400 to-blue-500",       badge: "bg-sky-50 text-sky-700" },
  winter: { gradient: "from-indigo-400 to-violet-500",  badge: "bg-indigo-50 text-indigo-700" },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.4, 0, 0.2, 1] } },
};

export default function YearView({ yearData, onSelectSemester }) {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p
          className="text-[11px] font-semibold text-white/70 uppercase mb-1"
          style={{ letterSpacing: "0.06em" }}
        >
          Academic Year
        </p>
        <h1
          className="text-[32px] font-semibold text-white"
          style={{ letterSpacing: "-0.03em", textShadow: "0 1px 16px rgba(0,0,0,0.14)" }}
        >
          {yearData.year}–{(yearData.year + 1).toString().slice(-2)}
        </h1>
        <p className="text-[13px] text-white/60 mt-1">
          {yearData.semesters.length} semesters ·{" "}
          {yearData.semesters.reduce((acc, s) => acc + s.courses.length, 0)} courses total
        </p>
      </div>

      {/* Semester cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl"
      >
        {yearData.semesters.map((sem) => {
          const colors  = SEASON[sem.season] ?? SEASON.fall;
          const assigns = sem.courses.flatMap((c) => c.events.filter((e) => e.type === "assignment"));
          const done    = assigns.filter((e) => e.completed).length;
          const total   = assigns.length;
          const events  = sem.courses.flatMap((c) => c.events);

          return (
            <motion.div key={sem._id} variants={item}>
              <motion.div
                whileHover={{ y: -4, transition: { duration: 0.18 } }}
                whileTap={{ scale: 0.975 }}
                onClick={() => onSelectSemester(sem)}
                className="cursor-pointer"
              >
                <GlassCard className="p-6">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${colors.gradient} mb-4 shadow-sm`}
                  />

                  {/* Season badge */}
                  <span
                    className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md mb-2 ${colors.badge}`}
                    style={{ letterSpacing: "0.06em" }}
                  >
                    {sem.season}
                  </span>

                  <h2
                    className="text-[19px] font-semibold text-gray-900 leading-tight mb-1"
                    style={{ letterSpacing: "-0.022em" }}
                  >
                    {sem.name}
                  </h2>
                  <p className="text-[12px] text-gray-500 mb-5">
                    {sem.courses.length} courses · {events.length} events
                  </p>

                  {/* Progress */}
                  <ProgressBar value={done} max={total} showLabel />
                </GlassCard>
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
