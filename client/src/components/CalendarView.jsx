/**
 * CalendarView — thin shim that forwards to GlobalCalendar.
 *
 * SemesterView renders <CalendarView courses={courses} /> and this keeps that
 * import working without any change to the caller.
 */
export { default } from "./GlobalCalendar.jsx";
