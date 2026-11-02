const { Op, QueryTypes } = require('sequelize');
const { DateTime } = require('luxon');
const { sequelize, Task } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { todayIn, addDays } = require('../utils/time');
const { pick } = require('../utils/object');
const { computeAutoStatus, AUTO_STATUSES } = require('./taskStatusService');
const { getNotificationSettings } = require('./settingsService');
const notifications = require('../notifications/notificationService');
const recurrence = require('./recurrenceService');
const {
  TASK_INPUT_FIELDS,
  hhmm,
  normalizeRecurrence,
  normalizeNewTask,
  validateTaskShape,
  assertNotPast,
  findConflicts,
  conflictError,
  lockTimetableForDate,
  loadDayTasks,
  utcFields,
  buildTaskValues,
} = require('./taskHelpers');

const MEANINGFUL_FIELDS = ['title', 'scheduleDate', 'startTime', 'endTime'];
const SCHEDULE_FIELDS = ['scheduleDate', 'startTime', 'endTime'];
const REMINDER_FIELDS = ['reminderEnabled', 'whatsappReminder', 'emailReminder'];
const RECURRENCE_FIELDS = ['repeatType', 'repeatDays', 'repeatUntil'];

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const scheduleOf = (t) => ({ title: t.title, scheduleDate: t.scheduleDate, startTime: t.startTime, endTime: t.endTime });

/** Runs `fn` after commit without failing the request. */
const afterCommit = (transaction, fn) =>
  transaction.afterCommit(() => Promise.resolve().then(fn).catch((err) => logger.error('[tasks] post-commit:', err.message)));

