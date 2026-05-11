import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getWarmUpPrompt, buildContextString, categoryTheme, getModeName } from "../utils/warmup";
import { priorityTier, priorityScore } from "../utils/roi";
import GlassButton from "./ui/GlassButton";
import Button from "./ui/Button";

// ── Audio chime (ascending C-E-G chord) ──────────────────────────────────────
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.start(t);
      osc.stop(t + 1.8);
    });
  } catch (_) { /* AudioContext unavailable in some environments */ }
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function DomainIcon({ domain, size = 14 }) {
  if (domain === "Academic") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
  if (domain === "Professional") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
  if (domain === "Career") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
  // Personal + fallback
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// ── Typewriter prompt display ──────────────────────────────────────────────────
function WarmUpText({ text, done }) {
  const [displayed, setDisplayed] = useState("");
  const [typing,    setTyping]    = useState(true);

  useEffect(() => {
    setDisplayed("");
    setTyping(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); setTyping(false); }
    }, 9);
    return () => clearInterval(id);
  }, [text]);

  return (
    <pre
      className="whitespace-pre-wrap text-[13.5px] leading-[1.7] text-white/85"
      style={{ fontFamily: "var(--font-sans)", letterSpacing: "-0.008em" }}
    >
      {displayed}
      {typing && <span className="animate-pulse text-white/35">▍</span>}
    </pre>
  );
}

// ── Copy Context button ───────────────────────────────────────────────────────
function CopyContextButton({ task }) {
  const [state, setState] = useState("idle"); // idle | copying | copied | error

  async function handleCopy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(buildContextString(task));
      setState("copied");
      setTimeout(() => setState("idle"), 2200);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 2200);
    }
  }

  const label =
    state === "copying" ? "Copying…"
    : state === "copied" ? "Copied!"
    : state === "error"  ? "Failed"
    : "Copy Context";

  const color =
    state === "copied" ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
    : state === "error" ? "text-rose-400 border-rose-500/40 bg-rose-500/10"
    : "text-white/60 border-white/15 hover:text-white/90 hover:bg-white/10";

  return (
    <button
      onClick={handleCopy}
      disabled={state === "copying"}
      className={[
        "flex items-center gap-1.5 h-7 px-3 rounded-[8px] text-[12px] font-medium",
        "border transition-all duration-150 cursor-pointer",
        color,
      ].join(" ")}
    >
      <CopyIcon />
      {label}
    </button>
  );
}

// ── Focus Timer ───────────────────────────────────────────────────────────────
const DURATIONS = [
  { label: "25m", secs: 25 * 60 },
  { label: "45m", secs: 45 * 60 },
  { label: "60m", secs: 60 * 60 },
  { label: "90m", secs: 90 * 60 },
];

// Radius of the SVG progress ring
const R = 50;
const CIRC = 2 * Math.PI * R;

