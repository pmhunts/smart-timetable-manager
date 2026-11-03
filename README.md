# Smart To-Do & Timetable Manager

A full-stack timetable platform: daily timetables with a **server-enforced editing window**, automatic
**WhatsApp (Meta Cloud API) and email reminders**, independent per-channel notification controls,
recurring tasks, calendar views, statistics and a complete notification history.

| Layer | Tech |
|---|---|
| Frontend | React 18 (Vite), JavaScript, Tailwind CSS, Axios, lucide-react, react-router, react-hot-toast |
| Backend | Node.js, Express, JWT (httpOnly cookie), bcrypt, Helmet, express-rate-limit, express-validator |
| Database | MySQL 8 via Sequelize ORM + mysql2, Sequelize migrations & seeders |
| Scheduling | BullMQ + Redis (persistent delayed jobs) + node-cron; MySQL-polling fallback driver |
| Notifications | WhatsApp Cloud API (template messages), Nodemailer SMTP with HTML templates |

```
to do list manager/
├── backend/            Express API, scheduler and notification worker
├── frontend/           React SPA
├── database/schema.sql Plain MySQL script (same schema as the migrations)
├── docs/API.md         REST API contract
└── docker-compose.yml  MySQL 8 + Redis (+ optional API/worker containers)
```

---

## 1. Architecture

```
 React SPA ──/api──▶ Express API ───────────────▶ MySQL 8 (source of truth)
 (Vite proxy /       │  auth · validation · ownership         ▲
  same origin)       │  editing-window guard (403)            │
                     │  timetable/task services ──▶ notificationService
                     │                               (idempotent logs + jobs)
                     │                                        │ after commit
                     ▼                                        ▼
               node-cron jobs                        BullMQ queue (Redis)
               · task statuses (1 min)                        │ delayed job fires
               · reminder planner (5 min)                     ▼
               · recurrence generator (1 h)          notificationWorker
               · reconciler (1 min)                  claim → re-check prefs →
               · archive / lock sync                 render → send → record
                                                       │            │
                                              WhatsApp Cloud API   SMTP
                                                       │
                                     Meta webhook ◀────┘ (delivered/read/failed, STOP)
```

### Key design decisions

- **Editing window enforced on the server.** `requireEditingWindowOpen` runs on every create/update/delete
  route for timetables and tasks. It computes the window from the **server clock** in the user's timezone
  (`utils/editingWindow.js`). When it's closed the API returns `403 EDITING_WINDOW_CLOSED`, so browser
  dev tools or direct API calls can't get around it. The window configuration itself can only be
  changed while the window is open, otherwise a locked user could just switch the restriction off.
  Marking tasks completed or skipped is still allowed while locked.
- **Times.** A task stores the user's local `schedule_date` / `start_time` / `end_time` *and* the UTC
  instants `start_at_utc` / `end_at_utc`. All `DATETIME` columns are UTC (`timezone: '+00:00'`). If the
  user changes their timezone, upcoming tasks are re-computed and their reminders re-planned.
- **One timetable per user per day** (unique `user_id + schedule_date`). Overlap checks lock that
  day's timetable row (`SELECT … FOR UPDATE`) inside a transaction, so two concurrent requests can't
  both insert clashing tasks.
- **Notifications are durable and idempotent.** Every notification is a `notification_logs` row with a
  unique `idempotency_key` (e.g. `TASK_START-EMAIL-t42-v3`) plus exactly one `notification_jobs` row.
  - **Repeated planning:** planning the same reminder again (cron, restart, concurrent request)
    reschedules the existing row instead of adding a duplicate.
  - **Single send:** the worker *claims* a job with a conditional `UPDATE … WHERE status='PENDING'`, so
    a job reaches the provider at most once even if several triggers fire.
  - **Checks at send time:** preferences, WhatsApp consent, quiet hours, task status and task version
    are checked again just before sending, so setting changes apply immediately.
  - **Reschedules and deletions:** editing a task's time bumps `schedule_version` and cancels its old
    reminders before planning new ones. Deleting a task cancels its pending reminders, and
    `ON DELETE SET NULL` plus the `task_title` snapshot keep its history.
  - **Retries:** failed sends are retried with exponential backoff (30 s → 30 min, `NOTIFICATION_MAX_ATTEMPTS`).
    Permanent errors (bad number, auth failures, SMTP 5xx) fail straight away.
  - **Restart safety:** MySQL is the source of truth for the queue. After a restart, pending jobs are
    re-queued (BullMQ dedupes by job id), and a reconciler delivers anything Redis lost. With
    `QUEUE_DRIVER=db` the app runs **without Redis** by polling `notification_jobs`.
