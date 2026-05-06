import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard from "../components/GlassCard";
import ProgressBar from "../components/ProgressBar";
import ProgressRing from "../components/ProgressRing";
import DeleteModal from "../components/DeleteModal";
import {
  useAssignments,
  useUpdateAssignment,
  useCreateAssignment,
} from "../hooks/useAssignments";

// ── Static config ─────────────────────────────────────────────────────────────

const EVENT_STYLE = {
  assignment: { pill: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  exam:       { pill: "bg-rose-100   text-rose-700",   dot: "bg-rose-500" },
  lecture:    { pill: "bg-sky-100    text-sky-700",     dot: "bg-sky-500" },
  reminder:   { pill: "bg-amber-100  text-amber-700",  dot: "bg-amber-500" },
  other:      { pill: "bg-gray-100   text-gray-600",   dot: "bg-gray-400" },
};

const STATUS_CONFIG = {
  "todo":        { label: "To-Do",       ring: "bg-gray-100   text-gray-600",   dot: "bg-gray-400",    next: "in-progress" },
  "in-progress": { label: "In Progress", ring: "bg-amber-50   text-amber-700",  dot: "bg-amber-400",   next: "completed"   },
  "completed":   { label: "Completed",   ring: "bg-emerald-50 text-emerald-700",dot: "bg-emerald-500", next: "todo"        },
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

// ── Animation variants ────────────────────────────────────────────────────────

const tabFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0,       transition: { duration: 0.12 } },
};

const listStagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.045 } },
};

const listItem = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] } },
};

// ── Small helpers ─────────────────────────────────────────────────────────────

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

// ── StatusBadge — click to cycle through statuses ────────────────────────────

function StatusBadge({ status, onClick, isPending }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["todo"];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={isPending}
      className={[
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "text-[11px] font-semibold transition-opacity duration-100",
        "cursor-pointer hover:opacity-75 active:scale-95 disabled:cursor-wait",
        cfg.ring,
      ].join(" ")}
      title="Click to change status"
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </button>
  );
}

// ── Add-assignment inline form ────────────────────────────────────────────────

function AddAssignmentForm({ courseId, onClose }) {
  const [title, setTitle]   = useState("");
  const [date,  setDate]    = useState("");
  const { mutate, isPending, error } = useCreateAssignment(courseId);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    mutate(
      { title: title.trim(), date },
      { onSuccess: onClose }
    );
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <GlassCard variant="subtle" className="p-4 mb-3">
        <p className="text-[12px] font-semibold text-gray-700 mb-3" style={{ letterSpacing: "-0.011em" }}>
          New Assignment
        </p>
        <div className="space-y-2.5">
          <input
            type="text"
            placeholder="Assignment title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none
                       bg-white/70 border border-gray-200/80 text-gray-900
                       placeholder:text-gray-300
                       focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100
                       transition-all duration-150"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none
                       bg-white/70 border border-gray-200/80 text-gray-700
                       focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100
                       transition-all duration-150"
          />
        </div>

        {error && (
          <p className="text-[11px] text-rose-500 mt-2">{error.message}</p>
        )}

        <div className="flex gap-2 mt-3">
          <motion.button
            type="submit"
            disabled={isPending || !title.trim() || !date}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-2 rounded-[8px] text-[13px] font-semibold text-white
                       bg-gradient-to-r from-indigo-500 to-violet-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-opacity duration-150 cursor-pointer"
          >
            {isPending ? "Adding…" : "Add Assignment"}
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-gray-500
                       bg-gray-100/70 hover:bg-gray-200/70 transition-colors duration-100 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </GlassCard>
    </motion.form>
  );
}

// ── Assignment row ────────────────────────────────────────────────────────────

function AssignmentRow({ assignment, courseId }) {
  const { mutate, isPending } = useUpdateAssignment(courseId);
  const cfg = STATUS_CONFIG[assignment.status] ?? STATUS_CONFIG["todo"];

  function cycleStatus() {
    mutate({ assignmentId: assignment._id, status: cfg.next });
  }

  return (
    <motion.li
      variants={listItem}
      layout
      className={[
        "flex items-center gap-3 px-4 py-3.5",
        assignment.status === "completed" ? "opacity-55" : "",
      ].join(" ")}
    >
      {/* Status badge — click to advance */}
      <StatusBadge
        status={assignment.status}
        onClick={cycleStatus}
        isPending={isPending}
      />

      {/* Title + date */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            "text-[13px] font-medium text-gray-900 leading-tight truncate",
            assignment.status === "completed" ? "line-through text-gray-500" : "",
          ].join(" ")}
          style={{ letterSpacing: "-0.011em" }}
        >
          {assignment.title}
        </p>
        {assignment.description && (
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {assignment.description}
          </p>
        )}
      </div>

      {/* Due date */}
      <span className="text-[11px] text-gray-400 shrink-0 tabular-nums">
        {relativeDate(assignment.date)}
      </span>
    </motion.li>
  );
}

