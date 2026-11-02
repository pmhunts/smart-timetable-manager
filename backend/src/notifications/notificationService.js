/**
 * Creates, plans and cancels notifications.
 *
 * Every notification is a `notification_logs` row (history) with exactly one `notification_jobs`
 * row (durable queue state). Each log has a deterministic idempotency key, so planning the same
 * reminder twice - from a cron run, a restart or a concurrent request - never creates a duplicate.
 * The actual sending happens in notificationWorker.js.
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const { sequelize, NotificationLog, NotificationJob, Task, User } = require('../models');
const env = require('../config/env');
const logger = require('../utils/logger');
const { localToUtc, nowIn } = require('../utils/time');
const { getNotificationSettings } = require('../services/settingsService');
const { render } = require('./templates');
const queue = require('./queue');
const { CHANNELS, REMINDER_EVENTS, SCHEDULED_EVENTS, channelBlockReason, eventBlockReason } = require('./preferences');

/** Plain snapshot of the task fields used by templates. */
const taskSnapshot = (task) =>
  task && {
    id: task.id,
    title: task.title,
    description: task.description,
    scheduleDate: task.scheduleDate,
    startTime: task.startTime,
    endTime: task.endTime,
    category: task.category,
    priority: task.priority,
  };

const recipientFor = (user, channel) => (channel === 'EMAIL' ? user.email : user.getWhatsappNumber());

/** Run `fn` after the transaction commits (or now when there is no transaction). */
const afterCommit = (transaction, fn) => {
  const run = () => Promise.resolve().then(fn).catch((err) => logger.error('[notifications] post-commit hook failed:', err.message));
  if (transaction) transaction.afterCommit(run);
  else run();
};

const enqueueJob = (transaction, job) => afterCommit(transaction, () => queue.enqueue({ id: job.id, runAt: job.runAt }));

/**
 * Idempotent upsert of a notification.
 *  - new key                    -> create log + job and enqueue
 *  - existing PENDING/CANCELLED -> (re)activate it and move it to the new scheduled time
 *  - existing SENT/FAILED       -> untouched (never sent twice)
 */
async function ensureNotification({ user, channel, eventType, key, scheduledAt, task, payload = {}, transaction }) {
  const rendered = render(eventType, { user, task: taskSnapshot(task), payload });
  const values = {
    userId: user.id,
    taskId: task ? task.id : null,
    taskTitle: task ? task.title : payload.task?.title || null,
    notificationType: channel,
    eventType,
    subject: channel === 'EMAIL' ? rendered.subject : null,
    message: rendered.text,
    payload,
    recipient: recipientFor(user, channel),
    scheduledAt,
  };

  const existing = await NotificationLog.findOne({
    where: { idempotencyKey: key },
    include: [{ model: NotificationJob, as: 'job' }],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  if (!existing) {
    let log;
    try {
      log = await NotificationLog.create({ ...values, idempotencyKey: key, deliveryStatus: 'PENDING' }, { transaction });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') return null; // created concurrently
      throw err;
    }
    const job = await NotificationJob.create(
      { notificationLogId: log.id, jobType: eventType, scheduledAt, runAt: scheduledAt, status: 'PENDING' },
      { transaction }
    );
    enqueueJob(transaction, job);
    return log;
  }

  const job = existing.job;
  const reschedulable = ['PENDING', 'CANCELLED'].includes(existing.deliveryStatus) && job && ['PENDING', 'CANCELLED'].includes(job.status);
  const changed = existing.deliveryStatus === 'CANCELLED' || existing.scheduledAt.getTime() !== scheduledAt.getTime();
  if (reschedulable && changed) {
    await existing.update({ ...values, deliveryStatus: 'PENDING', errorMessage: null }, { transaction });
    await job.update({ status: 'PENDING', scheduledAt, runAt: scheduledAt, attempts: 0, lastError: null }, { transaction });
    enqueueJob(transaction, job);
  }
  return existing;
}

/** Marks PENDING notifications as CANCELLED. `where` targets notification_logs. */
async function cancelPending(where, reason, { transaction } = {}) {
  const logs = await NotificationLog.findAll({
    where: { ...where, deliveryStatus: 'PENDING' },
    attributes: ['id'],
    transaction,
  });
  if (!logs.length) return 0;
  const ids = logs.map((l) => l.id);
  await NotificationLog.update({ deliveryStatus: 'CANCELLED', errorMessage: reason }, { where: { id: { [Op.in]: ids } }, transaction });
  await NotificationJob.update(
    { status: 'CANCELLED', lastError: reason },
    { where: { notificationLogId: { [Op.in]: ids }, status: 'PENDING' }, transaction }
  );
  return ids.length;
}

const cancelTaskReminders = (taskIds, reason, opts) =>
  cancelPending({ taskId: { [Op.in]: [].concat(taskIds) }, eventType: { [Op.in]: REMINDER_EVENTS } }, reason, opts);

/**
 * Plans the advance / start / incomplete reminders of one task for every enabled channel.
 * Only reminders inside the planning horizon are created; the planner cron picks up later ones.
 */
async function planTaskReminders(task, user, settings, { transaction, now = new Date() } = {}) {
  if (!['UPCOMING', 'ONGOING'].includes(task.status) || !task.reminderEnabled) return;
  const horizonEnd = new Date(now.getTime() + env.queue.planningHorizonHours * 3600 * 1000);
  const earliest = new Date(now.getTime() - 60 * 1000);
  const startAt = new Date(task.startAtUtc);
  const endAt = new Date(task.endAtUtc);

  const events = [
    ['ADVANCE_REMINDER', new Date(startAt.getTime() - settings.reminderMinutes * 60 * 1000)],
    ['TASK_START', startAt],
    ['INCOMPLETE_REMINDER', endAt],
  ];

  for (const channel of CHANNELS) {
    if (channelBlockReason(user, settings, channel)) continue;
    for (const [eventType, at] of events) {
      if (at < earliest || at > horizonEnd) continue;
      if (eventBlockReason(settings, channel, eventType, task)) continue;
      await ensureNotification({
        user,
        channel,
        eventType,
        key: `${eventType}-${channel}-t${task.id}-v${task.scheduleVersion}`,
        scheduledAt: at,
        task,
        payload: { scheduleVersion: task.scheduleVersion, reminderMinutes: settings.reminderMinutes },
        transaction,
      });
    }
  }
}

/** Plans the next daily summary (today if its time has not passed yet, else tomorrow). */
async function planDailySummary(user, settings, { transaction, now = new Date() } = {}) {
  const local = nowIn(user.timezone, now);
  let date = local.toISODate();
  let at = localToUtc(date, settings.dailySummaryTime, user.timezone);
  if (at <= now) {
    date = local.plus({ days: 1 }).toISODate();
    at = localToUtc(date, settings.dailySummaryTime, user.timezone);
  }
  if (at.getTime() - now.getTime() > env.queue.planningHorizonHours * 3600 * 1000) return;

  for (const channel of CHANNELS) {
    if (channelBlockReason(user, settings, channel) || eventBlockReason(settings, channel, 'DAILY_SUMMARY')) continue;
    await ensureNotification({
      user,
      channel,
      eventType: 'DAILY_SUMMARY',
      key: `DAILY_SUMMARY-${channel}-u${user.id}-${date}`,
      scheduledAt: at,
      payload: { date },
      transaction,
    });
  }
}

/** (Re)plans everything for one user: used after settings/timezone changes. */
async function replanUser(userId, { now = new Date() } = {}) {
  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(userId, { transaction });
    if (!user) return;
    const settings = await getNotificationSettings(userId, { transaction });

    // Cancel every future scheduled notification, then re-plan: ensureNotification re-activates
    // the ones that are still allowed (same key), so nothing is duplicated.
    await cancelPending(
      { userId, eventType: { [Op.in]: SCHEDULED_EVENTS }, scheduledAt: { [Op.gt]: now } },
      'Notification settings changed',
      { transaction }
    );

    const horizonEnd = new Date(now.getTime() + env.queue.planningHorizonHours * 3600 * 1000);
    const tasks = await Task.findAll({
      where: {
        userId,
        status: { [Op.in]: ['UPCOMING', 'ONGOING'] },
        endAtUtc: { [Op.gt]: now },
        startAtUtc: { [Op.lt]: horizonEnd },
      },
      transaction,
    });
    for (const task of tasks) await planTaskReminders(task, user, settings, { transaction, now });
    await planDailySummary(user, settings, { transaction, now });
  });
}

