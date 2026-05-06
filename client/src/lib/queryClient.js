import { QueryClient } from "@tanstack/react-query";

// Single shared QueryClient for the entire app.
// - staleTime 30s: background refetches don't fire on every focus/mount
// - retry 1: one retry on transient errors; API errors (4xx) don't retry
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 1;
      },
    },
  },
});

export default queryClient;
