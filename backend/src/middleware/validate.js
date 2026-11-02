const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Runs express-validator chains (which also sanitise req.body in place) and rejects with 400
 * on failure. Controllers/services whitelist the fields they use with utils/object.pick, so
 * unknown fields are ignored and explicit nulls (e.g. clearing a description) are preserved.
 */
const validate = (chains) => [
  ...chains,
  (req, res, next) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      const errors = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg }));
      return next(ApiError.badRequest(errors[0].message, 'VALIDATION_ERROR', { errors }));
    }
    return next();
  },
];

module.exports = { validate };
