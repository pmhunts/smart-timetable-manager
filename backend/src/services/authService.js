const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, User, PasswordReset, TimetableSetting, NotificationSetting } = require('../models');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { isValidTimezone } = require('../utils/time');
const { TIMETABLE_SETTING_DEFAULTS } = require('./settingsService');
const emailProvider = require('../notifications/channels/emailProvider');
const notifications = require('../notifications/notificationService');
const { layout, p } = require('../notifications/templates/emailLayout');

// Used to keep login timing constant when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-attack-dummy-password', 10);

const hashPassword = (password) => bcrypt.hash(password, env.bcryptRounds);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const signToken = (user) => jwt.sign({ sub: String(user.id), tv: user.tokenVersion }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

async function register({ name, email, countryCode, phoneNumber, password, timezone }) {
  const normalizedEmail = email.toLowerCase();
  if (await User.findOne({ where: { email: normalizedEmail } })) {
    throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }
  const user = await sequelize.transaction(async (transaction) => {
    const created = await User.create(
      {
        name,
        email: normalizedEmail,
        countryCode,
        phoneNumber,
        password: await hashPassword(password),
        timezone: isValidTimezone(timezone) ? timezone : 'UTC',
      },
      { transaction }
    );
    await TimetableSetting.create({ userId: created.id, ...TIMETABLE_SETTING_DEFAULTS }, { transaction });
    await NotificationSetting.create({ userId: created.id }, { transaction });
    return created;
  });
  // Queued after commit; a mail problem must never block sign-up (it shows up in Notification History).
  await notifications.sendWelcome(user).catch((err) => logger.error('[auth] could not queue welcome email:', err.message));
  return { user, token: signToken(user) };
}

async function login({ email, password }) {
  const user = await User.scope('withPassword').findOne({ where: { email: email.toLowerCase() } });
  const valid = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
  if (!user || !valid) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (!user.isActive) throw new ApiError(401, 'This account has been deactivated', 'ACCOUNT_DISABLED');
  await user.update({ lastLoginAt: new Date() });
  return { user, token: signToken(user) };
}

/** Always resolves (no account enumeration). Emails a single-use link valid for a short time. */
async function forgotPassword(email) {
  const user = await User.findOne({ where: { email: email.toLowerCase(), isActive: true } });
  if (!user) return;

  const token = crypto.randomBytes(32).toString('hex');
  await sequelize.transaction(async (transaction) => {
    // Invalidate older unused links.
    await PasswordReset.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null }, transaction });
    await PasswordReset.create(
      {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + env.passwordResetTtlMinutes * 60 * 1000),
      },
      { transaction }
    );
  });

  const link = `${env.frontendUrl}/reset-password?token=${token}`;
  try {
    await emailProvider.send({
      to: user.email,
      subject: 'Reset your Smart Timetable password',
      text: `Hello ${user.name},\n\nUse this link to reset your password (valid for ${env.passwordResetTtlMinutes} minutes):\n${link}\n\nIf you did not request this, you can ignore this email.`,
      html: layout({
        title: 'Reset your password',
        body:
          p(`Hello ${user.name},`) +
          p(`We received a request to reset your password. This link is valid for ${env.passwordResetTtlMinutes} minutes and can be used once.`) +
          p('If you did not request this, you can safely ignore this email.'),
        ctaLabel: 'Reset password',
        ctaUrl: link,
      }),
    });
  } catch (err) {
    logger.error('[auth] failed to send password reset email:', err.message);
  }
}

async function resetPassword(token, password) {
  const reset = await PasswordReset.findOne({
    where: { tokenHash: sha256(token), usedAt: null, expiresAt: { [Op.gt]: new Date() } },
  });
  if (!reset) throw ApiError.badRequest('This reset link is invalid or has expired', 'INVALID_TOKEN');

  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(reset.userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user) throw ApiError.badRequest('This reset link is invalid or has expired', 'INVALID_TOKEN');
    await user.update(
      { password: await hashPassword(password), tokenVersion: user.tokenVersion + 1 },
      { transaction }
    );
    await reset.update({ usedAt: new Date() }, { transaction });
  });
}

async function changePassword(user, currentPassword, newPassword) {
  const fresh = await User.scope('withPassword').findByPk(user.id);
  if (!(await bcrypt.compare(currentPassword, fresh.password))) {
    throw ApiError.badRequest('Current password is incorrect', 'VALIDATION_ERROR', {
      errors: [{ field: 'currentPassword', message: 'Current password is incorrect' }],
    });
  }
  // Bumping the token version signs out every other session.
  await fresh.update({ password: await hashPassword(newPassword), tokenVersion: fresh.tokenVersion + 1 });
  return { user: fresh, token: signToken(fresh) };
}

async function cleanupExpiredResets() {
  await PasswordReset.destroy({
    where: { [Op.or]: [{ expiresAt: { [Op.lt]: new Date(Date.now() - 24 * 3600 * 1000) } }, { usedAt: { [Op.ne]: null } }] },
  });
}

module.exports = { register, login, forgotPassword, resetPassword, changePassword, signToken, cleanupExpiredResets };
