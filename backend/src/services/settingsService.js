const { TimetableSetting, NotificationSetting } = require('../models');
const { ALL_DAYS } = require('../utils/editingWindow');

const TIMETABLE_SETTING_DEFAULTS = {
  editingEnabled: false,
  startTime: '06:00',
  endTime: '09:00',
  applicableDays: ALL_DAYS,
};

/** Returns the user's timetable (editing window) settings, creating defaults on first access. */
async function getTimetableSettings(userId, { transaction } = {}) {
  const [settings] = await TimetableSetting.findOrCreate({
    where: { userId },
    defaults: { userId, ...TIMETABLE_SETTING_DEFAULTS },
    transaction,
  });
  return settings;
}

/** Returns the user's notification settings, creating defaults on first access. */
async function getNotificationSettings(userId, { transaction } = {}) {
  const [settings] = await NotificationSetting.findOrCreate({
    where: { userId },
    defaults: { userId },
    transaction,
  });
  return settings;
}

module.exports = { getTimetableSettings, getNotificationSettings, TIMETABLE_SETTING_DEFAULTS };
