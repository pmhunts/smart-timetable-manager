const { Op } = require('sequelize');
const { sequelize, Task, User } = require('../models');
const { todayIn } = require('../utils/time');

const AUTO_STATUSES = ['UPCOMING', 'ONGOING', 'MISSED'];
const FINAL_STATUSES = ['COMPLETED', 'SKIPPED'];

/** Status derived purely from the clock (for tasks the user has not completed/skipped). */
function computeAutoStatus(startAtUtc, endAtUtc, now = new Date()) {
  if (now >= new Date(endAtUtc)) return 'MISSED';
  if (now >= new Date(startAtUtc)) return 'ONGOING';
  return 'UPCOMING';
}

/** Cron: UPCOMING -> ONGOING -> MISSED based on UTC start/end instants. */
async function refreshTaskStatuses(now = new Date()) {
  const [missed] = await Task.update(
    { status: 'MISSED' },
    { where: { status: { [Op.in]: ['UPCOMING', 'ONGOING'] }, endAtUtc: { [Op.lte]: now } } }
  );
  const [ongoing] = await Task.update(
    { status: 'ONGOING' },
    { where: { status: 'UPCOMING', startAtUtc: { [Op.lte]: now }, endAtUtc: { [Op.gt]: now } } }
  );
  return { missed, ongoing };
}

/** Cron: archive timetables whose date is in the past for their owner's timezone. */
async function archivePastTimetables(now = new Date()) {
  const zones = await User.findAll({ attributes: [[sequelize.fn('DISTINCT', sequelize.col('timezone')), 'timezone']], raw: true });
  for (const { timezone } of zones) {
    await sequelize.query(
      `UPDATE timetables t
         JOIN users u ON u.id = t.user_id
          SET t.status = 'ARCHIVED'
        WHERE u.timezone = :tz AND t.schedule_date < :today AND t.status <> 'ARCHIVED'`,
      { replacements: { tz: timezone, today: todayIn(timezone, now) } }
    );
  }
}

module.exports = { computeAutoStatus, refreshTaskStatuses, archivePastTimetables, AUTO_STATUSES, FINAL_STATUSES };
