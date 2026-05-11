import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/auth.js";

// ── Query key ─────────────────────────────────────────────────────────────────
// Single key covers the entire tree (years → semesters → courses).
// Any mutation invalidates it so the UI always reflects server state.
export const YEARS_KEY = ["years"];

// ── Data normalisation ────────────────────────────────────────────────────────
// The API returns raw Mongoose docs.  We add client-only fields here so views
// and cards never have to derive them themselves.

const GRADIENTS = [
  "from-violet-400 to-indigo-500",
  "from-sky-400    to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400  to-orange-500",
  "from-rose-400   to-pink-500",
  "from-fuchsia-400 to-purple-500",
  "from-cyan-400   to-sky-500",
  "from-lime-400   to-green-500",
];

/** Deterministic gradient derived from the last 4 hex chars of a Mongo _id. */
function gradientFor(id) {
  const n = parseInt(String(id).slice(-4), 16) || 0;
  return GRADIENTS[n % GRADIENTS.length];
}

function normaliseCourse(c) {
  const hex = c.colorHex ?? "#6366f1";
  return {
    ...c,
    gradient:      gradientFor(c._id),
    gradientStyle: `linear-gradient(135deg, ${hex}cc, ${hex})`,
  };
}

function normaliseSemester(s) {
  return { ...s, courses: (s.courses ?? []).map(normaliseCourse) };
}

function normaliseYear(y) {
  return { ...y, semesters: (y.semesters ?? []).map(normaliseSemester) };
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function apiFetchJSON(path, options = {}) {
  const res = await apiFetch(path, options);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status });
  return data;
}

// ── Query ─────────────────────────────────────────────────────────────────────

/**
 * useYears — loads all of the user's Year documents (with nested semesters +
 * courses) from GET /api/years.  Returns normalised data that includes
 * client-side gradient strings for every course.
 */
export function useYears() {
  return useQuery({
    queryKey: YEARS_KEY,
    queryFn:  () => apiFetchJSON("/api/years"),
    select:   (data) => data.map(normaliseYear),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
// All mutations follow the same pattern:
//   1. Optimistic update  — instant UI feedback
//   2. onError rollback   — restore previous cache if the server rejects
//   3. onSettled refetch  — reconcile with actual server state

/**
 * useCreateYear
 * mutationFn: (year: number) => Promise<YearDoc>
 */
export function useCreateYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (year) =>
      apiFetchJSON("/api/years", {
        method: "POST",
        body:   JSON.stringify({ year }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

/**
 * useDeleteYear
 * mutationFn: ({ yearId }) => Promise<{ success: true }>
 */
export function useDeleteYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ yearId }) =>
      apiFetchJSON(`/api/years/${yearId}`, { method: "DELETE" }),
    onMutate: async ({ yearId }) => {
      await qc.cancelQueries({ queryKey: YEARS_KEY });
      const prev = qc.getQueryData(YEARS_KEY);
      qc.setQueryData(YEARS_KEY, (old) =>
        old?.filter((y) => String(y._id) !== String(yearId))
      );
      return { prev };
    },
    onError:   (_e, _v, ctx) => qc.setQueryData(YEARS_KEY, ctx.prev),
    onSettled: ()             => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

/**
 * useCreateSemester
 * mutationFn: ({ yearId, name, season }) => Promise<SemesterDoc>
 */
export function useCreateSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ yearId, name, season }) =>
      apiFetchJSON(`/api/years/${yearId}/semesters`, {
        method: "POST",
        body:   JSON.stringify({ name, season }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

/**
 * useDeleteSemester
 * mutationFn: ({ yearId, semId }) => Promise<{ success: true }>
 */
export function useDeleteSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ yearId, semId }) =>
      apiFetchJSON(`/api/years/${yearId}/semesters/${semId}`, { method: "DELETE" }),
    onMutate: async ({ yearId, semId }) => {
      await qc.cancelQueries({ queryKey: YEARS_KEY });
      const prev = qc.getQueryData(YEARS_KEY);
      qc.setQueryData(YEARS_KEY, (old) =>
        old?.map((y) =>
          String(y._id) === String(yearId)
            ? { ...y, semesters: y.semesters.filter((s) => String(s._id) !== String(semId)) }
            : y
        )
      );
      return { prev };
    },
    onError:   (_e, _v, ctx) => qc.setQueryData(YEARS_KEY, ctx.prev),
    onSettled: ()             => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

/**
 * useCreateCourse
 * mutationFn: ({ yearId, semId, title, code?, description?, colorHex? })
 */
export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ yearId, semId, ...body }) =>
      apiFetchJSON(`/api/years/${yearId}/semesters/${semId}/courses`, {
        method: "POST",
        body:   JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

/**
 * useDeleteCourse
 * mutationFn: ({ yearId, semId, courseId }) => Promise<{ success: true }>
 */
export function useDeleteCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ yearId, semId, courseId }) =>
      apiFetchJSON(`/api/years/${yearId}/semesters/${semId}/courses/${courseId}`, {
        method: "DELETE",
      }),
    onMutate: async ({ yearId, semId, courseId }) => {
      await qc.cancelQueries({ queryKey: YEARS_KEY });
      const prev = qc.getQueryData(YEARS_KEY);
      qc.setQueryData(YEARS_KEY, (old) =>
        old?.map((y) =>
          String(y._id) !== String(yearId) ? y : {
            ...y,
            semesters: y.semesters.map((s) =>
              String(s._id) !== String(semId) ? s : {
                ...s,
                courses: s.courses.filter((c) => String(c._id) !== String(courseId)),
              }
            ),
          }
        )
      );
      return { prev };
    },
    onError:   (_e, _v, ctx) => qc.setQueryData(YEARS_KEY, ctx.prev),
    onSettled: ()             => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}
