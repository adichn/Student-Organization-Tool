import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/auth";

const qKey = (courseId) => ["assignments", courseId];

// ── Derive status from legacy `completed` boolean so mock data works ──────────
function normalise(a) {
  return {
    ...a,
    status: a.status ?? (a.completed ? "completed" : "todo"),
  };
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch assignments for a course.
 *
 * `seedData` — assignments from the parent component (mock or previously
 * loaded data). Used as initialData so the list renders immediately while
 * the request is in-flight.  initialDataUpdatedAt: 0 marks it as immediately
 * stale so a background fetch always fires on mount.
 */
export function useAssignments(courseId, seedData) {
  return useQuery({
    queryKey: qKey(courseId),
    queryFn:  async () => {
      const res = await apiFetch(`/api/courses/${courseId}/assignments`);
      if (!res.ok) {
        const err = new Error((await res.json().catch(() => ({})))?.error ?? "Failed to load assignments.");
        err.status = res.status;
        throw err;
      }
      const { assignments } = await res.json();
      return assignments.map(normalise);
    },
    initialData:            seedData?.map(normalise),
    initialDataUpdatedAt:   0,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Cycle an assignment's status with an optimistic update so the UI responds
 * instantly regardless of network latency.
 *
 * onMutate  → update cache immediately
 * onError   → roll back to the snapshot taken in onMutate
 * onSettled → re-sync with the server
 */
export function useUpdateAssignment(courseId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, status }) => {
      const res = await apiFetch(
        `/api/courses/${courseId}/assignments/${assignmentId}`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      );
      if (!res.ok) {
        const err = new Error((await res.json().catch(() => ({})))?.error ?? "Update failed.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    onMutate: async ({ assignmentId, status }) => {
      await qc.cancelQueries({ queryKey: qKey(courseId) });
      const prev = qc.getQueryData(qKey(courseId));
      qc.setQueryData(qKey(courseId), (old) =>
        old?.map((a) =>
          a._id === assignmentId
            ? { ...a, status, completed: status === "completed" }
            : a
        )
      );
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        qc.setQueryData(qKey(courseId), ctx.prev);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: qKey(courseId) });
    },
  });
}

/**
 * Create a new assignment and append it to the cached list.
 */
export function useCreateAssignment(courseId) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, date, description }) => {
      const res = await apiFetch(`/api/courses/${courseId}/assignments`, {
        method: "POST",
        body:   JSON.stringify({ title, date, description }),
      });
      if (!res.ok) {
        const err = new Error((await res.json().catch(() => ({})))?.error ?? "Create failed.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    onSuccess: ({ assignment }) => {
      qc.setQueryData(qKey(courseId), (old = []) => [
        ...old,
        normalise(assignment),
      ]);
    },
  });
}
