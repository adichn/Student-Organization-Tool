import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadResource } from "../hooks/useResources";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);
const ACCEPTED_EXTS  = /\.(pdf|txt|md|docx|doc)$/i;
const MAX_BYTES      = 10 * 1024 * 1024; // 10 MB

// ── Icons ─────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024)              return `${bytes} B`;
  if (bytes < 1024 * 1024)       return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function validateFile(file) {
  const mimeOk = ACCEPTED_MIMES.has(file.type);
  const extOk  = ACCEPTED_EXTS.test(file.name);
  if (!mimeOk && !extOk) {
    return "Only PDF, Word (.docx), and text files (.pdf, .txt, .md) are accepted.";
  }
  if (file.size > MAX_BYTES) {
    return `File too large (${formatBytes(file.size)}). Maximum is 10 MB.`;
  }
  return null;
}

// ── Inner state views ─────────────────────────────────────────────────────────

const fade = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: 0.12 } },
};

function IdleView({ isDragging, onBrowse }) {
  return (
    <motion.div key="idle" {...fade} className="flex flex-col items-center gap-3 py-2">
      {/* Icon ring */}
      <motion.div
        animate={isDragging ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background:   "rgba(255,255,255,0.55)",
          border:       "1px solid rgba(255,255,255,0.5)",
          boxShadow:    "0 2px 12px rgba(0,0,0,0.08)",
          color:        isDragging ? "#6366f1" : "#9ca3af",
        }}
      >
        <UploadIcon />
      </motion.div>

      {/* Text */}
      <div className="text-center select-none">
        <p
          className="text-[13px] font-medium text-white/85"
          style={{ letterSpacing: "-0.011em" }}
        >
          {isDragging ? "Release to upload" : "Drop a file here"}
        </p>
        <p className="text-[12px] text-white/50 mt-0.5">
          or{" "}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onBrowse(); }}
            className="text-indigo-300 hover:text-indigo-200 font-medium
                       transition-colors duration-100 cursor-pointer underline
                       underline-offset-2 decoration-indigo-300/50"
          >
            browse files
          </button>
        </p>
      </div>

      {/* Hint */}
      <p className="text-[11px] text-white/35" style={{ letterSpacing: "0.01em" }}>
        PDF · DOCX · TXT · MD — up to 10 MB
      </p>
    </motion.div>
  );
}

function UploadingView({ fileName, progress }) {
  return (
    <motion.div key="uploading" {...fade} className="flex flex-col items-center gap-3 w-full py-1">
      {/* File info */}
      <div className="flex items-center gap-2.5 text-white/80">
        <span className="text-white/50"><DocumentIcon /></span>
        <p className="text-[13px] font-medium truncate max-w-[200px]" style={{ letterSpacing: "-0.011em" }}>
          {fileName}
        </p>
      </div>

      {/* Progress track */}
      <div className="w-full max-w-[240px]">
        <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #818cf8, #6366f1)",
              boxShadow:  "0 0 8px rgba(99,102,241,0.6)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />
        </div>
        <p className="text-center text-[11px] text-white/45 mt-1.5">
          {progress < 100 ? `Uploading… ${progress}%` : "Processing…"}
        </p>
      </div>
    </motion.div>
  );
}

