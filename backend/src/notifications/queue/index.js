/**
 * Queue facade. Two interchangeable drivers:
 *  - bullmq : delayed jobs in Redis (persistent, precise timing, horizontal workers)
 *  - db     : no Redis; the notification_jobs table is polled every few seconds
 * In both cases MySQL `notification_jobs` stays the source of truth, so nothing is lost on restart.
 */
const env = require('../../config/env');
const logger = require('../../utils/logger');

let driver;
const getDriver = () => {
  if (!driver) {
    driver = env.queue.driver === 'db' ? require('./dbDriver') : require('./bullmqDriver');
    logger.info(`[queue] using "${env.queue.driver === 'db' ? 'db' : 'bullmq'}" driver`);
  }
  return driver;
};

/** Never throws: if the queue is unavailable the reconciler will still deliver the job. */
async function enqueue(job) {
  try {
    await getDriver().enqueue(job);
  } catch (err) {
    logger.error(`[queue] enqueue of job ${job.id} failed (reconciler will retry):`, err.message);
  }
}

module.exports = {
  enqueue,
  startWorker: () => getDriver().startWorker(),
  stop: () => (driver ? driver.stop() : Promise.resolve()),
  name: () => (env.queue.driver === 'db' ? 'db' : 'bullmq'),
};
