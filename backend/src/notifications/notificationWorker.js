/**
 * Processes one notification job: claim -> re-check preferences -> render -> send -> record.
 *
 * Safe against duplicates: a job is claimed with a conditional UPDATE (PENDING -> PROCESSING),
 * so if BullMQ, the DB poller and the reconciler all fire for the same job, only one sends it.
 */
const { Op } = require('sequelize');
const { NotificationJob, NotificationLog, Task, User } = require('../models');
const env = require('../config/env');
const logger = require('../utils/logger');
const { getNotificationSettings } = require('../services/settingsService');
const { render } = require('./templates');
const whatsapp = require('./channels/whatsappProvider');
const email = require('./channels/emailProvider');
const { REMINDER_EVENTS, channelBlockReason, eventBlockReason, quietHoursEnd } = require('./preferences');
const { taskSnapshot } = require('./notificationService');
const queue = require('./queue');

const CLAIM_TOLERANCE_MS = 5000;
const backoffMs = (attempt) => Math.min(30 * 1000 * 2 ** (attempt - 1), 30 * 60 * 1000); // 30s, 1m, 2m, 4m ... max 30m

async function finish(job, log, deliveryStatus, jobStatus, fields = {}) {
  await log.update({ deliveryStatus, ...fields.log });
  await job.update({ status: jobStatus, lockedAt: null, ...fields.job });
}

async function defer(job, runAt, reason) {
  await job.update({ status: 'PENDING', runAt, lockedAt: null, lastError: reason });
  await queue.enqueue({ id: job.id, runAt });
}

/** Decides whether a claimed job should be sent, cancelled or deferred. */
function evaluate({ log, user, settings, task, now }) {
  const channel = log.notificationType;
  const blocked = channelBlockReason(user, settings, channel);
  if (blocked) return { action: 'cancel', reason: blocked };

  const isReminder = REMINDER_EVENTS.includes(log.eventType);
  if (isReminder) {
    if (!task) return { action: 'cancel', reason: 'Task was deleted' };
    if (log.payload?.scheduleVersion && task.scheduleVersion !== log.payload.scheduleVersion) {
      return { action: 'cancel', reason: 'Task was rescheduled' };
    }
    if (['COMPLETED', 'SKIPPED'].includes(task.status)) {
      return { action: 'cancel', reason: `Task already ${task.status.toLowerCase()}` };
    }
  }

  const eventBlocked = eventBlockReason(settings, channel, log.eventType, task);
  if (eventBlocked) return { action: 'cancel', reason: eventBlocked };

  // Time-critical messages are useless when very late (e.g. the server was down for hours).
  if (isReminder && now - log.scheduledAt > env.queue.staleMinutes * 60 * 1000) {
    return { action: 'cancel', reason: `Expired: more than ${env.queue.staleMinutes} minutes late` };
  }

  if (log.eventType !== 'TEST') {
    const quietEnd = quietHoursEnd(settings, user.timezone, now);
    if (quietEnd) {
      // Reminders are pointless after quiet hours; informational messages are delayed instead.
      if (isReminder) return { action: 'cancel', reason: 'Suppressed during quiet hours' };
      return { action: 'defer', runAt: quietEnd, reason: 'Deferred until quiet hours end' };
    }
  }
  return { action: 'send' };
}

async function buildContent(log, user, task) {
  const ctx = { user, payload: log.payload || {} };
  if (REMINDER_EVENTS.includes(log.eventType)) {
    ctx.task = taskSnapshot(task);
  } else {
    ctx.task = ctx.payload.task || null;
  }
  if (log.eventType === 'DAILY_SUMMARY') {
    ctx.tasks = (
      await Task.findAll({
        where: { userId: user.id, scheduleDate: ctx.payload.date, status: { [Op.ne]: 'SKIPPED' } },
        order: [['startTime', 'ASC']],
      })
    ).map(taskSnapshot);
  }
  return render(log.eventType, ctx);
}

