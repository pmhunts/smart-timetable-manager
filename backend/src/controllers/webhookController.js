const { Op } = require('sequelize');
const { sequelize, NotificationLog, User } = require('../models');
const env = require('../config/env');
const logger = require('../utils/logger');
const whatsapp = require('../notifications/channels/whatsappProvider');
const { getNotificationSettings } = require('../services/settingsService');

const STOP_WORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPT OUT', 'OPTOUT'];
const START_WORDS = ['START', 'SUBSCRIBE', 'OPT IN', 'OPTIN'];

/** GET: Meta webhook verification handshake. */
const verify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && env.whatsapp.verifyToken && token === env.whatsapp.verifyToken) {
    return res.status(200).type('text/plain').send(String(challenge));
  }
  return res.sendStatus(403);
};

async function handleStatus(status) {
  const log = await NotificationLog.findOne({ where: { providerMessageId: status.id, notificationType: 'WHATSAPP' } });
  if (!log) return;
  const update = { providerStatus: status.status };
  if (status.status === 'failed') {
    const e = status.errors?.[0];
    update.deliveryStatus = 'FAILED';
    update.errorMessage = e ? `${e.title || e.message} (code ${e.code})${e.error_data?.details ? ` - ${e.error_data.details}` : ''}` : 'Delivery failed';
  }
  await log.update(update);
}

async function findUserByWhatsapp(from) {
  const digits = String(from).replace(/\D/g, '');
  return User.findOne({
    where: sequelize.where(sequelize.fn('CONCAT', sequelize.fn('REPLACE', sequelize.col('country_code'), '+', ''), sequelize.col('phone_number')), {
      [Op.eq]: digits,
    }),
  });
}

/** Inbound keywords let users withdraw (STOP) or give back (START) WhatsApp consent. */
async function handleInbound(message) {
  const text = String(message.text?.body || message.button?.text || '').trim().toUpperCase();
  const isStop = STOP_WORDS.includes(text);
  const isStart = START_WORDS.includes(text);
  if (!isStop && !isStart) return;
  const user = await findUserByWhatsapp(message.from);
  if (!user) return;
  const settings = await getNotificationSettings(user.id);
  if (isStop) {
    await settings.update({ whatsappEnabled: false, whatsappOptIn: false, whatsappOptInAt: null });
    logger.info(`[webhook] user ${user.id} opted out of WhatsApp`);
  } else {
    await settings.update({ whatsappOptIn: true, whatsappOptInAt: new Date(), whatsappEnabled: true });
    logger.info(`[webhook] user ${user.id} opted in to WhatsApp`);
  }
}

/** POST: delivery status callbacks and inbound messages. Always 200 quickly so Meta does not retry. */
const receive = async (req, res) => {
  if (!whatsapp.verifySignature(req.rawBody, req.get('x-hub-signature-256'))) {
    return res.sendStatus(401);
  }
  res.sendStatus(200);
  try {
    for (const entry of req.body?.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        for (const status of value.statuses || []) await handleStatus(status);
        for (const message of value.messages || []) await handleInbound(message);
      }
    }
  } catch (err) {
    logger.error('[webhook] processing failed:', err.message);
  }
  return undefined;
};

module.exports = { verify, receive };
