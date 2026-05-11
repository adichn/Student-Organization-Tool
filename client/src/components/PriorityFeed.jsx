import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassButton from "./ui/GlassButton";
import Button from "./ui/Button";
import FormModal, { Field } from "./ui/FormModal";
import { priorityTier, priorityScore } from "../utils/roi";
import { useCreateTask, useUpdateTask, useDeleteTask, nextStatus } from "../hooks/useTasks";
import { DOMAIN_META } from "../context/DomainContext";
import { useWorkspace, WORKSPACE_TYPE_META, WORKSPACE_DEFAULT_TASK_DOMAIN } from "../context/WorkspaceContext";

// ── Design tokens ─────────────────────────────────────────────────────────────

const TIER_COLORS = {
  Critical: { bg: "#f43f5e", text: "white" },
  High:     { bg: "#f59e0b", text: "white" },
  Medium:   { bg: "#0ea5e9", text: "white" },
  Low:      { bg: "#94a3b8", text: "white" },
};

const STATUS_STYLES = {
  "todo":        "bg-gray-100   text-gray-500   border-gray-200/60",
  "in-progress": "bg-amber-100  text-amber-700  border-amber-200/60",
  "completed":   "bg-emerald-100 text-emerald-700 border-emerald-200/60",
};

const STATUS_LABELS = {
  "todo":        "To do",
  "in-progress": "In progress",
  "completed":   "Done",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5"  y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ClockIcon({ size = 11, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChevronUpDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 15l5 5 5-5" />
      <path d="M7 9l5-5 5 5" />
    </svg>
  );
}

function BoltIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

// ── Domain badge (Apple-style pill) ──────────────────────────────────────────

function DomainBadge({ domain }) {
  const meta = DOMAIN_META[domain];
  if (!meta) return null;
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold
                 px-2 py-0.5 rounded-full"
      style={{
        background: meta.badge.bg,
        border:     `1px solid ${meta.badge.border}`,
        color:      meta.badge.text,
        letterSpacing: "-0.008em",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.dot }} />
      {meta.label}
    </span>
  );
}

// ── Priority score badge ──────────────────────────────────────────────────────

function ScoreBadge({ task }) {
  const score = task.priorityScore ?? priorityScore(task);
  const tier  = priorityTier(score);
  const col   = TIER_COLORS[tier.label];
  return (
    <div
      className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[12px]
                 font-bold shrink-0 select-none"
      style={{ background: col.bg, color: col.text, boxShadow: `0 2px 8px ${col.bg}55` }}
      title={`${tier.label} priority — score ${score.toFixed(1)}`}
    >
      {score >= 100 ? "99+" : Math.round(score)}
    </div>
  );
}

// ── Relative due date ─────────────────────────────────────────────────────────

