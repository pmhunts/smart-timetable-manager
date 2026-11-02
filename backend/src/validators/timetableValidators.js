const { body, param, query } = require('express-validator');
const { idParam, dateField, dateQuery } = require('./common');
const { taskFields } = require('./taskValidators');

const title = (chain) => chain.isString().trim().isLength({ min: 1, max: 255 }).withMessage('Title must be 1-255 characters');

const create = [
  title(body('title')),
  dateField(body('scheduleDate'), 'Schedule date'),
  body('tasks').optional().isArray({ max: 100 }).withMessage('Tasks must be a list (max 100)'),
  ...taskFields('tasks.*.'),
];

const update = [
  idParam(),
  title(body('title').optional()),
  body('tasks').optional().isArray({ max: 100 }).withMessage('Tasks must be a list (max 100)'),
  body('tasks.*.id').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Invalid task id').toInt(),
  ...taskFields('tasks.*.'),
];

const duplicate = [idParam(), dateField(body('targetDate'), 'Target date'), title(body('title').optional())];

const list = [
  dateQuery('from'),
  dateQuery('to'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const byDate = [dateField(param('date'), 'Date')];

module.exports = { create, update, duplicate, list, byDate, idParam };
