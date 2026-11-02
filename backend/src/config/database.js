// Shared by the app (src/models/index.js) and sequelize-cli (.sequelizerc).
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || null,
  database: process.env.DB_NAME || 'smart_timetable_db',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  dialect: process.env.DB_DIALECT || 'mysql',
  // All DATETIME values are stored and read as UTC.
  timezone: '+00:00',
  dialectOptions: {
    charset: 'utf8mb4',
    dateStrings: false,
    supportBigNumbers: true,
    bigNumberStrings: false,
    ...(process.env.DB_SSL === 'true'
      ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
      : {}),
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    underscored: true,
    timestamps: true,
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  logging: ['1', 'true'].includes(String(process.env.DB_LOGGING).toLowerCase()) ? console.log : false,
  migrationStorageTableName: 'sequelize_meta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'sequelize_data',
};

module.exports = {
  development: { ...base },
  test: { ...base, database: process.env.DB_NAME_TEST || `${base.database}_test` },
  production: { ...base },
};
