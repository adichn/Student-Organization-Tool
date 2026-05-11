import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassButton from "./GlassButton.jsx";
import Button from "./Button.jsx";
import { useDomain, DOMAINS, DOMAIN_META } from "../../context/DomainContext.jsx";

/**
 * Returns the current university term based on today's month.
 */
function getCurrentTerm() {
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();
  if (month < 4)  return `Spring ${year}`;
  if (month < 8)  return `Summer ${year}`;
  return `Fall ${year}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SF Symbol-style icons
───────────────────────────────────────────────────────────────────────────── */
function Icon({ d, paths, children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d && <path d={d} />}
      {paths?.map((p, i) =>
        typeof p === "string" ? (
          <path key={i} d={p} />
        ) : (
          <p.type key={i} {...p.props} />
        )
      )}
      {children}
    </svg>
  );
}

const ICONS = {
  dashboard: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  courses: (
    <Icon>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Icon>
  ),
  calendar: (
    <Icon>
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
  ),
  resources: (
    <Icon>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  ),
  search: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  signOut: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  sun: (
    <Icon size={16}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Icon>
  ),
  moon: (
    <Icon size={16}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  ),
  app: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
};

/* ─────────────────────────────────────────────────────────────────────────────
   NAV SECTIONS
───────────────────────────────────────────────────────────────────────────── */
export const NAV_SECTIONS = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: ICONS.dashboard },
      { id: "courses",   label: "Courses",   icon: ICONS.courses   },
      { id: "calendar",  label: "Calendar",  icon: ICONS.calendar  },
      { id: "resources", label: "Resources", icon: ICONS.resources },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "settings", label: "Settings", icon: ICONS.settings },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   DOMAIN SWITCHER
   Reads/writes the global DomainContext. Lives between search and nav sections.
───────────────────────────────────────────────────────────────────────────── */
function DomainSwitcher() {
  const { activeDomain, setActiveDomain } = useDomain();

  return (
    <div className="px-3 pt-1 pb-0.5">
      {/* Section label */}
      <p
        className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase"
        style={{ letterSpacing: "0.07em" }}
      >
        Workspace
      </p>

      <ul className="space-y-0.5" role="listbox" aria-label="Active domain">
        {DOMAINS.map((domain) => {
          const meta     = DOMAIN_META[domain];
          const isActive = activeDomain === domain;

          return (
            <li key={domain} role="option" aria-selected={isActive}>
              <button
                onClick={() => setActiveDomain(domain)}
                className={[
                  "relative w-full flex items-center gap-2.5 px-3 py-[7px]",
                  "text-[13px] rounded-[9px] text-left select-none",
                  "transition-colors duration-100 cursor-pointer",
                  isActive
                    ? "text-gray-900 dark:text-gray-100 font-medium"
                    : "text-gray-500 dark:text-gray-400 font-normal hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/45 dark:hover:bg-white/10",
                ].join(" ")}
                style={{ letterSpacing: "-0.011em" }}
              >
                {/* Shared animated pill (same layoutId technique as NavItem) */}
                {isActive && (
                  <motion.span
                    layoutId="domain-active-pill"
                    className="absolute inset-0 glass-nav-active"
                    style={{ borderRadius: 9, zIndex: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}

                {/* Colored domain dot */}
                <span
                  className="relative z-10 shrink-0 w-2 h-2 rounded-full"
                  style={{ background: meta.dot, boxShadow: isActive ? `0 0 0 2.5px ${meta.dot}30` : "none" }}
                  aria-hidden="true"
                />

                <span className="relative z-10 leading-none">{meta.label}</span>

                {/* Active indicator line (right edge) */}
                {isActive && (
                  <motion.span
                    layoutId="domain-active-bar"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full z-10"
                    style={{ background: meta.dot }}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   NAV ITEM
───────────────────────────────────────────────────────────────────────────── */
function NavItem({ item, isActive, onClick }) {
  return (
    <li>
      <button
        onClick={() => onClick(item.id)}
        className={[
          "relative w-full flex items-center gap-3 px-3 py-2",
          "text-[13px] rounded-[9px] text-left select-none",
          "transition-colors duration-100 cursor-pointer",
          isActive
            ? "text-gray-900 dark:text-gray-100 font-medium"
            : "text-gray-500 dark:text-gray-400 font-normal hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/45 dark:hover:bg-white/10",
        ].join(" ")}
        style={{ letterSpacing: "-0.011em" }}
        aria-current={isActive ? "page" : undefined}
      >
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="absolute inset-0 glass-nav-active"
            style={{ borderRadius: 9, zIndex: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }}
          />
        )}

        <span
          className={[
            "relative z-10 shrink-0 leading-none",
            isActive ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500",
          ].join(" ")}
        >
          {item.icon}
        </span>

        <span className="relative z-10 leading-none">{item.label}</span>
      </button>
    </li>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────────────────────── */
/**
 * Props
 * ─────
 *   activeId      Controlled active nav ID (falls back to internal state)
 *   onNavigate    Called with the new nav ID when a link is clicked
 *   user          { name: string, email: string }
 *   onLogout      Called when Sign Out is clicked
 *   onOpenSearch  Called when the search bar / ⌘K trigger is clicked
 *   sections      Override NAV_SECTIONS with a custom array
 */
export default function Sidebar({
  activeId,
  onNavigate,
  user,
  onLogout,
  onOpenSearch,
  sections = NAV_SECTIONS,
  dark = false,
  onToggleTheme,
}) {
  const [localActive, setLocalActive] = useState("dashboard");
  const current = activeId ?? localActive;

  function handleClick(id) {
    setLocalActive(id);
    onNavigate?.(id);
  }

  return (
    <aside
      className="glass-sidebar w-64 shrink-0 flex flex-col h-screen sticky top-0 select-none"
      aria-label="Main navigation"
    >
      {/* ── Brand ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div
            className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            }}
          >
            {ICONS.app}
          </div>

          <span
            className="text-[15px] font-semibold text-gray-900 dark:text-white"
            style={{ letterSpacing: "-0.022em" }}
          >
            Semester
          </span>
        </div>

        <p
          className="text-[11px] text-gray-400 font-medium"
          style={{ letterSpacing: "0.02em", paddingLeft: "38px" }}
        >
          {user?.currentSemester ?? getCurrentTerm()}
        </p>
      </div>

      {/* ── Search trigger ───────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <Button
          variant="ghost"
          full
          onClick={onOpenSearch}
          className={[
            "h-auto py-2 px-3 rounded-[9px] text-left justify-start gap-2.5",
            "bg-black/[0.04] hover:bg-black/[0.07] dark:bg-white/[0.05] dark:hover:bg-white/[0.08]",
            "border border-black/[0.05] dark:border-white/[0.07]",
            "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300",
          ].join(" ")}
          aria-label="Open search (⌘K)"
        >
          {ICONS.search}
          <span className="flex-1 text-[12px] font-medium" style={{ letterSpacing: "-0.011em" }}>
            Search…
          </span>
          <span className="flex items-center gap-0.5 shrink-0" aria-hidden="true">
            <kbd className="text-[10px] font-semibold text-gray-400 bg-white/80 border border-gray-200 rounded-[4px] px-1 py-0.5 leading-none shadow-sm">
              ⌘
            </kbd>
            <kbd className="text-[10px] font-semibold text-gray-400 bg-white/80 border border-gray-200 rounded-[4px] px-1 py-0.5 leading-none shadow-sm">
              K
            </kbd>
          </span>
        </Button>
      </div>

      {/* ── Domain switcher ──────────────────────────────────────────────── */}
      <div className="pt-3">
        <DomainSwitcher />
      </div>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div className="mx-4 my-2.5 glass-divider" />

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-4">
        {sections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p
                className="px-3 mb-1.5 text-[10px] font-semibold text-gray-400 uppercase"
                style={{ letterSpacing: "0.06em" }}
              >
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={current === item.id}
                  onClick={handleClick}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── User strip ───────────────────────────────────────────────────── */}
      <div className="px-3 pb-5 pt-3 border-t border-white/40 dark:border-white/10 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-[9px]">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #f472b6 0%, #fb7185 100%)",
            }}
            aria-hidden="true"
          >
            <span className="text-white text-[11px] font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-tight truncate"
              style={{ letterSpacing: "-0.011em" }}
            >
              {user?.name ?? "Unknown"}
            </p>
            <p className="text-[11px] text-gray-400 truncate leading-tight">
              {user?.email ?? ""}
            </p>
          </div>
        </div>

        {onToggleTheme && (
          <Button
            variant="ghost"
            full
            onClick={onToggleTheme}
            icon={
              <span className="shrink-0 leading-none text-gray-400 dark:text-gray-500">
                {dark ? ICONS.sun : ICONS.moon}
              </span>
            }
            className="h-auto py-2 px-3 rounded-[9px] justify-start gap-3
                       text-[13px] text-gray-500 dark:text-gray-400
                       hover:text-gray-800 dark:hover:text-gray-200
                       hover:bg-white/45 dark:hover:bg-white/10"
            style={{ letterSpacing: "-0.011em" }}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? "Light mode" : "Dark mode"}
          </Button>
        )}

        <GlassButton
          variant="danger"
          size="sm"
          full
          icon={ICONS.signOut}
          onClick={onLogout}
          className="justify-start px-3"
        >
          Sign out
        </GlassButton>
      </div>
    </aside>
  );
}
