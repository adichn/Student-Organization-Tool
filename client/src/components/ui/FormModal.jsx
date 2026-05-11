import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import GlassButton from "./GlassButton.jsx";

/**
 * FormModal — a glass sheet modal for short create/edit forms.
 *
 * Props
 * ─────
 *   isOpen       boolean
 *   onClose      () => void
 *   onSubmit     (e: FormEvent) => void  — called on <form> submit
 *   title        string
 *   submitLabel  string  (default "Create")
 *   loading      boolean — disables submit + shows spinner
 *   error        string  — shown as a red inline message
 *   children     form fields
 */
export default function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  submitLabel = "Create",
  loading     = false,
  error       = "",
  children,
}) {
  const firstFieldRef = useRef(null);

  // Focus the first input when the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      const input = firstFieldRef.current?.querySelector("input, select, textarea");
      input?.focus();
    }, 180);
    return () => clearTimeout(id);
  }, [isOpen]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [isOpen, onClose]);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="form-modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="form-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 cursor-pointer"
            style={{
              backgroundColor: "rgba(0,0,0,0.28)",
              backdropFilter: "blur(14px) saturate(150%)",
              WebkitBackdropFilter: "blur(14px) saturate(150%)",
            }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit={{    scale: 0.96, y: 10, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.34, 1.3, 0.64, 1] }}
            className="relative z-10 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-[20px] p-6"
              style={{
                background: "rgba(255,255,255,0.94)",
                border: "1px solid rgba(255,255,255,0.78)",
                boxShadow:
                  "0 24px 60px rgba(0,0,0,0.14), 0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.98)",
                backdropFilter: "blur(28px) saturate(190%)",
                WebkitBackdropFilter: "blur(28px) saturate(190%)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2
                  id="form-modal-title"
                  className="text-[17px] font-semibold text-gray-900"
                  style={{ letterSpacing: "-0.022em" }}
                >
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-full
                             text-gray-400 hover:text-gray-600 hover:bg-black/[0.06]
                             transition-colors duration-100 cursor-pointer"
                  aria-label="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={onSubmit} noValidate ref={firstFieldRef}>
                <div className="space-y-4">{children}</div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="form-error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mt-3 text-[12px] text-rose-500 font-medium"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-2.5 mt-5">
                  <GlassButton
                    type="button"
                    variant="ghost"
                    size="md"
                    full
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    variant="primary"
                    size="md"
                    full
                    loading={loading}
                  >
                    {submitLabel}
                  </GlassButton>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}

// ── Small form primitives bundled with FormModal ──────────────────────────────

/** Labelled text / number input that inherits the glass-input utility. */
export function Field({
  label, id, type = "text", required, placeholder, value, onChange, hint,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[12px] font-medium text-gray-600 mb-1.5"
        style={{ letterSpacing: "-0.011em" }}
      >
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="glass-input w-full px-3.5 py-2.5 text-[14px] text-gray-900"
        style={{ letterSpacing: "-0.011em" }}
      />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** Colour swatch picker — renders preset coloured dots. */
export function ColorPicker({ value, onChange }) {
  const SWATCHES = [
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // emerald
    "#0ea5e9", // sky
    "#f43f5e", // rose
    "#14b8a6", // teal
  ];

  return (
    <div>
      <p
        className="text-[12px] font-medium text-gray-600 mb-2"
        style={{ letterSpacing: "-0.011em" }}
      >
        Card colour
      </p>
      <div className="flex gap-2 flex-wrap">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            className="w-7 h-7 rounded-full transition-transform duration-100 cursor-pointer"
            style={{
              background: hex,
              transform: value === hex ? "scale(1.25)" : "scale(1)",
              outline: value === hex ? `2.5px solid ${hex}` : "none",
              outlineOffset: "2px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
            }}
            aria-label={hex}
            aria-pressed={value === hex}
          />
        ))}
      </div>
    </div>
  );
}
