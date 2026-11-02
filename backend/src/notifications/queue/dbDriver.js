const logger = require('../../utils/logger');

const POLL_MS = 10 * 1000;
let timer;
let running = false;

/** Jobs that are already due are processed right away; later ones are picked up by the poller. */
async function enqueue({ id, runAt }) {
  if (new Date(runAt).getTime() <= Date.now()) {
    const { processJob } = require('../notificationWorker');
    setImmediate(() => processJob(id).catch((err) => logger.error(`[db-queue] job ${id}:`, err.message)));
  }
}

function startWorker() {
  const { reconcile } = require('../notificationWorker');
  timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await reconcile({ graceMs: 0 });
    } catch (err) {
      logger.error('[db-queue] poll failed:', err.message);
    } finally {
      running = false;
    }
  }, POLL_MS);
  logger.info(`[db-queue] polling notification_jobs every ${POLL_MS / 1000}s`);
}

async function stop() {
  clearInterval(timer);
}

module.exports = { enqueue, startWorker, stop };