function SuccessView({ fileName, chunksIndexed, pendingCount, onReset }) {
  return (
    <motion.div key="success" {...fade} className="flex flex-col items-center gap-2.5 py-1">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-emerald-500"
        style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
      >
        <CheckIcon />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium text-white/85" style={{ letterSpacing: "-0.011em" }}>
          Uploaded successfully
        </p>
        {fileName && (
          <p className="text-[11px] text-white/45 mt-0.5 truncate max-w-[200px]">{fileName}</p>
        )}
        {chunksIndexed != null && (
          <p className="text-[11px] text-indigo-300/80 mt-0.5">
            {chunksIndexed} chunk{chunksIndexed !== 1 ? "s" : ""} indexed for AI search
          </p>
        )}
        {pendingCount > 0 && (
          <p className="text-[11px] text-amber-400/90 mt-0.5">
            {pendingCount} item{pendingCount !== 1 ? "s" : ""} ready to review →
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-1 text-[12px] text-white/45 hover:text-white/70
                   transition-colors duration-100 cursor-pointer underline
                   underline-offset-2 decoration-white/20"
      >
        Upload another
      </button>
    </motion.div>
  );
}

function ErrorView({ message, onReset }) {
  return (
    <motion.div key="error" {...fade} className="flex flex-col items-center gap-2.5 py-1">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-rose-400"
        style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.22)" }}
      >
        <AlertIcon />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium text-rose-300" style={{ letterSpacing: "-0.011em" }}>
          Upload failed
        </p>
        <p className="text-[12px] text-white/50 mt-0.5 max-w-[220px] leading-snug">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-1 text-[12px] text-indigo-300 hover:text-indigo-200
                   transition-colors duration-100 cursor-pointer font-medium"
      >
        Try again
      </button>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * FileUploader
 *
 * Props
 * ─────
 *   courseId   string — target course _id
 *   onUploaded (resource) => void — called after a successful upload
 *   className  string — extra wrapper classes
 */
export default function FileUploader({ courseId, onUploaded, className = "" }) {
  const inputRef = useRef(null);

  const [phase,        setPhase]        = useState("idle");  // idle|dragging|uploading|done|error
  const [progress,     setProgress]     = useState(0);
  const [fileName,     setFileName]     = useState("");
  const [chunks,       setChunks]       = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [errMsg,       setErrMsg]       = useState("");

  const { mutateAsync } = useUploadResource();

  // ── Upload trigger ───────────────────────────────────────────────────────────
  const startUpload = useCallback(async (file) => {
    const validationErr = validateFile(file);
    if (validationErr) {
      setPhase("error");
      setErrMsg(validationErr);
      return;
    }

    setFileName(file.name);
    setProgress(0);
    setPhase("uploading");

    try {
      const data = await mutateAsync({
        courseId,
        file,
        onProgress: setProgress,
      });
      setChunks(data.resource?.chunksIndexed ?? null);
      setPendingCount(data.pendingExtractions?.length ?? 0);
      setPhase("done");
      onUploaded?.(data);
    } catch (err) {
      setPhase("error");
      setErrMsg(err.message ?? "Something went wrong.");
    }
  }, [courseId, mutateAsync, onUploaded]);

  // ── Drag events ──────────────────────────────────────────────────────────────
  function onDragOver(e) {
    e.preventDefault();
    if (phase === "idle") setPhase("dragging");
  }
  function onDragLeave(e) {
    // only fire if truly leaving the drop zone (not a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setPhase("idle");
    }
  }
  function onDrop(e) {
    e.preventDefault();
    setPhase("idle");
    const file = e.dataTransfer.files[0];
    if (file) startUpload(file);
  }

  // ── File input browse ────────────────────────────────────────────────────────
  function onBrowseClick() {
    inputRef.current?.click();
  }
  function onInputChange(e) {
    const file = e.target.files?.[0];
    if (file) startUpload(file);
    e.target.value = ""; // allow re-selecting same file
  }

  function reset() {
    setPhase("idle");
    setProgress(0);
    setFileName("");
    setChunks(null);
    setPendingCount(0);
    setErrMsg("");
  }

  const isDragging  = phase === "dragging";
  const isUploading = phase === "uploading";
  const isDone      = phase === "done";
  const isError     = phase === "error";
  const isIdle      = phase === "idle" || isDragging;
  const isClickable = isIdle;

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={isClickable ? onBrowseClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => isClickable && e.key === "Enter" && onBrowseClick()}
      aria-label="Upload file"
      className={[
        "relative flex flex-col items-center justify-center",
        "min-h-[148px] rounded-[18px] px-6 py-6",
        "transition-all duration-200 outline-none",
        isClickable ? "cursor-pointer" : "",
        className,
      ].join(" ")}
      style={{
        background:          isDragging
          ? "rgba(99,102,241,0.12)"
          : "rgba(255,255,255,0.08)",
        backdropFilter:      "blur(12px) saturate(140%)",
        WebkitBackdropFilter:"blur(12px) saturate(140%)",
        border:              isDragging
          ? "2px dashed rgba(129,140,248,0.8)"
          : isUploading
            ? "2px dashed rgba(255,255,255,0.25)"
            : isDone
              ? "2px dashed rgba(16,185,129,0.45)"
              : isError
                ? "2px dashed rgba(244,63,94,0.45)"
                : "2px dashed rgba(255,255,255,0.28)",
        boxShadow: isDragging
          ? "0 0 0 4px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.1)"
          : "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,.docx,.doc,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        onChange={onInputChange}
        className="sr-only"
        aria-hidden="true"
      />

      {/* Animated content swap */}
      <AnimatePresence mode="wait" initial={false}>
        {isIdle     && <IdleView     isDragging={isDragging} onBrowse={onBrowseClick} />}
        {isUploading && <UploadingView fileName={fileName}    progress={progress}       />}
        {isDone     && <SuccessView   fileName={fileName}    chunksIndexed={chunks}    pendingCount={pendingCount} onReset={reset} />}
        {isError    && <ErrorView     message={errMsg}                                 onReset={reset} />}
      </AnimatePresence>
    </div>
  );
}
