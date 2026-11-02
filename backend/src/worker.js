// Standalone background process: cron schedulers + notification worker, no HTTP server.
// Use it with RUN_BACKGROUND_JOBS=false on the API instances to scale them independently.
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const { startSchedulers, stopSchedulers } = require('./schedulers');

async function start() {
  await sequelize.authenticate();
  logger.info('[worker] database connected');
  await startSchedulers();

  const shutdown = async () => {
    await stopSchedulers().catch(() => {});
    await sequelize.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  logger.error('[worker] failed to start:', err);
  process.exit(1);
});
