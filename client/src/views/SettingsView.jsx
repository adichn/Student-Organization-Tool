import { useState } from "react";
import { motion } from "framer-motion";

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, description, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="glass-card rounded-[20px] overflow-hidden"
    >
      {/* Section header */}
      <div className="px-6 py-5 border-b border-black/[0.04]">
        <h2
          className="text-[15px] font-semibold text-gray-900 dark:text-white"
          style={{ letterSpacing: "-0.022em" }}
        >
          {title}
        </h2>
        {description && (
          <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">{description}</p>
        )}
      </div>

      {/* Section body */}
      <div className="px-6 py-5 space-y-4">{children}</div>
    </motion.div>
  );
}

// ── Row inside a section ──────────────────────────────────────────────────────

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200" style={{ letterSpacing: "-0.011em" }}>
          {label}
        </p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative w-10 h-6 rounded-full transition-all duration-200 cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 hover:scale-105"
      style={{ background: value ? "#6366f1" : "rgba(0,0,0,0.12)" }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm
                   transition-transform duration-200"
        style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
      />
    </button>
  );
}

// ── Danger button ─────────────────────────────────────────────────────────────

function DangerButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-rose-500
                 bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:scale-105
                 active:scale-95 transition-all duration-150 cursor-pointer"
    >
      {children}
    </button>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

/**
 * Props
 *   user      { name, email }
 *   onLogout  () => void
 */
export default function SettingsView({ user, onLogout }) {
  const [notifications, setNotifications] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  return (
    <div className="max-w-[680px] mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1
          className="text-[32px] font-semibold text-white leading-tight"
          style={{ letterSpacing: "-0.03em", textShadow: "0 2px 20px rgba(0,0,0,0.15)" }}
        >
          Settings
        </h1>
        <p className="text-[13px] text-white/55 mt-1">
          Manage your account and application preferences.
        </p>
      </div>

      {/* ── Account ─────────────────────────────────────────────────────────── */}
      <Section title="Account" description="Your profile information.">
        <Row label="Name">
          <span className="text-[13px] text-gray-500 dark:text-gray-300">{user?.name ?? "—"}</span>
        </Row>
        <Row label="Email">
          <span className="text-[13px] text-gray-500 dark:text-gray-300">{user?.email ?? "—"}</span>
        </Row>
        <div className="pt-2 border-t border-black/[0.04]">
          <DangerButton onClick={onLogout}>Sign out</DangerButton>
        </div>
      </Section>

      {/* ── Notifications ───────────────────────────────────────────────────── */}
      <Section title="Notifications" description="Control when the app alerts you.">
        <Row label="Push notifications" hint="Browser or desktop alerts for new items">
          <Toggle value={notifications} onChange={setNotifications} />
        </Row>
        <Row label="Deadline alerts" hint="Remind me 24 h before an assignment is due">
          <Toggle value={deadlineAlerts} onChange={setDeadlineAlerts} />
        </Row>
      </Section>

      {/* ── Appearance ──────────────────────────────────────────────────────── */}
      <Section title="Appearance" description="Visual and layout preferences.">
        <Row label="Compact mode" hint="Reduce padding in lists and cards">
          <Toggle value={compactMode} onChange={setCompactMode} />
        </Row>
      </Section>

      {/* ── AI & Integrations ───────────────────────────────────────────────── */}
      <Section
        title="AI & Integrations"
        description="Control syllabus extraction and research features."
      >
        <Row label="AI-powered extraction" hint="Automatically pull events from uploaded syllabi">
          <Toggle value={aiEnabled} onChange={setAiEnabled} />
        </Row>
        <Row
          label="Anthropic API key"
          hint="Supply your own key to bypass the free-tier quota"
        >
          <span className="text-[12px] text-indigo-400 font-medium cursor-not-allowed">
            Set via x-user-api-key header
          </span>
        </Row>
      </Section>

    </div>
  );
}
