import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import ProgressBar from "../components/ProgressBar";
import DeleteModal from "../components/DeleteModal";

const EVENT_STYLE = {
  assignment: { pill: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  exam:       { pill: "bg-rose-100   text-rose-700",   dot: "bg-rose-500" },
  lecture:    { pill: "bg-sky-100    text-sky-700",     dot: "bg-sky-500" },
  reminder:   { pill: "bg-amber-100  text-amber-700",  dot: "bg-amber-500" },
  other:      { pill: "bg-gray-100   text-gray-600",   dot: "bg-gray-400" },
};

const RESOURCE_TYPE_ICON = {
  document: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  file: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
    </svg>
  ),
  link: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
};

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeDate(date) {
  const d    = new Date(date);
  const days = Math.round((d - new Date()) / 86_400_000);
  if (days === 0)  return "Today";
  if (days === 1)  return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 8) return `In ${days} days`;
  if (days < -1)  return `${Math.abs(days)}d ago`;
  return formatDate(date);
}

const tabFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0,       transition: { duration: 0.12 } },
};

const listStagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.055 } },
};

const listItem = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
};

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function CourseView({ course, semester, onBack }) {
  const [tab,        setTab]        = useState("events");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const now = new Date();

  const assignments = course.events.filter((e) => e.type === "assignment");
  const done        = assignments.filter((e) => e.completed).length;

  const upcoming    = course.events
    .filter((e) => !e.completed && new Date(e.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const past        = course.events
    .filter((e) => e.completed || new Date(e.date) <= now)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const style = (type) => EVENT_STYLE[type] ?? EVENT_STYLE.other;

  const deleteDescription =
    `This will permanently remove ${course.events.length} event${course.events.length !== 1 ? "s" : ""} ` +
    `and ${course.resources.length} resource${course.resources.length !== 1 ? "s" : ""}.`;

  return (
    <>
    <div>
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.93 }}
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-white/75 hover:text-white transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          {semester?.name}
        </motion.button>
        <span className="text-white/35 text-[13px]">/</span>
        <span className="text-[13px] text-white/90 font-medium">{course.title}</span>
      </div>

      {/* ── Course header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-[14px] bg-gradient-to-br ${course.gradient} shadow-md shrink-0 mt-0.5`}
          />
          <div>
            <p className="text-[11px] font-semibold text-white/60 uppercase mb-0.5" style={{ letterSpacing: "0.06em" }}>
              {course.code}
            </p>
            <h1
              className="text-[26px] font-semibold text-white leading-tight"
              style={{ letterSpacing: "-0.03em", textShadow: "0 1px 12px rgba(0,0,0,0.14)" }}
            >
              {course.title}
            </h1>
            {course.description && (
              <p className="text-[13px] text-white/65 mt-1">{course.description}</p>
            )}
          </div>
        </div>

        {/* Delete course button */}
        <motion.button
          onClick={() => setDeleteOpen(true)}
          whileHover={{ scale: 1.06, backgroundColor: "rgba(255,255,255,0.22)" }}
          whileTap={{ scale: 0.94 }}
          className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px]
                     font-medium text-white/70 hover:text-rose-300
                     bg-white/[0.12] backdrop-blur-sm transition-colors duration-150
                     border border-white/20 cursor-pointer shrink-0 mt-1"
        >
          <TrashIcon />
          Delete Course
        </motion.button>
      </div>

      {/* ── Stats + progress ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Assignments",   value: `${done} / ${assignments.length}` },
          { label: "Upcoming",      value: String(upcoming.length) },
          { label: "Resources",     value: String(course.resources.length) },
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

      <GlassCard variant="subtle" className="px-4 py-3 mb-6">
        <ProgressBar value={done} max={assignments.length} showLabel />
      </GlassCard>

      {/* ── Tab control ───────────────────────────────────────────────────── */}
      <div className="flex items-center mb-5 p-1 rounded-[11px] bg-white/[0.18] backdrop-blur-sm w-fit">
        {["events", "resources"].map((t) => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "relative px-4 py-1.5 text-[13px] font-medium rounded-[8px] cursor-pointer",
              "transition-colors duration-100 capitalize min-w-[88px] text-center",
              tab === t ? "text-gray-900" : "text-white/80 hover:text-white",
            ].join(" ")}
          >
            {tab === t && (
              <motion.span
                layoutId="course-tab-pill"
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
        {tab === "events" ? (
          <motion.div key="events" {...tabFade} className="space-y-6">
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-white/70 uppercase mb-3" style={{ letterSpacing: "0.06em" }}>
                  Upcoming · {upcoming.length}
                </p>
                <GlassCard variant="elevated" className="divide-y divide-gray-100/70">
                  <motion.ul variants={listStagger} initial="hidden" animate="show">
                    {upcoming.map((ev) => (
                      <motion.li
                        key={ev._id}
                        variants={listItem}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${style(ev.type).dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 leading-tight" style={{ letterSpacing: "-0.011em" }}>
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(ev.date)}</p>
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${style(ev.type).pill}`}>
                          {relativeDate(ev.date)}
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </GlassCard>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-white/50 uppercase mb-3" style={{ letterSpacing: "0.06em" }}>
                  Past · {past.length}
                </p>
                <GlassCard className="divide-y divide-gray-100/50">
                  <motion.ul variants={listStagger} initial="hidden" animate="show">
                    {past.map((ev) => (
                      <motion.li
                        key={ev._id}
                        variants={listItem}
                        className="flex items-center gap-3 px-4 py-3 opacity-60"
                      >
                        {/* Checkmark for completed assignments */}
                        {ev.completed ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${style(ev.type).dot}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-medium text-gray-700 leading-tight ${ev.completed ? "line-through" : ""}`} style={{ letterSpacing: "-0.011em" }}>
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(ev.date)}</p>
                        </div>
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${style(ev.type).pill} opacity-70`}>
                          {ev.type}
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </GlassCard>
              </section>
            )}
          </motion.div>
        ) : (
          <motion.div key="resources" {...tabFade}>
            <div className="grid grid-cols-2 gap-3">
              {course.resources.map((res, i) => (
                <motion.div
                  key={res._id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }}
                >
                  <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="cursor-pointer">
                    <GlassCard variant="subtle" className="p-4 flex items-start gap-3">
                      <span className="text-gray-500 mt-0.5 shrink-0">
                        {RESOURCE_TYPE_ICON[res.type] ?? RESOURCE_TYPE_ICON.file}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 leading-snug truncate" style={{ letterSpacing: "-0.011em" }}>
                          {res.title}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{res.type}</p>
                      </div>
                    </GlassCard>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    <DeleteModal
      isOpen={deleteOpen}
      onClose={() => setDeleteOpen(false)}
      onConfirm={onBack}
      entityType="Course"
      entityName={course.title}
      description={deleteDescription}
    />
    </>
  );
}
