/**
 * GlassCard — a frosted-glass surface primitive.
 *
 * Variants
 * ────────
 *   default   68% white, 20px blur — general-purpose card
 *   elevated  80% white, 24px blur — modal sheets, featured content
 *   subtle    38% white, 12px blur — nested/secondary cards
 *   frosted   92% white, 32px blur — dialogs, popovers
 *
 * Props
 * ─────
 *   variant   "default" | "elevated" | "subtle" | "frosted"
 *   padding   true (p-5, default) | false | any string passed as className padding
 *   hover     true (default) | false — disables the built-in hover lift
 *   as        element or component to render (default "div")
 *   className extra Tailwind classes
 */

const VARIANTS = {
  default:     "glass-card",
  elevated:    "glass-card-elevated",
  subtle:      "glass-card-subtle",
  frosted:     "glass-card-frosted",
  interactive: "glass-card-interactive",
};

export default function GlassCard({
  children,
  variant   = "default",
  padding   = true,
  hover     = true,
  as: Tag   = "div",
  className = "",
  ...props
}) {
  const base    = VARIANTS[variant] ?? VARIANTS.default;
  const padCls  = padding === true ? "p-5" : padding === false ? "" : padding;
  // When hover is off, we can't remove the :hover selector from the utility,
  // but we can neutralise it visually with pointer-events-none on a wrapper.
  // Instead, just pass `hover:!bg-[initial]` — simpler to skip by not using
  // the hover-interactive utility in favour of an explicit class.
  const hoverCls = hover ? "" : "hover:!bg-[rgba(255,255,255,0.68)] hover:!shadow-[inherit]";

  return (
    <Tag
      className={[base, padCls, hoverCls, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ── Compound sub-components ────────────────────────────────────────────────── */

/** Consistent section header inside a card. */
GlassCard.Header = function GlassCardHeader({ children, className = "", ...props }) {
  return (
    <div
      className={`flex items-center justify-between mb-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/** Horizontal divider that reads on any glass surface. */
GlassCard.Divider = function GlassCardDivider({ className = "" }) {
  return <div className={`glass-divider my-4 ${className}`} />;
};

/** Small muted helper text at the bottom of a card. */
GlassCard.Footer = function GlassCardFooter({ children, className = "", ...props }) {
  return (
    <div
      className={`mt-4 pt-3 border-t border-white/40 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
