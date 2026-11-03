const env = require('./config/env');
const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const { startSchedulers, stopSchedulers } = require('./schedulers');
const whatsapp = require('./notifications/channels/whatsappProvider');
const email = require('./notifications/channels/emailProvider');

async function start() {
  await sequelize.authenticate();
  logger.info(`[db] connected to ${sequelize.config.database}@${sequelize.config.host}`);

  if (!whatsapp.isLive()) logger.warn('[whatsapp] WHATSAPP_MODE=mock - messages are logged, not sent');
  else if (!whatsapp.isConfigured()) logger.warn('[whatsapp] live mode but credentials are missing - sends will fail');
  (email.isLive() && email.isConfigured() ? logger.info : logger.warn)(`[email] ${email.describe()}`);
  if (email.isLive() && email.provider() === 'smtp') {
    email
      .verifyConnection()
      .then(() => logger.info('[email] SMTP connection verified'))
      .catch((err) =>
        logger.error(
          `[email] SMTP verification failed: ${err.message}` +
            (/ETIMEDOUT|ECONNREFUSED|ESOCKET|timeout/i.test(`${err.code} ${err.message}`)
              ? ' - this host may block outbound SMTP ports; use EMAIL_PROVIDER=brevo instead'
              : '')
        )
      );
  }

  const server = app.listen(env.port, () => logger.info(`[api] listening on http://localhost:${env.port}`));

  if (env.runBackgroundJobs) await startSchedulers();
  else logger.info('[schedulers] disabled in this process (RUN_BACKGROUND_JOBS=false) - run `npm run worker`');

  const shutdown = async (signal) => {
    logger.info(`[api] ${signal} received, shutting down`);
    server.close();
    await stopSchedulers().catch(() => {});
    await sequelize.close().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error('[api] failed to start:', err);
  process.exit(1);
});
