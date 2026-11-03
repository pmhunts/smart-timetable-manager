/**
 * Email delivery. EMAIL_MODE=mock logs instead of sending. In live mode EMAIL_PROVIDER picks the transport:
 *  - smtp  : Nodemailer over SMTP (Gmail etc.) - needs outbound ports 587/465
 *  - brevo : Brevo transactional email HTTPS API - works on hosts that block SMTP (e.g. Render free tier)
 */
const nodemailer = require('nodemailer');
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { DeliveryError } = require('./errors');

const cfg = env.email;
let transporter;

const isLive = () => cfg.mode === 'live';
const provider = () => (cfg.provider === 'brevo' ? 'brevo' : 'smtp');

const isConfigured = () => {
  if (!isLive()) return true;
  if (provider() === 'brevo') return Boolean(cfg.brevoApiKey && cfg.from);
  return Boolean(cfg.host && cfg.user && cfg.pass);
};

const missingConfigMessage = () =>
  provider() === 'brevo'
    ? 'Brevo is not configured (BREVO_API_KEY / EMAIL_FROM)'
    : 'SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)';

/** "Name <a@b.c>" -> { name, email } */
function parseAddress(value) {
  const match = String(value).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return match ? { name: match[1].trim() || undefined, email: match[2].trim() } : { email: String(value).trim() };
}

function getTransporter() {
  if (transporter) return transporter;
  transporter =
    isLive() && provider() === 'smtp'
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
const isRetryableSmtp = (err) => {
  if (err.code === 'EAUTH' || err.code === 'EENVELOPE') return false;
  if (err.responseCode) return err.responseCode < 500;
  return true; // network errors (ECONNECTION, ETIMEDOUT, ESOCKET, ...)
};

async function sendSmtp({ to, subject, html, text }) {
  try {
    const info = await getTransporter().sendMail({ from: cfg.from, to, subject, html, text });
    if (!isLive()) logger.info(`[email:mock] -> ${to} | ${subject}\n${text}`);
    return { providerMessageId: info.messageId || `mock-email-${Date.now()}` };
  } catch (err) {
    const hint = err.code === 'EAUTH' ? ' - for Gmail use an App Password, not your normal password' : '';
    throw new DeliveryError(`SMTP error: ${err.message}${hint}`, { retryable: isRetryableSmtp(err), providerCode: err.responseCode || err.code });
  }
}

async function sendBrevo({ to, subject, html, text }) {
  try {
    const { data } = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      { sender: parseAddress(cfg.from), to: [{ email: to }], subject, htmlContent: html, textContent: text },
      { headers: { 'api-key': cfg.brevoApiKey, 'Content-Type': 'application/json', Accept: 'application/json' }, timeout: 15000 }
    );
    return { providerMessageId: data?.messageId || `brevo-${Date.now()}` };
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.message || err.message;
    throw new DeliveryError(`Brevo error${status ? ` ${status}` : ''}: ${detail}`, {
      retryable: !status || status >= 500 || status === 429,
      providerCode: err.response?.data?.code || status,
    });
  }
}

/**
 * @param {{ to: string, subject: string, html: string, text: string }} message
 * @returns {Promise<{ providerMessageId: string }>}
 */
async function send(message) {
  if (!message.to) throw new DeliveryError('Recipient email is missing', { retryable: false });
  if (!isConfigured()) throw new DeliveryError(missingConfigMessage(), { retryable: false });
  if (isLive() && provider() === 'brevo') return sendBrevo(message);
  return sendSmtp(message);
}

async function verifyConnection() {
  if (!isLive() || provider() !== 'smtp') return true;
  await getTransporter().verify();
  return true;
}

/** One line for the startup log, so the deployed configuration is obvious. */
const describe = () => {
  if (!isLive()) return 'EMAIL_MODE=mock - emails are only logged to the console, NOT sent';
  if (!isConfigured()) return `EMAIL_MODE=live but ${missingConfigMessage()} - sends will fail`;
  return provider() === 'brevo'
    ? `live via Brevo API as ${parseAddress(cfg.from).email}`
    : `live via SMTP ${cfg.host}:${cfg.port} as ${cfg.user}`;
};

module.exports = { send, isConfigured, isLive, verifyConnection, describe, parseAddress, provider };
