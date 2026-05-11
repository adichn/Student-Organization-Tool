import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WORKSPACE_TYPE_META } from "../context/WorkspaceContext.jsx";

// ── Icons ─────────────────────────────────────────────────────────────────────

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="12" />
      <path d="M12 12h.01" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const TYPE_ICONS = {
  default:  <GridIcon />,
  work:     <BriefcaseIcon />,
  academic: <BookIcon />,
};

const VIEW_LABELS = {
  dashboard: "Dashboard",
  courses:   "Courses",
  calendar:  "Calendar",
  resources: "Resources",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * Props
 * ─────
 *   isOpen       boolean
 *   onClose      () => void
 *   onCreate     (name: string, type: string) => void
 */
export default function WorkspaceModal({ isOpen, onClose, onCreate }) {
  const [name,     setName]     = useState("");
  const [type,     setType]     = useState("default");
  const [error,    setError]    = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError("Workspace name is required."); return; }
    onCreate(name.trim(), type);
    setName(""); setType("default"); setError("");
    onClose();
  }

  function handleClose() {
    setName(""); setType("default"); setError("");
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
            onClick={handleClose}
          />

          {/* Centering shell — separate from animation so Framer Motion's transform
              doesn't override the translate(-50%, -50%) centering trick */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1,    y: 0  }}
            exit={{    scale: 0.96, y: 8  }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="glass-modal w-full max-w-[480px] p-6 pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white"
                    style={{ letterSpacing: "-0.022em" }}>
                  New workspace
                </h2>
                <p className="text-[13px] text-gray-400 mt-0.5">
                  Choose a type and give it a name.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-7 h-7 flex items-center justify-center rounded-full
                           text-gray-400 hover:text-gray-600 hover:bg-gray-100
                           dark:hover:bg-white/10 dark:hover:text-gray-200
                           transition-colors duration-100 cursor-pointer"
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type picker */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2.5"
                   style={{ letterSpacing: "0.06em" }}>
                  Type
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.entries(WORKSPACE_TYPE_META).filter(([, meta]) => !meta.isSystem).map(([key, meta]) => {
                    const isSelected = type === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setType(key)}
                        className={[
                          "flex flex-col items-start gap-2 p-3.5 rounded-[12px] text-left",
                          "border-2 transition-all duration-150 cursor-pointer",
                          isSelected
                            ? "border-transparent"
                            : "border-transparent bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.07]",
                        ].join(" ")}
                        style={isSelected ? {
                          background:   `${meta.color}15`,
                          borderColor:  `${meta.color}50`,
                          boxShadow:    `0 0 0 0.5px ${meta.color}30`,
                        } : {}}
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-[9px] flex items-center justify-center"
                          style={{
                            background: isSelected ? `${meta.color}20` : "rgba(0,0,0,0.06)",
                            color:      isSelected ? meta.color : "#9ca3af",
                          }}
                        >
                          {TYPE_ICONS[key]}
                        </div>

                        <div>
                          <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100"
                             style={{ letterSpacing: "-0.011em", color: isSelected ? meta.color : undefined }}>
                            {meta.label}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug mt-0.5">
                            {meta.description}
                          </p>
                        </div>

                        {/* Available views */}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {meta.views.map((v) => (
                            <span key={v}
                              className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-[4px]"
                              style={{
                                letterSpacing: "0.05em",
                                background:    isSelected ? `${meta.color}18` : "rgba(0,0,0,0.05)",
                                color:         isSelected ? meta.color : "#9ca3af",
                              }}>
                              {VIEW_LABELS[v] ?? v}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Name input */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2"
                       style={{ letterSpacing: "0.06em" }}>
                  Name
                </label>
                <input
                  type="text"
                  placeholder={
                    type === "academic" ? "e.g. Fall 2025" :
                    type === "work"     ? "e.g. Day Job" :
                                         "e.g. Personal"
                  }
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  autoFocus
                  className="glass-input w-full px-3.5 py-2.5 text-[14px] text-gray-900 dark:text-gray-100"
                  style={{ letterSpacing: "-0.011em" }}
                />
                {error && (
                  <p className="text-[11px] text-rose-500 mt-1.5">{error}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 h-9 rounded-[10px] text-[13px] font-medium text-gray-500
                             dark:text-gray-400 bg-black/[0.04] dark:bg-white/[0.06]
                             hover:bg-black/[0.07] dark:hover:bg-white/[0.10]
                             transition-colors duration-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-[10px] text-[13px] font-semibold text-white
                             transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  style={{
                    background:  WORKSPACE_TYPE_META[type].color,
                    boxShadow:   `0 2px 8px ${WORKSPACE_TYPE_META[type].color}55`,
                  }}
                >
                  Create workspace
                </button>
              </div>
            </form>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