async function findOwnedTask(user, id, { transaction, lock = false } = {}) {
  const task = await Task.findOne({
    where: { id, userId: user.id },
    transaction,
    lock: lock && transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

/**
 * Applies an update to a task inside a transaction and keeps reminders/recurrence consistent.
 * Returns { change, recurrenceTouched } where `change` describes meaningful (user visible) changes
 * used for update notifications, or null when nothing meaningful changed.
 */
async function applyTaskUpdate(user, task, rawInput, { transaction, settings, today, skipOverlapCheck = false, now = new Date() }) {
  const input = pick(rawInput, [...TASK_INPUT_FIELDS, 'scheduleDate']);
  if (input.startTime) input.startTime = hhmm(input.startTime);
  if (input.endTime) input.endTime = hhmm(input.endTime);

  const before = { ...task.get() };
  const merged = normalizeRecurrence({ ...before, ...input });
  validateTaskShape(merged, merged.scheduleDate);
  if (merged.scheduleDate !== before.scheduleDate) assertNotPast(merged.scheduleDate, today);

  const changed = (f) => !same(merged[f], before[f]);
  const changes = MEANINGFUL_FIELDS.filter(changed).map((field) => ({ field, from: before[field], to: merged[field] }));
  const scheduleChanged = SCHEDULE_FIELDS.some(changed);
  const remindersChanged = REMINDER_FIELDS.some(changed);
  const recurrenceTouched = before.repeatType !== 'NONE' || merged.repeatType !== 'NONE';

  const updates = {};
  [...TASK_INPUT_FIELDS, 'scheduleDate'].forEach((f) => {
    if (changed(f)) updates[f] = merged[f];
  });
  if (!Object.keys(updates).length) return { change: null, recurrenceTouched: false };

  if (scheduleChanged) {
    if (merged.scheduleDate !== before.scheduleDate) {
      const timetable = await lockTimetableForDate(user, merged.scheduleDate, { transaction });
      updates.timetableId = timetable.id;
      // A moved occurrence becomes a standalone task; the template must not recreate it on the old date.
      if (task.sourceTaskId) {
        await addRecurrenceException(task.sourceTaskId, before.scheduleDate, transaction);
        updates.sourceTaskId = null;
      }
    }
    Object.assign(updates, utcFields(merged.scheduleDate, merged.startTime, merged.endTime, user.timezone));
    updates.scheduleVersion = task.scheduleVersion + 1;
    if (AUTO_STATUSES.includes(task.status)) updates.status = computeAutoStatus(updates.startAtUtc, updates.endAtUtc, now);
  }

  if (!skipOverlapCheck && (scheduleChanged || (changed('allowOverlap') && !merged.allowOverlap))) {
    const dayTasks = await loadDayTasks(user.id, merged.scheduleDate, transaction);
    const conflicts = findConflicts({ ...merged, id: task.id }, dayTasks);
    if (conflicts.length) throw conflictError(merged, conflicts);
  }

  await task.update(updates, { transaction });

  if (scheduleChanged) {
    await notifications.cancelTaskReminders(task.id, 'Task was rescheduled', { transaction });
  } else if (remindersChanged) {
    await notifications.cancelTaskReminders(task.id, 'Reminder settings changed', { transaction });
  }
  if (scheduleChanged || remindersChanged) {
    await notifications.planTaskReminders(task, user, settings, { transaction, now });
  }

  return {
    recurrenceTouched: recurrenceTouched && Object.keys(updates).length > 0,
    change: changes.length
      ? { taskId: task.id, title: task.title, before: scheduleOf(before), after: scheduleOf(merged), changes }
      : null,
  };
}

async function addRecurrenceException(templateId, date, transaction) {
  const template = await Task.findByPk(templateId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!template) return;
  const exceptions = new Set(template.repeatExceptions || []);
  exceptions.add(date);
  await template.update({ repeatExceptions: [...exceptions].sort() }, { transaction });
}

/**
 * Deletes a task inside a transaction: cancels its reminders, records a recurrence exception for
 * generated occurrences, and removes future untouched occurrences when the task is a template.
 * Returns a snapshot of the deleted task.
 */
async function removeTask(task, { transaction, today }) {
  await notifications.cancelTaskReminders(task.id, 'Task was deleted', { transaction });
  if (task.sourceTaskId) await addRecurrenceException(task.sourceTaskId, task.scheduleDate, transaction);
  if (task.repeatType !== 'NONE') {
    const future = await Task.findAll({
      where: { sourceTaskId: task.id, scheduleDate: { [Op.gt]: today }, status: 'UPCOMING' },
      transaction,
    });
    if (future.length) {
      const ids = future.map((t) => t.id);
      await notifications.cancelTaskReminders(ids, 'Recurring task was deleted', { transaction });
      await Task.destroy({ where: { id: { [Op.in]: ids } }, transaction });
    }
  }
  const snapshot = notifications.taskSnapshot(task);
  await task.destroy({ transaction });
  return snapshot;
}

// ---------------------------------------------------------------------------------------------

async function createTask(user, input) {
  const today = todayIn(user.timezone);
  const date = input.scheduleDate;
  assertNotPast(date, today);
  const data = normalizeNewTask(input);
  validateTaskShape(data, date);

  return sequelize.transaction(async (transaction) => {
    const timetable = await lockTimetableForDate(user, date, { transaction });
    const dayTasks = await loadDayTasks(user.id, date, transaction);
    const conflicts = findConflicts(data, dayTasks);
    if (conflicts.length) throw conflictError(data, conflicts);

    const task = await Task.create(buildTaskValues(user, timetable, date, data), { transaction });
    const settings = await getNotificationSettings(user.id, { transaction });
    await notifications.planTaskReminders(task, user, settings, { transaction });
    await notifications.notifyEvent(user, 'TASK_CREATED', { task, transaction });
    if (task.repeatType !== 'NONE') afterCommit(transaction, () => recurrence.generateForTask(task.id));
    return task;
  });
}

async function updateTask(user, id, input) {
  const today = todayIn(user.timezone);
  return sequelize.transaction(async (transaction) => {
    const task = await findOwnedTask(user, id, { transaction, lock: true });
    assertNotPast(task.scheduleDate, today);
    const settings = await getNotificationSettings(user.id, { transaction });
    const { change, recurrenceTouched } = await applyTaskUpdate(user, task, input, { transaction, settings, today });
    if (change) {
      await notifications.notifyEvent(user, 'TASK_UPDATED', { task, payload: { change }, transaction });
    }
    if (recurrenceTouched) afterCommit(transaction, () => recurrence.regenerateFuture(task.id));
    return task;
  });
}

async function deleteTask(user, id) {
  const today = todayIn(user.timezone);
  await sequelize.transaction(async (transaction) => {
    const task = await findOwnedTask(user, id, { transaction, lock: true });
    assertNotPast(task.scheduleDate, today);
    const snapshot = await removeTask(task, { transaction, today });
    await notifications.notifyEvent(user, 'TASK_DELETED', { payload: { task: snapshot }, transaction });
  });
}

/** Manual status change. Allowed even while the editing window is locked. */
async function updateStatus(user, id, status) {
  const today = todayIn(user.timezone);
  const now = new Date();
  return sequelize.transaction(async (transaction) => {
    const task = await findOwnedTask(user, id, { transaction, lock: true });
    if (task.scheduleDate > today) {
      throw ApiError.badRequest("You can only change the status of today's or past tasks", 'BAD_REQUEST');
    }
    if (status === 'COMPLETED') {
      await task.update({ status, completedAt: now }, { transaction });
      await notifications.cancelTaskReminders(task.id, 'Task completed', { transaction });
    } else if (status === 'SKIPPED') {
      await task.update({ status, completedAt: null }, { transaction });
      await notifications.cancelTaskReminders(task.id, 'Task skipped', { transaction });
    } else {
      await task.update({ status: computeAutoStatus(task.startAtUtc, task.endAtUtc, now), completedAt: null }, { transaction });
      const settings = await getNotificationSettings(user.id, { transaction });
      await notifications.planTaskReminders(task, user, settings, { transaction, now });
    }
    return task;
  });
}

async function getTask(user, id) {
  return findOwnedTask(user, id);
}

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

async function listTasks(user, query) {
  const today = todayIn(user.timezone);
  let from = query.date || query.from || today;
  let to = query.date || query.to || from;
  if (to < from) [from, to] = [to, from];
  const span = DateTime.fromISO(to).diff(DateTime.fromISO(from), 'days').days;
  if (span > 62) throw ApiError.badRequest('Date range cannot exceed 62 days', 'VALIDATION_ERROR');

  const where = { userId: user.id, scheduleDate: { [Op.between]: [from, to] } };
  if (query.status) where.status = { [Op.in]: query.status };
  if (query.category) where.category = query.category;
  if (query.search) where.title = { [Op.like]: `%${escapeLike(query.search)}%` };

  return Task.findAll({
    where,
    order: [
      ['scheduleDate', 'ASC'],
      ['startTime', 'ASC'],
    ],
    limit: Math.min(1000, parseInt(query.limit, 10) || 1000),
  });
}

/** Daily completion statistics for the last `days` days including today. */
async function getStats(user, days = 7) {
  const today = todayIn(user.timezone);
  const from = addDays(today, -(days - 1));
  const rows = await sequelize.query(
    `SELECT schedule_date AS date,
            COUNT(*) AS total,
            SUM(status = 'COMPLETED') AS completed,
            SUM(status = 'MISSED') AS missed,
            SUM(status = 'SKIPPED') AS skipped,
            SUM(status IN ('UPCOMING', 'ONGOING')) AS pending
       FROM tasks
      WHERE user_id = :userId AND schedule_date BETWEEN :from AND :to
      GROUP BY schedule_date`,
    { replacements: { userId: user.id, from, to: today }, type: QueryTypes.SELECT }
  );
  const byDate = new Map(rows.map((r) => [String(r.date instanceof Date ? r.date.toISOString().slice(0, 10) : r.date).slice(0, 10), r]));
  const rate = (completed, total) => (total ? Math.round((completed / total) * 100) : 0);

  const daily = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const r = byDate.get(d) || {};
    const total = Number(r.total || 0);
    const completed = Number(r.completed || 0);
    daily.push({ date: d, total, completed, missed: Number(r.missed || 0), skipped: Number(r.skipped || 0), completionRate: rate(completed, total) });
  }

  const totals = daily.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      completed: acc.completed + d.completed,
      missed: acc.missed + d.missed,
      skipped: acc.skipped + d.skipped,
    }),
    { total: 0, completed: 0, missed: 0, skipped: 0 }
  );
  totals.pending = rows.reduce((n, r) => n + Number(r.pending || 0), 0);
  totals.completionRate = rate(totals.completed, totals.total);

  const byCategory = (
    await sequelize.query(
      `SELECT category, COUNT(*) AS total, SUM(status = 'COMPLETED') AS completed
         FROM tasks
        WHERE user_id = :userId AND schedule_date BETWEEN :from AND :to
        GROUP BY category ORDER BY total DESC`,
      { replacements: { userId: user.id, from, to: today }, type: QueryTypes.SELECT }
    )
  ).map((r) => ({ category: r.category, total: Number(r.total), completed: Number(r.completed || 0) }));

  return { daily, totals, byCategory };
}

/** After a timezone change: recompute UTC instants of current/future tasks and replan reminders. */
async function recomputeForTimezone(user) {
  const today = todayIn(user.timezone);
  const now = new Date();
  const tasks = await Task.findAll({ where: { userId: user.id, scheduleDate: { [Op.gte]: addDays(today, -1) } } });
  await sequelize.transaction(async (transaction) => {
    for (const task of tasks) {
      const utc = utcFields(task.scheduleDate, task.startTime, task.endTime, user.timezone);
      const updates = { ...utc, scheduleVersion: task.scheduleVersion + 1 };
      if (AUTO_STATUSES.includes(task.status)) updates.status = computeAutoStatus(utc.startAtUtc, utc.endAtUtc, now);
      await task.update(updates, { transaction });
    }
  });
  await notifications.replanUser(user.id);
}

module.exports = {
  createTask,
  updateTask,
  deleteTask,
  updateStatus,
  getTask,
  listTasks,
  getStats,
  recomputeForTimezone,
  applyTaskUpdate,
  removeTask,
  findOwnedTask,
};
