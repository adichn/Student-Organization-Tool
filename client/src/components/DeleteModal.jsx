import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";

const WarningIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/**
 * Destructive-action confirmation modal.
 *
 * The Delete button stays disabled until the user types `entityName` exactly.
 * Clicking Delete while disabled triggers a shake animation on the input
 * rather than the button, drawing attention to what's needed.
 *
 * @param {boolean}  isOpen
 * @param {()=>void} onClose
 * @param {()=>void} onConfirm   - Called only after a valid name match
 * @param {"Year"|"Semester"|"Course"} entityType
 * @param {string}   entityName  - The string the user must type verbatim
 * @param {string}   [description] - Secondary line describing what will be lost
 */
export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  entityType = "item",
  entityName = "",
  description,
}) {
  const [input, setInput]     = useState("");
  const inputRef              = useRef(null);
  const inputControls         = useAnimationControls();

  const matched    = input === entityName;
  const hasTyped   = input.length > 0;
  const inputState = !hasTyped ? "idle" : matched ? "match" : "mismatch";

  // Reset + focus whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setInput("");
    const id = setTimeout(() => inputRef.current?.focus(), 180);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Lock background scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  async function handleConfirm() {
    if (!matched) {
      // Shake the input to signal what the user needs to do
      await inputControls.start({
        x: [0, -9, 9, -6, 6, -3, 3, 0],
        transition: { duration: 0.42, ease: "easeInOut" },
      });
      inputRef.current?.focus();
      return;
    }
    onConfirm?.();
    onClose();
  }

  const inputBorder =
    inputState === "match"    ? "border-emerald-400 ring-2 ring-emerald-100" :
    inputState === "mismatch" ? "border-rose-300    ring-2 ring-rose-100"    :
                                "border-gray-200/80 focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-black/[0.06]";

  const modal = (
    <AnimatePresence>
      {isOpen && (
        // Outer wrapper: fades the whole overlay in/out
        <motion.div
          key="delete-modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="delete-modal-title"
        >
          {/* ── Blurred backdrop ──────────────────────────────────────────── */}
          <div
            className="absolute inset-0 cursor-pointer"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(16px) saturate(160%)",
              WebkitBackdropFilter: "blur(16px) saturate(160%)",
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Modal card ────────────────────────────────────────────────── */}
          <motion.div
            initial={{ scale: 0.93, y: 22, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit={{    scale: 0.95, y: 10, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
            className="relative z-10 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-[20px] p-6"
              style={{
                background: "rgba(255, 255, 255, 0.93)",
                border: "1px solid rgba(255, 255, 255, 0.75)",
                boxShadow:
                  "0 24px 60px rgba(0, 0, 0, 0.18), 0 8px 20px rgba(0, 0, 0, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
              }}
            >
              {/* Warning icon */}
              <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center mb-4 text-rose-500">
                <WarningIcon />
              </div>

              {/* Title */}
              <h2
                id="delete-modal-title"
                className="text-[17px] font-semibold text-gray-900 mb-2"
                style={{ letterSpacing: "-0.022em" }}
              >
                Delete {entityType}
              </h2>

              {/* Primary description */}
              <p className="text-[13px] text-gray-500 leading-relaxed mb-1">
                This action{" "}
                <span className="font-semibold text-gray-800">cannot be undone</span>.{" "}
                <span className="font-semibold text-gray-800">{entityName}</span>{" "}
                will be permanently deleted.
              </p>

              {/* Secondary description (what will be lost) */}
              {description && (
                <p className="text-[12px] text-gray-400 leading-relaxed mb-5">
                  {description}
                </p>
              )}
              {!description && <div className="mb-5" />}

              {/* ── Confirmation input ─────────────────────────────────────── */}
              <div className="mb-5">
                <label
                  htmlFor="delete-confirm-input"
                  className="block text-[12px] font-medium text-gray-600 mb-2"
                >
                  Type{" "}
                  <span
                    className="font-mono font-semibold text-gray-900 bg-gray-100/80 px-1.5 py-0.5 rounded-md text-[11px] border border-gray-200/80"
                  >
                    {entityName}
                  </span>{" "}
                  to confirm
                </label>

                <motion.div animate={inputControls}>
                  <input
                    id="delete-confirm-input"
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                    placeholder={entityName}
                    autoComplete="off"
                    spellCheck={false}
                    className={[
                      "w-full px-3 py-2.5 rounded-[10px] text-[14px] outline-none",
                      "bg-white/80 placeholder:text-gray-300 text-gray-900",
                      "border transition-all duration-150",
                      inputBorder,
                    ].join(" ")}
                    style={{ letterSpacing: "-0.011em" }}
                  />
                </motion.div>

                {/* Inline feedback */}
                <div className="h-4 mt-1.5">
                  <AnimatePresence mode="wait">
                    {inputState === "match" && (
                      <motion.p
                        key="ok"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-[11px] text-emerald-600 font-medium flex items-center gap-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Name confirmed
                      </motion.p>
                    )}
                    {inputState === "mismatch" && (
                      <motion.p
                        key="err"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-[11px] text-rose-500 font-medium"
                      >
                        Doesn't match — check capitalisation
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ── Action buttons ─────────────────────────────────────────── */}
              <div className="flex gap-2.5">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-medium text-gray-700
                             bg-white/70 hover:bg-white border border-gray-200/80
                             transition-all duration-150 cursor-pointer"
                >
                  Cancel
                </button>

                <motion.button
                  onClick={handleConfirm}
                  animate={{ opacity: matched ? 1 : 0.45 }}
                  transition={{ duration: 0.2 }}
                  className={[
                    "flex-1 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold",
                    "transition-colors duration-200 cursor-pointer",
                    matched
                      ? "bg-rose-500 hover:bg-rose-600 text-white shadow-sm shadow-rose-200/60"
                      : "bg-rose-500 text-white",
                  ].join(" ")}
                  style={{ letterSpacing: "-0.011em" }}
                >
                  Delete {entityType}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
