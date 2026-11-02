const { Sequelize, DataTypes } = require('sequelize');
const env = require('../config/env');
const dbConfig = require('../config/database')[env.nodeEnv] || require('../config/database').development;

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

const db = {
  User: require('./User')(sequelize, DataTypes),
  TimetableSetting: require('./TimetableSetting')(sequelize, DataTypes),
  Timetable: require('./Timetable')(sequelize, DataTypes),
  Task: require('./Task')(sequelize, DataTypes),
  NotificationSetting: require('./NotificationSetting')(sequelize, DataTypes),
  NotificationLog: require('./NotificationLog')(sequelize, DataTypes),
  NotificationJob: require('./NotificationJob')(sequelize, DataTypes),
  PasswordReset: require('./PasswordReset')(sequelize, DataTypes),
};

Object.values(db).forEach((model) => model.associate && model.associate(db));

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
