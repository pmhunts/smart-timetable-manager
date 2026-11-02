const { timeAttribute, jsonAttribute } = require('./helpers');

module.exports = (sequelize, DataTypes) => {
  const TimetableSetting = sequelize.define(
    'TimetableSetting',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
      // When false the editing window restriction is disabled (timetable always editable).
      editingEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      startTime: timeAttribute(DataTypes, 'startTime', { defaultValue: '06:00:00' }),
      endTime: timeAttribute(DataTypes, 'endTime', { defaultValue: '09:00:00' }),
      // ISO weekdays 1 (Mon) .. 7 (Sun)
      applicableDays: jsonAttribute(DataTypes, 'applicableDays', { allowNull: false }),
    },
    { tableName: 'timetable_settings' }
  );

  TimetableSetting.associate = (models) => {
    TimetableSetting.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return TimetableSetting;
};
