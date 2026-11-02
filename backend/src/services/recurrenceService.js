/**
 * Recurring tasks are "templates" (repeatType != NONE). Their occurrences are materialised as
 * normal task rows (sourceTaskId = template id) for the next RECURRENCE_HORIZON_DAYS days, so
 * every occurrence has its own status, reminders and history. The unique index
 * (source_task_id, schedule_date) guarantees at most one occurrence per day.
 */
const { Op } = require('sequelize');
const { sequelize, Task, User } = require('../models');
const env = require('../config/env');
const logger = require('../utils/logger');
const { todayIn, addDays, isoWeekday } = require('../utils/time');
const { getNotificationSettings } = require('./settingsService');
const notifications = require('../notifications/notificationService');
const { findConflicts, lockTimetableForDate, loadDayTasks, buildTaskValues } = require('./taskHelpers');

const OCCURRENCE_FIELDS = [
  'title',
  'description',
  'startTime',
  'endTime',
  'category',
  'priority',
  'allowOverlap',
  'reminderEnabled',
  'whatsappReminder',
  'emailReminder',
];

function occursOn(template, date) {
  if (template.repeatType === 'NONE' || date <= template.scheduleDate) return false;
  if (template.repeatUntil && date > template.repeatUntil) return false;
  if ((template.repeatExceptions || []).includes(date)) return false;
  const weekday = isoWeekday(date);
  switch (template.repeatType) {
    case 'DAILY':
      return true;
    case 'WEEKLY':
      return weekday === isoWeekday(template.scheduleDate);
    case 'CUSTOM':
      return (template.repeatDays || []).includes(weekday);
    default:
      return false;
  }
}

/** Creates missing occurrences of one template inside the horizon. Returns the number created. */
async function generateForTask(templateId, now = new Date()) {
  const template = await Task.findByPk(templateId, { include: [{ model: User, as: 'user' }] });
  if (!template || template.repeatType === 'NONE' || !template.user) return 0;
  const { user } = template;
  const today = todayIn(user.timezone, now);
  const last = addDays(today, env.recurrenceHorizonDays);
  const firstCandidate = addDays(template.scheduleDate, 1);
  let created = 0;

  for (let date = firstCandidate > today ? firstCandidate : today; date <= last; date = addDays(date, 1)) {
    if (!occursOn(template, date)) continue;
    try {
      const task = await sequelize.transaction(async (transaction) => {
        const exists = await Task.findOne({ where: { sourceTaskId: template.id, scheduleDate: date }, transaction });
        if (exists) return null;
        const timetable = await lockTimetableForDate(user, date, { transaction });
        const dayTasks = await loadDayTasks(user.id, date, transaction);
        const data = { repeatType: 'NONE', sourceTaskId: template.id };
        OCCURRENCE_FIELDS.forEach((f) => {
          data[f] = template[f];
        });
        if (findConflicts(data, dayTasks).length) {
          logger.info(`[recurrence] skipped "${template.title}" on ${date}: overlaps an existing task`);
          return null;
        }
        const occurrence = await Task.create(buildTaskValues(user, timetable, date, data, now), { transaction });
        const settings = await getNotificationSettings(user.id, { transaction });
        await notifications.planTaskReminders(occurrence, user, settings, { transaction, now });
        return occurrence;
      });
      if (task) created += 1;
    } catch (err) {
      if (err.name !== 'SequelizeUniqueConstraintError') logger.error(`[recurrence] template ${template.id} on ${date}:`, err.message);
    }
  }
  return created;
}

/** After a template is edited: drop its untouched future occurrences and generate them again. */
async function regenerateFuture(templateId, now = new Date()) {
  const template = await Task.findByPk(templateId, { include: [{ model: User, as: 'user' }] });
  if (!template || !template.user) return 0;
  const today = todayIn(template.user.timezone, now);
  await sequelize.transaction(async (transaction) => {
    const future = await Task.findAll({
      where: { sourceTaskId: template.id, scheduleDate: { [Op.gt]: today }, status: 'UPCOMING' },
      transaction,
    });
    if (!future.length) return;
    const ids = future.map((t) => t.id);
    await notifications.cancelTaskReminders(ids, 'Recurring task was changed', { transaction });
    await Task.destroy({ where: { id: { [Op.in]: ids } }, transaction });
  });
  return generateForTask(template.id, now);
}

/** Cron: extend every active recurring template up to the horizon. */
async function generateAll(now = new Date()) {
  const cutoff = addDays(now.toISOString().slice(0, 10), -1);
  const templates = await Task.findAll({
    where: {
      repeatType: { [Op.ne]: 'NONE' },
      [Op.or]: [{ repeatUntil: null }, { repeatUntil: { [Op.gte]: cutoff } }],
    },
    attributes: ['id'],
  });
  let created = 0;
  for (const { id } of templates) created += await generateForTask(id, now);
  return created;
}

module.exports = { occursOn, generateForTask, regenerateFuture, generateAll };
