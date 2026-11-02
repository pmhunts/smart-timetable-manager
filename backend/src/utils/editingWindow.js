const { DateTime } = require('luxon');
const { safeZone, timeToMinutes } = require('./time');

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Builds the concrete [opensAt, closesAt) window that starts on `day` (a luxon DateTime at local midnight).
 * A window whose closing time is earlier than its start time spans midnight and closes the next day.
 */
function windowForDay(day, startTime, endTime) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const opensAt = day.plus({ minutes: startMin });
  let closesAt = day.plus({ minutes: endMin });
  if (endMin <= startMin) closesAt = closesAt.plus({ days: 1 });
  return { opensAt, closesAt };
}

/**
 * Computes whether timetable editing is allowed right now.
 *
 * Rules:
 *  - restriction disabled  -> always open
 *  - restriction enabled   -> open only inside [startTime, endTime) on an applicable day
 *                             (the day the window opens; overnight windows are supported)
 *
 * All calculations use the server clock (`now`) converted into the user's timezone,
 * so the client cannot influence the result.
 */
function getEditingWindowState(settings, timezone, now = new Date()) {
  const tz = safeZone(timezone);
  const nowDt = DateTime.fromJSDate(now).setZone(tz);
  const base = {
    enabled: Boolean(settings && settings.editingEnabled),
    timezone: tz,
    serverTime: now.toISOString(),
  };

  if (!base.enabled) {
    return {
      ...base,
      isOpen: true,
      isLocked: false,
      currentWindow: null,
      nextWindow: null,
      secondsRemaining: null,
      secondsUntilOpen: null,
    };
  }

  const days = Array.isArray(settings.applicableDays) && settings.applicableDays.length ? settings.applicableDays : ALL_DAYS;
  const today = nowDt.startOf('day');
  let current = null;
  let next = null;

  // Yesterday is included so an overnight window that opened yesterday is detected.
  for (let offset = -1; offset <= 8 && !next; offset += 1) {
    const day = today.plus({ days: offset });
    if (!days.includes(day.weekday)) continue;
    const w = windowForDay(day, settings.startTime, settings.endTime);
    if (nowDt >= w.opensAt && nowDt < w.closesAt) current = current || w;
    else if (w.opensAt > nowDt) next = w;
  }

  const iso = (w) => (w ? { opensAt: w.opensAt.toUTC().toISO(), closesAt: w.closesAt.toUTC().toISO() } : null);
  const isOpen = Boolean(current);

  return {
    ...base,
    isOpen,
    isLocked: !isOpen,
    currentWindow: iso(current),
    nextWindow: iso(next),
    secondsRemaining: current ? Math.max(0, Math.floor(current.closesAt.diff(nowDt, 'seconds').seconds)) : null,
    secondsUntilOpen: !current && next ? Math.max(0, Math.floor(next.opensAt.diff(nowDt, 'seconds').seconds)) : null,
  };
}

const EDITING_WINDOW_CLOSED_MESSAGE =
  'Your timetable editing window has closed. You can manage your schedule again during the next allowed window.';

module.exports = { getEditingWindowState, EDITING_WINDOW_CLOSED_MESSAGE, ALL_DAYS };
