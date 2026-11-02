const { Op } = require('sequelize');
const { NotificationLog, NotificationJob } = require('../models');
const { localToUtc, addDays } = require('../utils/time');

const TYPES = ['WHATSAPP', 'EMAIL'];
const STATUSES = ['PENDING', 'SENT', 'FAILED', 'CANCELLED'];
const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

async function history(user, query, { page, limit, offset }) {
  const where = { userId: user.id };
  if (TYPES.includes(query.type)) where.notificationType = query.type;
  if (STATUSES.includes(query.status)) where.deliveryStatus = query.status;
  if (query.eventType) where.eventType = query.eventType;
  if (query.from || query.to) {
    // Dates are interpreted in the user's timezone and filter on the scheduled time.
    where.scheduledAt = {};
    if (query.from) where.scheduledAt[Op.gte] = localToUtc(query.from, '00:00', user.timezone);
    if (query.to) where.scheduledAt[Op.lt] = localToUtc(addDays(query.to, 1), '00:00', user.timezone);
  }
  if (query.search) {
    const like = `%${escapeLike(query.search)}%`;
    where[Op.or] = [{ message: { [Op.like]: like } }, { taskTitle: { [Op.like]: like } }];
  }

  const { rows, count } = await NotificationLog.findAndCountAll({
    where,
    include: [{ model: NotificationJob, as: 'job', attributes: ['attempts'] }],
    order: [
      ['scheduledAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit,
    offset,
    distinct: true,
  });
  return { rows, count };
}

module.exports = { history };
