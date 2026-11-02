const { Op } = require('sequelize');
const { sequelize, Timetable, Task } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { todayIn } = require('../utils/time');
const { pick } = require('../utils/object');
const { getNotificationSettings } = require('./settingsService');
const editingWindowService = require('./editingWindowService');
const notifications = require('../notifications/notificationService');
const recurrence = require('./recurrenceService');
const { applyTaskUpdate, removeTask } = require('./taskService');
const {
  TASK_INPUT_FIELDS,
  normalizeNewTask,
  validateTaskShape,
  assertNotPast,
  assertNoOverlaps,
  buildTaskValues,
  loadDayTasks,
  normalizeRecurrence,
  hhmm,
} = require('./taskHelpers');

const TASK_ORDER = [[{ model: Task, as: 'tasks' }, 'startTime', 'ASC']];

const COUNT_ATTRIBUTES = [
  [sequelize.literal('(SELECT COUNT(*) FROM tasks AS t WHERE t.timetable_id = `Timetable`.`id`)'), 'taskCount'],
  [
    sequelize.literal("(SELECT COUNT(*) FROM tasks AS t WHERE t.timetable_id = `Timetable`.`id` AND t.status = 'COMPLETED')"),
    'completedCount',
  ],
];

const afterCommit = (transaction, fn) =>
  transaction.afterCommit(() => Promise.resolve().then(fn).catch((err) => logger.error('[timetable] post-commit:', err.message)));

/** Adds computed flags (locked / past / editable) to a timetable. */
function serialize(timetable, { today, windowState }) {
  const json = timetable.toJSON();
  const tasks = timetable.tasks;
  const isPast = json.scheduleDate < today;
  return {
    ...json,
    taskCount: Number(json.taskCount ?? (tasks ? tasks.length : 0)),
    completedCount: Number(json.completedCount ?? (tasks ? tasks.filter((t) => t.status === 'COMPLETED').length : 0)),
    isLocked: windowState.isLocked,
    isPast,
    isEditable: !windowState.isLocked && !isPast,
  };
}

async function context(user) {
  return { today: todayIn(user.timezone), windowState: await editingWindowService.getStateForUser(user) };
}

async function findOwned(user, id, { transaction, lock = false, withTasks = false } = {}) {
  const timetable = await Timetable.findOne({
    where: { id, userId: user.id },
    include: withTasks ? [{ model: Task, as: 'tasks' }] : [],
    order: withTasks ? TASK_ORDER : undefined,
    transaction,
    lock: lock && transaction ? transaction.LOCK.UPDATE : undefined,
  });
  if (!timetable) throw ApiError.notFound('Timetable not found');
  return timetable;
}

async function getById(user, id) {
  const timetable = await findOwned(user, id, { withTasks: true });
  return serialize(timetable, await context(user));
}

async function getByDate(user, date) {
  const timetable = await Timetable.findOne({
    where: { userId: user.id, scheduleDate: date },
    include: [{ model: Task, as: 'tasks' }],
    order: TASK_ORDER,
  });
  return timetable ? serialize(timetable, await context(user)) : null;
}

async function list(user, { from, to, page, limit, offset }) {
  const where = { userId: user.id };
  if (from || to) {
    where.scheduleDate = {};
    if (from) where.scheduleDate[Op.gte] = from;
    if (to) where.scheduleDate[Op.lte] = to;
  }
  const { rows, count } = await Timetable.findAndCountAll({
    where,
    attributes: { include: COUNT_ATTRIBUTES },
    order: [['scheduleDate', 'DESC']],
    limit,
    offset,
  });
  const ctx = await context(user);
  return { items: rows.map((t) => serialize(t, ctx)), total: count, page, limit };
}

const snapshotList = (tasks) =>
  tasks
    .map((t) => notifications.taskSnapshot(t))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

async function create(user, { title, scheduleDate, tasks = [] }) {
  const today = todayIn(user.timezone);
  assertNotPast(scheduleDate, today);
  const items = tasks.map((t) => normalizeNewTask(t));
  items.forEach((t) => validateTaskShape(t, scheduleDate));
  assertNoOverlaps(items);

  const timetable = await sequelize.transaction(async (transaction) => {
    const existing = await Timetable.findOne({ where: { userId: user.id, scheduleDate }, transaction });
    if (existing) {
      throw ApiError.conflict('A timetable already exists for this date', 'TIMETABLE_EXISTS', { existingId: existing.id });
    }
    const created = await Timetable.create({ userId: user.id, title, scheduleDate, status: 'ACTIVE' }, { transaction });
    const settings = await getNotificationSettings(user.id, { transaction });
    const createdTasks = [];
    for (const data of items) {
      const task = await Task.create(buildTaskValues(user, created, scheduleDate, data), { transaction });
      await notifications.planTaskReminders(task, user, settings, { transaction });
      createdTasks.push(task);
    }
    await notifications.notifyEvent(user, 'TIMETABLE_CREATED', {
      payload: { title, scheduleDate, tasks: snapshotList(createdTasks) },
      transaction,
    });
    createdTasks
      .filter((t) => t.repeatType !== 'NONE')
      .forEach((t) => afterCommit(transaction, () => recurrence.generateForTask(t.id)));
    return created;
  });

  return getById(user, timetable.id);
}

