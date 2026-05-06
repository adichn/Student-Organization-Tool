import { useState } from "react";
import Sidebar from "./components/Sidebar";
import GlassCard from "./components/GlassCard";
import "./App.css";

const COURSES = [
  { title: "Advanced Algorithms",  code: "CS 401",   grade: "A",   events: 3, resources: 12, color: "from-violet-400 to-indigo-500" },
  { title: "Linear Algebra",       code: "MATH 302", grade: "A−",  events: 1, resources: 8,  color: "from-sky-400 to-blue-500" },
  { title: "Systems Programming",  code: "CS 380",   grade: "B+",  events: 4, resources: 6,  color: "from-emerald-400 to-teal-500" },
  { title: "Technical Writing",    code: "ENG 210",  grade: "A+",  events: 2, resources: 5,  color: "from-amber-400 to-orange-500" },
];

const UPCOMING = [
  { label: "CS 401 — Assignment 3 due",  date: "Tomorrow, 11:59 PM", type: "assignment" },
  { label: "MATH 302 — Midterm Exam",    date: "Wed, May 8",         type: "exam" },
  { label: "CS 380 — Lab Report",        date: "Thu, May 9",         type: "assignment" },
  { label: "ENG 210 — Draft Review",     date: "Fri, May 10",        type: "reminder" },
];

const TYPE_DOT = {
  assignment: "bg-violet-400",
  exam:       "bg-rose-400",
  reminder:   "bg-amber-400",
};

export default function App() {
  const [activeNav, setActiveNav] = useState("dashboard");

  return (
    /* Full-viewport gradient — gives the glass something to blur against */
    <div
      className="flex min-h-screen font-sans"
      style={{
        background:
          "linear-gradient(135deg, #c4b5f7 0%, #93b8f5 22%, #bae1fb 44%, #d8b4f8 66%, #fbcfe8 88%, #fde68a 100%)",
      }}
    >
      <Sidebar activeId={activeNav} onNavigate={setActiveNav} />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Page header */}
        <div className="mb-8">
          <p
            className="text-[11px] font-semibold text-white/70 uppercase mb-1"
            style={{ letterSpacing: "0.06em" }}
          >
            Fall 2025 · 4 courses
          </p>
          <h1
            className="text-[28px] font-semibold text-white"
            style={{ letterSpacing: "-0.03em", textShadow: "0 1px 12px rgba(0,0,0,0.15)" }}
          >
            Good morning, Aditya
          </h1>
        </div>

        {/* ── Stat strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "GPA",             value: "3.87" },
            { label: "Upcoming events", value: "10" },
            { label: "Resources saved", value: "31" },
          ].map((stat) => (
            <GlassCard key={stat.label} variant="subtle" className="px-5 py-4">
              <p
                className="text-[11px] font-semibold text-gray-500 uppercase mb-1"
                style={{ letterSpacing: "0.06em" }}
              >
                {stat.label}
              </p>
              <p
                className="text-[26px] font-semibold text-gray-900 leading-none"
                style={{ letterSpacing: "-0.03em" }}
              >
                {stat.value}
              </p>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_300px] gap-6 items-start">
          {/* ── Course grid ─────────────────────────────────────────────── */}
          <section>
            <h2
              className="text-[13px] font-semibold text-white/80 mb-3"
              style={{ letterSpacing: "-0.011em" }}
            >
              Courses
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {COURSES.map((course) => (
                <GlassCard key={course.code} className="p-5 cursor-pointer">
                  <div className={`w-8 h-8 rounded-[10px] bg-gradient-to-br ${course.color} mb-4 shadow-sm`} />
                  <p
                    className="text-[11px] font-semibold text-gray-400 mb-0.5"
                    style={{ letterSpacing: "0.04em" }}
                  >
                    {course.code}
                  </p>
                  <h3
                    className="text-[15px] font-semibold text-gray-900 mb-3 leading-snug"
                    style={{ letterSpacing: "-0.022em" }}
                  >
                    {course.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3 text-[12px] text-gray-500">
                      <span>{course.events} events</span>
                      <span>{course.resources} files</span>
                    </div>
                    <span
                      className="text-[13px] font-semibold text-gray-700 bg-white/60 px-2 py-0.5 rounded-md"
                      style={{ letterSpacing: "-0.011em" }}
                    >
                      {course.grade}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </section>

          {/* ── Upcoming events panel ───────────────────────────────────── */}
          <section>
            <h2
              className="text-[13px] font-semibold text-white/80 mb-3"
              style={{ letterSpacing: "-0.011em" }}
            >
              Upcoming
            </h2>
            <GlassCard variant="elevated" className="p-5">
              <ul className="space-y-4">
                {UPCOMING.map((ev, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className={`mt-[5px] w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[ev.type]}`} />
                    <div className="min-w-0">
                      <p
                        className="text-[13px] font-medium text-gray-800 leading-snug"
                        style={{ letterSpacing: "-0.011em" }}
                      >
                        {ev.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{ev.date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </section>
        </div>
      </main>
    </div>
  );
}
