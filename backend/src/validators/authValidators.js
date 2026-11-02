const { body } = require('express-validator');
const { password, confirmPassword, timezone, countryCode, phoneNumber } = require('./common');

const email = () => body('email').trim().isEmail().withMessage('Enter a valid email address').isLength({ max: 255 }).toLowerCase();

const register = [
  body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  email(),
  countryCode(body('countryCode')),
  phoneNumber(body('phoneNumber')),
  password('password'),
  confirmPassword('confirmPassword'),
  timezone(body('timezone').optional()),
];

const login = [email(), body('password').isString().notEmpty().withMessage('Password is required')];

const forgotPassword = [email()];

const resetPassword = [
  body('token').isString().isLength({ min: 32, max: 128 }).withMessage('Invalid reset token'),
  password('password'),
  confirmPassword('confirmPassword'),
];

module.exports = { register, login, forgotPassword, resetPassword };
