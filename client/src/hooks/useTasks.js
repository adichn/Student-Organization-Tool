import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/auth.js";
import { sortByPriority, sortByDueDate } from "../utils/roi.js";

// ── Query keys ────────────────────────────────────────────────────────────────
export const TASKS_KEY = ["tasks"];

const taskKey = (id) => [...TASKS_KEY, id];
const filteredKey = ({ domain, status, workspaceId } = {}) => [...TASKS_KEY, { domain, status, workspaceId }];

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function apiFetchJSON(path, options = {}) {
  const res  = await apiFetch(path, options);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Request failed"), { status: res.status });
  return data;
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * useTasks — fetches all tasks for the current user.
 *
 * @param {{ domain?: string, status?: string, sortBy?: "priority"|"dueDate"|"created" }} opts
 *
 * sortBy is applied client-side so the UI can re-sort without a new fetch.
 * The server also sorts, but the client selector guarantees consistency when
 * the cache is updated optimistically.
 */
export function useTasks({ domain, status, sortBy = "priority", workspaceId } = {}) {
  const params = new URLSearchParams();
  // workspaceId takes precedence over domain on the server
  if (workspaceId) params.set("workspaceId", workspaceId);
  else if (domain) params.set("domain", domain);
  if (status) params.set("status", status);
  params.set("sortBy", "priority");

  return useQuery({
    queryKey: filteredKey({ domain, status, workspaceId }),
    queryFn:  () => apiFetchJSON(`/api/tasks?${params}`),
    select: (tasks) => {
      if (sortBy === "dueDate")  return sortByDueDate(tasks);
      if (sortBy === "created")  return [...tasks].sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
      return sortByPriority(tasks); // default: priority
    },
  });
}

/**
 * useTask — fetches a single task by id (used by Context Mode panel).
 */
export function useTask(id) {
  return useQuery({
    queryKey: taskKey(id),
    queryFn:  () => apiFetchJSON(`/api/tasks/${id}`),
    enabled:  !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * useCreateTask
 * mutationFn: ({ title, description?, category, dueDate?, gradeBusinessValue?,
 *                estimatedEffort?, warmUpPrompt?, courseRef?, tags? })
 */
export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      apiFetchJSON("/api/tasks", {
        method: "POST",
        body:   JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/**
 * useUpdateTask
 * mutationFn: ({ id, ...patch }) — partial update of any task fields.
 *
 * Optimistic update: immediately patches the cached task so the UI feels instant.
 * The server response is the source of truth (re-serialised with updated priorityScore).
 */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }) =>
      apiFetchJSON(`/api/tasks/${id}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
      }),

    onMutate: async ({ id, ...patch }) => {
      // Cancel in-flight queries so they don't overwrite optimistic update
      await qc.cancelQueries({ queryKey: TASKS_KEY });

      const snapshots = qc
        .getQueriesData({ queryKey: TASKS_KEY })
        .map(([key, data]) => ({ key, data }));

      // Apply optimistic patch to every tasks list in cache
      qc.getQueriesData({ queryKey: TASKS_KEY }).forEach(([key, data]) => {
        if (!Array.isArray(data)) return;
        qc.setQueryData(key, data.map((t) =>
          String(t._id) === String(id) ? { ...t, ...patch } : t
        ));
      });

      return { snapshots };
    },

    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(({ key, data }) => qc.setQueryData(key, data));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/**
 * useDeleteTask
 * mutationFn: (id: string)
 */
export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) =>
      apiFetchJSON(`/api/tasks/${id}`, { method: "DELETE" }),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });

      const snapshots = qc
        .getQueriesData({ queryKey: TASKS_KEY })
        .map(([key, data]) => ({ key, data }));

      qc.getQueriesData({ queryKey: TASKS_KEY }).forEach(([key, data]) => {
        if (!Array.isArray(data)) return;
        qc.setQueryData(key, data.filter((t) => String(t._id) !== String(id)));
      });

      return { snapshots };
    },

    onError: (_e, _v, ctx) => {
      ctx?.snapshots?.forEach(({ key, data }) => qc.setQueryData(key, data));
    },

    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

// ── Context Mode helpers ──────────────────────────────────────────────────────

/**
 * Cycle through statuses on click (same pattern as assignments).
 * "todo" → "in-progress" → "completed" → "todo"
 */
export function nextStatus(current) {
  const cycle = ["todo", "in-progress", "completed"];
  return cycle[(cycle.indexOf(current) + 1) % cycle.length];
}
