/**
 * Cron schedules (node-cron) for the jobs in ../jobs. All jobs are idempotent, so running them
 * on two instances at once is harmless.
 *
 *  every minute      task statuses + timetable lock status sync
 *  every 5 minutes   plan reminders / daily summaries inside the horizon
 *  every minute      reconcile overdue notification jobs (bullmq safety net)
 *  every 15 minutes  archive past timetables
 *  hourly            materialise recurring tasks, purge password reset tokens
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const queue = require('../notifications/queue');
const jobs = require('../jobs');

const scheduled = [];

async function startSchedulers() {
  scheduled.push(cron.schedule('* * * * *', jobs.statuses));
  scheduled.push(cron.schedule('*/5 * * * *', jobs.planner));
  scheduled.push(cron.schedule('15 */15 * * * *', jobs.archive));
  scheduled.push(cron.schedule('0 * * * *', jobs.recurrence));
  if (queue.name() === 'bullmq') scheduled.push(cron.schedule('30 * * * * *', jobs.reconcile));

  queue.startWorker();

  // Catch up right after a (re)start so nothing scheduled while the process was down is lost.
  await jobs.statuses();
  await jobs.archive();
  await jobs.recurrence();
  await jobs.planner();
  if (queue.name() === 'bullmq') {
    const recovered = await jobs.recover();
    if (recovered) logger.info(`[startup] re-queued ${recovered} pending notification job(s)`);
    await jobs.reconcile();
  }
  logger.info('[schedulers] started');
}

async function stopSchedulers() {
  scheduled.forEach((t) => t.stop());
  await queue.stop();
}

module.exports = { startSchedulers, stopSchedulers };
