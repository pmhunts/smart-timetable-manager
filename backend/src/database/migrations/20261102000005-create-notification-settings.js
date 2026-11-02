'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const flag = (defaultValue) => ({ type: Sequelize.BOOLEAN, allowNull: false, defaultValue });

    await queryInterface.createTable(
      'notification_settings',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        whatsapp_enabled: flag(false),
        whatsapp_opt_in: flag(false),
        whatsapp_opt_in_at: { type: Sequelize.DATE, allowNull: true },
        whatsapp_task_start: flag(true),
        whatsapp_advance_reminder: flag(true),
        whatsapp_update_notification: flag(true),
        whatsapp_deletion_notification: flag(true),
        whatsapp_daily_summary: flag(false),
        email_enabled: flag(true),
        email_task_start: flag(true),
        email_advance_reminder: flag(true),
        email_update_notification: flag(true),
        email_deletion_notification: flag(true),
        email_daily_summary: flag(true),
        incomplete_reminder: flag(false),
        reminder_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
        daily_summary_time: { type: Sequelize.TIME, allowNull: false, defaultValue: '07:00:00' },
        quiet_hours_enabled: flag(false),
        quiet_hours_start: { type: Sequelize.TIME, allowNull: true },
        quiet_hours_end: { type: Sequelize.TIME, allowNull: true },
        notification_sound: flag(true),
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    await queryInterface.addIndex('notification_settings', ['user_id'], { unique: true, name: 'uq_notification_settings_user' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_settings');
  },
};
