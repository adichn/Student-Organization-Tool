import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useBatchSaveEvents } from "../hooks/useResources";
import Button from "./ui/Button";

// ── Helpers ───────────────────────────────────────────────────────────────────

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META = {
  assignment: { label: "Assignment", color: "#6366f1", bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.22)" },
  exam:       { label: "Exam",       color: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.22)"  },
  lecture:    { label: "Lecture",    color: "#0ea5e9", bg: "rgba(14,165,233,0.10)",  border: "rgba(14,165,233,0.22)" },
  reminder:   { label: "Reminder",   color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.22)" },
  other:      { label: "Other",      color: "#6b7280", bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.20)"},
};

// ── Input styles ──────────────────────────────────────────────────────────────

const inputCls = [
  "w-full px-3 py-2 rounded-[9px] text-[13px] outline-none",
  "bg-white border border-gray-200/80 text-gray-800 placeholder:text-gray-300",
  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
  "transition-all duration-150",
].join(" ");

const selectCls = [
  "px-2.5 py-2 rounded-[9px] text-[12px] outline-none appearance-none",
  "bg-white border border-gray-200/80 text-gray-700",
  "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
  "transition-all duration-150 cursor-pointer",
].join(" ");

// ── Checkbox ──────────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  return (
    <label className="relative flex items-center justify-center w-5 h-5 shrink-0 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={onChange}
        className="sr-only"
        aria-label={label}
      />
      <span
        className={[
          "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all duration-100",
          checked || indeterminate
            ? "bg-indigo-500 border-indigo-500"
            : "bg-white border-gray-300 hover:border-indigo-400",
        ].join(" ")}
      >
        {checked && !indeterminate && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
            <polyline points="1.5 6 4.5 9 10.5 3" stroke="white" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {indeterminate && (
          <span className="block w-2 h-0.5 bg-white rounded-full" />
        )}
      </span>
    </label>
  );
}

// ── Single editable row ───────────────────────────────────────────────────────