- **Recurring tasks.** A recurring task is a template. Its occurrences are created as real task rows
  for the next `RECURRENCE_HORIZON_DAYS`, so each day has its own status and reminders.
  - **One per day:** the unique `(source_task_id, schedule_date)` prevents duplicate occurrences.
  - **Deleting one day:** records an exception date so it isn't recreated.
  - **Editing the template:** regenerates future occurrences that haven't started yet.
- **"Meaningful" update notifications.** These are sent only when a task's title, date, start time or
  end time changes, with before and after values. Editing a whole timetable sends **one** summary
  notification ("added / removed / changed"), not one per task.

### Deviations from the requested table list (and why)

All requested tables and columns exist. These were added:

| Table | Added | Reason |
|---|---|---|
| users | `country_code`, `token_version`, `last_login_at` | Country code for WhatsApp E.164 numbers; JWT revocation after a password change or reset |
| tasks | `schedule_date`, `start_at_utc`, `end_at_utc`, `repeat_days`, `repeat_until`, `repeat_exceptions`, `source_task_id`, `allow_overlap`, `reminder_enabled`, `schedule_version`, `completed_at` | Fast overlap checks and indexes; UTC scheduling; custom and recurring schedules; idempotent reminder keys |
| notification_settings | per-channel flags (`whatsapp_task_start`, `email_task_start`, …), `whatsapp_opt_in(_at)`, `incomplete_reminder`, `daily_summary_time`, `notification_sound` | The spec asks for **separate** WhatsApp and Email switches, which a single `task_start_reminder` column can't represent; WhatsApp consent tracking |
| notification_logs | `task_title`, `subject`, `payload`, `recipient`, `idempotency_key` (UNIQUE), `provider_status` | History survives task deletion; duplicate prevention; WhatsApp delivered/read receipts |
| notification_jobs | `run_at`, `last_error`, `locked_at`, `queue_job_id` | Retry backoff and quiet-hours deferral; recovery of crashed jobs |

---

## 2. Local setup

### Prerequisites
- Node.js 18+ (tested on Node 24)
- MySQL 8.0+ and (recommended) Redis 6+. The easiest way to get both is Docker:
  ```bash
  docker compose up -d mysql redis
  ```
  If you have no Redis, set `QUEUE_DRIVER=db` in `backend/.env`.

### Backend
```bash
cd backend
cp .env.example .env        # then edit DB_PASSWORD, JWT_SECRET, ...
npm install
npm run db:create           # creates smart_timetable_db (skip if it exists)
npm run db:migrate          # creates all tables, keys and indexes
npm run db:seed             # optional demo data
npm run dev                 # API on http://localhost:5000 (+ schedulers and worker)
npm test                    # unit tests (editing window, overlaps, recurrence, templates ...)
```
Instead of migrations you can run `database/schema.sql` in MySQL Workbench or the CLI
(`mysql -u root -p < database/schema.sql`). It records the migrations as applied.

**Demo account (after seeding):** `demo@smarttimetable.app` / `Demo@1234`. It has today's sample
routine and three days of history. Its editing window is configured for 06:00–09:00 but switched off,
so you can try both modes in *Profile & Settings → Timetable Configuration Window*.

### Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api and /uploads to :5000)
```

By default `EMAIL_MODE=mock` and `WHATSAPP_MODE=mock`. Messages are printed to the backend console
and recorded as *Sent* (with a `mock-…` provider id) in Notification History, so the whole flow works
before you have credentials.

---

## 3. Email (SMTP) setup

1. In `backend/.env` set `EMAIL_MODE=live`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
2. **Gmail:** turn on 2-Step Verification, then create an **App Password** (Google Account → Security →
   App passwords) and use it as `SMTP_PASS`, with host `smtp.gmail.com` and port `587` (`SMTP_SECURE=false`).
3. Restart the backend; it verifies the SMTP connection at startup. Use **Notification Center → Send test email**.
4. **Hosts that block SMTP (e.g. Render free tier):** use the Brevo HTTPS API instead. Create a free
   account at <https://www.brevo.com>, verify your sender address (*Senders, Domains & Dedicated IPs*),
   create an API key (*SMTP & API → API keys*), and set `EMAIL_MODE=live`, `EMAIL_PROVIDER=brevo`,
   `BREVO_API_KEY=...`, `EMAIL_FROM="Smart Timetable Manager <your-verified@address>"`.
5. **On a hosting platform**, `backend/.env` is not deployed (it is gitignored). Set the same variables in
   the platform's environment settings. The first startup log line `[email] ...` shows whether
   email is live or mock.

New accounts automatically receive a **welcome email** (sent once per account, visible in Notification History).

## 4. WhatsApp Cloud API setup

1. Create an app at <https://developers.facebook.com> → add the **WhatsApp** product.
2. From *WhatsApp → API Setup*, copy the **Phone number ID** and create a **permanent access token**
   (Business Settings → System users → generate a token with `whatsapp_business_messaging`).
3. In `backend/.env`: `WHATSAPP_MODE=live`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`.
4. **Templates.** Business-initiated messages outside the 24-hour customer-service window must use
   approved templates. In *WhatsApp Manager → Message templates*, create these (category **Utility**,
   language matching `WHATSAPP_TEMPLATE_LANG`, default `en_US`). The names are configurable in `.env`.

   | Env var / default name | Body (parameters in order) |
   |---|---|
   | `task_reminder` | `Hello {{1}}! ⏰ Your activity *{{2}}* starts at {{3}} (in {{4}} minutes). Details: {{5}}` |
   | `task_start` | `Hello {{1}}! 👋 It's {{2}}. Your scheduled activity: *{{3}}*. Description: {{4}}. Stay consistent with your daily goals! 💪` |
   | `task_incomplete` | `Hello {{1}}, your task *{{2}}* ({{3}}) has ended but is not marked as completed.` |
   | `schedule_update` | `Hello {{1}}, your timetable has been updated: {{2}}. Please follow your updated schedule.` |
   | `schedule_cancelled` | `Hello {{1}}, this was removed from your timetable: {{2}}.` |
   | `daily_summary` | `Good day {{1}}! Your plan for {{2}} has {{3}} task(s): {{4}}` |
   | `generic_notification` | `Hello {{1}}, {{2}}` |

   While testing with the Meta test number (inside the 24 h window) you can set
   `WHATSAPP_USE_TEMPLATES=false` to send the full free-form text messages instead.
