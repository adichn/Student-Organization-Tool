import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import CourseCard from "../components/CourseCard";
import CalendarView from "../components/CalendarView";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] } },
};

const tabFade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const TABS = ["grid", "calendar"];

export default function SemesterView({ semester, onSelectCourse, onBack }) {
  const [tab, setTab] = useState("grid");

  const now         = new Date();
  const allAssigns  = semester.courses.flatMap((c) => c.events.filter((e) => e.type === "assignment"));
  const doneAssigns = allAssigns.filter((e) => e.completed);
  const allEvents   = semester.courses.flatMap((c) => c.events);
  const upcoming    = allEvents.filter((e) => !e.completed && new Date(e.date) > now);

  return (
    <div>
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.93 }}
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-white/75 hover:text-white transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Academic Year
        </motion.button>
        <span className="text-white/35 text-[13px]">/</span>
        <span className="text-[13px] text-white/90 font-medium">{semester.name}</span>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-[30px] font-semibold text-white"
          style={{ letterSpacing: "-0.03em", textShadow: "0 1px 16px rgba(0,0,0,0.14)" }}
        >
          {semester.name}
        </h1>
        <p className="text-[13px] text-white/60 mt-1">
          {semester.courses.length} courses · {allEvents.length} total events
        </p>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Assignments done",   value: `${doneAssigns.length} / ${allAssigns.length}` },
          { label: "Upcoming events",    value: String(upcoming.length) },
          { label: "Courses enrolled",   value: String(semester.courses.length) },
        ].map((s) => (
          <GlassCard key={s.label} variant="subtle" className="px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1" style={{ letterSpacing: "0.06em" }}>
              {s.label}
            </p>
            <p className="text-[22px] font-semibold text-gray-900 leading-none" style={{ letterSpacing: "-0.03em" }}>
              {s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* ── Segmented tab control ─────────────────────────────────────────── */}
      <div className="flex items-center mb-5 p-1 rounded-[11px] bg-white/[0.18] backdrop-blur-sm w-fit">
        {TABS.map((t) => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "relative px-4 py-1.5 text-[13px] font-medium rounded-[8px] cursor-pointer",
              "transition-colors duration-100 capitalize min-w-[80px] text-center",
              tab === t ? "text-gray-900" : "text-white/80 hover:text-white",
            ].join(" ")}
          >
            {tab === t && (
              <motion.span
                layoutId="sem-tab-pill"
                className="absolute inset-0 rounded-[8px] bg-white/85 shadow-sm"
                style={{ zIndex: 0 }}
                transition={{ type: "spring", stiffness: 440, damping: 36 }}
              />
            )}
            <span className="relative z-10">{t}</span>
          </motion.button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === "grid" ? (
          <motion.div key="grid" {...tabFade}>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 xl:grid-cols-3 gap-4 items-start"
            >
              {semester.courses.map((course) => (
                <motion.div key={course._id} variants={cardItem} className="h-full">
                  <CourseCard course={course} onClick={onSelectCourse} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="calendar" {...tabFade}>
            <CalendarView courses={semester.courses} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
