import { useState } from "react";

/* ── SF Symbol-style SVG icons (24×24, 1.6 stroke, round caps) ────────────── */
const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  courses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  resources: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const NAV_SECTIONS = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", icon: icons.dashboard },
      { id: "courses",   label: "Courses",   icon: icons.courses },
      { id: "calendar",  label: "Calendar",  icon: icons.calendar },
      { id: "resources", label: "Resources", icon: icons.resources },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "settings", label: "Settings", icon: icons.settings },
    ],
  },
];

/* ── NavItem ───────────────────────────────────────────────────────────────── */
function NavItem({ item, isActive, onClick }) {
  return (
    <button
      onClick={() => onClick(item.id)}
      className={[
        "w-full flex items-center gap-3 px-3 py-2 text-sm cursor-pointer",
        "transition-all duration-150 rounded-[9px] text-left select-none",
        isActive
          ? "glass-nav-active text-gray-900 font-medium"
          : "text-gray-600 hover:bg-white/45 hover:text-gray-900",
      ].join(" ")}
    >
      <span className={isActive ? "text-gray-800" : "text-gray-400"}>
        {item.icon}
      </span>
      {item.label}
    </button>
  );
}

/* ── Sidebar ───────────────────────────────────────────────────────────────── */
export default function Sidebar({ activeId, onNavigate, user, onLogout }) {
  const [localActive, setLocalActive] = useState("dashboard");

  const current = activeId ?? localActive;

  function handleClick(id) {
    setLocalActive(id);
    onNavigate?.(id);
  }

  return (
    <aside className="glass-sidebar w-60 shrink-0 flex flex-col h-screen sticky top-0 select-none">
      {/* App identity */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <span
            className="text-[15px] font-semibold text-gray-900"
            style={{ letterSpacing: "-0.022em" }}
          >
            Semester
          </span>
        </div>
        <p className="text-[11px] text-gray-400 pl-9.5 font-medium" style={{ letterSpacing: "0.02em" }}>
          Fall 2025
        </p>
      </div>

      {/* Divider */}
      <div className="mx-4 my-3 h-px bg-white/60 border-t border-gray-200/50" />

      {/* Navigation */}
      <nav className="flex-1 px-3 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map((section, i) => (
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
                <li key={item.id}>
                  <NavItem
                    item={item}
                    isActive={current === item.id}
                    onClick={handleClick}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* User profile strip */}
      <div className="px-3 pb-5 pt-3 border-t border-white/40 space-y-1">
        <div className="w-full flex items-center gap-3 px-3 py-2 rounded-[9px]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-[11px] font-semibold">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p
              className="text-[13px] font-medium text-gray-800 leading-tight truncate"
              style={{ letterSpacing: "-0.011em" }}
            >
              {user?.name ?? "Unknown"}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email ?? ""}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium
                     text-gray-500 hover:text-rose-600 hover:bg-rose-50/60
                     transition-all duration-150 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