5. **Webhook (delivery receipts + STOP opt-out).** In *WhatsApp → Configuration*, set the callback URL
   to `https://<your-domain>/api/webhooks/whatsapp`. Use `WHATSAPP_VERIFY_TOKEN` as the verify token
   and subscribe to `messages`. Set `WHATSAPP_APP_SECRET` so payload signatures (`X-Hub-Signature-256`) are verified.
6. **Consent.** WhatsApp can only be enabled after the user ticks the opt-in checkbox in Notification
   Center (stored with a timestamp). Replying **STOP** withdraws consent; **START** restores it.
   Changing the phone number resets consent.

---

## 5. Deployment

**Option A: Docker Compose (single host)**
```bash
cp backend/.env.example backend/.env        # production values, NODE_ENV=production, COOKIE_SECURE=true
docker compose --profile app up -d --build  # mysql, redis, api (runs migrations), worker
cd frontend && npm ci && npm run build      # serve frontend/dist with nginx (below)
```

**Option B: VM / PaaS with managed MySQL + Redis**
- API: `npm ci --omit=dev && npx sequelize-cli db:migrate && node src/server.js` with `RUN_BACKGROUND_JOBS=false`.
- Worker: `node src/worker.js`, as a separate process or dyno (it runs the crons and the BullMQ worker).
  Run multiple API instances freely. Crons are idempotent and the worker claims jobs atomically, so
  a second worker is safe too.
- Use PM2 or systemd for restarts. Back up MySQL; Redis only needs AOF persistence (it's not the source of truth).

**Serve both from one origin.** The auth cookie is `SameSite=Lax`, so serve the SPA and the API from
the same domain. Example nginx:
```nginx
server {
  listen 443 ssl; server_name timetable.example.com;
  root /var/www/smart-timetable/frontend/dist;
  location /api/     { proxy_pass http://127.0.0.1:5000; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
  location /uploads/ { proxy_pass http://127.0.0.1:5000; }
  location /         { try_files $uri /index.html; }
}
```

**Production checklist:** `NODE_ENV=production`, a long random `JWT_SECRET`, `COOKIE_SECURE=true`,
`FRONTEND_URL`/`CORS_ORIGINS` set to your domain, HTTPS, `WHATSAPP_APP_SECRET` set, a dedicated MySQL
user with least privilege, and `EMAIL_MODE=live` / `WHATSAPP_MODE=live`.

---

## 6. Security summary

- **Passwords and tokens:** bcrypt password hashes (12 rounds). Reset tokens are stored only as
  SHA-256 hashes; they are single-use and expire after 30 minutes. Forgot-password responds the same
  way whether or not the email exists.
- **Sessions:** the JWT lives in an `httpOnly`, `SameSite=Lax` cookie. Changing or resetting the
  password bumps `token_version`, which revokes all other sessions.
- **Ownership:** every query is scoped by `user_id`. Another user's resources return 404.
- **Hardening:** Helmet; strict CORS allow-list; rate limits (global, auth, password reset, test
  notifications); a 200 kb body limit.
- **Input handling:** express-validator on every input, tag and control-character stripping, and
  prototype-pollution guards. SQL is always parameterised (Sequelize). Email HTML is escaped.
- **Uploads:** only images (PNG/JPG/WEBP) up to 2 MB are accepted, and files get random server-side names.
- **Secrets:** they live only in `backend/.env`. The frontend never sees SMTP, WhatsApp or DB credentials.
