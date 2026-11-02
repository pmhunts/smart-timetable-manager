/** Copies only the listed keys that are actually present on `source`. */
const pick = (source, keys) => {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  keys.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(source, k)) out[k] = source[k];
  });
  return out;
};

module.exports = { pick };
