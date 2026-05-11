import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard   from "../components/GlassCard";
import GlassButton from "../components/ui/GlassButton";
import CourseCard  from "../components/CourseCard";
import CalendarView from "../components/CalendarView";
import DeleteModal  from "../components/DeleteModal";
import FormModal, { Field, ColorPicker } from "../components/ui/FormModal";
import { useCreateCourse, useDeleteCourse, useDeleteSemester } from "../hooks/useAcademic";

// ── Animation presets ──────────────────────────────────────────────────────────
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardItem = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};
const tabFade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0,       transition: { duration: 0.12 } },
};

const TABS = ["grid", "calendar"];

// ── Icons ──────────────────────────────────────────────────────────────────────
function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────
/**
 * Props
 * ─────
 *   semester       Semester subdocument (normalised — includes gradient on courses)
 *   yearId         String — parent Year _id, needed for mutations
 *   onSelectCourse (course) => void
 *   onBack         () => void
 */
export default function SemesterView({ semester, yearId, onSelectCourse, onBack }) {
  const [tab,          setTab]          = useState("grid");
  const [deletePending, setDeletePending] = useState(null); // { type, target }
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [formError,     setFormError]     = useState("");

  // ── Course form state ──────────────────────────────────────────────────────
  const [courseTitle, setCourseTitle] = useState("");
  const [courseCode,  setCourseCode]  = useState("");
  const [courseDesc,  setCourseDesc]  = useState("");
  const [courseColor, setCourseColor] = useState("#6366f1");

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createCourse  = useCreateCourse();
  const deleteCourse  = useDeleteCourse();
  const deleteSemester = useDeleteSemester();

  const courses = semester.courses ?? [];

  // ── Stats ──────────────────────────────────────────────────────────────────
  const now      = new Date();
  const allAssigns = courses.flatMap((c) =>
    (c.events ?? []).filter((e) => e.type === "assignment")
  );
  const doneAssigns = allAssigns.filter((e) => e.completed || e.status === "completed");
  const allEvents   = courses.flatMap((c) => c.events ?? []);
  const upcoming    = allEvents.filter((e) => !e.completed && new Date(e.date) > now);

  // ── Delete helpers ─────────────────────────────────────────────────────────
  function openDeleteSemester(e) {
    e.stopPropagation();
    setDeletePending({ type: "semester", target: semester });
  }
  function openDeleteCourse(course) {
    setDeletePending({ type: "course", target: course });
  }

  async function handleDeleteConfirm() {
    if (!deletePending) return;
    if (deletePending.type === "semester") {
      await deleteSemester.mutateAsync({ yearId, semId: String(semester._id) });
      onBack(); // App.jsx will also auto-pop, but call immediately for speed
    } else {
      await deleteCourse.mutateAsync({
        yearId,
        semId:    String(semester._id),
        courseId: String(deletePending.target._id),
      });
    }
    setDeletePending(null);
  }

  // ── Create course ──────────────────────────────────────────────────────────
  async function handleCreateCourse(e) {
    e.preventDefault();
    setFormError("");
    if (!courseTitle.trim()) { setFormError("Course title is required."); return; }
    try {
      await createCourse.mutateAsync({
        yearId,
        semId:       String(semester._id),
        title:       courseTitle.trim(),
        code:        courseCode.trim(),
        description: courseDesc.trim(),
        colorHex:    courseColor,
      });
      setCourseTitle(""); setCourseCode(""); setCourseDesc(""); setCourseColor("#6366f1");
      setShowAddCourse(false);
    } catch (err) {
      setFormError(err.message);
    }
  }

  // ── Delete modal props ─────────────────────────────────────────────────────
  const delTarget = deletePending?.target;
  const deleteEntityName =
    deletePending?.type === "semester" ? semester.name :
    delTarget?.title ?? "";

  const deleteDescription = (() => {
    if (!deletePending) return undefined;
    if (deletePending.type === "semester") {
      const totalEvents = courses.reduce((n, c) => n + (c.events?.length ?? 0), 0);
      const totalRes    = courses.reduce((n, c) => n + (c.resources?.length ?? 0), 0);
      return `This will permanently remove ${courses.length} course${courses.length !== 1 ? "s" : ""}, ${totalEvents} events, and ${totalRes} resources.`;
    }
    const c = delTarget;
    const evts = c?.events?.length ?? 0;
    const res  = c?.resources?.length ?? 0;
    return `This will permanently remove ${evts} event${evts !== 1 ? "s" : ""} and ${res} resource${res !== 1 ? "s" : ""}.`;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.93 }}
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Academic Year
        </motion.button>
        <span className="text-gray-400 text-[13px]">/</span>
        <span className="text-[13px] text-gray-900 font-medium">{semester.name}</span>
      </div>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-[30px] font-semibold text-gray-900"
              style={{ letterSpacing: "-0.03em" }}>
            {semester.name}
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {courses.length} courses · {allEvents.length} total events
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-1">
          <GlassButton
            variant="secondary"
            size="sm"
            icon={<PlusIcon />}
            onClick={() => { setFormError(""); setShowAddCourse(true); }}
          >
            Add course
          </GlassButton>
          <GlassButton
            variant="danger"
            size="sm"
            icon={<TrashIcon />}
            onClick={openDeleteSemester}
          >
            Delete semester
          </GlassButton>
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Assignments done",  value: `${doneAssigns.length} / ${allAssigns.length}` },
          { label: "Upcoming events",   value: String(upcoming.length) },
          { label: "Courses enrolled",  value: String(courses.length) },
        ].map((s) => (
          <GlassCard key={s.label} variant="subtle" className="px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1"
               style={{ letterSpacing: "0.06em" }}>
              {s.label}
            </p>
            <p className="text-[22px] font-semibold text-gray-900 leading-none"
               style={{ letterSpacing: "-0.03em" }}>
              {s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* ── Tab control ────────────────────────────────────────────────── */}
      <div className="flex items-center mb-5 p-1 rounded-[11px] bg-black/[0.05]
                      w-fit">
        {TABS.map((t) => (
          <motion.button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "relative px-4 py-1.5 text-[13px] font-medium rounded-[8px]",
              "cursor-pointer transition-colors duration-100 capitalize min-w-[80px] text-center",
              tab === t ? "text-gray-900" : "text-gray-500 hover:text-gray-900",
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

      {/* ── Tab content ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {tab === "grid" ? (
          <motion.div key="grid" {...tabFade}>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
            >
              <AnimatePresence>
                {courses.map((course) => (
                  <motion.div
                    key={course._id}
                    variants={cardItem}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="h-full"
                    layout
                  >
                    <CourseCard
                      course={course}
                      onClick={onSelectCourse}
                      onDelete={openDeleteCourse}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* ── Add course card ───────────────────────────────── */}
              <motion.div variants={cardItem}>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setFormError(""); setShowAddCourse(true); }}
                  className="w-full h-full cursor-pointer min-h-[200px]"
                >
                  <div className="glass-card-subtle p-5 flex flex-col items-center
                                  justify-center h-full min-h-[200px]
                                  border-2 border-dashed border-white/40
                                  hover:border-white/70 transition-all duration-200
                                  rounded-[16px]">
                    <div className="w-9 h-9 rounded-full bg-white/50 flex items-center
                                    justify-center mb-2.5 shadow-sm">
                      <PlusIcon />
                    </div>
                    <p className="text-[13px] font-medium text-gray-600">Add course</p>
                  </div>
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div key="calendar" {...tabFade}>
            <CalendarView courses={courses} semester={semester} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Create course modal ─────────────────────────────────────────── */}
      <FormModal
        isOpen={showAddCourse}
        onClose={() => setShowAddCourse(false)}
        onSubmit={handleCreateCourse}
        title={`Add course to ${semester.name}`}
        submitLabel="Add course"
        loading={createCourse.isPending}
        error={formError}
      >
        <Field
          label="Course title" id="c-title" required
          placeholder="e.g. Advanced Algorithms"
          value={courseTitle}
          onChange={(e) => setCourseTitle(e.target.value)}
        />
        <Field
          label="Course code" id="c-code"
          placeholder="e.g. CS 401"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
          hint="Optional — appears as a small label on the card."
        />
        <Field
          label="Description" id="c-desc"
          placeholder="Short description…"
          value={courseDesc}
          onChange={(e) => setCourseDesc(e.target.value)}
        />
        <ColorPicker value={courseColor} onChange={setCourseColor} />
      </FormModal>

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      <DeleteModal
        isOpen={!!deletePending}
        onClose={() => setDeletePending(null)}
        onConfirm={handleDeleteConfirm}
        entityType={deletePending?.type === "semester" ? "Semester" : "Course"}
        entityName={deleteEntityName}
        description={deleteDescription}
      />
    </div>
  );
}