async function processJob(jobId) {
  const now = new Date();
  const [claimed] = await NotificationJob.update(
    { status: 'PROCESSING', lockedAt: now, attempts: NotificationJob.sequelize.literal('attempts + 1') },
    { where: { id: jobId, status: 'PENDING', runAt: { [Op.lte]: new Date(now.getTime() + CLAIM_TOLERANCE_MS) } } }
  );
  if (!claimed) return 'skipped';

  const job = await NotificationJob.findByPk(jobId, {
    include: [
      {
        model: NotificationLog,
        as: 'log',
        include: [
          { model: User, as: 'user' },
          { model: Task, as: 'task' },
        ],
      },
    ],
  });
  const { log } = job;
  const { user, task } = log;

  try {
    if (!user) {
      await finish(job, log, 'CANCELLED', 'CANCELLED', { log: { errorMessage: 'User no longer exists' } });
      return 'cancelled';
    }
    const settings = await getNotificationSettings(user.id);
    const decision = evaluate({ log, user, settings, task, now });

    if (decision.action === 'cancel') {
      await finish(job, log, 'CANCELLED', 'CANCELLED', { log: { errorMessage: decision.reason }, job: { lastError: decision.reason } });
      return 'cancelled';
    }
    if (decision.action === 'defer') {
      await job.update({ attempts: Math.max(0, job.attempts - 1) });
      await defer(job, decision.runAt, decision.reason);
      return 'deferred';
    }

    const content = await buildContent(log, user, task);
    const recipient = log.notificationType === 'EMAIL' ? user.email : user.getWhatsappNumber();
    const result =
      log.notificationType === 'EMAIL'
        ? await email.send({ to: recipient, subject: content.subject, html: content.html, text: content.text })
        : await whatsapp.send({ to: recipient, text: content.text, whatsappTemplate: content.whatsappTemplate });

    await finish(job, log, 'SENT', 'COMPLETED', {
      log: {
        sentAt: new Date(),
        providerMessageId: result.providerMessageId,
        providerStatus: 'sent',
        errorMessage: null,
        message: content.text,
        subject: log.notificationType === 'EMAIL' ? content.subject : null,
        recipient,
      },
      job: { lastError: null },
    });
    return 'sent';
  } catch (err) {
    const attempts = job.attempts;
    const retry = err.retryable !== false && attempts < env.queue.maxAttempts;
    logger.warn(`[worker] job ${job.id} attempt ${attempts} failed: ${err.message}${retry ? ' (will retry)' : ''}`);
    if (retry) {
      const runAt = new Date(Date.now() + backoffMs(attempts));
      await log.update({ errorMessage: `Attempt ${attempts} failed: ${err.message}` });
      await defer(job, runAt, err.message);
      return 'retry';
    }
    await finish(job, log, 'FAILED', 'FAILED', { log: { errorMessage: err.message }, job: { lastError: err.message } });
    return 'failed';
  }
}

/**
 * Safety net run by cron:
 *  - releases jobs stuck in PROCESSING (worker crashed mid-send)
 *  - processes overdue PENDING jobs the queue never delivered (e.g. Redis was flushed)
 * With the `db` queue driver this is the main dispatcher (graceMs = 0).
 */
async function reconcile({ graceMs = 60 * 1000, batchSize = 100 } = {}) {
  const now = Date.now();
  await NotificationJob.update(
    { status: 'PENDING', lockedAt: null },
    { where: { status: 'PROCESSING', lockedAt: { [Op.lt]: new Date(now - 10 * 60 * 1000) } } }
  );
  const due = await NotificationJob.findAll({
    where: { status: 'PENDING', runAt: { [Op.lte]: new Date(now - graceMs) } },
    order: [['runAt', 'ASC']],
    limit: batchSize,
    attributes: ['id'],
  });
  for (const { id } of due) {
    try {
      await processJob(id);
    } catch (err) {
      logger.error(`[reconcile] job ${id}:`, err.message);
    }
  }
  return due.length;
}

/** On startup: push every future PENDING job back into the queue (deduplicated by job id). */
async function recoverPendingJobs() {
  const pending = await NotificationJob.findAll({
    where: { status: 'PENDING', runAt: { [Op.gt]: new Date() } },
    attributes: ['id', 'runAt'],
  });
  for (const job of pending) await queue.enqueue({ id: job.id, runAt: job.runAt });
  return pending.length;
}

module.exports = { processJob, reconcile, recoverPendingJobs, evaluate };
