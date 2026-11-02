import { validateTask } from './task.js';

/** Validates every row; returns { [rowKey]: errors } containing only invalid rows. */
export function validateRows(rows) {
  const out = {};
  rows.forEach((r) => {
    const e = validateTask(r);
    if (Object.keys(e).length) out[r._key] = e;
  });
  return out;
}

/**
 * Maps backend validation errors such as `tasks[2].endTime` or `tasks.2.endTime`
 * onto row keys. Non-row errors are returned under `_general`.
 */
export function mapServerRowErrors(err, rows) {
  const list = err?.response?.data?.errors;
  const out = {};
  if (!Array.isArray(list)) return out;
  list.forEach(({ field = '', message }) => {
    const m = field.match(/^tasks(?:\[(\d+)\]|\.(\d+))\.?(\w+)?/);
    if (m) {
      const idx = Number(m[1] ?? m[2]);
      const key = rows[idx]?._key;
      if (key) {
        out[key] = { ...(out[key] || {}), [m[3] || 'title']: message };
        return;
      }
    }
    out._general = { ...(out._general || {}), [field || 'form']: message };
  });
  return out;
}
