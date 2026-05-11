import { createContext, useContext, useState } from "react";

// Ordered list of all valid domains (matches backend VALID_DOMAINS + "All")
export const DOMAINS = ["All", "Academic", "Professional", "Personal", "Career"];

// Visual tokens for each domain — used by badges, dots, and switcher
export const DOMAIN_META = {
  All: {
    label: "All",
    dot:   "#6366f1",
    badge: { bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.22)",  text: "#4f46e5" },
  },
  Academic: {
    label: "Academic",
    dot:   "#22c55e",
    badge: { bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.25)",   text: "#15803d" },
  },
  Professional: {
    label: "Professional",
    dot:   "#3b82f6",
    badge: { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.25)",  text: "#1d4ed8" },
  },
  Personal: {
    label: "Personal",
    dot:   "#a855f7",
    badge: { bg: "rgba(168,85,247,0.10)",  border: "rgba(168,85,247,0.25)",  text: "#7e22ce" },
  },
  Career: {
    label: "Career",
    dot:   "#f59e0b",
    badge: { bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.25)",  text: "#b45309" },
  },
};

const DomainContext = createContext(null);

export function DomainProvider({ children }) {
  const [activeDomain, setActiveDomain] = useState("All");
  return (
    <DomainContext.Provider value={{ activeDomain, setActiveDomain }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const ctx = useContext(DomainContext);
  if (!ctx) throw new Error("useDomain must be used inside <DomainProvider>");
  return ctx;
}
