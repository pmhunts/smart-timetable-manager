const { timeAttribute, jsonAttribute } = require('./helpers');

module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define(
    'Task',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      timetableId: { type: DataTypes.BIGINT, allowNull: false },
      userId: { type: DataTypes.BIGINT, allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      // Local (user timezone) date and times as entered by the user ...
      scheduleDate: { type: DataTypes.DATEONLY, allowNull: false },
      startTime: timeAttribute(DataTypes, 'startTime'),
      endTime: timeAttribute(DataTypes, 'endTime'),
      // ... and the same instants in UTC, used by the scheduler and status jobs.
      startAtUtc: { type: DataTypes.DATE, allowNull: false },
      endAtUtc: { type: DataTypes.DATE, allowNull: false },
      category: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'Personal' },
      priority: { type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'), allowNull: false, defaultValue: 'MEDIUM' },
      status: {
        type: DataTypes.ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'SKIPPED', 'MISSED'),
        allowNull: false,
        defaultValue: 'UPCOMING',
      },
      repeatType: { type: DataTypes.ENUM('NONE', 'DAILY', 'WEEKLY', 'CUSTOM'), allowNull: false, defaultValue: 'NONE' },
      repeatDays: jsonAttribute(DataTypes, 'repeatDays'),
      repeatUntil: { type: DataTypes.DATEONLY, allowNull: true },
      // Dates whose generated occurrence the user deleted (so the generator does not recreate them).
      repeatExceptions: jsonAttribute(DataTypes, 'repeatExceptions'),
      sourceTaskId: { type: DataTypes.BIGINT, allowNull: true },
      allowOverlap: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      reminderEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      whatsappReminder: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      emailReminder: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      // Bumped whenever date/time changes; part of reminder idempotency keys.
      scheduleVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      completedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'tasks',
      indexes: [
        { fields: ['timetable_id'] },
        { fields: ['user_id', 'schedule_date'] },
        { fields: ['status', 'start_at_utc'] },
        { fields: ['status', 'end_at_utc'] },
        { unique: true, fields: ['source_task_id', 'schedule_date'] },
      ],
    }
  );

  Task.prototype.toJSON = function toJSON() {
    const v = { ...this.get() };
    delete v.repeatExceptions;
    delete v.scheduleVersion;
    return v;
  };

  Task.associate = (models) => {
    Task.belongsTo(models.Timetable, { foreignKey: 'timetableId', as: 'timetable' });
    Task.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Task.belongsTo(models.Task, { foreignKey: 'sourceTaskId', as: 'sourceTask', onDelete: 'SET NULL' });
    Task.hasMany(models.NotificationLog, { foreignKey: 'taskId', as: 'notificationLogs', onDelete: 'SET NULL' });
  };

  return Task;
};
