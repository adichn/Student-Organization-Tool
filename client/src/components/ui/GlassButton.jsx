import { motion } from "framer-motion";

/**
 * GlassButton — Apple-style minimalist button.
 *
 * Design principles
 * ─────────────────
 *   • No harsh drop-shadows — rely on contrast and subtle fills instead.
 *   • Every variant uses the SF Pro font stack inherited from body.
 *   • Press scale via Framer Motion (0.97) mirrors UIKit spring feedback.
 *   • Loading state preserves button dimensions — no layout shift.
 *
 * Variants
 * ────────
 *   primary   Indigo→violet gradient fill, white text. Main CTA.
 *   secondary Semi-transparent glass fill, dark text. Secondary action.
 *   ghost     Transparent + subtle hover tint. Tertiary / inline.
 *   danger    Rose hover tint. Destructive actions.
 *   tint      Indigo-50 fill. Accent/filter pill.
 *
 * Sizes
 * ─────
 *   xs   h-7,  text-11px — compact chips / toolbar
 *   sm   h-8,  text-12px — sidebar actions, list row buttons
 *   md   h-9,  text-13px — default (most panels)
 *   lg   h-11, text-15px — primary page actions
 *
 * Other props
 * ───────────
 *   icon          ReactNode — leading icon (sized to match text)
 *   iconTrailing  ReactNode — trailing icon / chevron
 *   loading       boolean   — replaces content with spinner
 *   full          boolean   — w-full
 *   square        boolean   — removes horizontal padding for icon-only buttons
 */

/* ── Variant styles ───────────────────────────────────────────────────────── */
const VARIANT_CLS = {
  primary: [
    "bg-gradient-to-r from-indigo-500 to-violet-500",
    "hover:from-indigo-600 hover:to-violet-600",
    "active:from-indigo-700 active:to-violet-700",
    "text-white",
    "border border-indigo-400/30",
    "shadow-sm shadow-indigo-300/30",
  ].join(" "),

  secondary: [
    "bg-white/70 hover:bg-white/90",
    "backdrop-blur-sm",
    "text-gray-700",
    "border border-gray-200/80",
    "shadow-sm",
  ].join(" "),

  ghost: [
    "bg-transparent hover:bg-black/[0.05]",
    "text-gray-600 hover:text-gray-900",
    "border border-transparent",
  ].join(" "),

  danger: [
    "bg-transparent hover:bg-rose-50",
    "text-rose-500 hover:text-rose-600",
    "border border-transparent hover:border-rose-100",
  ].join(" "),

  tint: [
    "bg-indigo-50 hover:bg-indigo-100",
    "text-indigo-700",
    "border border-indigo-100",
  ].join(" "),
};

/* ── Size styles ─────────────────────────────────────────────────────────── */
const SIZE_CLS = {
  xs: "h-7  text-[11px] px-2.5 rounded-[7px]  gap-1",
  sm: "h-8  text-[12px] px-3   rounded-[8px]  gap-1.5",
  md: "h-9  text-[13px] px-4   rounded-[10px] gap-2",
  lg: "h-11 text-[15px] px-5   rounded-[12px] gap-2",
};

/* ── Font-weight per variant ─────────────────────────────────────────────── */
const WEIGHT_CLS = {
  primary:   "font-semibold",
  secondary: "font-medium",
  ghost:     "font-medium",
  danger:    "font-medium",
  tint:      "font-semibold",
};

/* ── Spinner ─────────────────────────────────────────────────────────────── */
function Spinner({ variant }) {
  const color =
    variant === "primary" ? "text-white/80" :
    variant === "danger"  ? "text-rose-400" :
    "text-indigo-400";

  return (
    <svg
      className={`animate-spin w-[1em] h-[1em] shrink-0 ${color}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function GlassButton({
  children,
  variant       = "secondary",
  size          = "md",
  loading       = false,
  icon          = null,
  iconTrailing  = null,
  full          = false,
  square        = false,
  className     = "",
  disabled,
  type          = "button",
  ...props
}) {
  const isDisabled = disabled || loading;

  const classes = [
    // Layout
    "inline-flex items-center justify-center",
    "select-none cursor-pointer",
    // Transition — covers color, background, border, shadow
    "transition-all duration-150",
    // Sizing
    square ? SIZE_CLS[size]?.replace(/px-[\d.]+\s?/, "") : SIZE_CLS[size],
    square ? "aspect-square px-0" : "",
    full ? "w-full" : "",
    // Variant
    VARIANT_CLS[variant],
    WEIGHT_CLS[variant],
    // Letter spacing to match SF Pro optical sizing
    "tracking-[-0.011em]",
    // Disabled
    isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      className={classes}
      whileTap={isDisabled ? {} : { scale: 0.95 }}
      whileHover={isDisabled ? {} : { scale: 1.05 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      {...props}
    >
      {loading ? (
        <>
          <Spinner variant={variant} />
          {/* Keep the text invisible so the button width doesn't collapse */}
          <span className="opacity-0 pointer-events-none select-none" aria-hidden="true">
            {children}
          </span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0 leading-none">{icon}</span>}
          {children && <span>{children}</span>}
          {iconTrailing && <span className="shrink-0 leading-none">{iconTrailing}</span>}
        </>
      )}
    </motion.button>
  );
}

/* ── Group ───────────────────────────────────────────────────────────────── */
/**
 * GlassButton.Group — renders buttons in a segmented control style.
 * Children should be <GlassButton> elements.
 *
 * @example
 * <GlassButton.Group>
 *   <GlassButton variant="secondary">Week</GlassButton>
 *   <GlassButton variant="primary">Month</GlassButton>
 *   <GlassButton variant="secondary">Year</GlassButton>
 * </GlassButton.Group>
 */
GlassButton.Group = function GlassButtonGroup({ children, className = "" }) {
  return (
    <div
      className={[
        "inline-flex items-center",
        "bg-white/60 backdrop-blur-sm",
        "border border-gray-200/70 rounded-[12px] p-1 gap-0.5",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};
