import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassCard              from "./GlassCard";
import FileUploader           from "./FileUploader";
import ExtractionReviewModal  from "./ExtractionReviewModal";
import Button                 from "./ui/Button";
import { useDeleteResource }  from "../hooks/useResources";

// ── Session-storage key ───────────────────────────────────────────────────────
// Keyed per-course so uploads from different courses don't clobber each other.
function storageKey(courseId) {
  return `extraction_pending_${courseId}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fileExt(title = "") {
  const m = title.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : "FILE";
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6"  x2="21" y2="6"  />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6"  x2="3.01" y2="6"  />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── File type visual ──────────────────────────────────────────────────────────

const EXT_COLORS = {
  PDF:  { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)",  text: "#ef4444" },
  TXT:  { bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.22)", text: "#6366f1" },
  MD:   { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.22)", text: "#10b981" },
};

function FileTypeBadge({ ext, large = false }) {
  const style = EXT_COLORS[ext] ?? { bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.20)", text: "#6b7280" };
  const size  = large ? { width: 56, height: 56, fontSize: 13 } : { width: 32, height: 32, fontSize: 10 };
  return (
    <div
      className="flex items-center justify-center rounded-[10px] font-bold select-none shrink-0"
      style={{
        width:         size.width,
        height:        size.height,
        background:    style.bg,
        border:        `1px solid ${style.border}`,
        color:         style.text,
        fontSize:      size.fontSize,
        letterSpacing: "0.04em",
      }}
    >
      {ext}
    </div>
  );
}

// ── Inline confirm ────────────────────────────────────────────────────────────
// Two-step: first click → "Delete?" prompt inline, second → confirmed delete.

function InlineConfirmDelete({ onConfirm, isDeleting, label }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[11px] font-medium text-rose-500">Delete?</span>
        <button
          onClick={() => { onConfirm(); setConfirming(false); }}
          disabled={isDeleting}
          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700
                     px-1.5 py-0.5 rounded-[5px] hover:bg-rose-50
                     transition-all duration-100 cursor-pointer disabled:opacity-50"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-[11px] font-medium text-gray-400 hover:text-gray-600
                     px-1.5 py-0.5 rounded-[5px] hover:bg-gray-100
                     transition-all duration-100 cursor-pointer"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-7 h-7 flex items-center justify-center rounded-[8px]
                 text-white/30 hover:text-rose-400 hover:bg-rose-400/10
                 transition-all duration-100 cursor-pointer
                 opacity-0 group-hover:opacity-100"
      aria-label={label}
    >
      <TrashIcon />
    </button>
  );
}

// ── Animation variants ────────────────────────────────────────────────────────

const itemFade = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:   { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({
  searchQuery, onSearch,
  viewMode,   onViewMode,
  sortOption, onSort,
  onUploadClick,
  uploadDisabled,
}) {
  const [sortOpen, setSortOpen] = useState(false);
  const SORT_LABELS = { name: "Name", date: "Date Uploaded" };

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search files…"
          className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px] outline-none
                     bg-white/[0.12] backdrop-blur-sm border border-white/20
                     text-white placeholder:text-white/35
                     focus:border-white/40 focus:bg-white/[0.16]
                     transition-all duration-150"
        />
      </div>

      <div className="flex-1" />

      {/* View toggle */}
      <div className="flex items-center rounded-[10px] overflow-hidden border border-white/20 bg-white/[0.10]">
        {["grid", "list"].map((mode) => (
          <button
            key={mode}
            onClick={() => onViewMode(mode)}
            className={[
              "flex items-center justify-center w-8 h-8 transition-all duration-100 cursor-pointer",
              viewMode === mode
                ? "bg-white/30 text-white"
                : "text-white/50 hover:text-white/80",
            ].join(" ")}
            title={mode === "grid" ? "Grid view" : "List view"}
          >
            {mode === "grid" ? <GridIcon /> : <ListIcon />}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="relative">
        <button
          onClick={() => setSortOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px]
                     font-medium text-white/75 bg-white/[0.12] backdrop-blur-sm
                     border border-white/20 hover:bg-white/[0.18]
                     transition-all duration-100 cursor-pointer"
        >
          {SORT_LABELS[sortOption]}
          <ChevronDownIcon />
        </button>

        <AnimatePresence>
          {sortOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: -4,  scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="glass-modal absolute right-0 top-full mt-1.5 w-44 rounded-[12px] overflow-hidden z-20"
            >
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { onSort(key); setSortOpen(false); }}
                  className={[
                    "w-full text-left px-4 py-2.5 text-[13px] transition-colors duration-100 cursor-pointer",
                    sortOption === key
                      ? "font-semibold text-indigo-600 bg-indigo-50/60"
                      : "text-gray-700 hover:bg-gray-100/60",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload button — disabled while extractions are pending */}
      <button
        onClick={onUploadClick}
        disabled={uploadDisabled}
        className={[
          "flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px]",
          "font-medium text-white backdrop-blur-sm border",
          "transition-all duration-150 cursor-pointer shadow-sm",
          uploadDisabled
            ? "bg-white/[0.10] border-white/10 text-white/40 cursor-not-allowed"
            : "bg-indigo-500/80 hover:bg-indigo-500 border-indigo-400/40",
        ].join(" ")}
        title={uploadDisabled ? "Review extracted items before uploading another file" : "Upload a file"}
      >
        <UploadIcon />
        {uploadDisabled ? "Review pending…" : "Upload"}
      </button>
    </div>
  );
}

// ── Pending review banner ─────────────────────────────────────────────────────

function PendingBanner({ count, onReview }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] mb-4"
      style={{
        background: "rgba(245,158,11,0.12)",
        border:     "1px solid rgba(245,158,11,0.30)",
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <p className="text-[13px] font-medium text-amber-200" style={{ letterSpacing: "-0.011em" }}>
          {count} extracted item{count !== 1 ? "s" : ""} need your review before you can upload again.
        </p>
      </div>
      <button
        onClick={onReview}
        className="shrink-0 text-[12px] font-semibold text-amber-300 hover:text-amber-100
                   transition-colors duration-100 cursor-pointer underline underline-offset-2"
      >
        Review now →
      </button>
    </motion.div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function ListRow({ resource, onDelete, isDeleting }) {
  const ext = fileExt(resource.title);
  return (
    <motion.div
      variants={itemFade}
      layout
      className="group flex items-center gap-4 px-4 py-3.5
                 border-b border-white/[0.10] last:border-b-0
                 hover:bg-white/[0.06] transition-colors duration-100"
    >
      <FileTypeBadge ext={ext} />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-white/90 truncate"
           style={{ letterSpacing: "-0.011em" }}>
          {resource.title}
        </p>
        {resource.fileSize > 0 && (
          <p className="text-[11px] text-white/40 mt-0.5">{formatBytes(resource.fileSize)}</p>
        )}
      </div>

      <span className="text-[12px] text-white/50 shrink-0 hidden sm:block tabular-nums">
        {formatDate(resource.uploadedAt)}
      </span>

      <InlineConfirmDelete
        onConfirm={() => onDelete(resource)}
        isDeleting={isDeleting}
        label={`Delete ${resource.title}`}
      />
    </motion.div>
  );
}

// ── Grid card ─────────────────────────────────────────────────────────────────

function GridCard({ resource, onDelete, isDeleting }) {
  const ext = fileExt(resource.title);
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      variants={itemFade}
      layout
      className="group relative"
    >
      <motion.div
        whileHover={{ y: -3, transition: { duration: 0.16 } }}
        className="cursor-default"
      >
        <GlassCard variant="subtle" className="p-5 flex flex-col items-center gap-3 text-center min-h-[148px] justify-center">
          <FileTypeBadge ext={ext} large />

          <div className="w-full">
            <p className="text-[12px] font-medium text-white/90 truncate leading-snug"
               style={{ letterSpacing: "-0.011em" }}>
              {resource.title}
            </p>
            <p className="text-[11px] text-white/40 mt-0.5">
              {formatBytes(resource.fileSize) || formatDate(resource.uploadedAt)}
            </p>
          </div>
        </GlassCard>
      </motion.div>

      {/* Inline confirm overlay */}
      <AnimatePresence>
        {confirming ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5
                       px-2.5 py-1.5 rounded-[10px]"
            style={{
              background: "rgba(254,242,242,0.95)",
              border:     "1px solid rgba(239,68,68,0.25)",
              boxShadow:  "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <span className="text-[11px] font-medium text-rose-600">Delete?</span>
            <button
              onClick={() => { onDelete(resource); setConfirming(false); }}
              disabled={isDeleting}
              className="text-[11px] font-semibold text-white bg-rose-500 hover:bg-rose-600
                         px-1.5 py-0.5 rounded-[5px] transition-colors duration-100
                         cursor-pointer disabled:opacity-50"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-[11px] font-medium text-gray-500 hover:text-gray-700
                         px-1.5 py-0.5 rounded-[5px] hover:bg-gray-100
                         transition-colors duration-100 cursor-pointer"
            >
              No
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="trash"
            onClick={() => setConfirming(true)}
            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center
                       rounded-[8px] text-white/40 hover:text-rose-400 hover:bg-rose-400/10
                       transition-all duration-100 cursor-pointer
                       opacity-0 group-hover:opacity-100"
            aria-label={`Delete ${resource.title}`}
          >
            <TrashIcon />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Upload drawer ─────────────────────────────────────────────────────────────

function UploadDrawer({ courseId, show, onUploaded }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          className="overflow-hidden mb-5"
        >
          <FileUploader courseId={courseId} onUploaded={onUploaded} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filtered, onUploadClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
      <div
        className="w-12 h-12 rounded-[16px] flex items-center justify-center"
        style={{
          background: "rgba(255,255,255,0.12)",
          border:     "1px solid rgba(255,255,255,0.20)",
          color:      "rgba(255,255,255,0.45)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <p className="text-[14px] font-medium text-white/70" style={{ letterSpacing: "-0.011em" }}>
        {filtered ? "No files match your search" : "No files uploaded yet"}
      </p>
      <p className="text-[12px] text-white/40 max-w-[220px] leading-relaxed">
        {filtered
          ? "Try a different search term."
          : "Upload PDFs or text files to give the AI context about this course."}
      </p>
      {!filtered && (
        <button
          onClick={onUploadClick}
          className="mt-1 flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px]
                     font-medium text-white/80 bg-white/[0.14] backdrop-blur-sm
                     border border-white/20 hover:bg-white/[0.20]
                     transition-all duration-150 cursor-pointer"
        >
          <UploadIcon />
          Upload a file
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * ResourceManager
 *
 * Props
 * ─────
 *   course     Course subdocument — must have `._id` and `.resources[]`
 *   className  string — extra wrapper classes
 */
export default function ResourceManager({ course, className = "" }) {
  const courseId  = String(course._id);
  const resources = course.resources ?? [];

  // ── State ────────────────────────────────────────────────────────────────
  const [viewMode,      setViewMode]      = useState("grid");
  const [sortOption,    setSortOption]    = useState("date");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [showUploader,  setShowUploader]  = useState(false);
  const [pendingItems,  setPendingItems]  = useState(null);  // extraction items | null
  const [reviewOpen,    setReviewOpen]    = useState(false); // controls modal visibility

  const { mutate: doDelete, isPending: isDeleting } = useDeleteResource();

  // ── Restore pending extractions from sessionStorage on mount ─────────────
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey(courseId));
      if (stored) {
        const { items } = JSON.parse(stored);
        if (Array.isArray(items) && items.length > 0) {
          setPendingItems(items);
          setReviewOpen(true);
        }
      }
    } catch {
      // corrupt storage — clear it
      sessionStorage.removeItem(storageKey(courseId));
    }
  }, [courseId]);

  // ── Derived list ─────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = resources;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (sortOption === "name") {
      list = [...list].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.uploadedAt ?? 0) - new Date(a.uploadedAt ?? 0)
      );
    }
    return list;
  }, [resources, searchQuery, sortOption]);

  const isFiltered = searchQuery.trim().length > 0;
  const hasPending = !!pendingItems;

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleUploaded(data) {
    setShowUploader(false);
    if (data?.pendingExtractions?.length) {
      const items = data.pendingExtractions;
      // Persist so a page refresh restores the review gate
      sessionStorage.setItem(storageKey(courseId), JSON.stringify({ items }));
      setPendingItems(items);
      setReviewOpen(true);
    }
  }

  function clearPendingState() {
    sessionStorage.removeItem(storageKey(courseId));
    setPendingItems(null);
    setReviewOpen(false);
  }

  function handleDelete(resource) {
    doDelete({ courseId, resourceId: String(resource._id) });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={className}>
      {/* Pending review banner — persists even if modal is somehow closed */}
      <AnimatePresence>
        {hasPending && !reviewOpen && (
          <PendingBanner
            count={pendingItems.length}
            onReview={() => setReviewOpen(true)}
          />
        )}
      </AnimatePresence>

      <Toolbar
        searchQuery={searchQuery}  onSearch={setSearchQuery}
        viewMode={viewMode}        onViewMode={setViewMode}
        sortOption={sortOption}    onSort={setSortOption}
        onUploadClick={() => setShowUploader((v) => !v)}
        uploadDisabled={hasPending}
      />

      <UploadDrawer
        courseId={courseId}
        show={showUploader && !hasPending}
        onUploaded={handleUploaded}
      />

      {displayed.length === 0 ? (
        <EmptyState
          filtered={isFiltered}
          onUploadClick={() => !hasPending && setShowUploader(true)}
        />
      ) : viewMode === "list" ? (
        <div className="glass-card rounded-[14px] overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-white/[0.10]">
            <div className="w-8 shrink-0" />
            <p className="flex-1 text-[10px] font-semibold text-white/45 uppercase"
               style={{ letterSpacing: "0.07em" }}>
              Name
            </p>
            <p className="text-[10px] font-semibold text-white/45 uppercase shrink-0 hidden sm:block"
               style={{ letterSpacing: "0.07em" }}>
              Uploaded
            </p>
            <div className="w-7 shrink-0" />
          </div>

          <motion.div variants={stagger} initial="hidden" animate="show">
            <AnimatePresence initial={false}>
              {displayed.map((res) => (
                <ListRow
                  key={String(res._id)}
                  resource={res}
                  onDelete={handleDelete}
                  isDeleting={isDeleting}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <AnimatePresence initial={false}>
            {displayed.map((res) => (
              <GridCard
                key={String(res._id)}
                resource={res}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {resources.length > 0 && (
        <p className="mt-4 text-[11px] text-white/35 text-right" style={{ letterSpacing: "0.01em" }}>
          {displayed.length} of {resources.length} file{resources.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Human-in-the-loop extraction review modal */}
      <ExtractionReviewModal
        isOpen={reviewOpen}
        items={pendingItems ?? []}
        courseId={courseId}
        onSaved={clearPendingState}
        onDiscard={clearPendingState}
      />
    </div>
  );
}
