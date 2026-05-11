import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard   from "../components/GlassCard";
import GlassButton from "../components/ui/GlassButton";
import ProgressBar from "../components/ProgressBar";
import DeleteModal from "../components/DeleteModal";
import FormModal, { Field } from "../components/ui/FormModal";
import {
  useCreateYear,
  useDeleteYear,
  useCreateSemester,
  useDeleteSemester,
} from "../hooks/useAcademic";

// ── Static config ──────────────────────────────────────────────────────────────
const SEASON = {
  spring: { gradient: "from-emerald-400 to-teal-500",  badge: "bg-emerald-50 text-emerald-700" },
  fall:   { gradient: "from-amber-400  to-orange-500", badge: "bg-amber-50  text-amber-700" },
  summer: { gradient: "from-sky-400    to-blue-500",   badge: "bg-sky-50    text-sky-700" },
  winter: { gradient: "from-indigo-400 to-violet-500", badge: "bg-indigo-50 text-indigo-700" },
};

const SEASONS = ["spring", "summer", "fall", "winter"];

const container = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.34, ease: [0.4, 0, 0.2, 1] } },
};

// ── Icon helpers ───────────────────────────────────────────────────────────────
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mt-8">
      {[0, 1].map((i) => (
        <div key={i} className="glass-card p-6 animate-pulse">
          <div className="w-10 h-10 rounded-[12px] bg-gray-200 mb-4" />
          <div className="h-2.5 w-16 bg-gray-200 rounded mb-3" />
          <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-2 w-24 bg-gray-200 rounded mb-5" />
          <div className="h-1.5 w-full bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ onAddYear }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-[20px] bg-gray-200 flex items-center justify-center mb-5 shadow-sm">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b7280"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      </div>
      <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white mb-2" style={{ letterSpacing: "-0.03em" }}>
        No academic years yet
      </h2>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">
        Add your first year to start organising your studies.
      </p>
      <GlassButton variant="secondary" size="md" icon={<PlusIcon />} onClick={onAddYear}>
        Add academic year
      </GlassButton>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function YearView({
  years,
  isLoading,
  isError,
  activeYearId,
  onYearChange,
  onSelectSemester,
}) {
  // ── Delete state ──────────────────────────────────────────────────────────
  const [deletePending, setDeletePending] = useState(null); // { type:"year"|"semester", yearId, semId?, target }

  // ── Create modals ─────────────────────────────────────────────────────────
  const [showAddYear, setShowAddYear]   = useState(false);
  const [showAddSem,  setShowAddSem]    = useState(false);

  // ── Form fields ───────────────────────────────────────────────────────────
  const [newYearNum, setNewYearNum] = useState(new Date().getFullYear());
  const [semName,    setSemName]    = useState("");
  const [semSeason,  setSemSeason]  = useState("fall");
  const [formError,  setFormError]  = useState("");

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createYear     = useCreateYear();
  const deleteYear     = useDeleteYear();
  const createSemester = useCreateSemester();
  const deleteSemester = useDeleteSemester();

  const activeYear = years.find((y) => String(y._id) === activeYearId) ?? years[0] ?? null;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function openDeleteSemester(e, sem) {
    e.stopPropagation();
    setDeletePending({
      type: "semester",
      yearId: String(activeYear._id),
      semId:  String(sem._id),
      target: sem,
    });
  }
  function openDeleteYear(e) {
    e.stopPropagation();
    setDeletePending({ type: "year", yearId: String(activeYear._id), target: activeYear });
  }

  async function handleDeleteConfirm() {
    if (!deletePending) return;
    if (deletePending.type === "year") {
      await deleteYear.mutateAsync({ yearId: deletePending.yearId });
      // If we deleted the active year, parent will auto-select next via useEffect
    } else {
      await deleteSemester.mutateAsync({
        yearId: deletePending.yearId,
        semId:  deletePending.semId,
      });
    }
    setDeletePending(null);
  }

  async function handleCreateYear(e) {
    e.preventDefault();
    setFormError("");
    try {
      const doc = await createYear.mutateAsync(Number(newYearNum));
      onYearChange(String(doc._id));
      setShowAddYear(false);
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function handleCreateSemester(e) {
    e.preventDefault();
    setFormError("");
    if (!semName.trim()) { setFormError("Please enter a semester name."); return; }
    try {
      await createSemester.mutateAsync({
        yearId: String(activeYear._id),
        name:   semName.trim(),
        season: semSeason,
      });
      setSemName("");
      setSemSeason("fall");
      setShowAddSem(false);
    } catch (err) {
      setFormError(err.message);
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const semesters = activeYear?.semesters ?? [];
  const del = deletePending?.target;

  const deleteDescription = (() => {
    if (!del) return undefined;
    if (deletePending.type === "year") {
      const totalCourses = activeYear.semesters.reduce((n, s) => n + s.courses.length, 0);
      return `This will permanently remove all ${activeYear.semesters.length} semester${activeYear.semesters.length !== 1 ? "s" : ""} and ${totalCourses} course${totalCourses !== 1 ? "s" : ""}.`;
    }
    const c = del.courses?.length ?? 0;
    return `This will permanently remove ${c} course${c !== 1 ? "s" : ""} and all associated resources.`;
  })();

  // ── Render: loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        <div className="mb-8">
          <div className="h-9 w-32 bg-white/30 rounded-xl animate-pulse mb-2" />
          <div className="h-3 w-24 bg-white/20 rounded animate-pulse" />
        </div>
        <Skeleton />
      </div>
    );
  }

  // ── Render: error ─────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-700 text-[15px]">Failed to load your data.</p>
        <p className="text-gray-400 text-[13px] mt-1">Check your connection and refresh.</p>
      </div>
    );
  }

  // ── Render: no years ──────────────────────────────────────────────────────
  if (years.length === 0) {
    return (
      <>
        <EmptyState onAddYear={() => { setFormError(""); setShowAddYear(true); }} />
        <FormModal
          isOpen={showAddYear}
          onClose={() => setShowAddYear(false)}
          onSubmit={handleCreateYear}
          title="New academic year"
          submitLabel="Create year"
          loading={createYear.isPending}
          error={formError}
        >
          <Field
            label="Year (starting)" id="year-num" type="number" required
            placeholder="e.g. 2026"
            value={newYearNum}
            onChange={(e) => setNewYearNum(e.target.value)}
            hint="e.g. 2026 creates the 2026–27 academic year."
          />
        </FormModal>
      </>
    );
  }

  // ── Render: main ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        {/* Year selector (shown when multiple years exist) */}
        {years.length > 1 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {years.map((y) => (
              <button
                key={y._id}
                onClick={() => onYearChange(String(y._id))}
                className={[
                  "px-3 py-1 rounded-[8px] text-[13px] font-medium cursor-pointer",
                  "transition-all duration-150",
                  String(y._id) === String(activeYear?._id)
                    ? "bg-white/80 text-gray-900 shadow-sm"
                    : "bg-white/25 text-white/80 hover:bg-white/40",
                ].join(" ")}
              >
                {y.year}–{String(y.year + 1).slice(-2)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1"
               style={{ letterSpacing: "0.06em" }}>
              Academic Year
            </p>
            <h1 className="text-[32px] font-semibold text-gray-900 dark:text-white"
                style={{ letterSpacing: "-0.03em" }}>
              {activeYear.year}–{String(activeYear.year + 1).slice(-2)}
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              {semesters.length} semester{semesters.length !== 1 ? "s" : ""} ·{" "}
              {semesters.reduce((n, s) => n + s.courses.length, 0)} courses
            </p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <GlassButton
              variant="secondary"
              size="sm"
              icon={<PlusIcon />}
              onClick={() => { setFormError(""); setShowAddYear(true); }}
            >
              New year
            </GlassButton>
            <GlassButton
              variant="danger"
              size="sm"
              icon={<TrashIcon />}
              onClick={openDeleteYear}
            >
              Delete year
            </GlassButton>
          </div>
        </div>
      </div>

      {/* ── Semester grid ─────────────────────────────────────────────── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {semesters.map((sem) => {
            const colors    = SEASON[sem.season] ?? SEASON.fall;
            const assigns   = sem.courses.flatMap((c) =>
              (c.events ?? []).filter((e) => e.type === "assignment")
            );
            const done      = assigns.filter((e) => e.completed || e.status === "completed").length;
            const evtCount  = sem.courses.reduce((n, c) => n + (c.events?.length ?? 0), 0);

            return (
              <motion.div key={sem._id} variants={item} layout exit={{ opacity: 0, scale: 0.95 }}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.18 } }}
                  whileTap={{ scale: 0.975 }}
                  onClick={() => onSelectSemester(sem)}
                  className="cursor-pointer group"
                >
                  <GlassCard variant="interactive" className="p-7 relative min-h-[200px] flex flex-col justify-between">
                    {/* Delete button */}
                    <motion.button
                      onClick={(e) => openDeleteSemester(e, sem)}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center
                                 rounded-[7px] text-gray-400 hover:text-rose-500 hover:bg-rose-50
                                 transition-all duration-150 cursor-pointer
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

                    <h2 className="text-[19px] font-semibold text-gray-900 dark:text-white leading-tight mb-1"
                        style={{ letterSpacing: "-0.022em" }}>
                      {sem.name}
                    </h2>
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-5">
                      {sem.courses.length} courses · {evtCount} events
                    </p>

                    <ProgressBar value={done} max={assigns.length} showLabel />
                  </GlassCard>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* ── "Add Semester" card ──────────────────────────────────────── */}
        <motion.div variants={item}>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setFormError(""); setSemName(""); setSemSeason("fall"); setShowAddSem(true); }}
            className="w-full cursor-pointer"
          >
            <div className="glass-card-subtle p-6 flex flex-col items-center justify-center
                            min-h-[200px] border-2 border-dashed border-white/40
                            hover:border-white/70 transition-all duration-200 rounded-[16px]">
              <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center mb-3 shadow-sm">
                <PlusIcon />
              </div>
              <p className="text-[14px] font-medium text-gray-600 dark:text-gray-300">Add semester</p>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5">Spring, Fall, Summer…</p>
            </div>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* ── Add year modal ─────────────────────────────────────────────── */}
      <FormModal
        isOpen={showAddYear}
        onClose={() => setShowAddYear(false)}
        onSubmit={handleCreateYear}
        title="New academic year"
        submitLabel="Create year"
        loading={createYear.isPending}
        error={formError}
      >
        <Field
          label="Start year" id="year-num" type="number" required
          placeholder="e.g. 2026"
          value={newYearNum}
          onChange={(e) => setNewYearNum(e.target.value)}
          hint="Entering 2026 creates the 2026–27 academic year."
        />
      </FormModal>

      {/* ── Add semester modal ─────────────────────────────────────────── */}
      <FormModal
        isOpen={showAddSem}
        onClose={() => setShowAddSem(false)}
        onSubmit={handleCreateSemester}
        title={`Add semester to ${activeYear.year}–${String(activeYear.year + 1).slice(-2)}`}
        submitLabel="Add semester"
        loading={createSemester.isPending}
        error={formError}
      >
        {/* Season picker */}
        <div>
          <p className="text-[12px] font-medium text-gray-600 mb-2"
             style={{ letterSpacing: "-0.011em" }}>
            Season <span className="text-rose-400">*</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {SEASONS.map((s) => {
              const c = SEASON[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSemSeason(s);
                    // Auto-populate name if empty
                    if (!semName)
                      setSemName(`${s.charAt(0).toUpperCase() + s.slice(1)} ${activeYear.year}`);
                  }}
                  className={[
                    "py-2 rounded-[9px] text-[12px] font-medium capitalize",
                    "border transition-all duration-100 cursor-pointer",
                    semSeason === s
                      ? `bg-gradient-to-br ${c.gradient} text-white border-transparent shadow-sm`
                      : "bg-white/60 text-gray-600 border-gray-200/70 hover:bg-white/80",
                  ].join(" ")}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <Field
          label="Semester name" id="sem-name" required
          placeholder="e.g. Fall 2026"
          value={semName}
          onChange={(e) => setSemName(e.target.value)}
        />
      </FormModal>

      {/* ── Delete confirmation ────────────────────────────────────────── */}
      <DeleteModal
        isOpen={!!deletePending}
        onClose={() => setDeletePending(null)}
        onConfirm={handleDeleteConfirm}
        entityType={deletePending?.type === "year" ? "Year" : "Semester"}
        entityName={
          deletePending?.type === "year"
            ? `${activeYear.year}–${String(activeYear.year + 1).slice(-2)}`
            : del?.name ?? ""
        }
        description={deleteDescription}
      />
    </div>
  );
}