// ── Assignments tab ───────────────────────────────────────────────────────────

const STATUS_ORDER = ["in-progress", "todo", "completed"];
const STATUS_SECTION_LABEL = {
  "in-progress": "In Progress",
  "todo":        "To-Do",
  "completed":   "Completed",
};

function AssignmentsTab({ course }) {
  const seedData = course.events.filter((e) => e.type === "assignment");
  const { data: assignments = [], isError } = useAssignments(course._id, seedData);
  const [showForm, setShowForm] = useState(false);

  const done  = assignments.filter((a) => a.status === "completed").length;
  const total = assignments.length;

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    acc[status] = assignments.filter((a) => a.status === status);
    return acc;
  }, {});

  return (
    <div>
      {/* Summary ring + add button */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <ProgressRing value={done} max={total} size={64} strokeWidth={5.5} />
          <div>
            <p className="text-[13px] font-medium text-white/90" style={{ letterSpacing: "-0.011em" }}>
              {done} of {total} complete
            </p>
            <p className="text-[11px] text-white/55 mt-0.5">
              {grouped["in-progress"].length > 0
                ? `${grouped["in-progress"].length} in progress`
                : grouped["todo"].length > 0
                ? `${grouped["todo"].length} remaining`
                : "All done!"}
            </p>
          </div>
        </div>

        <motion.button
          onClick={() => setShowForm((v) => !v)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px]
                     font-medium text-white/85 bg-white/[0.15] backdrop-blur-sm
                     border border-white/20 hover:bg-white/[0.22] transition-colors
                     duration-150 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add
        </motion.button>
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showForm && (
          <AddAssignmentForm
            courseId={course._id}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {isError && (
        <p className="text-[12px] text-amber-200/80 mb-4">
          Showing cached data — couldn't reach the server.
        </p>
      )}

      {/* Status sections */}
      {total === 0 && !showForm ? (
        <GlassCard variant="subtle" className="flex flex-col items-center py-10 text-center">
          <span className="text-2xl mb-2">✓</span>
          <p className="text-[14px] font-medium text-gray-700">No assignments yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Click "Add" to create your first one.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {STATUS_ORDER.map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            return (
              <section key={status}>
                <p
                  className="text-[10px] font-semibold text-white/60 uppercase mb-2"
                  style={{ letterSpacing: "0.07em" }}
                >
                  {STATUS_SECTION_LABEL[status]} · {items.length}
                </p>
                <GlassCard
                  variant={status === "in-progress" ? "elevated" : "default"}
                  className="divide-y divide-gray-100/60"
                >
                  <motion.ul variants={listStagger} initial="hidden" animate="show">
                    {items.map((a) => (
                      <AssignmentRow key={a._id} assignment={a} courseId={course._id} />
                    ))}
                  </motion.ul>
                </GlassCard>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ["assignments", "events", "resources"];

export default function CourseView({ course, semester, onBack }) {
  const [tab,        setTab]        = useState("assignments");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const now = new Date();

  const assignments = course.events.filter((e) => e.type === "assignment");
  const done        = assignments.filter((e) => e.completed || e.status === "completed").length;

  const upcoming = course.events
    .filter((e) => !e.completed && new Date(e.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const past = course.events
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

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
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
        {TABS.map((t) => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "relative px-4 py-1.5 text-[13px] font-medium rounded-[8px] cursor-pointer",
              "transition-colors duration-100 capitalize min-w-[96px] text-center",
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
        {tab === "assignments" && (
          <motion.div key="assignments" {...tabFade}>
            <AssignmentsTab course={course} />
          </motion.div>
        )}

        {tab === "events" && (
          <motion.div key="events" {...tabFade} className="space-y-6">
            {upcoming.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-white/70 uppercase mb-3" style={{ letterSpacing: "0.06em" }}>
                  Upcoming · {upcoming.length}
                </p>
                <GlassCard variant="elevated" className="divide-y divide-gray-100/70">
                  <motion.ul variants={listStagger} initial="hidden" animate="show">
                    {upcoming.map((ev) => (
                      <motion.li key={ev._id} variants={listItem} className="flex items-center gap-3 px-4 py-3">
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

            {past.length > 0 && (
              <section>
                <p className="text-[11px] font-semibold text-white/50 uppercase mb-3" style={{ letterSpacing: "0.06em" }}>
                  Past · {past.length}
                </p>
                <GlassCard className="divide-y divide-gray-100/50">
                  <motion.ul variants={listStagger} initial="hidden" animate="show">
                    {past.map((ev) => (
                      <motion.li key={ev._id} variants={listItem} className="flex items-center gap-3 px-4 py-3 opacity-60">
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
        )}

        {tab === "resources" && (
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
