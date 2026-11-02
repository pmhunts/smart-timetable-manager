const crypto = require('crypto');
const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const { DeliveryError } = require('./errors');

const cfg = env.whatsapp;

const isLive = () => cfg.mode === 'live';
const isConfigured = () => !isLive() || Boolean(cfg.phoneNumberId && cfg.accessToken);

// Graph API error codes that are worth retrying (throttling / temporary errors).
// https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
const RETRYABLE_CODES = new Set([1, 2, 4, 17, 341, 80007, 130429, 131000, 131016, 131048, 131056, 133004]);

/** WhatsApp template parameters may not contain newlines, tabs or >4 consecutive spaces. */
const cleanParam = (value) => {
  const text = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, 1000);
  return text || '-';
};

const buildPayload = (to, { text, whatsappTemplate }) => {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };
  if (cfg.useTemplates && whatsappTemplate) {
    return {
      ...base,
      type: 'template',
      template: {
        name: cfg.templates[whatsappTemplate.key] || cfg.templates.GENERIC,
        language: { code: cfg.templateLang },
        components: [
          { type: 'body', parameters: whatsappTemplate.params.map((p) => ({ type: 'text', text: cleanParam(p) })) },
        ],
      },
    };
  }
  // Free-form text is only delivered inside the 24h customer-service window.
  return { ...base, type: 'text', text: { preview_url: false, body: text.slice(0, 4096) } };
};

/**
 * Sends a WhatsApp message through the Meta WhatsApp Cloud API.
 * @param {{ to: string, text: string, whatsappTemplate?: { key: string, params: string[] } }} message
 * @returns {Promise<{ providerMessageId: string }>}
 */
async function send(message) {
  const to = String(message.to || '').replace(/\D/g, '');
  if (to.length < 8) throw new DeliveryError('Invalid WhatsApp number', { retryable: false });

  const payload = buildPayload(to, message);

  if (!isLive()) {
    const id = `mock-wa-${crypto.randomUUID()}`;
    logger.info(`[whatsapp:mock] -> +${to} (${payload.type}${payload.template ? `:${payload.template.name}` : ''})\n${message.text}`);
    return { providerMessageId: id };
  }

  if (!isConfigured()) {
    throw new DeliveryError('WhatsApp Cloud API is not configured (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN)', {
      retryable: false,
    });
  }

  try {
    const url = `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${cfg.accessToken}`, 'Content-Type': 'application/json' },
      timeout: 15000,
    });
    const id = data?.messages?.[0]?.id;
    if (!id) throw new DeliveryError('WhatsApp API returned no message id', { retryable: true });
    return { providerMessageId: id };
  } catch (err) {
    if (err instanceof DeliveryError) throw err;
    const status = err.response?.status;
    const apiError = err.response?.data?.error;
    const code = apiError?.code;
    const retryable = !status || status >= 500 || status === 429 || RETRYABLE_CODES.has(code);
    const detail = apiError ? `${apiError.message}${apiError.error_data?.details ? ` - ${apiError.error_data.details}` : ''} (code ${code})` : err.message;
    throw new DeliveryError(`WhatsApp API error: ${detail}`, { retryable, providerCode: code });
  }
}

/** Verifies the X-Hub-Signature-256 header of a webhook request. */
function verifySignature(rawBody, signatureHeader) {
  if (!cfg.appSecret) return true; // signature check disabled (document this in production!)
  if (!signatureHeader || !rawBody) return false;
  const expected = `sha256=${crypto.createHmac('sha256', cfg.appSecret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signatureHeader));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { send, isConfigured, isLive, verifySignature, buildPayload };
