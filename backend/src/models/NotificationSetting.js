const { timeAttribute } = require('./helpers');

module.exports = (sequelize, DataTypes) => {
  const flag = (defaultValue) => ({ type: DataTypes.BOOLEAN, allowNull: false, defaultValue });

  const NotificationSetting = sequelize.define(
    'NotificationSetting',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT, allowNull: false, unique: true },

      // WhatsApp channel
      whatsappEnabled: flag(false),
      whatsappOptIn: flag(false),
      whatsappOptInAt: { type: DataTypes.DATE, allowNull: true },
      whatsappTaskStart: flag(true),
      whatsappAdvanceReminder: flag(true),
      whatsappUpdateNotification: flag(true),
      whatsappDeletionNotification: flag(true),
      whatsappDailySummary: flag(false),

      // Email channel
      emailEnabled: flag(true),
      emailTaskStart: flag(true),
      emailAdvanceReminder: flag(true),
      emailUpdateNotification: flag(true),
      emailDeletionNotification: flag(true),
      emailDailySummary: flag(true),

      // General
      incompleteReminder: flag(false),
      reminderMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      dailySummaryTime: timeAttribute(DataTypes, 'dailySummaryTime', { defaultValue: '07:00:00' }),
      quietHoursEnabled: flag(false),
      quietHoursStart: timeAttribute(DataTypes, 'quietHoursStart', { allowNull: true }),
      quietHoursEnd: timeAttribute(DataTypes, 'quietHoursEnd', { allowNull: true }),
      notificationSound: flag(true),
    },
    { tableName: 'notification_settings' }
  );

  NotificationSetting.prototype.toJSON = function toJSON() {
    const v = { ...this.get() };
    delete v.id;
    delete v.userId;
    return v;
  };

  NotificationSetting.associate = (models) => {
    NotificationSetting.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return NotificationSetting;
};
