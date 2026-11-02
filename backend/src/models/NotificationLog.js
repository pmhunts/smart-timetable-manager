const { jsonAttribute } = require('./helpers');

module.exports = (sequelize, DataTypes) => {
  const NotificationLog = sequelize.define(
    'NotificationLog',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT, allowNull: false },
      // SET NULL on task deletion so the history survives.
      taskId: { type: DataTypes.BIGINT, allowNull: true },
      // Snapshot of the task title at the time the notification was created.
      taskTitle: { type: DataTypes.STRING(255), allowNull: true },
      notificationType: { type: DataTypes.ENUM('WHATSAPP', 'EMAIL'), allowNull: false },
      eventType: { type: DataTypes.STRING(100), allowNull: false },
      subject: { type: DataTypes.STRING(255), allowNull: true },
      message: { type: DataTypes.TEXT, allowNull: false },
      // Structured data used to render templates at send time.
      payload: jsonAttribute(DataTypes, 'payload'),
      recipient: { type: DataTypes.STRING(255), allowNull: true },
      // Prevents duplicate notifications for the same logical event.
      idempotencyKey: { type: DataTypes.STRING(191), allowNull: false, unique: true },
      scheduledAt: { type: DataTypes.DATE, allowNull: false },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      deliveryStatus: {
        type: DataTypes.ENUM('PENDING', 'SENT', 'FAILED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      // Provider-side lifecycle (WhatsApp webhook: sent/delivered/read/failed).
      providerStatus: { type: DataTypes.STRING(50), allowNull: true },
      providerMessageId: { type: DataTypes.STRING(255), allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'notification_logs',
      indexes: [
        { fields: ['user_id', 'created_at'] },
        { fields: ['user_id', 'delivery_status'] },
        { fields: ['task_id'] },
        { fields: ['scheduled_at'] },
        { fields: ['provider_message_id'] },
      ],
    }
  );

  NotificationLog.prototype.toJSON = function toJSON() {
    const v = { ...this.get() };
    delete v.payload;
    delete v.idempotencyKey;
    if (this.job) {
      v.attempts = this.job.attempts;
      delete v.job;
    }
    return v;
  };

  NotificationLog.associate = (models) => {
    NotificationLog.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    NotificationLog.belongsTo(models.Task, { foreignKey: 'taskId', as: 'task', onDelete: 'SET NULL' });
    NotificationLog.hasOne(models.NotificationJob, { foreignKey: 'notificationLogId', as: 'job', onDelete: 'CASCADE' });
  };

  return NotificationLog;
};
