module.exports = (sequelize, DataTypes) => {
  const NotificationJob = sequelize.define(
    'NotificationJob',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      // One job per notification log (unique) - the durable source of truth for the queue.
      notificationLogId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
      jobType: { type: DataTypes.STRING(100), allowNull: false },
      // When the notification is meant to go out.
      scheduledAt: { type: DataTypes.DATE, allowNull: false },
      // When the next attempt may run (differs from scheduledAt on retry / quiet-hours deferral).
      runAt: { type: DataTypes.DATE, allowNull: false },
      status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lastError: { type: DataTypes.TEXT, allowNull: true },
      lockedAt: { type: DataTypes.DATE, allowNull: true },
      queueJobId: { type: DataTypes.STRING(191), allowNull: true },
    },
    {
      tableName: 'notification_jobs',
      indexes: [{ fields: ['status', 'run_at'] }, { fields: ['scheduled_at'] }],
    }
  );

  NotificationJob.associate = (models) => {
    NotificationJob.belongsTo(models.NotificationLog, { foreignKey: 'notificationLogId', as: 'log' });
  };

  return NotificationJob;
};
