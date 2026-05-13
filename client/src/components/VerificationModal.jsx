import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useBatchSaveEvents } from "../hooks/useResources";
import Button from "./ui/Button";

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META = {
  assignment: { label: "Assignment", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border-violet-200" },
  exam:       { label: "Exam",       dot: "bg-rose-500",   badge: "bg-rose-50 text-rose-700 border-rose-200"       },
  lecture:    { label: "Lecture",    dot: "bg-sky-500",    badge: "bg-sky-50 text-sky-700 border-sky-200"          },
  reminder:   { label: "Reminder",   dot: "bg-amber-500",  badge: "bg-amber-50 text-amber-700 border-amber-200"    },
  other:      { label: "Other",      dot: "bg-slate-400",  badge: "bg-slate-50 text-slate-600 border-slate-200"    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Splits `text` into at most three segments around the first occurrence of
 * `quote` (exact match first, then case-insensitive fallback).
 * Returns [{ t: string, hi: boolean }, ...].
 */
function buildSegments(text, quote) {
  if (!text) return [{ t: "", hi: false }];
  const q = quote?.trim();
  if (!q) return [{ t: text, hi: false }];

  // Exact match
  let idx = text.indexOf(q);
  let len = q.length;

  // Case-insensitive fallback
  if (idx === -1) {
    idx = text.toLowerCase().indexOf(q.toLowerCase());
  }

  if (idx === -1) return [{ t: text, hi: false }];

  return [
    { t: text.slice(0, idx),        hi: false },
    { t: text.slice(idx, idx + len), hi: true  },
    { t: text.slice(idx + len),      hi: false },
  ].filter((s) => s.t.length > 0);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ item, index, isActive, onClick, onChange, onDelete }) {
  const meta = TYPE_META[item.type] ?? TYPE_META.other;

  function set(field, value) {
    onChange(index, { ...item, [field]: value });
  }

  return (
    <div
      onClick={() => onClick(index)}
      className={[
        "group relative rounded-xl border bg-white transition-all duration-150 cursor-pointer",
        "hover:shadow-md",
        isActive
          ? "ring-2 ring-blue-500 border-blue-300 shadow-md shadow-blue-100/60"
          : "border-slate-200 shadow-sm hover:border-slate-300",
      ].join(" ")}
    >
      {/* Card header row */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 pointer-events-none">
        <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${meta.dot}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badge}`}>
          {meta.label}
        </span>
        <div className="flex-1" />
        {item.weight > 0 && (
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
            {item.weight}%
          </span>
        )}
        <div className="pointer-events-auto">
          <Button
            variant="danger"
            size="xs"
            square
            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-100"
            aria-label="Remove this event"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {/* Editable fields — stop propagation so clicks here don't re-fire the card onClick */}
      <div
        className="px-4 pb-3.5 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <input
          type="text"
          value={item.title ?? ""}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Event title…"
          className={[
            "w-full text-[13px] font-medium text-slate-800 bg-transparent",
            "border-0 border-b border-transparent outline-none py-0.5",
            "hover:border-slate-200 focus:border-blue-400 transition-colors",
            "placeholder:text-slate-300",
          ].join(" ")}
          aria-label="Event title"
        />

        {/* Date + Weight + Type row */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={toInputDate(item.date)}
            onChange={(e) => set("date", e.target.value)}
            className={[
              "flex-1 text-[12px] text-slate-600 tabular-nums bg-transparent",
              "border border-slate-200 hover:border-slate-300 focus:border-blue-400",
              "rounded-lg px-2.5 py-1.5 outline-none transition-colors",
            ].join(" ")}
            aria-label="Event date"
          />

          <div className={[
            "flex items-center gap-1 border border-slate-200",
            "hover:border-slate-300 focus-within:border-blue-400",
            "rounded-lg px-2.5 py-1.5 transition-colors",
          ].join(" ")}>
            <input
              type="number"
              value={item.weight ?? 0}
              onChange={(e) => set("weight", parseFloat(e.target.value) || 0)}
              min={0}
              max={200}
              step={0.5}
              className="w-10 text-[12px] text-slate-600 tabular-nums bg-transparent outline-none text-right"
              aria-label="Grade weight"
            />
            <span className="text-[11px] text-slate-400 shrink-0">%</span>
          </div>

          <select
            value={item.type ?? "other"}
            onChange={(e) => set("type", e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className={[
              "text-[11px] text-slate-600 bg-transparent appearance-none cursor-pointer",
              "border border-slate-200 hover:border-slate-300 focus:border-blue-400",
              "rounded-lg px-2.5 py-1.5 outline-none transition-colors",
            ].join(" ")}
            aria-label="Event type"
          >
            {Object.entries(TYPE_META).map(([val, { label }]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* Source quote chip */}
        {item.source_quote && (
          <div className={[
            "flex items-start gap-1.5 px-2.5 py-2 rounded-lg border transition-colors mt-1",
            isActive
              ? "bg-yellow-50 border-yellow-200"
              : "bg-slate-50 border-slate-100",
          ].join(" ")}>
            <span className={`mt-[1px] shrink-0 ${isActive ? "text-yellow-500" : "text-slate-300"}`}>
              <QuoteIcon />
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 italic">
              {item.source_quote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Document viewer ───────────────────────────────────────────────────────────

function DocumentViewer({ text, quote }) {
  const markRef    = useRef(null);
  const prevQuote  = useRef(null);
  const segments   = buildSegments(text, quote);
  const hasMatch   = segments.some((s) => s.hi);

  // Scroll the highlighted mark into view whenever the active quote changes
  useEffect(() => {
    if (quote && quote !== prevQuote.current && markRef.current) {
      markRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    prevQuote.current = quote;
  }, [quote]);

  if (!text) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-slate-400">No document text available.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <p className="font-mono text-[11.5px] leading-[1.8] text-slate-600 whitespace-pre-wrap break-words">
        {segments.map((seg, i) =>
          seg.hi ? (
            <mark
              key={i}
              ref={markRef}
              className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded px-1 not-italic font-semibold"
            >
              {seg.t}
            </mark>
          ) : (
            <span key={i}>{seg.t}</span>
          )
        )}
      </p>

      {quote && !hasMatch && (
        <p className="mt-6 text-[11px] text-slate-400 italic border border-dashed border-slate-200 rounded-lg px-4 py-3">
          Quote not found verbatim in the displayed text. The source may have been
          reformatted during PDF extraction.
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * VerificationModal
 *
 * Props
 * ─────
 *   isOpen    boolean
 *   items     array of pending extraction objects (each with source_quote, weight)
 *   rawText   string — the raw syllabus text returned alongside pendingExtractions
 *   courseId  string
 *   onSaved   () => void — called after successful batch save
 *   onDiscard () => void — called when user discards all or closes
 */
export default function VerificationModal({
  isOpen,
  items   = [],
  rawText = "",
  courseId,
  onSaved,
  onDiscard,
}) {
  const [rows,      setRows]      = useState([]);
  const [activeIdx, setActiveIdx] = useState(null);
  const [saveErr,   setSaveErr]   = useState("");

  const { mutateAsync: batchSave, isPending: isSaving } = useBatchSaveEvents();

  // Seed rows when modal opens
  useEffect(() => {
    if (isOpen && items.length) {
      setRows(items.map((item, i) => ({ ...item, _key: i })));
      setActiveIdx(0);
      setSaveErr("");
    }
  }, [isOpen, items]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Block Escape — user must explicitly act
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => e.stopPropagation();
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [isOpen]);

  // ── Row mutation helpers ───────────────────────────────────────────────────

  const handleChange = useCallback((index, updated) => {
    setRows((prev) => prev.map((r, i) => (i === index ? updated : r)));
  }, []);

  function handleDelete(index) {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setActiveIdx((ai) => {
        if (ai === null) return null;
        if (next.length === 0) return null;
        if (ai === index) return Math.min(ai, next.length - 1);
        if (ai > index)   return ai - 1;
        return ai;
      });
      return next;
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (rows.length === 0) return;
    setSaveErr("");
    try {
      await batchSave({
        courseId,
        events: rows.map(({ title, date, type, weight }) => ({
          title,
          date,
          type:        type ?? "other",
          description: (weight ?? 0) > 0 ? `Weight: ${weight}%` : "",
        })),
      });
      onSaved?.();
    } catch (err) {
      setSaveErr(err.message ?? "Failed to save. Please try again.");
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const activeEvent  = activeIdx !== null ? rows[activeIdx] : null;
  const activeQuote  = activeEvent?.source_quote ?? "";
  const totalWeight  = rows.reduce((sum, r) => sum + (parseFloat(r.weight) || 0), 0);
  const weightColor  = Math.abs(totalWeight - 100) < 0.5
    ? "text-emerald-600"
    : totalWeight > 100
      ? "text-rose-500"
      : "text-amber-500";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="verification-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{
            backgroundColor:     "rgba(15,23,42,0.55)",
            backdropFilter:      "blur(8px)",
            WebkitBackdropFilter:"blur(8px)",
          }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="vm-title"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 14 }}
            animate={{ scale: 1,    opacity: 1, y: 0  }}
            exit={{    scale: 0.97, opacity: 0, y: 8  }}
            transition={{ duration: 0.24, ease: [0.34, 1.15, 0.64, 1] }}
            className="w-[95vw] h-[90vh] bg-white rounded-3xl flex overflow-hidden"
            style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)" }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* ════════════════════════════════════════════
                LEFT PANEL — Verification feed
                ════════════════════════════════════════════ */}
            <div className="flex flex-col w-1/2 min-w-0 border-r border-slate-200">

              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div>
                  <h2
                    id="vm-title"
                    className="text-[17px] font-semibold text-slate-900 tracking-tight"
                    style={{ letterSpacing: "-0.022em" }}
                  >
                    Review Extracted Events
                  </h2>
                  <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>{rows.length} event{rows.length !== 1 ? "s" : ""}</span>
                    {totalWeight > 0 && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className={`font-medium tabular-nums ${weightColor}`}>
                          {totalWeight % 1 === 0 ? totalWeight : totalWeight.toFixed(1)}% total weight
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={onDiscard}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400
                             hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0 mt-0.5"
                  aria-label="Discard all and close"
                >
                  <XIcon />
                </button>
              </div>

              {/* Scrollable event list */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <AnimatePresence initial={false}>
                  {rows.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100
                                      flex items-center justify-center text-emerald-500 mb-3">
                        <CheckIcon />
                      </div>
                      <p className="text-[13px] font-medium text-slate-600">All events addressed</p>
                      <button
                        onClick={onDiscard}
                        className="mt-2 text-[12px] text-slate-400 hover:text-slate-600
                                   cursor-pointer transition-colors"
                      >
                        Close
                      </button>
                    </motion.div>
                  ) : (
                    rows.map((item, index) => (
                      <motion.div
                        key={item._key ?? index}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -12, scale: 0.97, transition: { duration: 0.14 } }}
                        transition={{ duration: 0.18 }}
                      >
                        <EventCard
                          item={item}
                          index={index}
                          isActive={activeIdx === index}
                          onClick={setActiveIdx}
                          onChange={handleChange}
                          onDelete={handleDelete}
                        />
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Sticky footer */}
              {rows.length > 0 && (
                <div className="shrink-0 px-4 py-4 border-t border-slate-100 bg-white">
                  <AnimatePresence>
                    {saveErr && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[12px] text-rose-500 mb-2.5"
                      >
                        {saveErr}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <Button
                    variant="primary"
                    size="lg"
                    full
                    loading={isSaving}
                    icon={!isSaving ? <CheckIcon /> : undefined}
                    onClick={handleSave}
                    disabled={rows.length === 0}
                  >
                    {isSaving
                      ? "Saving…"
                      : `Approve & Save All ${rows.length} Event${rows.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════════
                RIGHT PANEL — Document & highlight viewer
                ════════════════════════════════════════════ */}
            <div className="flex flex-col w-1/2 min-w-0 bg-slate-50 border-l border-slate-200">

              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 shrink-0">
                <span className="text-slate-400"><FileTextIcon /></span>
                <h3 className="text-[12px] font-semibold text-slate-500 uppercase tracking-[0.07em]">
                  Source Document
                </h3>
                <AnimatePresence mode="wait">
                  {activeEvent?.source_quote ? (
                    <motion.span
                      key={activeEvent._key}
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.14 }}
                      className="ml-auto text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200
                                 px-2.5 py-1 rounded-full font-medium truncate max-w-[200px]"
                      title={activeEvent.title}
                    >
                      ↳ {activeEvent.title?.slice(0, 30)}{(activeEvent.title?.length ?? 0) > 30 ? "…" : ""}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="ml-auto text-[11px] text-slate-400"
                    >
                      Select an event to highlight its source
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Document text with inline highlight */}
              <DocumentViewer text={rawText} quote={activeQuote} />
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
