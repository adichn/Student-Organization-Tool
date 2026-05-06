import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./components/Sidebar";
import YearView from "./views/YearView";
import SemesterView from "./views/SemesterView";
import CourseView from "./views/CourseView";
import LoginPage from "./pages/LoginPage";
import { YEAR_DATA } from "./data/mockData";
import { getUser, saveAuth, clearAuth } from "./utils/auth";
import "./App.css";

const BG = "linear-gradient(135deg, #c4b5f7 0%, #93b8f5 22%, #bae1fb 44%, #d8b4f8 66%, #fbcfe8 88%, #fde68a 100%)";

// direction > 0  → drilling in  (new view slides in from right)
// direction < 0  → going back   (new view slides in from left)
const pageVariants = {
  initial: (dir) => ({
    x:      dir > 0 ? 60 : -60,
    opacity: 0,
    filter: "blur(6px)",
  }),
  animate: {
    x:      0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
  },
  exit: (dir) => ({
    x:      dir > 0 ? -60 : 60,
    opacity: 0,
    filter: "blur(4px)",
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  }),
};

export default function App() {
  const [authUser,       setAuthUser]       = useState(getUser);
  const [page,           setPage]           = useState("year");
  const [activeSemester, setActiveSemester] = useState(null);
  const [activeCourse,   setActiveCourse]   = useState(null);
  const [direction,      setDirection]      = useState(1);
  const [activeNav,      setActiveNav]      = useState("dashboard");

  function handleAuthSuccess(token, user) {
    saveAuth(token, user);
    setAuthUser(user);
  }

  function handleLogout() {
    clearAuth();
    setAuthUser(null);
  }

  if (!authUser) {
    return <LoginPage onSuccess={handleAuthSuccess} />;
  }

  function push(newPage, params = {}) {
    setDirection(1);
    if (params.semester) setActiveSemester(params.semester);
    if (params.course)   setActiveCourse(params.course);
    setPage(newPage);
  }

  function pop() {
    setDirection(-1);
    setPage((prev) => (prev === "course" ? "semester" : "year"));
  }

  // Stable, unique key per screen so AnimatePresence knows when to swap
  const pageKey =
    page === "year"     ? "year" :
    page === "semester" ? `sem-${activeSemester?._id}` :
                          `course-${activeCourse?._id}`;

  return (
    <div className="flex font-sans" style={{ background: BG, minHeight: "100svh" }}>
      <Sidebar activeId={activeNav} onNavigate={setActiveNav} user={authUser} onLogout={handleLogout} />

      {/* Fixed-size main — each page scrolls independently */}
      <main className="flex-1 h-screen overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={pageKey}
            custom={direction}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 overflow-y-auto p-8"
          >
            {page === "year" && (
              <YearView
                yearData={YEAR_DATA}
                onSelectSemester={(sem) => push("semester", { semester: sem })}
              />
            )}

            {page === "semester" && (
              <SemesterView
                semester={activeSemester}
                onSelectCourse={(course) => push("course", { course })}
                onBack={pop}
              />
            )}

            {page === "course" && (
              <CourseView
                course={activeCourse}
                semester={activeSemester}
                onBack={pop}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
