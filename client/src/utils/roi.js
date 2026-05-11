// ── ROI Engine ────────────────────────────────────────────────────────────────
// Priority Score = gradeBusinessValue / estimatedEffort
// For School tasks, the course's difficultyMultiplier scales urgency.
// difficultyMultiplier 5 = neutral (1×), 10 = 2×, 1 = 0.2×.

/**
 * Compute the raw priority score (no difficulty adjustment).
 * @param {number} gradeBusinessValue  0–100
 * @param {number} estimatedEffort     hours, > 0
 */
export function basePriorityScore(gradeBusinessValue, estimatedEffort) {
  if (!estimatedEffort || estimatedEffort <= 0) return 0;
  return gradeBusinessValue / estimatedEffort;
}

/**
 * Compute the adjusted priority score for a task.
 * Applies course difficultyMultiplier for Academic domain tasks.
 * @param {{ domain: string, gradeBusinessValue: number, estimatedEffort: number, courseRef?: { difficultyMultiplier?: number } }} task
 */
export function priorityScore(task) {
  const base = basePriorityScore(task.gradeBusinessValue, task.estimatedEffort);
  if (task.domain === "Academic" && task.courseRef?.difficultyMultiplier) {
    return base * (task.courseRef.difficultyMultiplier / 5);
  }
  return base;
}

/**
 * Human-readable tier for a priority score.
 * @param {number} score
 * @returns {{ label: string, color: string }}
 */
export function priorityTier(score) {
  if (score >= 40) return { label: "Critical",  color: "text-rose-400"   };
  if (score >= 20) return { label: "High",       color: "text-amber-400"  };
  if (score >= 10) return { label: "Medium",     color: "text-sky-400"    };
  return              { label: "Low",        color: "text-slate-400"  };
}

/**
 * Sort an array of tasks by descending priority score (highest urgency first).
 * Does not mutate the original array.
 * @param {object[]} tasks
 */
export function sortByPriority(tasks) {
  return [...tasks].sort(
    (a, b) => (b.priorityScore ?? priorityScore(b)) - (a.priorityScore ?? priorityScore(a))
  );
}

/**
 * Sort an array of tasks by ascending due date (earliest first, no-date tasks last).
 * @param {object[]} tasks
 */
export function sortByDueDate(tasks) {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
}
