import { motion } from "framer-motion";

// Colour thresholds match ProgressBar for visual consistency
function ringColor(pct) {
  if (pct >= 70) return "#10b981"; // emerald-500
  if (pct >= 40) return "#f59e0b"; // amber-500
  return "#f43f5e";                // rose-500
}

/**
 * Apple Watch-style circular progress ring.
 *
 * @param {number}  value        - Completed count
 * @param {number}  max          - Total count
 * @param {number}  size         - Outer diameter in px (default 52)
 * @param {number}  strokeWidth  - Track/arc stroke thickness (default 4.5)
 * @param {string}  className
 */
export default function ProgressRing({
  value,
  max,
  size        = 52,
  strokeWidth = 4.5,
  className   = "",
}) {
  const pct          = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  const r            = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset       = circumference * (1 - pct / 100);
  const color        = ringColor(pct);
  const cx           = size / 2;

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* SVG rotated so the arc starts at the 12-o'clock position */}
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress arc */}
        <motion.circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>

      {/* Centre label — counter-rotated back to upright */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {max === 0 ? (
          <span className="text-[9px] font-semibold text-gray-400 leading-none">
            —
          </span>
        ) : (
          <>
            <span
              className="text-[12px] font-bold leading-none"
              style={{ color, letterSpacing: "-0.03em" }}
            >
              {pct}%
            </span>
          </>
        )}
      </div>
    </div>
  );
}
