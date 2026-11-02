'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'timetables',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        title: { type: Sequelize.STRING(255), allowNull: false },
        schedule_date: { type: Sequelize.DATEONLY, allowNull: false },
        status: { type: Sequelize.ENUM('ACTIVE', 'LOCKED', 'ARCHIVED'), allowNull: false, defaultValue: 'ACTIVE' },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    // One timetable per user per day; also serves user_id lookups.
    await queryInterface.addIndex('timetables', ['user_id', 'schedule_date'], { unique: true, name: 'uq_timetables_user_date' });
    await queryInterface.addIndex('timetables', ['schedule_date'], { name: 'idx_timetables_schedule_date' });
    await queryInterface.addIndex('timetables', ['status'], { name: 'idx_timetables_status' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('timetables');
  },
};
