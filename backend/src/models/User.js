module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      countryCode: { type: DataTypes.STRING(6), allowNull: false, defaultValue: '+1' },
      phoneNumber: { type: DataTypes.STRING(20), allowNull: false },
      password: { type: DataTypes.STRING(255), allowNull: false },
      timezone: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'UTC' },
      profileImage: { type: DataTypes.STRING(500), allowNull: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      // Incremented on password change/reset to invalidate previously issued JWTs.
      tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: 'users',
      defaultScope: { attributes: { exclude: ['password'] } },
      scopes: { withPassword: { attributes: { include: ['password'] } } },
    }
  );

  /** E.164 number used by WhatsApp, e.g. +919876543210 */
  User.prototype.getWhatsappNumber = function getWhatsappNumber() {
    if (!this.phoneNumber) return null;
    const cc = String(this.countryCode || '').replace(/\D/g, '');
    return `+${cc}${String(this.phoneNumber).replace(/\D/g, '')}`;
  };

  User.prototype.toJSON = function toJSON() {
    const v = { ...this.get() };
    delete v.password;
    delete v.tokenVersion;
    v.whatsappNumber = this.getWhatsappNumber();
    return v;
  };

  User.associate = (models) => {
    User.hasMany(models.Timetable, { foreignKey: 'userId', as: 'timetables', onDelete: 'CASCADE' });
    User.hasMany(models.Task, { foreignKey: 'userId', as: 'tasks', onDelete: 'CASCADE' });
    User.hasOne(models.TimetableSetting, { foreignKey: 'userId', as: 'timetableSetting', onDelete: 'CASCADE' });
    User.hasOne(models.NotificationSetting, { foreignKey: 'userId', as: 'notificationSetting', onDelete: 'CASCADE' });
    User.hasMany(models.NotificationLog, { foreignKey: 'userId', as: 'notificationLogs', onDelete: 'CASCADE' });
    User.hasMany(models.PasswordReset, { foreignKey: 'userId', as: 'passwordResets', onDelete: 'CASCADE' });
  };

  return User;
};
