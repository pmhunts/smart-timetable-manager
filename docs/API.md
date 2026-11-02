# Smart Timetable — REST API Contract

Base URL: `/api` (the Vite dev server proxies `/api` and `/uploads` to `http://localhost:5000`).

## Conventions

- JSON bodies and responses; attribute names are **camelCase**.
- Auth: JWT stored in an **httpOnly cookie** (`st_token`). The frontend sends requests with `withCredentials: true`.
  The token is also returned in the login/register body and is accepted as `Authorization: Bearer <token>` (useful for Postman/curl).
- Success envelope: `{ "success": true, "data": <payload>, "message"?: string }`
- Error envelope: `{ "success": false, "message": string, "code"?: string, "errors"?: [{ "field": string, "message": string }], ...extra }`
- Dates: `YYYY-MM-DD` (in the user's timezone). Times: `HH:mm` (24h, user's local time).
  Instants (`createdAt`, `scheduledAt`, `startAtUtc`...) are ISO-8601 UTC strings.
- Weekdays use ISO numbering: `1` = Monday … `7` = Sunday.

### Error codes

| HTTP | code                     | When |
|------|--------------------------|------|
| 400  | `VALIDATION_ERROR`       | Bad input; `errors[]` lists fields |
| 400  | `PAST_DATE`              | Creating/modifying a timetable or task on a past date |
| 401  | `UNAUTHORIZED`           | Missing/invalid/expired token |
| 403  | `EDITING_WINDOW_CLOSED`  | Timetable editing window is closed. Body also has `editingWindow` (state object, see below). Message: "Your timetable editing window has closed. You can manage your schedule again during the next allowed window." |
| 403  | `WHATSAPP_CONSENT_REQUIRED` | Enabling WhatsApp without opt-in consent |
| 404  | `NOT_FOUND`              | Resource missing or owned by another user |
| 409  | `TASK_OVERLAP`           | Time overlap. Body has `conflicts: [{ id, title, startTime, endTime }]` |
| 409  | `TIMETABLE_EXISTS`       | A timetable already exists for the date. Body has `existingId` |
| 409  | `EMAIL_TAKEN`            | Email already registered |
| 429  | `RATE_LIMITED`           | Too many requests |

---

## Objects

### User
```json
{ "id": 1, "name": "Piyush", "email": "p@x.com", "countryCode": "+91", "phoneNumber": "9876543210",
  "whatsappNumber": "+919876543210", "timezone": "Asia/Kolkata", "profileImage": "/uploads/avatars/1-abc.png" | null,
  "isActive": true, "createdAt": "..." }
```

### Task
```json
{
  "id": 10, "timetableId": 3, "userId": 1,
  "title": "Morning Exercise", "description": "Complete your morning workout.",
  "scheduleDate": "2026-11-02", "startTime": "06:30", "endTime": "07:30",
  "category": "Exercise", "priority": "LOW|MEDIUM|HIGH",
  "status": "UPCOMING|ONGOING|COMPLETED|SKIPPED|MISSED",
  "repeatType": "NONE|DAILY|WEEKLY|CUSTOM", "repeatDays": [1,3,5] | null, "repeatUntil": "2026-12-31" | null,
  "sourceTaskId": null,            // set on auto-generated occurrences of a recurring task
  "allowOverlap": false,
  "reminderEnabled": true,         // master reminder switch for this task
  "whatsappReminder": true, "emailReminder": true,
  "startAtUtc": "2026-11-02T01:00:00.000Z", "endAtUtc": "...",
  "completedAt": null, "createdAt": "...", "updatedAt": "..."
}
```
Categories suggested by UI: `Study, Work, Exercise, Personal, Reading, Health, Meal, Other` (free text, max 100).

### Timetable
```json
{ "id": 3, "userId": 1, "title": "Monday plan", "scheduleDate": "2026-11-02",
  "status": "ACTIVE|LOCKED|ARCHIVED",
  "isLocked": false,       // computed now: editing window closed
  "isPast": false,         // scheduleDate < today (always read-only)
  "isEditable": true,      // !isLocked && !isPast
  "taskCount": 9, "completedCount": 2,
  "tasks": [Task...],      // only on GET /timetable/:id and /timetable/date/:date, sorted by startTime
  "createdAt": "...", "updatedAt": "..." }
```

