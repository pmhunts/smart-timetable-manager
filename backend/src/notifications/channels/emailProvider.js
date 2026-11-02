const nodemailer = require('nodemailer');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { DeliveryError } = require('./errors');

const cfg = env.email;
let transporter;

const isLive = () => cfg.mode === 'live';
const isConfigured = () => !isLive() || Boolean(cfg.host && cfg.user && cfg.pass);

function getTransporter() {
  if (transporter) return transporter;
  transporter = isLive()
    ? nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
        pool: true,
        maxConnections: 3,
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
      })
    : nodemailer.createTransport({ jsonTransport: true });
  return transporter;
}

// SMTP 4xx = temporary, 5xx = permanent. Auth/config problems are not retryable either.
const isRetryable = (err) => {
  if (err.code === 'EAUTH' || err.code === 'EENVELOPE') return false;
  if (err.responseCode) return err.responseCode < 500;
  return true; // network errors (ECONNECTION, ETIMEDOUT, ESOCKET, ...)
};

/**
 * @param {{ to: string, subject: string, html: string, text: string }} message
 * @returns {Promise<{ providerMessageId: string }>}
 */
async function send({ to, subject, html, text }) {
  if (!to) throw new DeliveryError('Recipient email is missing', { retryable: false });
  if (!isConfigured()) {
    throw new DeliveryError('SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)', { retryable: false });
  }
  try {
    const info = await getTransporter().sendMail({ from: cfg.from, to, subject, html, text });
    if (!isLive()) logger.info(`[email:mock] -> ${to} | ${subject}\n${text}`);
    return { providerMessageId: info.messageId || `mock-email-${Date.now()}` };
  } catch (err) {
    throw new DeliveryError(`SMTP error: ${err.message}`, { retryable: isRetryable(err), providerCode: err.responseCode || err.code });
  }
}

async function verifyConnection() {
  if (!isLive()) return true;
  await getTransporter().verify();
  return true;
}

module.exports = { send, isConfigured, isLive, verifyConnection };
