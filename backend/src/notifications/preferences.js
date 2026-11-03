/**
 * Pure functions deciding whether a notification may be sent, based on the user's
 * notification settings, WhatsApp consent and the task's own reminder switches.
 * Evaluated both when planning and again right before sending, so changes take effect immediately.
 */
const { timeToMinutes, inTimeRange, nowIn } = require('../utils/time');

const CHANNELS = ['WHATSAPP', 'EMAIL'];
const REMINDER_EVENTS = ['ADVANCE_REMINDER', 'TASK_START', 'INCOMPLETE_REMINDER'];
const UPDATE_EVENTS = ['TASK_CREATED', 'TASK_UPDATED', 'TIMETABLE_CREATED', 'TIMETABLE_UPDATED'];
const DELETION_EVENTS = ['TASK_DELETED', 'TIMETABLE_DELETED'];
const SCHEDULED_EVENTS = [...REMINDER_EVENTS, 'DAILY_SUMMARY'];
// Account/system messages: not controlled by per-event toggles and never held back by quiet hours.
const TRANSACTIONAL_EVENTS = ['TEST', 'WELCOME'];

const prefix = (channel) => (channel === 'WHATSAPP' ? 'whatsapp' : 'email');

/** Returns null when the channel can be used, otherwise the reason it cannot. */
function channelBlockReason(user, settings, channel) {
  if (!user || !user.isActive) return 'User account is inactive';
  if (channel === 'EMAIL') {
    if (!settings.emailEnabled) return 'Email notifications are turned off';
    if (!user.email) return 'No email address on profile';
    return null;
  }
  if (!settings.whatsappEnabled) return 'WhatsApp notifications are turned off';
  if (!settings.whatsappOptIn) return 'WhatsApp opt-in consent has not been given';
  if (!user.phoneNumber) return 'No WhatsApp number on profile';
  return null;
}

/** Returns null when this event type is enabled for the channel (and task), otherwise the reason. */
function eventBlockReason(settings, channel, eventType, task) {
  const p = prefix(channel);
  if (REMINDER_EVENTS.includes(eventType)) {
    if (!task) return 'Task no longer exists';
    if (!task.reminderEnabled) return 'Reminders are disabled for this task';
    if (channel === 'WHATSAPP' && !task.whatsappReminder) return 'WhatsApp reminder disabled for this task';
    if (channel === 'EMAIL' && !task.emailReminder) return 'Email reminder disabled for this task';
  }
  switch (eventType) {
    case 'ADVANCE_REMINDER':
      return settings[`${p}AdvanceReminder`] ? null : 'Advance reminders are turned off';
    case 'TASK_START':
      return settings[`${p}TaskStart`] ? null : 'Task start reminders are turned off';
    case 'INCOMPLETE_REMINDER':
      return settings.incompleteReminder ? null : 'Incomplete-task reminders are turned off';
    case 'DAILY_SUMMARY':
      return settings[`${p}DailySummary`] ? null : 'Daily summary is turned off';
    case 'TEST':
    case 'WELCOME':
      return null;
    default:
      if (UPDATE_EVENTS.includes(eventType)) return settings[`${p}UpdateNotification`] ? null : 'Update notifications are turned off';
      if (DELETION_EVENTS.includes(eventType)) return settings[`${p}DeletionNotification`] ? null : 'Deletion notifications are turned off';
      return `Unknown event type ${eventType}`;
  }
}

/** If `now` falls inside the user's quiet hours, returns the UTC Date when they end; otherwise null. */
function quietHoursEnd(settings, timezone, now = new Date()) {
  if (!settings.quietHoursEnabled || !settings.quietHoursStart || !settings.quietHoursEnd) return null;
  const local = nowIn(timezone, now);
  const minute = local.hour * 60 + local.minute;
  const start = timeToMinutes(settings.quietHoursStart);
  const end = timeToMinutes(settings.quietHoursEnd);
  if (!inTimeRange(minute, start, end)) return null;
  let endsAt = local.startOf('day').plus({ minutes: end });
  if (endsAt <= local) endsAt = endsAt.plus({ days: 1 });
  return endsAt.toUTC().toJSDate();
}

module.exports = {
  CHANNELS,
  REMINDER_EVENTS,
  UPDATE_EVENTS,
  DELETION_EVENTS,
  SCHEDULED_EVENTS,
  TRANSACTIONAL_EVENTS,
  channelBlockReason,
  eventBlockReason,
  quietHoursEnd,
};
