const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

const notFound = (req, res, next) => next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (err instanceof UniqueConstraintError) {
    error = ApiError.conflict('A record with the same value already exists', 'CONFLICT');
  } else if (err instanceof ForeignKeyConstraintError) {
    error = ApiError.badRequest('Referenced record does not exist', 'BAD_REQUEST');
  } else if (err instanceof ValidationError) {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest(errors[0]?.message || 'Validation failed', 'VALIDATION_ERROR', { errors });
  } else if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 2 MB)' : err.message, 'VALIDATION_ERROR');
  } else if (err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Malformed JSON body', 'BAD_REQUEST');
  } else if (!(err instanceof ApiError)) {
    logger.error(err);
    error = new ApiError(500, env.isProd ? 'Something went wrong' : err.message, 'INTERNAL_ERROR');
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    code: error.code,
    ...error.extra,
  });
};

module.exports = { notFound, errorHandler };
