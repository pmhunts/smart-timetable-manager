class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} message human readable message
   * @param {string} [code] machine readable error code
   * @param {object} [extra] extra fields merged into the error response body
   */
  constructor(statusCode, message, code, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra;
  }

  static badRequest(message, code = 'BAD_REQUEST', extra) {
    return new ApiError(400, message, code, extra);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN', extra) {
    return new ApiError(403, message, code, extra);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message, code = 'CONFLICT', extra) {
    return new ApiError(409, message, code, extra);
  }
}

module.exports = ApiError;