/** Cron: plan reminders for all tasks inside the horizon + next daily summaries. Idempotent. */
async function planAll(now = new Date()) {
  const horizonEnd = new Date(now.getTime() + env.queue.planningHorizonHours * 3600 * 1000);
  const tasks = await Task.findAll({
    where: {
      status: { [Op.in]: ['UPCOMING', 'ONGOING'] },
      reminderEnabled: true,
      endAtUtc: { [Op.gt]: now },
      startAtUtc: { [Op.lt]: horizonEnd },
    },
    include: [{ model: User, as: 'user' }],
    order: [['userId', 'ASC']],
  });

  const settingsCache = new Map();
  const settingsFor = async (userId) => {
    if (!settingsCache.has(userId)) settingsCache.set(userId, await getNotificationSettings(userId));
    return settingsCache.get(userId);
  };

  let planned = 0;
  for (const task of tasks) {
    try {
      await planTaskReminders(task, task.user, await settingsFor(task.userId), { now });
      planned += 1;
    } catch (err) {
      logger.error(`[planner] task ${task.id}:`, err.message);
    }
  }

  const users = await User.findAll({
    where: { isActive: true },
    include: [
      {
        association: 'notificationSetting',
        required: true,
        where: { [Op.or]: [{ emailDailySummary: true }, { whatsappDailySummary: true }] },
      },
    ],
  });
  for (const user of users) {
    try {
      await planDailySummary(user, user.notificationSetting, { now });
    } catch (err) {
      logger.error(`[planner] daily summary user ${user.id}:`, err.message);
    }
  }
  return { tasks: planned, summaries: users.length };
}

/**
 * Immediate event notification (timetable created/updated/deleted ...) on every allowed channel.
 * A random event id makes each change its own notification.
 */
async function notifyEvent(user, eventType, { task = null, payload = {}, transaction } = {}) {
  const settings = await getNotificationSettings(user.id, { transaction });
  const eventId = crypto.randomUUID();
  const now = new Date();
  for (const channel of CHANNELS) {
    if (channelBlockReason(user, settings, channel) || eventBlockReason(settings, channel, eventType, task)) continue;
    await ensureNotification({
      user,
      channel,
      eventType,
      key: `${eventType}-${channel}-${eventId}`,
      scheduledAt: now,
      task,
      payload: { ...payload, task: payload.task || taskSnapshot(task) },
      transaction,
    });
  }
}

/** Test message on one channel; bypasses per-event toggles (the caller checks channel consent/config). */
function sendTest(user, channel) {
  return ensureNotification({
    user,
    channel,
    eventType: 'TEST',
    key: `TEST-${channel}-${crypto.randomUUID()}`,
    scheduledAt: new Date(),
    payload: { channel },
  });
}

module.exports = {
  ensureNotification,
  cancelPending,
  cancelTaskReminders,
  planTaskReminders,
  planDailySummary,
  replanUser,
  planAll,
  notifyEvent,
  sendTest,
  taskSnapshot,
};
