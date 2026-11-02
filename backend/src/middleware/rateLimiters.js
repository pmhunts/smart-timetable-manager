const rateLimit = require('express-rate-limit');

const handler = (req, res, next, options) =>
  res.status(options.statusCode).json({ success: false, code: 'RATE_LIMITED', message: options.message });

const make = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message, handler });

module.exports = {
  apiLimiter: make(15 * 60 * 1000, 600, 'Too many requests. Please slow down.'),
  authLimiter: make(15 * 60 * 1000, 20, 'Too many authentication attempts. Try again in 15 minutes.'),
  passwordResetLimiter: make(60 * 60 * 1000, 5, 'Too many password reset requests. Try again later.'),
  testNotificationLimiter: make(10 * 60 * 1000, 5, 'Too many test notifications. Try again in a few minutes.'),
};
