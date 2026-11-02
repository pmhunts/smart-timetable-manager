// Date helpers. Calendar dates are plain 'YYYY-MM-DD' strings in the user's timezone;
// they are manipulated as UTC-midnight Date objects so the browser's own offset never leaks in.

export const WEEKDAYS = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 7, short: 'Sun', long: 'Sunday' },
];

const pad = (n) => String(n).padStart(2, '0');

export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function safeTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

/** Parts of an instant in a given timezone. */
export function zonedParts(date = new Date(), tz) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTz(tz),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

export const todayInTz = (tz) => zonedParts(new Date(), tz).date;

export function nowMinutesInTz(tz) {
  const p = zonedParts(new Date(), tz);
  return p.hour * 60 + p.minute + p.second / 60;
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDateStr(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(str, n) {
  const d = parseDate(str);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

export function addMonths(str, n) {
  const d = parseDate(str);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return toDateStr(d);
}

/** ISO weekday 1 (Mon) … 7 (Sun). */
export function isoWeekday(str) {
  const w = parseDate(str).getUTCDay();
  return w === 0 ? 7 : w;
}

export const startOfWeek = (str) => addDays(str, 1 - isoWeekday(str));

export function startOfMonth(str) {
  return `${str.slice(0, 7)}-01`;
}

export function endOfMonth(str) {
  const d = parseDate(startOfMonth(str));
  return toDateStr(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** 6x7 grid of dates (Mon-first) covering the month containing `str`. */
export function monthGrid(str) {
  const start = startOfWeek(startOfMonth(str));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export function diffDays(a, b) {
  return Math.round((parseDate(a) - parseDate(b)) / 86400000);
}

export function formatDate(str, opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!str) return '';
  return parseDate(str).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
}

export const formatDateLong = (str) =>
  formatDate(str, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

export const formatMonthYear = (str) => formatDate(str, { month: 'long', year: 'numeric' });

/** '06:30' or '06:30:00' -> '6:30 AM' */
export function formatTime12(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${pad(m)} ${suffix}`;
}

export function formatHourLabel(h) {
  const suffix = h >= 12 && h < 24 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour} ${suffix}`;
}

export function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins) {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export const normalizeTime = (t) => (t ? t.slice(0, 5) : t);

/** Format a UTC ISO instant in the user's timezone. */
export function formatInstant(iso, tz, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    timeZone: safeTz(tz),
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...opts,
  });
}

export function formatInstantTime(iso, tz) {
  return formatInstant(iso, tz, { month: undefined, day: undefined });
}

/** 3725 -> '1h 02m 05s' */
export function formatCountdown(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) return '—';
  const s = Math.floor(totalSeconds);
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (days > 0) return `${days}d ${h}h ${pad(m)}m`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  return `${m}m ${pad(sec)}s`;
}

export function greeting(hour) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function durationLabel(start, end) {
  const mins = timeToMinutes(end) - timeToMinutes(start);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
}
