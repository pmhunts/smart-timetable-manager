const { pick } = require('../utils/object');
const ApiError = require('../utils/ApiError');
const { getNotificationSettings } = require('./settingsService');
const notifications = require('../notifications/notificationService');

const EDITABLE_FIELDS = [
  'whatsappEnabled',
  'whatsappOptIn',
  'whatsappTaskStart',
  'whatsappAdvanceReminder',
  'whatsappUpdateNotification',
  'whatsappDeletionNotification',
  'whatsappDailySummary',
  'emailEnabled',
  'emailTaskStart',
  'emailAdvanceReminder',
  'emailUpdateNotification',
  'emailDeletionNotification',
  'emailDailySummary',
  'incompleteReminder',
  'reminderMinutes',
  'dailySummaryTime',
  'quietHoursEnabled',
  'quietHoursStart',
  'quietHoursEnd',
  'notificationSound',
];

const get = (user) => getNotificationSettings(user.id);

/**
 * Saves notification preferences and immediately re-plans pending notifications so the
 * change takes effect at once (disabled ones are cancelled, newly enabled ones are scheduled).
 */
async function update(user, input) {
  const settings = await getNotificationSettings(user.id);
  const data = pick(input, EDITABLE_FIELDS);
  const next = { ...settings.get(), ...data };

  // WhatsApp consent handling (Meta requires explicit opt-in before business-initiated messages).
  if (data.whatsappOptIn === true && !settings.whatsappOptIn) data.whatsappOptInAt = new Date();
  if (data.whatsappOptIn === false) {
    data.whatsappOptInAt = null;
    data.whatsappEnabled = false;
    next.whatsappEnabled = false;
  }
  if (next.whatsappEnabled && !next.whatsappOptIn) {
    throw ApiError.forbidden(
      'Please confirm that you agree to receive WhatsApp messages before enabling WhatsApp notifications.',
      'WHATSAPP_CONSENT_REQUIRED'
    );
  }
  if (next.whatsappEnabled && !user.phoneNumber) {
    throw ApiError.badRequest('Add a WhatsApp number to your profile first', 'VALIDATION_ERROR');
  }
  if (next.quietHoursEnabled && (!next.quietHoursStart || !next.quietHoursEnd)) {
    throw ApiError.badRequest('Quiet hours need a start and end time', 'VALIDATION_ERROR', {
      errors: [{ field: 'quietHoursStart', message: 'Quiet hours need a start and end time' }],
    });
  }
  if (next.quietHoursEnabled && next.quietHoursStart?.slice(0, 5) === next.quietHoursEnd?.slice(0, 5)) {
    throw ApiError.badRequest('Quiet hours start and end cannot be the same', 'VALIDATION_ERROR');
  }

  await settings.update(data);
  await notifications.replanUser(user.id);
  return settings.reload();
}

module.exports = { get, update };
