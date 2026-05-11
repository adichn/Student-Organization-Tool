import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../utils/auth";

// All resource mutations invalidate the full year tree so CourseView re-renders
// with the updated resources array without any manual cache surgery.
const YEARS_KEY = ["years"];

// ── Upload ────────────────────────────────────────────────────────────────────

/**
 * Upload a file to a course.
 *
 * Uses XMLHttpRequest instead of fetch so we get granular upload-progress events.
 *
 * mutationFn: ({ courseId, file, title? })
 *   onProgress: (percent: number) => void  — passed via `context` in useMutation
 *
 * Because we need per-call progress callbacks we accept an `onProgress` option
 * directly on mutateAsync:
 *
 *   const { mutateAsync } = useUploadResource();
 *   await mutateAsync({ courseId, file }, { onProgress: setPercent });
 *
 * The extra option is passed through the second argument to mutateAsync and
 * forwarded to the mutationFn via a closure.
 */
export function useUploadResource() {
  const qc = useQueryClient();
  let _onProgress = null;

  return useMutation({
    mutationFn: ({ courseId, file, title, onProgress }) => {
      _onProgress = onProgress ?? null;

      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        if (title) formData.append("title", title);

        const xhr = new XMLHttpRequest();

        // ── Progress tracking ─────────────────────────────────────────────
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && _onProgress) {
            _onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        // ── Completion ────────────────────────────────────────────────────
        xhr.addEventListener("load", () => {
          let body;
          try { body = JSON.parse(xhr.responseText); } catch { body = {}; }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(body);
          } else {
            const err = new Error(body?.error ?? `Upload failed (${xhr.status}).`);
            err.status = xhr.status;
            reject(err);
          }
        });

        xhr.addEventListener("error", () =>
          reject(new Error("Network error — is the server running?"))
        );

        xhr.addEventListener("abort", () =>
          reject(new Error("Upload cancelled."))
        );

        // ── Send ──────────────────────────────────────────────────────────
        xhr.open("POST", `/api/courses/${courseId}/upload`);
        // DO NOT set Content-Type — the browser sets it with the multipart boundary.
        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

// ── Batch-save approved extractions ──────────────────────────────────────────

/**
 * Save a user-approved batch of pending event extractions.
 *
 * mutate({ courseId, events: [{ title, date, type, description }] })
 */
export function useBatchSaveEvents() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, events }) => {
      const token = getToken();
      const res   = await fetch(`/api/courses/${courseId}/events/batch`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ events }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body?.error ?? "Batch save failed.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    onSuccess: () => qc.invalidateQueries({ queryKey: YEARS_KEY }),
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

/**
 * Delete a resource and its associated embeddings.
 *
 * mutate({ courseId, resourceId })
 * Optimistic: removes the resource from the cache immediately; rolls back on error.
 */
export function useDeleteResource() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, resourceId }) => {
      const token = getToken();
      const res   = await fetch(`/api/courses/${courseId}/resources/${resourceId}`, {
        method:  "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err  = new Error(body?.error ?? "Delete failed.");
        err.status = res.status;
        throw err;
      }
      return res.json();
    },

    // Optimistic removal
    onMutate: async ({ courseId, resourceId }) => {
      await qc.cancelQueries({ queryKey: YEARS_KEY });
      const prev = qc.getQueryData(YEARS_KEY);

      qc.setQueryData(YEARS_KEY, (old) => {
        if (!old) return old;
        return old.map((year) => ({
          ...year,
          semesters: year.semesters.map((sem) => ({
            ...sem,
            courses: sem.courses.map((c) =>
              String(c._id) !== courseId ? c : {
                ...c,
                resources: (c.resources ?? []).filter(
                  (r) => String(r._id) !== resourceId
                ),
              }
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