### EditingWindowState
```json
{
  "enabled": true,               // restriction switched on
  "isOpen": true,                // editing currently allowed (always true when enabled=false)
  "isLocked": false,             // = !isOpen
  "timezone": "Asia/Kolkata",
  "serverTime": "2026-11-02T01:15:00.000Z",
  "currentWindow": { "opensAt": "ISO", "closesAt": "ISO" } | null,
  "nextWindow": { "opensAt": "ISO", "closesAt": "ISO" } | null,
  "secondsRemaining": 6300 | null,   // until currentWindow.closesAt
  "secondsUntilOpen": null | 75600   // until nextWindow.opensAt when locked
}
```

### NotificationSettings
```json
{
  "whatsappEnabled": false, "whatsappOptIn": false, "whatsappOptInAt": null,
  "whatsappTaskStart": true, "whatsappAdvanceReminder": true, "whatsappUpdateNotification": true,
  "whatsappDeletionNotification": true, "whatsappDailySummary": false,
  "emailEnabled": true,
  "emailTaskStart": true, "emailAdvanceReminder": true, "emailUpdateNotification": true,
  "emailDeletionNotification": true, "emailDailySummary": true,
  "incompleteReminder": false,
  "reminderMinutes": 10,                // one of 5, 10, 15, 30
  "dailySummaryTime": "07:00",
  "quietHoursEnabled": false, "quietHoursStart": "22:00" | null, "quietHoursEnd": "06:00" | null,
  "notificationSound": true
}
```

### NotificationLog
```json
{ "id": 5, "notificationType": "WHATSAPP|EMAIL",
  "eventType": "ADVANCE_REMINDER|TASK_START|INCOMPLETE_REMINDER|TASK_CREATED|TASK_UPDATED|TASK_DELETED|TIMETABLE_CREATED|TIMETABLE_UPDATED|TIMETABLE_DELETED|DAILY_SUMMARY|TEST",
  "message": "plain text body", "subject": "Email subject" | null,
  "taskId": 10 | null, "taskTitle": "Morning Exercise" | null,
  "scheduledAt": "ISO", "sentAt": "ISO" | null,
  "deliveryStatus": "PENDING|SENT|FAILED|CANCELLED",
  "providerStatus": "delivered|read|..." | null,
  "providerMessageId": "wamid..." | null, "errorMessage": null | "reason",
  "attempts": 1, "createdAt": "ISO" }
```

---

## Endpoints

