const TOKEN_KEY = "so_jwt";
const USER_KEY  = "so_user";

export const getToken = ()  => localStorage.getItem(TOKEN_KEY);

export const getUser  = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? "null"); }
  catch { return null; }
};

export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => !!getToken();

/**
 * Wrapper around fetch that injects the Bearer token and handles 401s.
 * Pass `onUnauthorized` to clear auth + redirect when the session expires.
 */
export async function apiFetch(path, options = {}, onUnauthorized) {
  const token = getToken();

  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && onUnauthorized) {
    clearAuth();
    onUnauthorized();
  }

  return res;
}
