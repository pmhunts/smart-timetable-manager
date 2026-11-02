const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const bool = (v, def = false) => (v === undefined || v === '' ? def : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const int = (v, def) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : def);

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 5000),
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  runBackgroundJobs: bool(process.env.RUN_BACKGROUND_JOBS, true),

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieName: 'st_token',
    cookieSecure: bool(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  },
  bcryptRounds: int(process.env.BCRYPT_ROUNDS, 12),
  passwordResetTtlMinutes: int(process.env.PASSWORD_RESET_TTL_MINUTES, 30),

  queue: {
    driver: (process.env.QUEUE_DRIVER || 'bullmq').toLowerCase(),
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    maxAttempts: int(process.env.NOTIFICATION_MAX_ATTEMPTS, 5),
    staleMinutes: int(process.env.NOTIFICATION_STALE_MINUTES, 30),
    planningHorizonHours: int(process.env.PLANNING_HORIZON_HOURS, 24),
  },
  recurrenceHorizonDays: int(process.env.RECURRENCE_HORIZON_DAYS, 7),

  email: {
    mode: (process.env.EMAIL_MODE || 'mock').toLowerCase(),
    host: process.env.SMTP_HOST,
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'Smart Timetable Manager <no-reply@smart-timetable.local>',
  },

  whatsapp: {
    mode: (process.env.WHATSAPP_MODE || 'mock').toLowerCase(),
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    useTemplates: bool(process.env.WHATSAPP_USE_TEMPLATES, true),
    templateLang: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US',
    templates: {
      ADVANCE_REMINDER: process.env.WHATSAPP_TEMPLATE_TASK_REMINDER || 'task_reminder',
      TASK_START: process.env.WHATSAPP_TEMPLATE_TASK_START || 'task_start',
      INCOMPLETE_REMINDER: process.env.WHATSAPP_TEMPLATE_TASK_INCOMPLETE || 'task_incomplete',
      UPDATE: process.env.WHATSAPP_TEMPLATE_SCHEDULE_UPDATE || 'schedule_update',
      CANCELLED: process.env.WHATSAPP_TEMPLATE_SCHEDULE_CANCELLED || 'schedule_cancelled',
      DAILY_SUMMARY: process.env.WHATSAPP_TEMPLATE_DAILY_SUMMARY || 'daily_summary',
      GENERIC: process.env.WHATSAPP_TEMPLATE_GENERIC || 'generic_notification',
    },
  },
};

if (!env.jwt.secret || env.jwt.secret.length < 32) {
  if (env.isProd) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production');
  }
  // eslint-disable-next-line no-console
  console.warn('[env] JWT_SECRET is missing or short - using an insecure development secret');
  env.jwt.secret = env.jwt.secret || 'dev-only-insecure-secret-change-me-please-0123456789';
}

module.exports = env;
