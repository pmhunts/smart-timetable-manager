const { DateTime, IANAZone } = require('luxon');

const isValidTimezone = (tz) => typeof tz === 'string' && IANAZone.isValidZone(tz);

const safeZone = (tz) => (isValidTimezone(tz) ? tz : 'UTC');

/** Current DateTime in the given IANA timezone. */
const nowIn = (tz, now = new Date()) => DateTime.fromJSDate(now).setZone(safeZone(tz));

/** Today's date (YYYY-MM-DD) in the given timezone. */
const todayIn = (tz, now = new Date()) => nowIn(tz, now).toISODate();

/** "HH:mm" or "HH:mm:ss" -> minutes since midnight. */
const timeToMinutes = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
};

/** Local date + local time in timezone -> JS Date (UTC instant). */
const localToUtc = (date, time, tz) => {
  const hhmm = String(time).slice(0, 5);
  const dt = DateTime.fromISO(`${date}T${hhmm}`, { zone: safeZone(tz) });
  if (!dt.isValid) throw new Error(`Invalid date/time: ${date} ${time}`);
  return dt.toUTC().toJSDate();
};

/** Format "HH:mm" as "6:30 AM". */
const formatTime12 = (t) => {
  if (!t) return '';
  const mins = timeToMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

/** Format a YYYY-MM-DD date as "Mon, 2 Nov 2026". */
const formatDateLong = (date) => DateTime.fromISO(date).toFormat('ccc, d LLL yyyy');

/** Format a UTC instant in the user's timezone. */
const formatInstant = (jsDate, tz, fmt = 'ccc d LLL, h:mm a') =>
  DateTime.fromJSDate(new Date(jsDate)).setZone(safeZone(tz)).toFormat(fmt);

/** Add days to an ISO date string. */
const addDays = (date, days) => DateTime.fromISO(date).plus({ days }).toISODate();

/** ISO weekday (1=Mon..7=Sun) of an ISO date string. */
const isoWeekday = (date) => DateTime.fromISO(date).weekday;

/** Whether a minute-of-day falls in [start, end) handling ranges that cross midnight. */
const inTimeRange = (minute, start, end) => {
  if (start === end) return false;
  if (start < end) return minute >= start && minute < end;
  return minute >= start || minute < end;
};

module.exports = {
  DateTime,
  isValidTimezone,
  safeZone,
  nowIn,
  todayIn,
  timeToMinutes,
  localToUtc,
  formatTime12,
  formatDateLong,
  formatInstant,
  addDays,
  isoWeekday,
  inTimeRange,
};
