module.exports = (sequelize, DataTypes) => {
  const Timetable = sequelize.define(
    'Timetable',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.BIGINT, allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      scheduleDate: { type: DataTypes.DATEONLY, allowNull: false },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'LOCKED', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    },
    {
      tableName: 'timetables',
      indexes: [{ unique: true, fields: ['user_id', 'schedule_date'] }],
    }
  );

  Timetable.associate = (models) => {
    Timetable.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    Timetable.hasMany(models.Task, { foreignKey: 'timetableId', as: 'tasks', onDelete: 'CASCADE', hooks: true });
  };

  return Timetable;
};
