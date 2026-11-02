const historyService = require('../services/notificationHistoryService');
const notifications = require('../notifications/notificationService');
const { channelBlockReason } = require('../notifications/preferences');
const { getNotificationSettings } = require('../services/settingsService');
const ApiError = require('../utils/ApiError');
const { asyncHandler, ok, created, parsePagination, paginationMeta } = require('../utils/http');

const history = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const { rows, count } = await historyService.history(req.user, req.query, pagination);
  ok(res, { items: rows, pagination: paginationMeta(pagination, count) });
});

const sendTest = (channel) =>
  asyncHandler(async (req, res) => {
    const settings = await getNotificationSettings(req.user.id);
    const blocked = channelBlockReason(req.user, settings, channel);
    if (blocked) throw ApiError.badRequest(`Cannot send test: ${blocked}`, 'CHANNEL_DISABLED');
    const log = await notifications.sendTest(req.user, channel);
    created(res, log, `Test ${channel === 'EMAIL' ? 'email' : 'WhatsApp message'} queued`);
  });

module.exports = { history, testWhatsapp: sendTest('WHATSAPP'), testEmail: sendTest('EMAIL') };
