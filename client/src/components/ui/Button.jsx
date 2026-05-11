import { forwardRef } from "react";

/**
 * Button — CSS-native premium button component.
 *
 * Uses Tailwind utilities only (no Framer Motion) so it remains lightweight
 * in contexts that don't need spring animations. For spring-pressed variants
 * see GlassButton.
 *
 * Variants
 * ────────
 *   primary    Slate-900 fill, white text. Dark-mode inverts to slate-100.
 *   secondary  Glassmorphism — semi-transparent bg, subtle border.
 *   ghost      No background; subtle tint on hover. Sidebar / inline actions.
 *   danger     Rose-tinted bg, darker rose text. Destructive actions.
 *
 * Sizes
 * ─────
 *   xs   h-7,  text-11px — compact chips / toolbar pills
 *   sm   h-8,  text-12px — sidebar actions, row-level buttons
 *   md   h-9,  text-13px — default (panel CTAs)
 *   lg   h-11, text-15px — primary page-level actions
 *
 * Props
 * ─────
 *   icon          ReactNode — leading icon
 *   iconTrailing  ReactNode — trailing icon / chevron
 *   loading       boolean   — replaces content with spinner (preserves width)
 *   full          boolean   — w-full
 *   square        boolean   — removes horizontal padding (icon-only)
 */

// ── Variant styles ─────────────────────────────────────────────────────────────

const VARIANT_CLS = {
  primary: [
    "bg-slate-900 text-white shadow-sm",
    "hover:bg-slate-800 active:bg-slate-950",
    "dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:active:bg-white",
    "focus-visible:ring-slate-900 dark:focus-visible:ring-slate-300",
  ].join(" "),

  secondary: [
    "bg-white/50 backdrop-blur-sm",
    "border border-slate-200 text-slate-700",
    "hover:bg-white/80",
    "dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/80",
    "focus-visible:ring-slate-400",
  ].join(" "),

  ghost: [
    "bg-transparent text-slate-600",
    "hover:bg-slate-100 hover:text-slate-900",
    "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    "focus-visible:ring-slate-400",
  ].join(" "),

  danger: [
    "bg-rose-50 text-rose-600",
    "hover:bg-rose-100 hover:text-rose-700",
    "border border-transparent hover:border-rose-200",
    "dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-300",
    "focus-visible:ring-rose-400",
  ].join(" "),
};

// ── Size styles ────────────────────────────────────────────────────────────────

const SIZE_CLS = {
  xs: "h-7  text-[11px] px-2.5 rounded-[7px]  gap-1",
  sm: "h-8  text-[12px] px-3   rounded-[8px]  gap-1.5",
  md: "h-9  text-[13px] px-4   rounded-[10px] gap-2",
  lg: "h-11 text-[15px] px-5   rounded-[12px] gap-2.5",
};

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner({ variant }) {
  const color =
    variant === "primary" ? "text-white/70"
    : variant === "danger" ? "text-rose-400"
    : "text-slate-400";

  return (
    <svg
      className={`animate-spin w-[1em] h-[1em] shrink-0 ${color}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

const Button = forwardRef(function Button(
  {
    children,
    variant      = "secondary",
    size         = "md",
    loading      = false,
    icon         = null,
    iconTrailing = null,
    full         = false,
    square       = false,
    className    = "",
    disabled,
    type         = "button",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  const sizeCls = SIZE_CLS[size] ?? SIZE_CLS.md;

  const classes = [
    "inline-flex items-center justify-center",
    "font-medium select-none cursor-pointer",
    "transition-all duration-200",
    "active:scale-95",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    square ? sizeCls.replace(/px-[\d.]+\s?/, "").trim() : sizeCls,
    square ? "aspect-square px-0" : "",
    full ? "w-full" : "",
    VARIANT_CLS[variant] ?? VARIANT_CLS.secondary,
    "tracking-[-0.011em]",
    isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={classes}
      {...props}
    >
      {loading ? (
        <>
          <Spinner variant={variant} />
          {/* Invisible ghost preserves width during loading */}
          <span className="opacity-0 pointer-events-none select-none" aria-hidden="true">
            {children}
          </span>
        </>
      ) : (
        <>
          {icon         && <span className="shrink-0 leading-none">{icon}</span>}
          {children     && <span>{children}</span>}
          {iconTrailing && <span className="shrink-0 leading-none">{iconTrailing}</span>}
        </>
      )}
    </button>
  );
});

export default Button;
