const notificationSettingsService = require('../services/notificationSettingsService');
const editingWindowService = require('../services/editingWindowService');
const { asyncHandler, ok } = require('../utils/http');
const { pick } = require('../utils/object');

const getNotificationSettings = asyncHandler(async (req, res) => ok(res, await notificationSettingsService.get(req.user)));

const updateNotificationSettings = asyncHandler(async (req, res) =>
  ok(res, await notificationSettingsService.update(req.user, req.body), 'Notification settings saved')
);

const getEditingWindow = asyncHandler(async (req, res) => ok(res, await editingWindowService.getConfig(req.user)));

const updateEditingWindow = asyncHandler(async (req, res) => {
  const input = pick(req.body, ['editingEnabled', 'startTime', 'endTime', 'applicableDays']);
  ok(res, await editingWindowService.updateConfig(req.user, input), 'Editing window saved');
});

module.exports = { getNotificationSettings, updateNotificationSettings, getEditingWindow, updateEditingWindow };
