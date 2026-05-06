const variants = {
  default: "glass-card",
  elevated: "glass-card-elevated",
  subtle: "glass-card-subtle",
};

/**
 * GlassCard — a frosted-glass surface.
 *
 * @param {"default"|"elevated"|"subtle"} variant
 * @param {string}  className  Extra Tailwind classes
 * @param {boolean} asChild    When true, renders children directly (no wrapper div)
 */
export default function GlassCard({
  children,
  variant = "default",
  className = "",
  asChild = false,
  ...props
}) {
  if (asChild) return children;

  return (
    <div className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
