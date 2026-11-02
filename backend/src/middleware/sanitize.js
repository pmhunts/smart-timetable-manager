/**
 * Recursively cleans request bodies:
 *  - drops prototype-pollution keys (__proto__, constructor, prototype)
 *  - strips HTML tags and control characters from strings (secrets such as passwords are left untouched)
 * Output is additionally escaped where rendered (React, email templates); SQL is always parameterised.
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const RAW_KEYS = /password|token/i;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const TAGS = /<\/?[a-z!][^>]*>/gi;

function clean(value, key = '') {
  if (typeof value === 'string') {
    return RAW_KEYS.test(key) ? value : value.replace(CONTROL_CHARS, '').replace(TAGS, '');
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach((k) => {
      if (!FORBIDDEN_KEYS.has(k)) out[k] = clean(value[k], k);
    });
    return out;
  }
  return value;
}

const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
};

module.exports = { sanitizeBody, clean };
