import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// Paths whose 401 is expected (session probing, login form) and must not trigger a redirect.
const SILENT_401 = ['/auth/me', '/auth/login', '/auth/register', '/auth/reset-password', '/auth/forgot-password'];
const PUBLIC_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !SILENT_401.some((p) => url.startsWith(p))) {
      if (onUnauthorized) onUnauthorized();
      if (!PUBLIC_PAGES.includes(window.location.pathname)) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

/** Unwrap the `{ success, data }` envelope. */
export const unwrap = (res) => res.data?.data;

export default api;
