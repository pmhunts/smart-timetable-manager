/**
 * Background job definitions. Each job is idempotent and guarded so that overlapping runs are
 * skipped and errors are logged instead of crashing the process. Scheduling lives in ../schedulers.
 */
const logger = require('../utils/logger');
const { refreshTaskStatuses, archivePastTimetables } = require('../services/taskStatusService');
const { syncAllLockStatuses } = require('../services/editingWindowService');
const { planAll } = require('../notifications/notificationService');
const { reconcile, recoverPendingJobs } = require('../notifications/notificationWorker');
const { generateAll } = require('../services/recurrenceService');
const { cleanupExpiredResets } = require('../services/authService');

function guarded(name, fn) {
  let running = false;
  return async () => {
    if (running) return undefined;
    running = true;
    try {
      return await fn();
    } catch (err) {
      logger.error(`[job:${name}]`, err.message);
      return undefined;
    } finally {
      running = false;
    }
  };
}

module.exports = {
  /** UPCOMING -> ONGOING -> MISSED, and mirror the editing-window lock into timetables.status */
  statuses: guarded('statuses', async () => {
    await refreshTaskStatuses();
    await syncAllLockStatuses();
  }),
  /** Plan reminders and daily summaries inside the planning horizon */
  planner: guarded('planner', () => planAll()),
  /** Deliver overdue jobs the queue missed and release stuck ones */
  reconcile: guarded('reconcile', () => reconcile({ graceMs: 60 * 1000 })),
  /** Re-queue future PENDING jobs after a restart (BullMQ dedupes by job id) */
  recover: guarded('recover', () => recoverPendingJobs()),
  /** Mark timetables of past days ARCHIVED (per user timezone) */
  archive: guarded('archive', () => archivePastTimetables()),
  /** Materialise recurring tasks and purge old password reset tokens */
  recurrence: guarded('recurrence', async () => {
    const created = await generateAll();
    if (created) logger.info(`[job:recurrence] created ${created} occurrence(s)`);
    await cleanupExpiredResets();
  }),
};
