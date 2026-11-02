const { Op } = require('sequelize');
const { Task, Timetable, NotificationLog } = require('../models');
const { todayIn, localToUtc } = require('../utils/time');
const { getNotificationSettings } = require('./settingsService');
const editingWindowService = require('./editingWindowService');
const taskService = require('./taskService');
const whatsapp = require('../notifications/channels/whatsappProvider');
const email = require('../notifications/channels/emailProvider');

async function getDashboard(user) {
  const today = todayIn(user.timezone);
  const startOfToday = localToUtc(today, '00:00', user.timezone);

  const [tasks, timetable, editingWindow, settings, pendingCount, failedToday, stats] = await Promise.all([
    Task.findAll({ where: { userId: user.id, scheduleDate: today }, order: [['startTime', 'ASC']] }),
    Timetable.findOne({ where: { userId: user.id, scheduleDate: today } }),
    editingWindowService.getStateForUser(user),
    getNotificationSettings(user.id),
    NotificationLog.count({ where: { userId: user.id, deliveryStatus: 'PENDING' } }),
    NotificationLog.count({ where: { userId: user.id, deliveryStatus: 'FAILED', createdAt: { [Op.gte]: startOfToday } } }),
    taskService.getStats(user, 7),
  ]);

  const count = (status) => tasks.filter((t) => t.status === status).length;
  const counts = {
    total: tasks.length,
    completed: count('COMPLETED'),
    upcoming: count('UPCOMING'),
    ongoing: count('ONGOING'),
    missed: count('MISSED'),
    skipped: count('SKIPPED'),
  };
  counts.pending = counts.upcoming + counts.ongoing;

  return {
    user,
    today,
    serverTime: new Date().toISOString(),
    stats: counts,
    tasks,
    nextTask: tasks.find((t) => t.status === 'ONGOING') || tasks.find((t) => t.status === 'UPCOMING') || null,
    timetable: timetable
      ? { id: timetable.id, title: timetable.title, status: timetable.status, isLocked: editingWindow.isLocked }
      : null,
    editingWindow,
    notifications: {
      whatsappEnabled: settings.whatsappEnabled,
      whatsappOptIn: settings.whatsappOptIn,
      emailEnabled: settings.emailEnabled,
      whatsappConfigured: whatsapp.isConfigured(),
      emailConfigured: email.isConfigured(),
      whatsappMode: whatsapp.isLive() ? 'live' : 'mock',
      emailMode: email.isLive() ? 'live' : 'mock',
      pendingCount,
      failedToday,
    },
    weekly: stats.daily,
  };
}

module.exports = { getDashboard };
