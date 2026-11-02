export const LOCKED_MESSAGE =
  'Your timetable editing window has closed. You can manage your schedule again during the next allowed window.';

/** Extracts a human-readable message from an axios error. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  const res = error.response;
  if (!res) {
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
    return error.message === 'Network Error' ? 'Cannot reach the server. Check your connection.' : error.message || fallback;
  }
  const body = res.data || {};
  if (body.code === 'EDITING_WINDOW_CLOSED') return body.message || LOCKED_MESSAGE;
  if (Array.isArray(body.errors) && body.errors.length) {
    return body.errors.map((e) => e.message).join(' • ');
  }
  if (res.status === 429) return body.message || 'Too many requests. Please slow down.';
  return body.message || fallback;
}

export const getErrorCode = (error) => error?.response?.data?.code;
export const getErrorBody = (error) => error?.response?.data || {};

/** Map of field -> message from a validation error response. */
export function getFieldErrors(error) {
  const errs = error?.response?.data?.errors;
  if (!Array.isArray(errs)) return {};
  return errs.reduce((acc, e) => {
    if (e.field && !acc[e.field]) acc[e.field] = e.message;
    return acc;
  }, {});
}