function ItemRow({ item, index, checked, onToggle, onChange, onDiscard }) {
  function set(field, value) {
    onChange(index, { ...item, [field]: value });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={[
        "group rounded-[14px] border px-4 py-3.5 transition-colors duration-100",
        checked
          ? "bg-rose-50/60 border-rose-200/60"
          : "bg-white/50 border-slate-200/70",
      ].join(" ")}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {/* Row 1: checkbox + type + title + date + trash */}
      <div className="flex items-center gap-3">
        <Checkbox
          checked={checked}
          onChange={onToggle}
          label={`Select ${item.title ?? "item"} for discard`}
        />

        <select
          value={item.type ?? "other"}
          onChange={(e) => set("type", e.target.value)}
          className={selectCls}
          style={{ minWidth: 108 }}
          aria-label="Event type"
        >
          {Object.entries(TYPE_META).map(([val, { label }]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        <input
          type="text"
          value={item.title ?? ""}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Event title…"
          className={[inputCls, "flex-1"].join(" ")}
          style={{ letterSpacing: "-0.011em" }}
          aria-label="Event title"
        />

        <input
          type="date"
          value={toInputDate(item.date)}
          onChange={(e) => set("date", e.target.value)}
          className={[inputCls, "w-[148px] shrink-0 tabular-nums"].join(" ")}
          aria-label="Event date"
        />

        <Button
          variant="danger"
          square
          size="sm"
          onClick={() => onDiscard(index)}
          className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-300"
          aria-label="Discard this item"
        >
          <TrashIcon />
        </Button>
      </div>

      {/* Row 2: description / notes */}
      <div className="mt-2.5 flex items-center gap-3">
        <div className="w-5 shrink-0" /> {/* checkbox spacer */}
        <div style={{ minWidth: 108 }} className="shrink-0" />
        <input
          type="text"
          value={item.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Notes / weight (optional)…"
          className={[inputCls, "flex-1 text-[12px] text-gray-500"].join(" ")}
          aria-label="Notes"
        />
        <div className="w-[148px] shrink-0" />
        <div className="w-8 shrink-0" />
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onClose }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.22)", color: "#10b981" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="text-[13px] font-medium text-gray-600">All items addressed</p>
      <p className="text-[12px] text-gray-400">You're good to go.</p>
      <Button variant="secondary" size="sm" onClick={onClose} className="mt-1">
        Done
      </Button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

/**
 * ExtractionReviewModal
 *
 * Props
 * ─────
 *   isOpen     boolean
 *   items      array of pending extraction objects from the server
 *   courseId   string
 *   onSaved    () => void — called after a successful batch save (clears gate)
 *   onDiscard  () => void — called when all items are discarded (clears gate)
 */
export default function ExtractionReviewModal({ isOpen, items = [], courseId, onSaved, onDiscard }) {
  const [rows,     setRows]     = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [saveErr,  setSaveErr]  = useState("");

  const { mutateAsync: batchSave, isPending: isSaving } = useBatchSaveEvents();

  // Seed rows on open
  useEffect(() => {
    if (isOpen && items.length) {
      setRows(items.map((item, i) => ({ ...item, _rowKey: i })));
      setSelected(new Set());
      setSaveErr("");
    }
  }, [isOpen, items]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Block Escape — user must explicitly save or discard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { e.stopPropagation(); };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen]);

  // ── Selection helpers ────────────────────────────────────────────────────────

  const allSelected  = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r._rowKey)));
  }

  function toggleRow(rowKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
      return next;
    });
  }

  // ── Row mutation helpers ─────────────────────────────────────────────────────

  const handleChange = useCallback((index, updated) => {
    setRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
  }, []);

  const handleDiscardRow = useCallback((index) => {
    setRows((prev) => {
      const removed = prev[index];
      if (removed) {
        setSelected((s) => {
          const next = new Set(s);
          next.delete(removed._rowKey);
          return next;
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  function handleDiscardSelected() {
    setRows((prev) => prev.filter((r) => !selected.has(r._rowKey)));
    setSelected(new Set());
  }

  function handleDiscardAll() {
    setRows([]);
    setSelected(new Set());
    onDiscard?.();
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (rows.length === 0) return;
    setSaveErr("");
    try {
      await batchSave({
        courseId,
        events: rows.map(({ title, date, type, description }) => ({
          title,
          date,
          type:        type ?? "other",
          description: description ?? "",
        })),
      });
      onSaved?.();
    } catch (err) {
      setSaveErr(err.message ?? "Failed to save. Please try again.");
    }
  }

  const isEmpty = rows.length === 0;

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="extraction-review-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6"
          aria-modal="true"
          role="dialog"
          aria-labelledby="extraction-modal-title"
        >
          {/* Backdrop — no click-to-close; user must explicitly act */}
          <div
            className="absolute inset-0"
            style={{
              backgroundColor:     "rgba(0,0,0,0.30)",
              backdropFilter:      "blur(18px) saturate(160%)",
              WebkitBackdropFilter:"blur(18px) saturate(160%)",
            }}
            aria-hidden="true"
          />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.93, y: 24, opacity: 0 }}
            animate={{ scale: 1,    y: 0,  opacity: 1 }}
            exit={{    scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
            className="relative z-10 w-full"
            style={{ maxWidth: 820 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background:          "rgba(255,255,255,0.92)",
                backdropFilter:      "blur(28px) saturate(180%)",
                WebkitBackdropFilter:"blur(28px) saturate(180%)",
                border:              "1px solid rgba(255,255,255,0.70)",
                boxShadow:           "0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.95)",
              }}
            >
              {/* ── Header ──────────────────────────────────────────────────── */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-200/60">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)", color: "#6366f1" }}
                  >
                    <SparkleIcon />
                  </div>
                  <div>
                    <h2
                      id="extraction-modal-title"
                      className="text-[16px] font-semibold text-gray-900"
                      style={{ letterSpacing: "-0.022em" }}
                    >
                      Review Extracted Items
                    </h2>
                    <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                      The AI found{" "}
                      <span className="font-medium text-gray-700">{items.length} item{items.length !== 1 ? "s" : ""}</span>{" "}
                      in your syllabus. Edit, discard, or save them to your calendar.
                    </p>
                  </div>
                </div>

                {/* Mandatory-action badge — replaces close button */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0 mt-0.5"
                  style={{
                    background: "rgba(245,158,11,0.10)",
                    border:     "1px solid rgba(245,158,11,0.28)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-semibold text-amber-600">
                    {isEmpty ? "All addressed" : "Review required"}
                  </span>
                </div>
              </div>

              {/* ── Column labels + select-all ────────────────────────────────── */}
              {!isEmpty && (
                <div className="flex items-center gap-3 px-6 pt-3 pb-1">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                    label="Select all items"
                  />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest"
                     style={{ minWidth: 108 }}>Type</p>
                  <p className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Title</p>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest"
                     style={{ width: 148 }}>Date</p>
                  <div className="w-8 shrink-0" />
                </div>
              )}

              {/* Selection hint */}
              <AnimatePresence>
                {selected.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="px-6 overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between py-2 px-3 rounded-[9px] mb-1"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
                    >
                      <span className="text-[12px] text-rose-600 font-medium">
                        {selected.size} item{selected.size !== 1 ? "s" : ""} selected for discard
                      </span>
                      <Button
                        variant="danger"
                        size="xs"
                        onClick={handleDiscardSelected}
                      >
                        Discard Selected
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Item list ────────────────────────────────────────────────── */}
              <div className="px-6 py-3 space-y-2.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 340px)" }}>
                <AnimatePresence initial={false}>
                  {!isEmpty ? (
                    rows.map((item, index) => (
                      <ItemRow
                        key={item._rowKey ?? index}
                        item={item}
                        index={index}
                        checked={selected.has(item._rowKey)}
                        onToggle={() => toggleRow(item._rowKey)}
                        onChange={handleChange}
                        onDiscard={handleDiscardRow}
                      />
                    ))
                  ) : (
                    <EmptyState key="empty" onClose={onDiscard} />
                  )}
                </AnimatePresence>
              </div>

              {/* ── Footer ──────────────────────────────────────────────────── */}
              {!isEmpty && (
                <div className="px-6 py-4 border-t border-slate-200/60">
                  <AnimatePresence>
                    {saveErr && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[12px] text-rose-500 mb-3"
                      >
                        {saveErr}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] text-gray-400 tabular-nums">
                      {rows.length} item{rows.length !== 1 ? "s" : ""} remaining
                    </span>

                    <div className="flex items-center gap-2.5">
                      <Button
                        variant="danger"
                        size="md"
                        onClick={handleDiscardAll}
                        disabled={isSaving}
                      >
                        Discard All
                      </Button>

                      <Button
                        variant="primary"
                        size="md"
                        loading={isSaving}
                        icon={!isSaving ? <CalendarIcon /> : undefined}
                        onClick={handleSave}
                        disabled={rows.length === 0}
                        className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                                   dark:bg-indigo-600 dark:hover:bg-indigo-700 shadow-sm shadow-indigo-200/60"
                      >
                        {isSaving ? "Saving…" : "Approve & Save to Calendar"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}
