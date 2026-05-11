import { useMemo } from "react";
import { motion } from "framer-motion";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function typeIcon(type) {
  if (type === "document" || type === "file")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  if (type === "link")
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

// ── Resource row ──────────────────────────────────────────────────────────────

function ResourceRow({ resource, courseName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card flex items-center gap-4 px-4 py-3 rounded-[12px] group cursor-default"
    >
      <span className="text-indigo-400 shrink-0">{typeIcon(resource.type)}</span>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-800 truncate"
           style={{ letterSpacing: "-0.011em" }}>
          {resource.title}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">{courseName}</p>
      </div>

      <div className="text-right shrink-0">
        {resource.fileSize > 0 && (
          <p className="text-[11px] text-gray-400">{formatBytes(resource.fileSize)}</p>
        )}
        {resource.uploadedAt && (
          <p className="text-[10px] text-gray-300 mt-0.5">
            {new Date(resource.uploadedAt).toLocaleDateString("en-US", {
              month: "short", day: "numeric",
            })}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="glass-card-subtle flex flex-col items-center justify-center py-20 gap-3 rounded-[20px]"
    >
      <div
        className="w-12 h-12 rounded-[14px] flex items-center justify-center text-indigo-300"
        style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.6)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p className="text-[14px] font-medium text-white/80" style={{ letterSpacing: "-0.016em" }}>
        No resources yet
      </p>
      <p className="text-[12px] text-white/50 max-w-[240px] text-center leading-relaxed">
        Upload syllabi, lecture notes, or PDFs from the Course view and they'll appear here.
      </p>
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

/**
 * Props
 *   years  — normalised Year[] from useYears() (nested semesters → courses → resources)
 */
export default function ResourcesView({ years = [] }) {
  // Flatten all resources across every course, tagged with course + semester name
  const allResources = useMemo(() => {
    const out = [];
    for (const year of years) {
      for (const sem of year.semesters ?? []) {
        for (const course of sem.courses ?? []) {
          for (const res of course.resources ?? []) {
            out.push({
              ...res,
              courseName: `${course.title ?? course.name} · ${sem.name}`,
            });
          }
        }
      }
    }
    // Most recently uploaded first
    return out.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  }, [years]);

  return (
    <div className="max-w-[860px] mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1
          className="text-[32px] font-semibold text-white leading-tight"
          style={{ letterSpacing: "-0.03em", textShadow: "0 2px 20px rgba(0,0,0,0.15)" }}
        >
          Resources
        </h1>
        <p className="text-[13px] text-white/55 mt-1">
          All uploaded files and notes across your courses.
        </p>
      </div>

      {/* Stats pill row */}
      {allResources.length > 0 && (
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-full text-[12px] font-medium"
            style={{
              background: "rgba(99,102,241,0.15)",
              border:     "1px solid rgba(99,102,241,0.25)",
              color:      "rgba(165,180,252,0.9)",
            }}
          >
            {allResources.length} file{allResources.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Resource list or empty state */}
      {allResources.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {allResources.map((r) => (
            <ResourceRow key={r._id} resource={r} courseName={r.courseName} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
