const { Op } = require('sequelize');
const { sequelize, Timetable, TimetableSetting } = require('../models');
const { getEditingWindowState, EDITING_WINDOW_CLOSED_MESSAGE } = require('../utils/editingWindow');
const { getTimetableSettings } = require('./settingsService');
const ApiError = require('../utils/ApiError');

async function getStateForUser(user, now = new Date()) {
  const settings = await getTimetableSettings(user.id);
  return getEditingWindowState(settings, user.timezone, now);
}

const serializeSettings = (s) => ({
  editingEnabled: s.editingEnabled,
  startTime: s.startTime,
  endTime: s.endTime,
  applicableDays: s.applicableDays,
});

async function getConfig(user) {
  const settings = await getTimetableSettings(user.id);
  return { settings: serializeSettings(settings), state: getEditingWindowState(settings, user.timezone) };
}

/**
 * Updates the editing window. The configuration is itself protected by the current window,
 * otherwise a locked user could simply disable the restriction to bypass it.
 */
async function updateConfig(user, input) {
  const settings = await getTimetableSettings(user.id);
  const current = getEditingWindowState(settings, user.timezone);
  if (!current.isOpen) {
    throw ApiError.forbidden(EDITING_WINDOW_CLOSED_MESSAGE, 'EDITING_WINDOW_CLOSED', { editingWindow: current });
  }

  if (input.startTime && input.endTime && input.startTime === input.endTime) {
    throw ApiError.badRequest('Start and closing time cannot be the same', 'VALIDATION_ERROR', {
      errors: [{ field: 'endTime', message: 'Start and closing time cannot be the same' }],
    });
  }

  if (input.applicableDays) input.applicableDays = [...new Set(input.applicableDays.map(Number))].sort();
  await settings.update(input);
  await syncLockStatusForUser(user, settings);
  return { settings: serializeSettings(settings), state: getEditingWindowState(settings, user.timezone) };
}

/** Mirrors the computed lock state into timetables.status for current/future timetables. */
async function syncLockStatusForUser(user, settings) {
  const state = getEditingWindowState(settings, user.timezone);
  const [from, to] = state.isLocked ? ['ACTIVE', 'LOCKED'] : ['LOCKED', 'ACTIVE'];
  await Timetable.update({ status: to }, { where: { userId: user.id, status: from } });
}

/** Cron: keep ACTIVE/LOCKED status of every user's non-archived timetables in sync with their window. */
async function syncAllLockStatuses(now = new Date()) {
  // Users without a restriction can never be locked.
  await sequelize.query(
    `UPDATE timetables t
       JOIN timetable_settings s ON s.user_id = t.user_id
        SET t.status = 'ACTIVE'
      WHERE s.editing_enabled = 0 AND t.status = 'LOCKED'`
  );

  const restricted = await TimetableSetting.findAll({
    where: { editingEnabled: true },
    include: [{ association: 'user', attributes: ['id', 'timezone'] }],
  });
  const locked = [];
  const open = [];
  restricted.forEach((s) => {
    if (!s.user) return;
    (getEditingWindowState(s, s.user.timezone, now).isLocked ? locked : open).push(s.userId);
  });
  if (locked.length) {
    await Timetable.update({ status: 'LOCKED' }, { where: { userId: { [Op.in]: locked }, status: 'ACTIVE' } });
  }
  if (open.length) {
    await Timetable.update({ status: 'ACTIVE' }, { where: { userId: { [Op.in]: open }, status: 'LOCKED' } });
  }
}

module.exports = { getStateForUser, getConfig, updateConfig, syncAllLockStatuses, syncLockStatusForUser };
