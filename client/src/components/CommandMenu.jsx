import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useCreateAssignment } from "../hooks/useAssignments";

// ── Search index ──────────────────────────────────────────────────────────────

function buildIndex(yearData) {
  const courses   = [];
  const resources = [];
  if (!yearData) return { courses, resources };
  for (const semester of yearData.semesters) {
    for (const course of semester.courses) {
      courses.push({ course, semester });
      for (const resource of course.resources) {
        resources.push({ resource, course, semester });
      }
    }
  }
  return { courses, resources };
}

// ── Shared icon primitives ────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const RESOURCE_ICONS = {
  document: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  file: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" />
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  video: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  other: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ── Shared sub-components ─────────────────────────────────────────────────────

function InputRow({ children, onBack, borderBottom = true }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3.5 ${borderBottom ? "border-b border-black/[0.06]" : ""}`}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center justify-center w-6 h-6 rounded-[6px]
                     text-gray-500 hover:text-gray-800 hover:bg-black/[0.06]
                     transition-colors duration-100 cursor-pointer shrink-0"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
      )}
      {children}
    </div>
  );
}

// Shared Tailwind classes for every command item
const ITEM_CLS = `
  flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer select-none
  text-gray-800 transition-colors duration-75 outline-none
  aria-selected:bg-violet-50 aria-selected:text-violet-900
`.trim();

// ── Mode: Search ──────────────────────────────────────────────────────────────

function SearchView({ courses, resources, onSelectCourse, onSelectResource, onStartCreate }) {
  return (
    <Command>
      <InputRow>
        <SearchIcon />
        <CommandInput
          autoFocus
          placeholder="Jump to course, search resources, or create…"
          className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 outline-none"
          style={{ letterSpacing: "-0.011em" }}
        />
        <kbd className="shrink-0 text-[11px] text-gray-400 font-medium px-1.5 py-0.5 rounded-[5px] bg-gray-100 border border-gray-200/80 leading-none">
          ESC
        </kbd>
      </InputRow>

      <CommandList className="max-h-[400px] overflow-y-auto p-2 pb-2.5">
        <CommandEmpty className="py-10 text-center text-[13px] text-gray-400">
          No results found.
        </CommandEmpty>

        {/* ── Courses ── */}
        <CommandGroup heading="Courses">
          {courses.map(({ course, semester }) => (
            <CommandItem
              key={course._id}
              value={`${course.title} ${course.code} ${semester.name}`}
              onSelect={() => onSelectCourse({ course, semester })}
              className={ITEM_CLS}
            >
              <div className={`w-6 h-6 rounded-[7px] bg-gradient-to-br ${course.gradient} shrink-0 shadow-sm`} />
              <span className="flex-1 text-[13px] font-medium leading-none" style={{ letterSpacing: "-0.011em" }}>
                {course.title}
              </span>
              <span className="text-[11px] text-gray-400 shrink-0">{course.code}</span>
              <span className="text-[11px] text-gray-400 shrink-0 hidden sm:block">{semester.name}</span>
              <ArrowRightIcon />
            </CommandItem>
          ))}
        </CommandGroup>

        {/* ── Resources (AI context) ── */}
        {resources.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Resources & AI Context">
              {resources.map(({ resource, course, semester }) => (
                <CommandItem
                  key={resource._id}
                  value={`${resource.title} ${course.title} ${course.code} ${resource.type}`}
                  onSelect={() => onSelectResource({ course, semester })}
                  className={ITEM_CLS}
                >
                  <span className="text-gray-400 shrink-0">
                    {RESOURCE_ICONS[resource.type] ?? RESOURCE_ICONS.other}
                  </span>
                  <span className="flex-1 text-[13px] font-medium leading-none truncate" style={{ letterSpacing: "-0.011em" }}>
                    {resource.title}
                  </span>
                  <span className="text-[11px] text-gray-400 shrink-0 truncate max-w-[120px]">
                    {course.title}
                  </span>
                  <ArrowRightIcon />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ── Actions ── */}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="new assignment create add task todo"
            onSelect={onStartCreate}
            className={ITEM_CLS}
          >
            <span className="w-6 h-6 rounded-[7px] bg-gradient-to-br from-indigo-400 to-violet-500
                             flex items-center justify-center text-white shrink-0 shadow-sm">
              <PlusIcon />
            </span>
            <span className="flex-1 text-[13px] font-medium" style={{ letterSpacing: "-0.011em" }}>
              New assignment…
            </span>
            <span className="text-[11px] text-gray-400">pick a course →</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// ── Mode: Pick course ─────────────────────────────────────────────────────────

function PickCourseView({ courses, onPick, onBack }) {
  return (
    <Command>
      <InputRow onBack={onBack}>
        <CommandInput
          autoFocus
          placeholder="Which course is this assignment for?"
          className="flex-1 bg-transparent text-[15px] text-gray-900 placeholder:text-gray-400 outline-none"
          style={{ letterSpacing: "-0.011em" }}
        />
      </InputRow>

      <CommandList className="max-h-[320px] overflow-y-auto p-2 pb-2.5">
        <CommandEmpty className="py-10 text-center text-[13px] text-gray-400">
          No courses found.
        </CommandEmpty>
        {courses.map(({ course, semester }) => (
          <CommandItem
            key={course._id}
            value={`${course.title} ${course.code} ${semester.name}`}
            onSelect={() => onPick({ course, semester })}
            className={ITEM_CLS}
          >
            <div className={`w-6 h-6 rounded-[7px] bg-gradient-to-br ${course.gradient} shrink-0 shadow-sm`} />
            <span className="flex-1 text-[13px] font-medium" style={{ letterSpacing: "-0.011em" }}>
              {course.title}
            </span>
            <span className="text-[11px] text-gray-400">{course.code} · {semester.name}</span>
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  );
}

// ── Mode: Create form ─────────────────────────────────────────────────────────

function CreateFormView({ course, onBack, onSuccess }) {
  const [title,     setTitle]     = useState("");
  const [date,      setDate]      = useState("");
  const { mutate, isPending, error } = useCreateAssignment(course?._id ?? "");
  const titleRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    mutate(
      { title: title.trim(), date },
      { onSuccess }
    );
  }

  const INPUT_CLS = `
    w-full px-3.5 py-2.5 rounded-[10px] text-[14px] outline-none
    bg-white/70 border border-gray-200/80 text-gray-900
    placeholder:text-gray-300
    focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100
    transition-all duration-150
  `.trim();

  return (
    <div>
      {/* Header */}
      <InputRow onBack={onBack}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-5 h-5 rounded-[5px] bg-gradient-to-br ${course?.gradient} shrink-0`} />
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 leading-none mb-0.5">New assignment in</p>
            <p className="text-[13px] font-semibold text-gray-900 truncate leading-tight" style={{ letterSpacing: "-0.011em" }}>
              {course?.title}
            </p>
          </div>
        </div>
      </InputRow>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <input
          ref={titleRef}
          type="text"
          placeholder="Assignment title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={INPUT_CLS}
          style={{ letterSpacing: "-0.011em" }}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={INPUT_CLS}
        />

        {error && (
          <p className="text-[12px] text-rose-500">{error.message}</p>
        )}

        <motion.button
          type="submit"
          disabled={isPending || !title.trim() || !date}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-[10px] text-[14px] font-semibold text-white
                     bg-gradient-to-r from-indigo-500 to-violet-500
                     hover:from-indigo-600 hover:to-violet-600
                     shadow-sm shadow-indigo-300/40
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-150 cursor-pointer"
          style={{ letterSpacing: "-0.011em" }}
        >
          {isPending ? "Creating…" : "Create Assignment"}
        </motion.button>
      </form>
    </div>
  );
}

