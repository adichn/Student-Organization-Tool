import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace, WORKSPACE_TYPE_META } from "../context/WorkspaceContext.jsx";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

// ── Workspace row (expanded) ──────────────────────────────────────────────────

function WorkspaceRow({ workspace, isActive, onSelect, onDelete, canDelete }) {
  const meta = WORKSPACE_TYPE_META[workspace.type] ?? WORKSPACE_TYPE_META.default;

  return (
    <div
      className={[
        "flex items-center gap-2 px-2.5 py-2 rounded-[10px] group",
        "transition-all duration-150",
        isActive
          ? "bg-white/70 dark:bg-white/10"
          : "hover:bg-white/40 dark:hover:bg-white/[0.06]",
      ].join(" ")}
      style={isActive ? { boxShadow: `0 0 0 1px ${meta.color}25, 0 1px 4px rgba(0,0,0,0.06)` } : {}}
    >
      {/* Colored dot */}
      <button
        onClick={() => onSelect(workspace.id)}
        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer text-left"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{
            background: meta.color,
            boxShadow: isActive ? `0 0 0 3px ${meta.color}22` : "none",
          }}
        />
        <div className="flex-1 min-w-0">
          <p
            className={[
              "text-[12px] truncate leading-tight",
              isActive
                ? "font-semibold text-gray-900 dark:text-white"
                : "font-medium text-gray-600 dark:text-gray-300",
            ].join(" ")}
            style={{ letterSpacing: "-0.011em" }}
          >
            {workspace.name}
          </p>
          <p
            className="text-[10px] leading-none mt-0.5"
            style={{ color: meta.color, opacity: 0.8 }}
          >
            {meta.label}
          </p>
        </div>
      </button>

      {/* Delete — always visible when canDelete */}
      {canDelete && (
        <button
          onClick={() => onDelete(workspace.id)}
          className="p-1 rounded-[6px] cursor-pointer shrink-0
                     text-gray-300 dark:text-gray-600
                     hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30
                     transition-all duration-100"
          aria-label={`Delete ${workspace.name}`}
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

// ── RightSidebar ──────────────────────────────────────────────────────────────

export default function RightSidebar({
  expanded,
  onToggle,
  onNewWorkspace,
  onNavigate,
  activeNav,
}) {
  const { workspaces, activeId, setActiveId, deleteWorkspace } = useWorkspace();

  function handleSelect(id) {
    setActiveId(id);
    const ws = workspaces.find((w) => w.id === id);
    if (ws && activeNav === "courses") {
      const meta = WORKSPACE_TYPE_META[ws.type] ?? WORKSPACE_TYPE_META.default;
      if (!meta.views.includes("courses")) onNavigate("dashboard");
    }
  }

  function handleDelete(id) {
    const ws = workspaces.find((w) => w.id === id);
    if (!ws || ws.isSystem) return;
    deleteWorkspace(id);
  }

  const W_EXPANDED  = 220;
  const W_COLLAPSED = 44;

  const sidebarStyle = {
    background:          "rgba(255,255,255,0.55)",
    backdropFilter:      "blur(28px) saturate(180%)",
    WebkitBackdropFilter:"blur(28px) saturate(180%)",
    borderLeft:          "1px solid rgba(255,255,255,0.6)",
  };

  return (
    /* Outer wrapper — NOT overflow-hidden so the toggle tab can poke out */
    <div className="relative shrink-0 flex z-20" style={{ width: expanded ? W_EXPANDED : W_COLLAPSED }}>

      {/* Toggle tab — sits on the left edge, outside the panel */}
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full
                   w-5 h-10 flex items-center justify-center cursor-pointer z-10
                   rounded-l-[7px] transition-all duration-150
                   text-gray-400 dark:text-gray-500
                   hover:text-gray-600 dark:hover:text-gray-300"
        style={{
          background:     "rgba(255,255,255,0.85)",
          backdropFilter: "blur(16px)",
          border:         "1px solid rgba(255,255,255,0.7)",
          borderRight:    "none",
          boxShadow:      "-3px 0 10px rgba(0,0,0,0.08)",
        }}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>

      {/* Panel */}
      <motion.div
        animate={{ width: expanded ? W_EXPANDED : W_COLLAPSED }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col h-full overflow-hidden"
        style={sidebarStyle}
      >
        <AnimatePresence initial={false} mode="wait">
          {expanded ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              className="flex flex-col h-full"
            >
              {/* Header + New button */}
              <div className="px-3 pt-4 pb-2 shrink-0 flex items-center justify-between">
                <p
                  className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase"
                  style={{ letterSpacing: "0.07em" }}
                >
                  Workspaces
                </p>
                <button
                  onClick={onNewWorkspace}
                  title="New workspace"
                  className="w-6 h-6 flex items-center justify-center rounded-[7px] cursor-pointer
                             text-gray-400 dark:text-gray-500
                             hover:text-gray-700 dark:hover:text-gray-200
                             hover:bg-black/[0.06] dark:hover:bg-white/10
                             transition-all duration-100"
                >
                  <PlusIcon />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 px-2 space-y-0.5">
                {workspaces.length === 0 ? (
                  <button
                    onClick={onNewWorkspace}
                    className="w-full flex flex-col items-center gap-1.5 py-6 px-3 rounded-[10px]
                               cursor-pointer transition-all duration-150 text-center
                               text-gray-400 dark:text-gray-500
                               hover:bg-white/40 dark:hover:bg-white/[0.06]"
                  >
                    <PlusIcon />
                    <span className="text-[11px] font-medium">Create workspace</span>
                  </button>
                ) : workspaces.map((ws) => (
                  <WorkspaceRow
                    key={ws.id}
                    workspace={ws}
                    isActive={ws.id === activeId}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                    canDelete={!ws.isSystem}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.06, duration: 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              className="flex flex-col items-center h-full py-3 gap-1"
            >
              {/* Dots */}
              <div className="flex-1 flex flex-col items-center gap-1 w-full">
                {workspaces.map((ws) => {
                  const meta = WORKSPACE_TYPE_META[ws.type] ?? WORKSPACE_TYPE_META.default;
                  const isActive = ws.id === activeId;
                  return (
                    <button
                      key={ws.id}
                      onClick={() => handleSelect(ws.id)}
                      title={ws.name}
                      className="w-full flex items-center justify-center py-2 cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full transition-all duration-150"
                        style={{
                          background: meta.color,
                          opacity: isActive ? 1 : 0.4,
                          boxShadow: isActive ? `0 0 0 3.5px ${meta.color}30` : "none",
                          transform: isActive ? "scale(1.2)" : "scale(1)",
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Plus dot */}
              <button
                onClick={onNewWorkspace}
                title="New workspace"
                className="w-full flex items-center justify-center py-2 cursor-pointer
                           text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                           transition-colors duration-100"
              >
                <PlusIcon />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
