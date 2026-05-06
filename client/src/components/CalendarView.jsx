import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const EVENT_PILL = {
  assignment: "bg-violet-100 text-violet-700",
  exam:       "bg-rose-100   text-rose-700",
  lecture:    "bg-sky-100    text-sky-700",
  reminder:   "bg-amber-100  text-amber-700",
  other:      "bg-gray-100   text-gray-600",
};

const EVENT_DOT = {
  assignment: "bg-violet-400",
  exam:       "bg-rose-400",
  lecture:    "bg-sky-400",
  reminder:   "bg-amber-400",
  other:      "bg-gray-400",
};

function buildCells(year, month) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Full monthly calendar that aggregates events from every course in the semester.
 * @param {{ _id, title, gradient, events: { _id, title, type, date, completed }[] }[]} courses
 */
export default function CalendarView({ courses }) {
  const today = new Date();
  const [current, setCurrent] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year  = current.getFullYear();
  const month = current.getMonth();

  // Flatten all events and tag with course info
  const allEvents = courses.flatMap((course) =>
    course.events.map((ev) => ({
      ...ev,
      date: new Date(ev.date),
      courseTitle: course.title,
      gradient: course.gradient,
    }))
  );

  // Index by "Y-M-D" key
  const eventMap = {};
  allEvents.forEach((ev) => {
    const key = `${ev.date.getFullYear()}-${ev.date.getMonth()}-${ev.date.getDate()}`;
    (eventMap[key] ??= []).push(ev);
  });

  function eventsOn(day) {
    return eventMap[`${year}-${month}-${day}`] ?? [];
  }

  const cells = buildCells(year, month);
  const rows  = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  function shift(delta) {
    setCurrent(new Date(year, month + delta, 1));
  }

  return (
    <GlassCard variant="elevated" className="p-6 overflow-hidden">
      {/* ── Month header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2
            className="text-[20px] font-semibold text-gray-900"
            style={{ letterSpacing: "-0.022em" }}
          >
            {MONTH_NAMES[month]}
          </h2>
          <p className="text-[12px] text-gray-400 mt-0.5">{year}</p>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => shift(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-black/[0.06] transition-colors text-gray-500 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-2.5 h-8 text-[12px] font-medium text-gray-600 hover:bg-black/[0.06] rounded-[8px] transition-colors cursor-pointer"
          >
            Today
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => shift(1)}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-black/[0.06] transition-colors text-gray-500 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* ── Day-of-week headers ───────────────────────────────────────────── */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[11px] font-semibold text-gray-400 pb-2"
            style={{ letterSpacing: "0.06em" }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="border-t border-l border-gray-200/60 rounded-b-lg overflow-hidden"
        >
          {rows.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7">
              {row.map((day, di) => {
                const events  = day ? eventsOn(day) : [];
                const visible = events.slice(0, 2);
                const extra   = events.length - visible.length;
                const isToday =
                  day &&
                  today.getFullYear() === year &&
                  today.getMonth()    === month &&
                  today.getDate()     === day;

                return (
                  <div
                    key={`${ri}-${di}`}
                    className={[
                      "border-b border-r border-gray-200/60 min-h-[82px] p-1.5",
                      !day ? "bg-gray-50/25" : "",
                      isToday ? "bg-indigo-50/40" : "",
                    ].join(" ")}
                  >
                    {day && (
                      <>
                        <div className="mb-1">
                          <span
                            className={[
                              "w-6 h-6 inline-flex items-center justify-center rounded-full",
                              "text-[12px] font-medium",
                              isToday
                                ? "bg-indigo-500 text-white shadow-sm"
                                : "text-gray-700",
                            ].join(" ")}
                          >
                            {day}
                          </span>
                        </div>

                        <div className="space-y-[3px]">
                          {visible.map((ev) => (
                            <div
                              key={ev._id}
                              title={`${ev.title} · ${ev.courseTitle}`}
                              className={[
                                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]",
                                "font-medium leading-tight truncate cursor-default",
                                EVENT_PILL[ev.type] ?? EVENT_PILL.other,
                                ev.completed ? "opacity-50 line-through" : "",
                              ].join(" ")}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_DOT[ev.type] ?? EVENT_DOT.other}`}
                              />
                              <span className="truncate">{ev.title}</span>
                            </div>
                          ))}
                          {extra > 0 && (
                            <p className="text-[10px] text-gray-400 px-1.5 leading-tight">
                              +{extra} more
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ── Legend ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {[
          ["assignment", "Assignment"],
          ["exam",       "Exam"],
          ["lecture",    "Lecture"],
          ["reminder",   "Reminder"],
        ].map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${EVENT_DOT[type]}`} />
            <span className="text-[11px] text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
