import { motion } from "framer-motion";

function barColor(pct) {
  if (pct >= 70) return "from-emerald-400 to-teal-500";
  if (pct >= 40) return "from-amber-400 to-orange-400";
  return "from-rose-400 to-pink-500";
}

/**
 * Animated assignment progress bar.
 *
 * @param {number}  value      - Completed count
 * @param {number}  max        - Total count
 * @param {boolean} showLabel  - Show "N of M complete / XX%" label row
 * @param {string}  className
 */
export default function ProgressBar({ value, max, showLabel = false, className = "" }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-gray-500 font-medium">
            {value} of {max} complete
          </span>
          <span className="text-[11px] font-semibold text-gray-600">{pct}%</span>
        </div>
      )}

      <div className="h-1.5 rounded-full overflow-hidden bg-black/[0.07]">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor(pct)}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
    </div>
  );
}
