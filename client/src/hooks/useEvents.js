import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/auth";

// The entire year tree (years → semesters → courses → events) lives under one key.
// Invalidating it after any event mutation causes CalendarView / GlobalCalendar to
// re-render with fresh data without any manual cache surgery.
const YEARS_KEY = ["years"];

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a new event on any course.
 *
 * mutateAsync({ courseId, title, date, type?, description? })
 *   → { event: EventDTO }
 */
export function useCreateEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, title, date, type = "other", description = "" }) => {
      const res = await apiFetch(`/api/courses/${courseId}/events`, {
        method: "POST",
        body:   JSON.stringify({ title, date, type, description }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body?.error ?? "Failed to create event.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

/**
 * Update an existing event (any field subset).
 *
 * mutateAsync({ courseId, eventId, ...fields })
 *   → { event: EventDTO }
 */
export function useUpdateEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, eventId, ...fields }) => {
      const res = await apiFetch(`/api/courses/${courseId}/events/${eventId}`, {
        method: "PATCH",
        body:   JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body?.error ?? "Failed to update event.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

/**
 * Delete an event from a course.
 *
 * mutate({ courseId, eventId })
 */
export function useDeleteEvent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, eventId }) => {
      const res = await apiFetch(`/api/courses/${courseId}/events/${eventId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body?.error ?? "Failed to delete event.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    // Optimistic: remove from cache immediately, re-sync on settle
    onMutate: async ({ courseId, eventId }) => {
      await qc.cancelQueries({ queryKey: YEARS_KEY });

      const prev = qc.getQueryData(YEARS_KEY);

      qc.setQueryData(YEARS_KEY, (old) => {
        if (!old) return old;
        return old.map((year) => ({
          ...year,
          semesters: year.semesters.map((sem) => ({
            ...sem,
            courses: sem.courses.map((c) =>
              String(c._id) !== courseId
                ? c
                : { ...c, events: (c.events ?? []).filter((ev) => String(ev._id) !== eventId) }
            ),
          })),
        }));
      });

      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(YEARS_KEY, ctx.prev);
    },

    onSettled: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}
