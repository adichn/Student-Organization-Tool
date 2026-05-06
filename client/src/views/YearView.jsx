import { useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import ProgressBar from "../components/ProgressBar";
import DeleteModal from "../components/DeleteModal";

const SEASON = {
  spring: { gradient: "from-emerald-400 to-teal-500",  badge: "bg-emerald-50 text-emerald-700" },
  fall:   { gradient: "from-amber-400 to-orange-500",  badge: "bg-amber-50 text-amber-700" },
  summer: { gradient: "from-sky-400 to-blue-500",      badge: "bg-sky-50 text-sky-700" },
  winter: { gradient: "from-indigo-400 to-violet-500", badge: "bg-indigo-50 text-indigo-700" },
};

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.4, 0, 0.2, 1] } },
};

export default function YearView({ yearData, onSelectSemester }) {
  const [semesters, setSemesters] = useState(yearData.semesters);
  const [pending,   setPending]   = useState(null); // { semester }

  function openDelete(e, sem) {
    e.stopPropagation();
    setPending({ semester: sem });
  }

  function handleConfirm() {
    setSemesters((prev) => prev.filter((s) => s._id !== pending.semester._id));
    setPending(null);
  }

  const sem = pending?.semester;
  const deleteDescription = sem
    ? `This will permanently remove ${sem.courses.length} course${sem.courses.length !== 1 ? "s" : ""}, ` +
      `${sem.courses.reduce((n, c) => n + c.events.length, 0)} events, and all associated resources.`
    : undefined;

  return (
    <>
      <div>
        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold text-white/70 uppercase mb-1" style={{ letterSpacing: "0.06em" }}>
            Academic Year
          </p>
          <h1 className="text-[32px] font-semibold text-white" style={{ letterSpacing: "-0.03em", textShadow: "0 1px 16px rgba(0,0,0,0.14)" }}>
            {yearData.year}–{(yearData.year + 1).toString().slice(-2)}
          </h1>
          <p className="text-[13px] text-white/60 mt-1">
            {semesters.length} semester{semesters.length !== 1 ? "s" : ""} ·{" "}
            {semesters.reduce((acc, s) => acc + s.courses.length, 0)} courses total
          </p>
        </div>

        {/* Semester cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl"
        >
          {semesters.map((sem) => {
            const colors  = SEASON[sem.season] ?? SEASON.fall;
            const assigns = sem.courses.flatMap((c) => c.events.filter((e) => e.type === "assignment"));
            const done    = assigns.filter((e) => e.completed).length;
            const events  = sem.courses.flatMap((c) => c.events);

            return (
              <motion.div key={sem._id} variants={item} layout>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => onSelectSemester(sem)}
                  className="cursor-pointer group"
                >
                  <GlassCard className="p-6 relative">
                    {/* Delete button */}
                    <motion.button
                      onClick={(e) => openDelete(e, sem)}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center
                                 rounded-[7px] text-gray-400 hover:text-rose-500
                                 hover:bg-rose-50 transition-all duration-150 cursor-pointer
                                 opacity-0 group-hover:opacity-100"
                      aria-label={`Delete ${sem.name}`}
                    >
                      <TrashIcon />
                    </motion.button>

                    <div className={`w-10 h-10 rounded-[12px] bg-gradient-to-br ${colors.gradient} mb-4 shadow-sm`} />

                    <span
                      className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md mb-2 ${colors.badge}`}
                      style={{ letterSpacing: "0.06em" }}
                    >
                      {sem.season}
                    </span>

                    <h2 className="text-[19px] font-semibold text-gray-900 leading-tight mb-1" style={{ letterSpacing: "-0.022em" }}>
                      {sem.name}
                    </h2>
                    <p className="text-[12px] text-gray-500 mb-5">
                      {sem.courses.length} courses · {events.length} events
                    </p>

                    <ProgressBar value={done} max={assigns.length} showLabel />
                  </GlassCard>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <DeleteModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        entityType="Semester"
        entityName={sem?.name ?? ""}
        description={deleteDescription}
      />
    </>
  );
}