function FocusTimer({ accentColor }) {
  const [duration,  setDuration]  = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running,   setRunning]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [sessions,  setSessions]  = useState(0);
  const intervalRef = useRef(null);

  // Clean up on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  function selectDuration(secs) {
    clearInterval(intervalRef.current);
    setRunning(false); setDone(false);
    setDuration(secs); setRemaining(secs);
  }

  function toggleRunning() {
    if (done) return;
    if (running) {
      clearInterval(intervalRef.current);
      setRunning(false);
    } else {
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setDone(true);
            setSessions((s) => s + 1);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  function reset() {
    clearInterval(intervalRef.current);
    setRunning(false); setDone(false);
    setRemaining(duration);
  }

  const progress   = 1 - remaining / duration;          // 0 → 1 as time passes
  const dashOffset = CIRC * (1 - progress);             // full → 0
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const ringColor = done ? "#22c55e" : accentColor;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Duration presets */}
      <div className="flex gap-1">
        {DURATIONS.map((d) => (
          <button
            key={d.label}
            onClick={() => selectDuration(d.secs)}
            className={[
              "h-6 px-2.5 rounded-[6px] text-[11px] font-semibold transition-all duration-150 cursor-pointer",
              duration === d.secs
                ? "text-white"
                : "text-white/35 hover:text-white/70",
            ].join(" ")}
            style={
              duration === d.secs
                ? { background: `${ringColor}30`, border: `1px solid ${ringColor}50`, color: ringColor }
                : { border: "1px solid transparent" }
            }
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Ring */}
      <div className="relative" style={{ width: 136, height: 136 }}>
        {/* Subtle glow when running */}
        {running && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ background: `${ringColor}08`, filter: `blur(12px)` }}
          />
        )}

        <svg
          width="136" height="136"
          className="-rotate-90 drop-shadow-sm"
          style={{ overflow: "visible" }}
        >
          {/* Track */}
          <circle cx="68" cy="68" r={R}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
          {/* Progress arc */}
          <circle cx="68" cy="68" r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{ transition: running ? "stroke-dashoffset 1s linear" : "stroke-dashoffset 0.3s ease" }}
          />
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <CheckIcon size={32} />
              </motion.div>
            ) : (
              <motion.span
                key="time"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[26px] font-semibold text-white leading-none"
                style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
              >
                {mm}:{ss}
              </motion.span>
            )}
          </AnimatePresence>

          {sessions > 0 && (
            <span className="text-[9px] text-white/35 font-medium" style={{ letterSpacing: "0.04em" }}>
              SESSION {sessions}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleRunning}
          disabled={done}
          className={[
            "h-8 px-4 rounded-[9px] text-[12px] font-semibold transition-all duration-150 cursor-pointer",
            done ? "opacity-30 cursor-not-allowed" : "",
          ].join(" ")}
          style={{
            background: done ? "rgba(255,255,255,0.06)" : `${ringColor}25`,
            border: `1px solid ${ringColor}40`,
            color: done ? "rgba(255,255,255,0.4)" : ringColor,
          }}
        >
          {running ? "Pause" : done ? "Done ✓" : "Start"}
        </button>

        <button
          onClick={reset}
          className="h-8 px-3 rounded-[9px] text-[11px] font-medium text-white/35
                     hover:text-white/60 border border-white/10 hover:border-white/20
                     transition-all duration-100 cursor-pointer"
        >
          Reset
        </button>
      </div>

      <p className="text-[10px] text-white/25 text-center" style={{ letterSpacing: "0.02em" }}>
        {done ? "Session complete — great work." : "Deep work window"}
      </p>
    </div>
  );
}

