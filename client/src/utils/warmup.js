// ── Context Mode — Warm-up Prompt & Copy Context ─────────────────────────────
// When a task is selected, the app surfaces a warm-up prompt to trigger a
// deliberate mental context switch.
//
// Priority order for the prompt text:
//   1. task.warmUpPrompt (user-authored)
//   2. Generated template (domain + course-aware)

const fmt = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : null;

// ── Mode name derivation ──────────────────────────────────────────────────────
const CODE_TO_MODE = {
  "CP 220": "Hardware Mode",
  "CS 101": "Intro CS Mode",
  "CS 201": "Data Structures Mode",
  "CS 301": "Systems Mode",
  "CS 350": "Systems Mode",
  "CS 401": "Algorithms Mode",
  "CS 440": "AI Mode",
  "CS 480": "Theory Mode",
  "MATH 241": "Calculus Mode",
  "MATH 341": "Linear Algebra Mode",
  "PHYS 201": "Physics Mode",
};

export function getModeName(task) {
  if (task.domain === "Professional") return "Professional Mode";
  if (task.domain === "Career")       return "Career Mode";
  if (task.domain === "Personal")     return "Personal Mode";
  const code = task.courseRef?.courseCode;
  if (code && CODE_TO_MODE[code]) return CODE_TO_MODE[code];
  if (code)                       return `${code} Mode`;
  return "Study Mode";
}

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES = {
  Academic: (task) => {
    const modeName = getModeName(task);
    const course   = task.courseRef?.courseTitle ?? null;
    const due      = fmt(task.dueDate);
    return [
      `You are now in ${modeName}.`,
      ``,
      `Task: ${task.title}`,
      task.description ? `Focus: ${task.description}` : null,
      course ? `Course: ${course}` : null,
      due    ? `Due: ${due}` : null,
      ``,
      `Take 30 seconds to load your mental context.`,
      `Open your notes, recall where you left off last session,`,
      `and identify the single most concrete action you can start with right now.`,
    ]
      .filter((l) => l !== null)
      .join("\n");
  },

  Professional: (task) => {
    const due = fmt(task.dueDate);
    return [
      `You are now in Professional Mode.`,
      ``,
      `Task: ${task.title}`,
      task.description ? `Context: ${task.description}` : null,
      due ? `Deadline: ${due}` : null,
      ``,
      `Think about user impact before writing a single line.`,
      `What is the minimum scope that delivers the most value?`,
      `Bias toward shipping. Perfection is the enemy of done.`,
    ]
      .filter((l) => l !== null)
      .join("\n");
  },

  Career: (task) => {
    const due = fmt(task.dueDate);
    return [
      `You are now in Career Mode.`,
      ``,
      `Focus: ${task.title}`,
      task.description ? `Notes: ${task.description}` : null,
      due ? `Target: ${due}` : null,
      ``,
      `You are not just looking for a job — you are evaluating mutual fit.`,
      `Lead with curiosity. Show genuine interest. Ask the questions they`,
      `won't expect. Confidence comes from preparation.`,
    ]
      .filter((l) => l !== null)
      .join("\n");
  },

  Personal: (task) => {
    const due = fmt(task.dueDate);
    return [
      `You are now in Personal Mode.`,
      ``,
      `Task: ${task.title}`,
      task.description ? `Notes: ${task.description}` : null,
      due ? `By: ${due}` : null,
      ``,
      `This is your time. No external obligations — just progress on what matters to you.`,
      `Start with the smallest possible action that moves this forward.`,
    ]
      .filter((l) => l !== null)
      .join("\n");
  },
};

// ── Public helpers ────────────────────────────────────────────────────────────

export function getWarmUpPrompt(task) {
  if (task.warmUpPrompt?.trim()) return task.warmUpPrompt.trim();
  const fn = TEMPLATES[task.domain];
  return fn ? fn(task) : `Ready to work on: ${task.title}`;
}

export function buildContextString(task) {
  const prompt  = getWarmUpPrompt(task);
  const mode    = getModeName(task);
  const score   = Math.round(task.priorityScore ?? 0);
  const dueStr  = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : null;

  const courseBlock = task.courseRef
    ? [
        `── COURSE CONTEXT ──`,
        `${task.courseRef.courseTitle}${task.courseRef.courseCode ? ` (${task.courseRef.courseCode})` : ""}`,
        `Difficulty: ${task.courseRef.difficultyMultiplier}/10`,
        ``,
        `[PASTE YOUR NOTEBOOKLM NOTEBOOK SUMMARY BELOW THIS LINE]`,
        `↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓`,
        ``,
      ].join("\n")
    : null;

  const aiPrompt = [
    `── PROMPT FOR AI ──`,
    `I am working on: "${task.title}"`,
    task.description ? `Context: ${task.description}` : null,
    task.courseRef
      ? `This is for ${task.courseRef.courseTitle}. My course materials are pasted above.`
      : null,
    ``,
    `Please help me:`,
    `1. Identify the key concepts I need to understand`,
    `2. Break down the task into concrete, ordered steps`,
    `3. Flag any common mistakes or gotchas to watch out for`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  return [
    `╔═══════════════════════════════════════════════╗`,
    `  ${mode.toUpperCase()} — ${task.title}`,
    `╚═══════════════════════════════════════════════╝`,
    ``,
    `Domain: ${task.domain}   Priority: ${score}   Effort: ${task.estimatedEffort}h${dueStr ? `   Due: ${dueStr}` : ""}`,
    ``,
    `── WARM-UP ──`,
    prompt,
    ``,
    courseBlock,
    aiPrompt,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/**
 * Domain accent colours for the Context Mode UI chrome.
 */
export function categoryTheme(domain) {
  switch (domain) {
    case "Academic":
      return {
        bg:     "from-indigo-900/40 to-violet-900/20",
        border: "border-indigo-500/30",
        badge:  "bg-indigo-500/20 text-indigo-300",
        ring:   "#6366f1",
      };
    case "Professional":
      return {
        bg:     "from-blue-900/40 to-cyan-900/20",
        border: "border-blue-500/30",
        badge:  "bg-blue-500/20 text-blue-300",
        ring:   "#3b82f6",
      };
    case "Personal":
      return {
        bg:     "from-purple-900/40 to-fuchsia-900/20",
        border: "border-purple-500/30",
        badge:  "bg-purple-500/20 text-purple-300",
        ring:   "#a855f7",
      };
    case "Career":
      return {
        bg:     "from-amber-900/40 to-orange-900/20",
        border: "border-amber-500/30",
        badge:  "bg-amber-500/20 text-amber-300",
        ring:   "#f59e0b",
      };
    default:
      return {
        bg:     "from-slate-900/40 to-slate-800/20",
        border: "border-slate-500/30",
        badge:  "bg-slate-500/20 text-slate-300",
        ring:   "#94a3b8",
      };
  }
}
