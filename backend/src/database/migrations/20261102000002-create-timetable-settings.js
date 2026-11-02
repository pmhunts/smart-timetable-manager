'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'timetable_settings',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        editing_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        start_time: { type: Sequelize.TIME, allowNull: false, defaultValue: '06:00:00' },
        end_time: { type: Sequelize.TIME, allowNull: false, defaultValue: '09:00:00' },
        applicable_days: { type: Sequelize.JSON, allowNull: false },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    await queryInterface.addIndex('timetable_settings', ['user_id'], { unique: true, name: 'uq_timetable_settings_user' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('timetable_settings');
  },
};
