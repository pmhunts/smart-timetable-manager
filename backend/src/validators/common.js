const { body, param, query } = require('express-validator');
const { isValidTimezone } = require('../utils/time');

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const isRealDate = (value) => {
  if (!DATE_REGEX.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

const idParam = (name = 'id') => param(name).isInt({ min: 1 }).withMessage('Invalid id').toInt();

const dateField = (chain, label = 'Date') => chain.custom(isRealDate).withMessage(`${label} must be a valid date (YYYY-MM-DD)`);

const timeField = (chain, label = 'Time') => chain.matches(TIME_REGEX).withMessage(`${label} must be in HH:mm format`);

const password = (field = 'password') =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter')
    .matches(/\d/)
    .withMessage('Password must contain a number');

const confirmPassword = (field, source = 'password') =>
  body(field)
    .custom((value, { req }) => value === req.body[source])
    .withMessage('Passwords do not match');

const timezone = (chain) => chain.custom(isValidTimezone).withMessage('Invalid timezone');

const countryCode = (chain) => chain.trim().matches(/^\+\d{1,4}$/).withMessage('Country code must look like +91');

const phoneNumber = (chain) =>
  chain
    .trim()
    .customSanitizer((v) => String(v).replace(/[\s\-()]/g, ''))
    .matches(/^\d{6,15}$/)
    .withMessage('Phone number must contain 6-15 digits');

const dateQuery = (name) => dateField(query(name).optional({ values: 'falsy' }), name);

module.exports = {
  TIME_REGEX,
  isRealDate,
  idParam,
  dateField,
  timeField,
  password,
  confirmPassword,
  timezone,
  countryCode,
  phoneNumber,
  dateQuery,
};