/**
 * Updates the title and/or synchronises the full task list:
 * items with an id are updated, items without an id are created, missing ones are deleted.
 * Everything happens in one transaction and produces a single "timetable updated" notification.
 */
async function update(user, id, { title, tasks }) {
  const today = todayIn(user.timezone);
  const now = new Date();

  await sequelize.transaction(async (transaction) => {
    const timetable = await findOwned(user, id, { transaction, lock: true });
    assertNotPast(timetable.scheduleDate, today);
    if (title !== undefined && title !== timetable.title) await timetable.update({ title }, { transaction });
    if (!Array.isArray(tasks)) return;

    const date = timetable.scheduleDate;
    const existing = await loadDayTasks(user.id, date, transaction);
    const byId = new Map(existing.map((t) => [String(t.id), t]));

    const toUpdate = [];
    const toCreate = [];
    const seen = new Set();
    for (const input of tasks) {
      if (input.id !== undefined && input.id !== null) {
        const task = byId.get(String(input.id));
        if (!task) throw ApiError.badRequest(`Task ${input.id} does not belong to this timetable`, 'VALIDATION_ERROR');
        if (seen.has(String(input.id))) throw ApiError.badRequest(`Task ${input.id} is listed twice`, 'VALIDATION_ERROR');
        seen.add(String(input.id));
        // Tasks of a timetable always stay on its date: never accept scheduleDate here.
        toUpdate.push({ task, input: pick(input, TASK_INPUT_FIELDS) });
      } else {
        toCreate.push(normalizeNewTask(input));
      }
    }
    const toDelete = existing.filter((t) => !seen.has(String(t.id)));

    // Validate the final state of the day before touching anything.
    const finalState = [
      ...toUpdate.map(({ task, input }) => {
        const merged = normalizeRecurrence({ ...task.get(), ...input, id: task.id });
        if (merged.startTime) merged.startTime = hhmm(merged.startTime);
        if (merged.endTime) merged.endTime = hhmm(merged.endTime);
        return merged;
      }),
      ...toCreate,
    ];
    finalState.forEach((t) => validateTaskShape(t, date));
    assertNoOverlaps(finalState);

    const settings = await getNotificationSettings(user.id, { transaction });
    const removed = [];
    const changed = [];
    const added = [];
    const recurring = [];

    for (const task of toDelete) removed.push(await removeTask(task, { transaction, today }));
    for (const { task, input } of toUpdate) {
      const { change, recurrenceTouched } = await applyTaskUpdate(user, task, input, {
        transaction,
        settings,
        today,
        skipOverlapCheck: true,
        now,
      });
      if (change) changed.push(change);
      if (recurrenceTouched) recurring.push(() => recurrence.regenerateFuture(task.id));
    }
    for (const data of toCreate) {
      const task = await Task.create(buildTaskValues(user, timetable, date, data, now), { transaction });
      await notifications.planTaskReminders(task, user, settings, { transaction, now });
      added.push(notifications.taskSnapshot(task));
      if (task.repeatType !== 'NONE') recurring.push(() => recurrence.generateForTask(task.id));
    }

    if (added.length || removed.length || changed.length) {
      await notifications.notifyEvent(user, 'TIMETABLE_UPDATED', {
        payload: { scheduleDate: date, title: timetable.title, added, removed, changed },
        transaction,
      });
    }
    recurring.forEach((fn) => afterCommit(transaction, fn));
  });

  return getById(user, id);
}

async function remove(user, id) {
  const today = todayIn(user.timezone);
  await sequelize.transaction(async (transaction) => {
    const timetable = await findOwned(user, id, { transaction, lock: true });
    assertNotPast(timetable.scheduleDate, today);
    const tasks = await loadDayTasks(user.id, timetable.scheduleDate, transaction);
    for (const task of tasks) await removeTask(task, { transaction, today });
    await timetable.destroy({ transaction });
    await notifications.notifyEvent(user, 'TIMETABLE_DELETED', {
      payload: { title: timetable.title, scheduleDate: timetable.scheduleDate, taskCount: tasks.length },
      transaction,
    });
  });
}

const COPY_FIELDS = [
  'title',
  'description',
  'startTime',
  'endTime',
  'category',
  'priority',
  'allowOverlap',
  'reminderEnabled',
  'whatsappReminder',
  'emailReminder',
];

/** Copies a timetable's tasks (as one-off tasks) to a new date. */
async function duplicate(user, id, { targetDate, title }) {
  const today = todayIn(user.timezone);
  assertNotPast(targetDate, today);
  const source = await findOwned(user, id, { withTasks: true });
  const items = source.tasks
    .filter((t) => t.status !== 'SKIPPED')
    .map((t) => {
      const data = { repeatType: 'NONE' };
      COPY_FIELDS.forEach((f) => {
        data[f] = t[f];
      });
      return data;
    });
  return create(user, { title: title || source.title, scheduleDate: targetDate, tasks: items });
}

module.exports = { list, getById, getByDate, create, update, remove, duplicate };
