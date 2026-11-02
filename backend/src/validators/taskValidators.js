const { body, query } = require('express-validator');
const { idParam, dateField, timeField, dateQuery } = require('./common');

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const REPEAT_TYPES = ['NONE', 'DAILY', 'WEEKLY', 'CUSTOM'];
const STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'SKIPPED', 'MISSED'];
const BOOLEAN_FIELDS = ['allowOverlap', 'reminderEnabled', 'whatsappReminder', 'emailReminder'];

/**
 * Validation chains for a task payload. `prefix` is '' for /tasks or 'tasks.*.' for timetable payloads.
 * When `partial` is true every field is optional (updates).
 */
function taskFields(prefix = '', { partial = false } = {}) {
  const f = (name) => body(`${prefix}${name}`);
  const req = (chain) => (partial ? chain.optional() : chain);
  return [
    req(f('title'))
      .isString()
      .withMessage('Title is required')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be 1-255 characters'),
    f('description').optional({ values: 'null' }).isString().trim().isLength({ max: 5000 }).withMessage('Description is too long'),
    timeField(req(f('startTime')), 'Start time'),
    timeField(req(f('endTime')), 'End time'),
    f('category').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Category must be 1-100 characters'),
    f('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of ${PRIORITIES.join(', ')}`),
    f('repeatType').optional().isIn(REPEAT_TYPES).withMessage(`Repeat must be one of ${REPEAT_TYPES.join(', ')}`),
    f('repeatDays').optional({ values: 'null' }).isArray({ max: 7 }).withMessage('Repeat days must be a list'),
    f('repeatDays.*').isInt({ min: 1, max: 7 }).withMessage('Repeat days must be 1 (Mon) to 7 (Sun)').toInt(),
    dateField(f('repeatUntil').optional({ values: 'falsy' }), 'Repeat until'),
    ...BOOLEAN_FIELDS.map((name) => f(name).optional().isBoolean().withMessage(`${name} must be true or false`).toBoolean()),
  ];
}

const create = [dateField(body('scheduleDate'), 'Schedule date'), ...taskFields()];

const update = [idParam(), dateField(body('scheduleDate').optional(), 'Schedule date'), ...taskFields('', { partial: true })];

const updateStatus = [
  idParam(),
  body('status').isIn(['COMPLETED', 'SKIPPED', 'UPCOMING']).withMessage('Status must be COMPLETED, SKIPPED or UPCOMING'),
];

const list = [
  dateQuery('date'),
  dateQuery('from'),
  dateQuery('to'),
  query('status')
    .optional({ values: 'falsy' })
    .customSanitizer((v) => String(v).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean))
    .custom((arr) => arr.every((s) => STATUSES.includes(s)))
    .withMessage(`Status must be any of ${STATUSES.join(', ')}`),
  query('category').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  query('search').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }).toInt(),
];

const stats = [query('days').optional().isInt({ min: 1, max: 90 }).withMessage('days must be 1-90').toInt()];

module.exports = { taskFields, create, update, updateStatus, list, stats, idParam };