// ── Metadata strip ────────────────────────────────────────────────────────────
function MetaStrip({ task }) {
  const score = task.priorityScore ?? priorityScore(task);
  const tier  = priorityTier(score);

  const tierColor =
    tier.label === "Critical" ? "#f43f5e"
    : tier.label === "High"   ? "#f59e0b"
    : tier.label === "Medium" ? "#0ea5e9"
    :                           "#94a3b8";

  const dueStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : null;

  const items = [
    {
      label: "Priority",
      value: `${Math.round(score)} · ${tier.label}`,
      color: tierColor,
    },
    { label: "Effort", value: `${task.estimatedEffort}h` },
    dueStr ? { label: "Due", value: dueStr } : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-5 flex-wrap">
      {items.map((item, i) => (
        <div key={i}>
          <p className="text-[10px] text-white/35 font-semibold uppercase mb-0.5"
            style={{ letterSpacing: "0.07em" }}>
            {item.label}
          </p>
          <p className="text-[13px] font-semibold"
            style={{ color: item.color ?? "rgba(255,255,255,0.85)" }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
/**
 * Props
 * ─────
 *   task     Task document from API (includes priorityScore virtual)
 *   onClose  () => void
 */
export default function ContextModePanel({ task, onClose }) {
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft,   setPromptDraft]   = useState("");

  const theme   = categoryTheme(task.domain);
  const mode    = getModeName(task);
  const prompt  = task.warmUpPrompt?.trim() || getWarmUpPrompt(task);

  // Keyboard close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const panel = (
    <motion.div
      key="ctx-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[300] flex items-center justify-center px-4 py-6"
      aria-modal="true"
      role="dialog"
      aria-label="Context Mode"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 cursor-pointer"
        style={{
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(24px) saturate(130%)",
          WebkitBackdropFilter: "blur(24px) saturate(130%)",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.93, y: 28, opacity: 0 }}
        animate={{ scale: 1,    y: 0,  opacity: 1 }}
        exit={{    scale: 0.95, y: 14, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.34, 1.15, 0.64, 1] }}
        className="relative z-10 w-full max-w-[720px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`rounded-[24px] overflow-hidden border ${theme.border}`}
          style={{
            background: "rgba(8,8,18,0.88)",
            backdropFilter: "blur(48px) saturate(160%)",
            WebkitBackdropFilter: "blur(48px) saturate(160%)",
            boxShadow: "0 40px 96px rgba(0,0,0,0.55), 0 8px 28px rgba(0,0,0,0.35)",
          }}
        >
          {/* Category accent bar */}
          <div
            className="h-[3px] w-full"
            style={{
              background: `linear-gradient(to right, ${theme.ring}, ${theme.ring}55)`,
            }}
          />

          <div className="p-7 pb-6">
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between mb-5 gap-4">
              <div className="flex flex-col gap-1.5">
                {/* Domain badge */}
                <div className={`flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full ${theme.badge}`}>
                  <DomainIcon domain={task.domain} size={12} />
                  <span className="text-[11px] font-semibold" style={{ letterSpacing: "-0.008em" }}>
                    {task.domain}
                  </span>
                </div>
                {/* Mode headline */}
                <h2
                  className="text-[22px] font-semibold text-white"
                  style={{ letterSpacing: "-0.03em", fontFamily: "var(--font-display)" }}
                >
                  {mode}
                </h2>
                <p className="text-[12px] text-white/40" style={{ letterSpacing: "-0.008em" }}>
                  {task.title}
                </p>
              </div>

              <Button
                variant="ghost"
                square
                size="sm"
                onClick={onClose}
                className="rounded-full shrink-0 mt-0.5 text-white/35 hover:text-white/70 hover:bg-white/10"
                aria-label="Close"
              >
                <XIcon />
              </Button>
            </div>

            {/* ── Main two-column body ───────────────────────────────────── */}
            <div className="flex gap-7">
              {/* LEFT — warm-up prompt */}
              <div className="flex-1 min-w-0">
                <div
                  className="rounded-[14px] p-4 mb-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {editingPrompt ? (
                    <textarea
                      autoFocus
                      value={promptDraft}
                      onChange={(e) => setPromptDraft(e.target.value)}
                      rows={6}
                      className="w-full text-[13.5px] text-white/85 bg-transparent resize-none
                                 outline-none leading-[1.7] placeholder-white/25"
                      style={{ fontFamily: "var(--font-sans)", letterSpacing: "-0.008em" }}
                      placeholder="Write your warm-up prompt here…"
                    />
                  ) : (
                    <WarmUpText key={`${task._id}-${prompt}`} text={prompt} />
                  )}
                </div>

                {/* Prompt actions */}
                <div className="flex items-center gap-2 mb-5">
                  <CopyContextButton task={{ ...task, warmUpPrompt: editingPrompt ? promptDraft : prompt }} />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (editingPrompt) {
                        setEditingPrompt(false);
                      } else {
                        setPromptDraft(prompt);
                        setEditingPrompt(true);
                      }
                    }}
                    className="text-white/40 border border-white/10 hover:text-white/70
                               hover:bg-white/[0.06] hover:border-white/20"
                  >
                    {editingPrompt ? "Save" : "Edit prompt"}
                  </Button>

                  {task.courseRef?.courseTitle && (
                    <span className="ml-auto text-[10px] text-white/25 italic">
                      ↑ pastes NotebookLM slot into clipboard
                    </span>
                  )}
                </div>

                {/* Divider */}
                <div className="h-px bg-white/[0.07] mb-5" />

                {/* Metadata */}
                <MetaStrip task={task} />
              </div>

              {/* RIGHT — focus timer */}
              <div
                className="shrink-0 flex flex-col items-center justify-start pt-1 rounded-[14px] px-5 py-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  width: 210,
                }}
              >
                <p
                  className="text-[10px] font-semibold text-white/35 uppercase mb-3 self-start"
                  style={{ letterSpacing: "0.09em" }}
                >
                  Focus Timer
                </p>
                <FocusTimer accentColor={theme.ring} />
              </div>
            </div>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <GlassButton
                variant="primary"
                size="md"
                full
                iconTrailing={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                }
                onClick={onClose}
              >
                Let's go
              </GlassButton>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(panel, document.body);
}