function DueLabel({ date }) {
  if (!date) return null;
  const d    = new Date(date);
  const now  = new Date();
  const diff = Math.round((d - now) / 86400000);

  let label, color;
  if (diff < 0)        { label = `${Math.abs(diff)}d overdue`; color = "#f43f5e"; }
  else if (diff === 0) { label = "Due today";                  color = "#f59e0b"; }
  else if (diff === 1) { label = "Due tomorrow";               color = "#f59e0b"; }
  else if (diff <= 7)  { label = `In ${diff} days`;            color = "#6b7280"; }
  else                 {
    label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    color = "#9ca3af";
  }

  return (
    <span className="flex items-center gap-1" style={{ color }}>
      <ClockIcon color={color} />
      <span className="text-[11px] font-medium">{label}</span>
    </span>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onSelect, index, showDomain }) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const score      = task.priorityScore ?? priorityScore(task);
  const tier       = priorityTier(score);
  const isComplete = task.status === "completed";

  function cycleStatus(e) {
    e.stopPropagation();
    updateTask.mutate({ id: task._id, status: nextStatus(task.status) });
  }

  function handleDelete(e) {
    e.stopPropagation();
    deleteTask.mutate(task._id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => onSelect(task)}
      className={[
        "group flex items-start gap-3.5 p-4 rounded-[14px] cursor-pointer",
        "transition-all duration-150",
        "hover:bg-black/[0.025]",
        isComplete ? "opacity-60" : "",
      ].join(" ")}
    >
      <ScoreBadge task={task} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p
            className={[
              "text-[14px] font-semibold text-gray-900 dark:text-gray-100 leading-tight",
              isComplete ? "line-through text-gray-400" : "",
            ].join(" ")}
            style={{ letterSpacing: "-0.016em" }}
          >
            {task.title}
          </p>

          {/* Show domain badge only in the "All" view so it's not redundant */}
          {showDomain && <DomainBadge domain={task.domain} />}
        </div>

        {task.description && (
          <p className="text-[12px] text-gray-500 mb-1.5 line-clamp-1 leading-snug">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <DueLabel date={task.dueDate} />

          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <BoltIcon size={11} />
            {task.estimatedEffort}h
          </span>

          <Button
            variant="ghost"
            size="xs"
            onClick={cycleStatus}
            className={[
              "h-auto px-2 py-0.5 rounded-full border text-[10px] font-semibold",
              STATUS_STYLES[task.status] ?? STATUS_STYLES.todo,
            ].join(" ")}
            title="Click to cycle status"
          >
            {STATUS_LABELS[task.status]}
          </Button>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
        <span
          className="text-[10px] font-semibold uppercase"
          style={{
            color: TIER_COLORS[tier.label]?.bg ?? "#94a3b8",
            letterSpacing: "0.06em",
          }}
        >
          {tier.label}
        </span>
        <Button
          variant="ghost"
          square
          size="xs"
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-rose-400 hover:bg-rose-50"
          title="Delete task"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </Button>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyFeed({ onAdd }) {
  const { typeMeta, activeWorkspace } = useWorkspace();
  const label = activeWorkspace?.name ?? "this workspace";
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center"
        style={{
          background: `${typeMeta.color}18`,
          border:     `1px solid ${typeMeta.color}30`,
        }}
      >
        <BoltIcon size={20} />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-gray-700" style={{ letterSpacing: "-0.016em" }}>
          No tasks yet
        </p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Add a task to {label} to get started.
        </p>
      </div>
      <GlassButton variant="primary" size="sm" icon={<PlusIcon />} onClick={onAdd}>
        New task
      </GlassButton>
    </div>
  );
}

// ── Create Task Modal ─────────────────────────────────────────────────────────

function CreateTaskModal({ isOpen, onClose, courses = [] }) {
  const createTask = useCreateTask();
  const { workspaces, activeWorkspace } = useWorkspace();

  // Build picker options — exclude the Home system workspace (tasks must belong to a real workspace)
  const wsOptions = workspaces
    .filter((ws) => !ws.isSystem)
    .map((ws) => ({
      ws,
      domain: WORKSPACE_DEFAULT_TASK_DOMAIN[ws.type] ?? "Personal",
      color:  WORKSPACE_TYPE_META[ws.type]?.color ?? "#6366f1",
    }));

  // Default to the first user workspace (skip Home — tasks can't live there)
  const firstUserWs = wsOptions[0]?.ws;
  const defaultWsId = (!activeWorkspace?.isSystem ? activeWorkspace?.id : null)
    ?? firstUserWs?.id ?? "";

  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [selectedWsId, setSelectedWsId] = useState(defaultWsId);
  const [courseId,     setCourseId]     = useState("");
  const [startDate,    setStartDate]    = useState("");
  const [dueDate,      setDueDate]      = useState("");
  const [gbValue,      setGbValue]      = useState(50);
  const [effort,       setEffort]       = useState(1);
  const [warmUpPrompt, setWarmUpPrompt] = useState("");
  const [error,        setError]        = useState("");

  const selectedOpt  = wsOptions.find((o) => o.ws.id === selectedWsId) ?? wsOptions[0];
  const domain       = selectedOpt?.domain ?? "Academic";
  const isAcademic   = domain === "Academic";

  function handleWsChange(id) {
    setSelectedWsId(id);
    if (!isAcademic) setCourseId("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }

    let courseRef = null;
    if (isAcademic && courseId) {
      const c = courses.find((x) => String(x._id) === courseId);
      if (c) {
        courseRef = {
          courseId:             c._id,
          courseTitle:          c.title,
          courseCode:           c.code || "",
          difficultyMultiplier: c.difficultyMultiplier ?? 5,
        };
      }
    }

    try {
      await createTask.mutateAsync({
        title:              title.trim(),
        description:        description.trim(),
        domain,
        workspaceId:        selectedOpt?.ws?.id ?? null,
        startDate:          startDate || undefined,
        dueDate:            dueDate   || undefined,
        gradeBusinessValue: Number(gbValue),
        estimatedEffort:    Number(effort),
        warmUpPrompt:       warmUpPrompt.trim(),
        courseRef,
      });
      setTitle(""); setDescription(""); setCourseId("");
      setStartDate(""); setDueDate(""); setGbValue(50); setEffort(1); setWarmUpPrompt("");
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title="New Task"
      submitLabel="Add task"
      loading={createTask.isPending}
      error={error}
    >
      <Field
        label="Title" id="t-title" required
        placeholder="e.g. Complete Problem Set 7"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* Workspace picker */}
      {wsOptions.length > 0 && (
        <div>
          <p className="text-[12px] font-medium text-gray-600 mb-1.5" style={{ letterSpacing: "-0.011em" }}>
            Workspace<span className="text-rose-400 ml-0.5">*</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {wsOptions.map(({ ws, color }) => {
              const isActive = selectedWsId === ws.id;
              return (
                <button
                  key={ws.id} type="button"
                  onClick={() => handleWsChange(ws.id)}
                  className={[
                    "flex items-center gap-2.5 py-2 px-3 rounded-[9px] text-[12px] font-medium",
                    "border transition-all duration-150 cursor-pointer text-left",
                    isActive
                      ? "border-transparent text-white"
                      : "bg-white/60 text-gray-600 border-gray-200 hover:bg-white/90",
                  ].join(" ")}
                  style={isActive ? {
                    background:  color,
                    boxShadow:   `0 2px 8px ${color}44`,
                  } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: isActive ? "rgba(255,255,255,0.75)" : color }}
                  />
                  <span className="flex-1 truncate">{ws.name}</span>
                  <span
                    className="text-[10px] font-semibold uppercase shrink-0"
                    style={{
                      letterSpacing: "0.05em",
                      color: isActive ? "rgba(255,255,255,0.75)" : color,
                    }}
                  >
                    {WORKSPACE_TYPE_META[ws.type]?.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Course selector (Academic workspaces only) */}
      {isAcademic && courses.length > 0 && (
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1.5" style={{ letterSpacing: "-0.011em" }}>
            Link to course <span className="text-gray-400 font-normal">(optional — powers the warm-up prompt)</span>
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="glass-input w-full px-3.5 py-2.5 text-[13px] text-gray-900"
            style={{ letterSpacing: "-0.011em" }}
          >
            <option value="">— None —</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code ? `${c.code} — ` : ""}{c.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Start date" id="t-start" type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Field
          label="Due date" id="t-due" type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Effort (hours)" id="t-effort" type="number"
          placeholder="e.g. 2"
          value={effort}
          onChange={(e) => setEffort(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-medium text-gray-600" style={{ letterSpacing: "-0.011em" }}>
            Grade / Business Value
          </label>
          <span className="text-[12px] font-semibold text-gray-800">{gbValue}</span>
        </div>
        <input
          type="range" min="0" max="100" step="5"
          value={gbValue}
          onChange={(e) => setGbValue(e.target.value)}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: "#6366f1" }}
        />
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-gray-400">Low impact</span>
          <span className="text-[10px] text-gray-400">High impact</span>
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1.5" style={{ letterSpacing: "-0.011em" }}>
          Warm-up prompt <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={warmUpPrompt}
          onChange={(e) => setWarmUpPrompt(e.target.value)}
          placeholder="Leave blank to auto-generate from domain…"
          rows={2}
          className="glass-input w-full px-3.5 py-2.5 text-[13px] text-gray-900 resize-none"
          style={{ letterSpacing: "-0.011em" }}
        />
      </div>
    </FormModal>
  );
}

// ── Collapsed completed section ───────────────────────────────────────────────

function CompletedSection({ tasks, onSelect, showDomain }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        full
        onClick={() => setExpanded((v) => !v)}
        className="h-auto py-2 px-3 justify-start gap-2 text-[11px] text-gray-400 hover:text-gray-600"
      >
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="inline-block leading-none"
        >
          ›
        </motion.span>
        {tasks.length} completed
      </Button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            {tasks.map((task, i) => (
              <TaskRow key={task._id} task={task} index={i} onSelect={onSelect} showDomain={showDomain} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Props
 * ─────
 *   tasks        Task[]
 *   courses      Course[] — for the course selector in CreateTaskModal
 *   isLoading    boolean
 *   sortBy       "priority" | "dueDate"
 *   onSortBy     (sort: string) => void
 *   onTaskSelect (task: Task) => void
 */
export default function PriorityFeed({
  tasks = [],
  courses = [],
  isLoading,
  sortBy,
  onSortBy,
  onTaskSelect,
}) {
  const [showCreate] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { typeMeta } = useWorkspace();

  // Show domain badges when workspace shows all domains (taskDomain === null)
  const showDomain = typeMeta.taskDomain === null;

  const visible = tasks.filter((t) => t.status !== "completed");
  const done    = tasks.filter((t) => t.status === "completed");

  return (
    <>
      <div className="glass-card-elevated rounded-[24px] overflow-hidden">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/[0.05]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${typeMeta.color}, ${typeMeta.color}aa)`,
              }}
            >
              <BoltIcon size={14} />
            </div>
            <div>
              <h2
                className="text-[16px] font-semibold text-gray-900 dark:text-white"
                style={{ letterSpacing: "-0.022em" }}
              >
                Priority Feed
              </h2>
              {!isLoading && (
                <p className="text-[11px] text-gray-400 leading-none mt-0.5">
                  {visible.length} active · {done.length} done
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="xs"
              icon={<ChevronUpDownIcon />}
              onClick={() => onSortBy(sortBy === "priority" ? "dueDate" : "priority")}
              title="Toggle sort"
            >
              {sortBy === "priority" ? "Priority" : "Due date"}
            </Button>

            <GlassButton
              variant="primary" size="sm"
              icon={<PlusIcon />}
              onClick={() => setCreateOpen(true)}
            >
              New task
            </GlassButton>
          </div>
        </div>

        {/* ── Task list ────────────────────────────────────────────────── */}
        <div className="px-2 pb-3 max-h-[560px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 px-2 py-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-[12px] bg-gray-100/80 animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 && done.length === 0 ? (
            <EmptyFeed onAdd={() => setCreateOpen(true)} />
          ) : (
            <>
              <AnimatePresence initial={false}>
                {visible.map((task, i) => (
                  <TaskRow
                    key={task._id}
                    task={task}
                    index={i}
                    onSelect={onTaskSelect}
                    showDomain={showDomain}
                  />
                ))}
              </AnimatePresence>

              {done.length > 0 && (
                <CompletedSection tasks={done} onSelect={onTaskSelect} showDomain={showDomain} />
              )}
            </>
          )}
        </div>
      </div>

      <CreateTaskModal isOpen={createOpen} onClose={() => setCreateOpen(false)} courses={courses} />
    </>
  );
}
