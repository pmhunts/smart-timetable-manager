const { Timetable, Task } = require('../models');
const ApiError = require('../utils/ApiError');
const { localToUtc, timeToMinutes, formatTime12, formatDateLong } = require('../utils/time');
const { pick } = require('../utils/object');
const { computeAutoStatus } = require('./taskStatusService');

const TASK_INPUT_FIELDS = [
  'title',
  'description',
  'startTime',
  'endTime',
  'category',
  'priority',
  'repeatType',
  'repeatDays',
  'repeatUntil',
  'allowOverlap',
  'reminderEnabled',
  'whatsappReminder',
  'emailReminder',
];

const hhmm = (t) => (t ? String(t).slice(0, 5) : t);

const fieldError = (field, message) => ApiError.badRequest(message, 'VALIDATION_ERROR', { errors: [{ field, message }] });

/** Normalises recurrence fields so the stored combination is always consistent. */
function normalizeRecurrence(data) {
  if (!data.repeatType || data.repeatType === 'NONE') {
    data.repeatType = 'NONE';
    data.repeatDays = null;
    data.repeatUntil = null;
  } else if (data.repeatType !== 'CUSTOM') {
    data.repeatDays = null;
  } else if (Array.isArray(data.repeatDays)) {
    data.repeatDays = [...new Set(data.repeatDays.map(Number))].sort();
  }
  if (data.repeatUntil === '') data.repeatUntil = null;
  return data;
}

/** Full task input with defaults (used on create). */
function normalizeNewTask(input) {
  const data = pick(input, TASK_INPUT_FIELDS);
  return normalizeRecurrence({
    title: data.title,
    description: data.description || null,
    startTime: hhmm(data.startTime),
    endTime: hhmm(data.endTime),
    category: data.category || 'Personal',
    priority: data.priority || 'MEDIUM',
    repeatType: data.repeatType || 'NONE',
    repeatDays: data.repeatDays || null,
    repeatUntil: data.repeatUntil || null,
    allowOverlap: data.allowOverlap ?? false,
    reminderEnabled: data.reminderEnabled ?? true,
    whatsappReminder: data.whatsappReminder ?? true,
    emailReminder: data.emailReminder ?? true,
  });
}

/** Business validation that express-validator cannot express on its own. */
function validateTaskShape(t, scheduleDate) {
  if (!t.title || !String(t.title).trim()) throw fieldError('title', 'Task title is required');
  if (!t.startTime || !t.endTime) throw fieldError('startTime', 'Start and end time are required');
  if (timeToMinutes(t.endTime) <= timeToMinutes(t.startTime)) {
    throw fieldError('endTime', `"${t.title}": end time must be after start time`);
  }
  if (t.repeatType === 'CUSTOM' && (!Array.isArray(t.repeatDays) || !t.repeatDays.length)) {
    throw fieldError('repeatDays', `"${t.title}": choose at least one day for a custom repeat`);
  }
  if (t.repeatUntil && t.repeatUntil < scheduleDate) {
    throw fieldError('repeatUntil', `"${t.title}": repeat-until date must be on or after the task date`);
  }
}

function assertNotPast(date, today) {
  if (date < today) {
    throw ApiError.badRequest('Past timetables are read-only and cannot be modified', 'PAST_DATE');
  }
}

const overlaps = (a, b) =>
  timeToMinutes(a.startTime) < timeToMinutes(b.endTime) && timeToMinutes(a.endTime) > timeToMinutes(b.startTime);

/** Tasks in `others` that clash with `candidate`. Overlap is allowed when either task opts in; skipped tasks never clash. */
function findConflicts(candidate, others) {
  return others.filter(
    (o) =>
      (candidate.id === undefined || String(o.id) !== String(candidate.id)) &&
      o.status !== 'SKIPPED' &&
      candidate.status !== 'SKIPPED' &&
      !candidate.allowOverlap &&
      !o.allowOverlap &&
      overlaps(candidate, o)
  );
}

const conflictError = (task, conflicts) =>
  ApiError.conflict(
    `"${task.title}" (${formatTime12(task.startTime)} - ${formatTime12(task.endTime)}) overlaps with ${conflicts
      .map((c) => `"${c.title}" (${formatTime12(c.startTime)} - ${formatTime12(c.endTime)})`)
      .join(', ')}. Turn on "Allow overlap" to schedule it anyway.`,
    'TASK_OVERLAP',
    { conflicts: conflicts.map((c) => ({ id: c.id ?? null, title: c.title, startTime: hhmm(c.startTime), endTime: hhmm(c.endTime) })) }
  );

/** Checks a complete list of tasks for one day against each other. */
function assertNoOverlaps(list) {
  for (let i = 0; i < list.length; i += 1) {
    const conflicts = findConflicts(list[i], list.slice(i + 1));
    if (conflicts.length) throw conflictError(list[i], conflicts);
  }
}

/**
 * Locks (SELECT ... FOR UPDATE) the user's timetable for `date`, creating it if needed.
 * Locking the day's timetable row serialises concurrent writes to the same day,
 * so two requests cannot both pass the overlap check and insert clashing tasks.
 */
async function lockTimetableForDate(user, date, { transaction, title, createIfMissing = true }) {
  const find = () => Timetable.findOne({ where: { userId: user.id, scheduleDate: date }, transaction, lock: transaction.LOCK.UPDATE });
  let timetable = await find();
  if (!timetable && createIfMissing) {
    try {
      timetable = await Timetable.create(
        { userId: user.id, scheduleDate: date, title: title || `Timetable for ${formatDateLong(date)}`, status: 'ACTIVE' },
        { transaction }
      );
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError') throw err;
      timetable = await find();
    }
  }
  return timetable;
}

const loadDayTasks = (userId, date, transaction) =>
  Task.findAll({ where: { userId, scheduleDate: date }, transaction, lock: transaction.LOCK.UPDATE, order: [['startTime', 'ASC']] });

const utcFields = (date, startTime, endTime, timezone) => ({
  startAtUtc: localToUtc(date, startTime, timezone),
  endAtUtc: localToUtc(date, endTime, timezone),
});

/** Column values for a new task row. */
function buildTaskValues(user, timetable, date, data, now = new Date()) {
  const utc = utcFields(date, data.startTime, data.endTime, user.timezone);
  return {
    ...data,
    userId: user.id,
    timetableId: timetable.id,
    scheduleDate: date,
    ...utc,
    status: computeAutoStatus(utc.startAtUtc, utc.endAtUtc, now),
    scheduleVersion: 1,
  };
}

module.exports = {
  TASK_INPUT_FIELDS,
  hhmm,
  normalizeRecurrence,
  normalizeNewTask,
  validateTaskShape,
  assertNotPast,
  findConflicts,
  conflictError,
  assertNoOverlaps,
  lockTimetableForDate,
  loadDayTasks,
  utcFields,
  buildTaskValues,
};
