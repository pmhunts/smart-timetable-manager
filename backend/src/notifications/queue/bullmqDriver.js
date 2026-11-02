const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const env = require('../../config/env');
const logger = require('../../utils/logger');

const QUEUE_NAME = 'notifications';
let connection;
let queue;
let worker;

const getConnection = () => {
  if (!connection) {
    connection = new IORedis(env.queue.redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: true });
    connection.on('error', (err) => logger.error('[redis]', err.message));
  }
  return connection;
};

const getQueue = () => {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getConnection() });
  return queue;
};

/**
 * Adds a delayed job. The BullMQ job id embeds the run time, so re-enqueueing the same
 * (job, runAt) is a no-op, while a rescheduled notification gets a fresh delayed job.
 */
async function enqueue({ id, runAt }) {
  const at = new Date(runAt).getTime();
  await getQueue().add(
    'send',
    { notificationJobId: id },
    {
      jobId: `nj-${id}-${at}`,
      delay: Math.max(0, at - Date.now()),
      attempts: 1, // retries are handled by notificationWorker with persisted backoff
      removeOnComplete: { age: 7 * 24 * 3600, count: 5000 },
      removeOnFail: { age: 14 * 24 * 3600 },
    }
  );
}

function startWorker() {
  const { processJob } = require('../notificationWorker');
  worker = new Worker(QUEUE_NAME, (job) => processJob(job.data.notificationJobId), {
    connection: getConnection(),
    concurrency: 5,
  });
  worker.on('failed', (job, err) => logger.error(`[bullmq] job ${job?.id} crashed:`, err.message));
  worker.on('error', (err) => logger.error('[bullmq] worker error:', err.message));
  logger.info('[bullmq] notification worker started');
}

async function stop() {
  await Promise.allSettled([worker && worker.close(), queue && queue.close()]);
  if (connection) connection.disconnect();
}

module.exports = { enqueue, startWorker, stop };