// ── Backdrop + modal shell ────────────────────────────────────────────────────

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.16 } },
};

const modalVariants = {
  hidden:  { opacity: 0, scale: 0.97, y: -14, filter: "blur(4px)" },
  visible: { opacity: 1, scale: 1,    y: 0,   filter: "blur(0px)", transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, scale: 0.97, y: -8,  filter: "blur(2px)", transition: { duration: 0.16, ease: [0.4, 0, 1, 1] } },
};

// ── Root component ────────────────────────────────────────────────────────────

export default function CommandMenu({ yearData, onNavigateToCourse, open, onOpenChange }) {
  const [mode,          setMode]          = useState("search");
  const [pickedCourse,  setPickedCourse]  = useState(null); // { course, semester }

  const { courses, resources } = useMemo(() => buildIndex(yearData), [yearData]);

  // Reset internal state after the exit animation finishes
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setMode("search");
        setPickedCourse(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape key handling per-mode
  useEffect(() => {
    if (!open) return;
    function onEsc(e) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (mode !== "search") setMode(mode === "create-form" ? "pick-course" : "search");
      else onOpenChange(false);
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, mode, onOpenChange]);

  function navigate(course, semester) {
    onNavigateToCourse(course, semester);
    onOpenChange(false);
  }

  function handleCreateSuccess() {
    if (pickedCourse) navigate(pickedCourse.course, pickedCourse.semester);
  }

  const content = (
    <AnimatePresence>
      {open && (
        <>
          {/* Dim + blur backdrop */}
          <motion.div
            key="cmd-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[98]"
            style={{
              background:            "rgba(30, 20, 60, 0.22)",
              backdropFilter:        "blur(6px) saturate(140%)",
              WebkitBackdropFilter:  "blur(6px) saturate(140%)",
            }}
            onClick={() => onOpenChange(false)}
          />

          {/* Floating glass panel */}
          <motion.div
            key="cmd-modal"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-[18%] left-1/2 -translate-x-1/2 z-[99] w-full max-w-[580px] px-4"
          >
            <div
              className="rounded-[22px] overflow-hidden"
              style={{
                background:           "rgba(255, 255, 255, 0.88)",
                backdropFilter:       "blur(44px) saturate(210%)",
                WebkitBackdropFilter: "blur(44px) saturate(210%)",
                border:               "1px solid rgba(255, 255, 255, 0.72)",
                boxShadow:
                  "0 2px 0 rgba(255,255,255,0.95) inset," +
                  "0 32px 80px rgba(20, 10, 60, 0.24)," +
                  "0 8px 24px rgba(0, 0, 0, 0.10)",
              }}
            >
              {/* Animated content swap */}
              <AnimatePresence mode="wait" initial={false}>
                {mode === "search" && (
                  <motion.div
                    key="view-search"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.18 } }}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
                  >
                    <SearchView
                      courses={courses}
                      resources={resources}
                      onSelectCourse={({ course, semester }) => navigate(course, semester)}
                      onSelectResource={({ course, semester }) => navigate(course, semester)}
                      onStartCreate={() => setMode("pick-course")}
                    />
                  </motion.div>
                )}

                {mode === "pick-course" && (
                  <motion.div
                    key="view-pick"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.18 } }}
                    exit={{ opacity: 0, x: 12, transition: { duration: 0.12 } }}
                  >
                    <PickCourseView
                      courses={courses}
                      onPick={(entry) => { setPickedCourse(entry); setMode("create-form"); }}
                      onBack={() => setMode("search")}
                    />
                  </motion.div>
                )}

                {mode === "create-form" && (
                  <motion.div
                    key="view-form"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.18 } }}
                    exit={{ opacity: 0, x: 12, transition: { duration: 0.12 } }}
                  >
                    <CreateFormView
                      course={pickedCourse?.course}
                      onBack={() => setMode("pick-course")}
                      onSuccess={handleCreateSuccess}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-center gap-4 mt-2.5 pb-1 pointer-events-none">
              {[
                ["↑↓", "navigate"],
                ["↵",  "select"],
                ["ESC", mode !== "search" ? "back" : "close"],
              ].map(([key, label]) => (
                <span key={key} className="flex items-center gap-1 text-[11px] text-white/60">
                  <kbd className="font-medium text-white/80 bg-white/[0.14] px-1.5 py-0.5 rounded-[4px] border border-white/20 text-[10px] leading-none">
                    {key}
                  </kbd>
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
