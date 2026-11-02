const { body } = require('express-validator');
const { password, confirmPassword, timezone, countryCode, phoneNumber } = require('./common');

const updateProfile = [
  body('name').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Name must be 2-150 characters'),
  body('email').optional().trim().isEmail().withMessage('Enter a valid email address').toLowerCase(),
  countryCode(body('countryCode').optional()),
  phoneNumber(body('phoneNumber').optional()),
  timezone(body('timezone').optional()),
];

const changePassword = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
  password('newPassword'),
  confirmPassword('confirmPassword', 'newPassword'),
];

module.exports = { updateProfile, changePassword };
