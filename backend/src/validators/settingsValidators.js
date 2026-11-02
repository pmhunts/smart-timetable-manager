const { body, query } = require('express-validator');
const { timeField, dateQuery } = require('./common');

const BOOLEAN_FIELDS = [
  'whatsappEnabled',
  'whatsappOptIn',
  'whatsappTaskStart',
  'whatsappAdvanceReminder',
  'whatsappUpdateNotification',
  'whatsappDeletionNotification',
  'whatsappDailySummary',
  'emailEnabled',
  'emailTaskStart',
  'emailAdvanceReminder',
  'emailUpdateNotification',
  'emailDeletionNotification',
  'emailDailySummary',
  'incompleteReminder',
  'quietHoursEnabled',
  'notificationSound',
];

const notificationSettings = [
  ...BOOLEAN_FIELDS.map((f) => body(f).optional().isBoolean().withMessage(`${f} must be true or false`).toBoolean()),
  body('reminderMinutes').optional().isIn([5, 10, 15, 30, '5', '10', '15', '30']).withMessage('Reminder must be 5, 10, 15 or 30 minutes').toInt(),
  timeField(body('dailySummaryTime').optional(), 'Daily summary time'),
  timeField(body('quietHoursStart').optional({ values: 'null' }), 'Quiet hours start'),
  timeField(body('quietHoursEnd').optional({ values: 'null' }), 'Quiet hours end'),
];

const editingWindow = [
  body('editingEnabled').isBoolean().withMessage('editingEnabled must be true or false').toBoolean(),
  timeField(body('startTime'), 'Start time'),
  timeField(body('endTime'), 'Closing time'),
  body('applicableDays').isArray({ min: 1, max: 7 }).withMessage('Select at least one day'),
  body('applicableDays.*').isInt({ min: 1, max: 7 }).withMessage('Days must be 1 (Mon) to 7 (Sun)').toInt(),
];

const history = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('type').optional({ values: 'falsy' }).isIn(['WHATSAPP', 'EMAIL']).withMessage('Invalid type'),
  query('status').optional({ values: 'falsy' }).isIn(['PENDING', 'SENT', 'FAILED', 'CANCELLED']).withMessage('Invalid status'),
  query('eventType').optional({ values: 'falsy' }).isString().isLength({ max: 100 }),
  query('search').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  dateQuery('from'),
  dateQuery('to'),
];

module.exports = { notificationSettings, editingWindow, history };