### Auth
| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, countryCode, phoneNumber, password, confirmPassword, timezone? }` | `{ user, token }` (sets cookie) |
| POST | `/auth/login` | `{ email, password }` | `{ user, token }` (sets cookie) |
| POST | `/auth/logout` | – | `null` (clears cookie) |
| GET  | `/auth/me` | – | `{ user }` |
| POST | `/auth/forgot-password` | `{ email }` | `null` (always 200) |
| POST | `/auth/reset-password` | `{ token, password, confirmPassword }` | `null` |

Password rule: min 8 chars, at least one letter and one number. Reset link: `${FRONTEND_URL}/reset-password?token=...`.

### Users
| Method | Path | Body | `data` |
|---|---|---|---|
| GET | `/users/profile` | – | `{ user }` |
| PUT | `/users/profile` | `{ name?, email?, countryCode?, phoneNumber?, timezone? }` | `{ user }` |
| PUT | `/users/password` | `{ currentPassword, newPassword, confirmPassword }` | `null` |
| POST | `/users/avatar` | multipart field `avatar` (png/jpg/webp, ≤2 MB) | `{ user }` |
| DELETE | `/users/avatar` | – | `{ user }` |

### Dashboard
`GET /dashboard` →
```json
{ "user": User, "today": "2026-11-02", "serverTime": "ISO",
  "stats": { "total": 9, "completed": 2, "pending": 5, "upcoming": 4, "ongoing": 1, "missed": 1, "skipped": 1 },
  "tasks": [Task...],                          // today, sorted by startTime
  "nextTask": Task | null,
  "timetable": { "id", "title", "status", "isLocked" } | null,
  "editingWindow": EditingWindowState,
  "notifications": { "whatsappEnabled", "whatsappOptIn", "emailEnabled", "whatsappConfigured": bool, "emailConfigured": bool, "pendingCount": 3, "failedToday": 0 },
  "weekly": [{ "date", "total", "completed", "missed", "skipped", "completionRate" }]   // last 7 days incl. today
}
```
`pending` = upcoming + ongoing.

### Timetables  (create/update/delete/duplicate are blocked with 403 when the editing window is closed)
| Method | Path | Body / Query | `data` |
|---|---|---|---|
| GET | `/timetable` | `?from=&to=&page=1&limit=20` | `{ items: [Timetable], pagination: { page, limit, total, totalPages } }` (newest date first) |
| GET | `/timetable/date/:date` | – | `Timetable` with tasks, or `null` |
| GET | `/timetable/:id` | – | `Timetable` with tasks |
| POST | `/timetable` | `{ title, scheduleDate, tasks: [TaskInput] }` | `Timetable` (201) |
| PUT | `/timetable/:id` | `{ title?, tasks?: [TaskInput & { id? }] }` — when `tasks` is given it is the full desired list: items with `id` are updated, without `id` are created, omitted existing tasks are deleted | `Timetable` |
| DELETE | `/timetable/:id` | – | `null` |
| POST | `/timetable/:id/duplicate` | `{ targetDate, title? }` | `Timetable` (201) |

`TaskInput` = `{ title, description?, startTime, endTime, category?, priority?, repeatType?, repeatDays?, repeatUntil?, allowOverlap?, reminderEnabled?, whatsappReminder?, emailReminder? }`

### Tasks  (POST/PUT/DELETE blocked by editing window; PATCH status is always allowed)
| Method | Path | Body / Query | `data` |
|---|---|---|---|
| GET | `/tasks` | `?date=` or `?from=&to=` (max 62 days), `&status=MISSED,UPCOMING&category=&search=&limit=` | `{ items: [Task] }` sorted by date, startTime |
| GET | `/tasks/stats` | `?days=7` (1–90) | `{ daily: [{ date, total, completed, missed, skipped, completionRate }], totals: { total, completed, missed, skipped, pending, completionRate }, byCategory: [{ category, total, completed }] }` |
| GET | `/tasks/:id` | – | `Task` |
| POST | `/tasks` | `TaskInput & { scheduleDate }` (creates the day's timetable if missing) | `Task` (201) |
| PUT | `/tasks/:id` | partial `TaskInput & { scheduleDate? }` | `Task` |
| PATCH | `/tasks/:id/status` | `{ status: "COMPLETED" | "SKIPPED" | "UPCOMING" }` (`UPCOMING` = undo; real status is recomputed from the clock) | `Task` |
| DELETE | `/tasks/:id` | – | `null` |

### Settings
| Method | Path | Body | `data` |
|---|---|---|---|
| GET | `/settings/notifications` | – | `NotificationSettings` |
| PUT | `/settings/notifications` | partial `NotificationSettings` (setting `whatsappOptIn: true` records consent time) | `NotificationSettings` |
| GET | `/settings/editing-window` | – | `{ settings: { editingEnabled, startTime, endTime, applicableDays }, state: EditingWindowState }` |
| PUT | `/settings/editing-window` | `{ editingEnabled, startTime, endTime, applicableDays }` — itself only allowed while the window is open (or restriction disabled), otherwise 403 `EDITING_WINDOW_CLOSED` | same as GET |

### Notifications
| Method | Path | Body / Query | `data` |
|---|---|---|---|
| GET | `/notifications/history` | `?page=1&limit=20&type=WHATSAPP|EMAIL&status=SENT|FAILED|PENDING|CANCELLED&eventType=&from=YYYY-MM-DD&to=YYYY-MM-DD&search=` | `{ items: [NotificationLog], pagination }` (newest first) |
| POST | `/notifications/test-whatsapp` | – | `NotificationLog` |
| POST | `/notifications/test-email` | – | `NotificationLog` |

### Webhooks (Meta, no auth)
- `GET /webhooks/whatsapp` — verification handshake.
- `POST /webhooks/whatsapp` — delivery statuses + inbound `STOP` / `START` keywords (opt-out / opt-in).
