import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import PriorityFeed       from "../components/PriorityFeed";
import CourseOverviewCard from "../components/CourseOverviewCard";
import ContextModePanel   from "../components/ContextModePanel";
import { useTasks }       from "../hooks/useTasks";
import { DOMAIN_META }    from "../context/DomainContext";
import { useWorkspace, WORKSPACE_TYPE_META, HOME_WORKSPACE_ID } from "../context/WorkspaceContext";

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ dot, label }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ background: `${dot}22`, border: `1px solid ${dot}44` }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      <span className="text-[12px] font-medium" style={{ color: `${dot}cc` }}>{label}</span>
    </div>
  );
}

// ── Workspace overview card (shown in Home dashboard right column) ─────────────

const itemVariant = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
};

function WorkspaceOverviewCard({ workspace, isActive, onSelect }) {
  const meta = WORKSPACE_TYPE_META[workspace.type] ?? WORKSPACE_TYPE_META.default;

  return (
    <motion.button
      variants={itemVariant}
      onClick={() => onSelect(workspace.id)}
      className={[
        "w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-[14px]",
        "transition-all duration-150 cursor-pointer",
        isActive
          ? "bg-white/80 dark:bg-white/10 shadow-sm"
          : "bg-white/40 dark:bg-white/[0.04] hover:bg-white/60 dark:hover:bg-white/[0.08]",
      ].join(" ")}
      style={{
        border: `1px solid ${isActive ? meta.color + "40" : "rgba(255,255,255,0.5)"}`,
        boxShadow: isActive ? `0 0 0 1px ${meta.color}20, 0 2px 8px rgba(0,0,0,0.06)` : undefined,
      }}
    >
      {/* Color dot */}
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{
          background: meta.color,
          boxShadow: `0 0 0 3px ${meta.color}22`,
        }}
      />

      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate"
          style={{ letterSpacing: "-0.016em" }}
        >
          {workspace.name}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: meta.color }}>
          {meta.label}
        </p>
      </div>

      {isActive && (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${meta.color}18`, color: meta.color }}
        >
          Active
        </span>
      )}
    </motion.button>
  );
}

// ── Empty workspace state ──────────────────────────────────────────────────────

function EmptyWorkspaces({ onCreateWorkspace }) {
  return (
    <div
      className="rounded-[16px] p-5 text-center"
      style={{ background: "rgba(0,0,0,0.03)", border: "1px dashed rgba(0,0,0,0.10)" }}
    >
      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">No workspaces yet</p>
      <p className="text-[12px] text-gray-400 mt-1">
        Create a workspace from the sidebar to get started.
      </p>
    </div>
  );
}

// ── Empty courses ──────────────────────────────────────────────────────────────

function EmptyCourses() {
  return (
    <div
      className="rounded-[16px] p-5 text-center"
      style={{ background: "rgba(0,0,0,0.03)", border: "1px dashed rgba(0,0,0,0.10)" }}
    >
      <p className="text-[13px] font-medium text-gray-700 dark:text-gray-300">No courses yet</p>
      <p className="text-[12px] text-gray-400 mt-1">Go to Courses to set up your semester.</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardView({ years, user, onNavigateToCourse }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [sortBy,       setSortBy]       = useState("priority");

  const { typeMeta, activeWorkspace, workspaces, setActiveId, userWorkspaceCount } = useWorkspace();

  const isHome       = activeWorkspace?.type === "home";
  const domainFilter = isHome ? null : typeMeta.taskDomain;

  // Home: no workspaceId filter → shows all tasks.
  // Specific workspace: filter strictly by workspaceId.
  const { data: tasks = [], isLoading } = useTasks({
    workspaceId: isHome ? undefined : activeWorkspace?.id,
    domain:      isHome ? undefined : domainFilter,
    sortBy,
  });

  const allCourses = useMemo(
    () => years.flatMap((y) =>
      y.semesters.flatMap((s) =>
        s.courses.map((c) => ({ ...c, _semesterId: String(s._id) }))
      )
    ),
    [years]
  );

  const now      = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const dueToday = tasks.filter(
    (t) => t.status !== "completed" && t.dueDate &&
    new Date(t.dueDate) >= today && new Date(t.dueDate) < tomorrow
  ).length;

  const overdue = tasks.filter(
    (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < today
  ).length;

  const greeting = useMemo(() => {
    const h = now.getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  // User workspaces shown in the Home right column (exclude system Home itself)
  const userWorkspaces = workspaces.filter((w) => !w.isSystem);

  return (
    <div className="max-w-[1380px] mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1
            className="text-[34px] font-semibold text-gray-900 dark:text-white leading-tight"
            style={{ letterSpacing: "-0.03em", fontFamily: "var(--font-display)" }}
          >
            {greeting}, {firstName}.
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {!isHome && domainFilter && (
              <span
                className="ml-2 inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  background: DOMAIN_META[domainFilter]?.badge.bg,
                  border:     `1px solid ${DOMAIN_META[domainFilter]?.badge.border}`,
                  color:      DOMAIN_META[domainFilter]?.badge.text,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: DOMAIN_META[domainFilter]?.dot }} />
                {domainFilter}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 pb-1">
          {dueToday > 0 && <StatPill dot="#f59e0b" label={`${dueToday} due today`} />}
          {overdue  > 0 && <StatPill dot="#f43f5e" label={`${overdue} overdue`} />}
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-5 items-start">

        {/* Priority Feed */}
        <PriorityFeed
          tasks={tasks}
          courses={allCourses}
          isLoading={isLoading}
          sortBy={sortBy}
          onSortBy={setSortBy}
          onTaskSelect={setSelectedTask}
        />

        {/* ── Right column ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {isHome ? (
            /* Home workspace: show workspace overview */
            <>
              <div className="flex items-center justify-between px-1">
                <span
                  className="text-[11px] font-semibold text-gray-500 uppercase"
                  style={{ letterSpacing: "0.07em" }}
                >
                  Workspaces
                </span>
                <span className="text-[11px] text-gray-400">{userWorkspaces.length}</span>
              </div>

              {userWorkspaces.length > 0 ? (
                <motion.div
                  variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  {userWorkspaces.map((ws) => (
                    <WorkspaceOverviewCard
                      key={ws.id}
                      workspace={ws}
                      isActive={false}
                      onSelect={setActiveId}
                    />
                  ))}
                </motion.div>
              ) : (
                <EmptyWorkspaces />
              )}
            </>
          ) : (
            /* Non-home workspace: show enrolled courses */
            <>
              <div className="flex items-center justify-between px-1">
                <span
                  className="text-[11px] font-semibold text-gray-500 uppercase"
                  style={{ letterSpacing: "0.07em" }}
                >
                  Enrolled Courses
                </span>
                <span className="text-[11px] text-gray-400">{allCourses.length}</span>
              </div>

              {allCourses.length > 0 ? (
                <motion.div
                  variants={{ show: { transition: { staggerChildren: 0.06 } } }}
                  initial="hidden"
                  animate="show"
                  className="space-y-2.5"
                >
                  {allCourses.map((course) => (
                    <CourseOverviewCard
                      key={course._id}
                      course={course}
                      onClick={onNavigateToCourse
                        ? () => onNavigateToCourse(String(course._id), course._semesterId)
                        : undefined
                      }
                    />
                  ))}
                </motion.div>
              ) : (
                <EmptyCourses />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Context Mode overlay ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <ContextModePanel
            key={selectedTask._id}
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
