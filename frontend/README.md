# Smart Timetable — Frontend

React 18 + Vite + Tailwind CSS (JavaScript, no TypeScript). Talks to the Express API described in [`../docs/API.md`](../docs/API.md).

## Run

```bash
cd frontend
npm install
cp .env.example .env   # optional
npm run dev            # http://localhost:5173
```

The dev server proxies `/api` and `/uploads` to `http://localhost:5000` (override with `VITE_BACKEND_URL`), so the
backend's httpOnly auth cookie is same-origin. Start the backend first.

## Build

```bash
npm run build      # outputs dist/
npm run preview
```

In production, serve `dist/` from the same origin as the API (reverse proxy `/api` and `/uploads` to the backend),
or set `VITE_API_URL` to the API's absolute URL and allow credentialed CORS on the backend.
All routes are client-side, so the web server must fall back to `index.html` for unknown paths.

## Structure

```
src/
  components/      UI primitives (ui/), task & timeline widgets, calendar views, settings forms
  context/         AuthContext, ThemeContext, EditingWindowContext
  hooks/           useAsync, useClock, useCountdown, useDebounce, useTaskModals, useMutationError …
  layouts/         AppLayout (sidebar + topbar), AuthLayout
  pages/           Dashboard, TimetableList/Detail, CreateTimetable, Calendar, Tasks,
                   NotificationCenter, NotificationHistory, Settings, auth/*
  services/        axios instance + one module per API area
  utils/           date/time helpers (timezone-aware), constants, error helpers
  styles/          Tailwind entry
```

The editing-window lock is reflected in the UI (read-only mode, countdowns, disabled controls), but the backend is the
authority: any 403 `EDITING_WINDOW_CLOSED` response immediately switches the UI into locked mode.
