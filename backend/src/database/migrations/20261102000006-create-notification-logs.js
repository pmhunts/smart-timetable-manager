'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'notification_logs',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        task_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: { model: 'tasks', key: 'id' },
          // keep history when a task is deleted
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        task_title: { type: Sequelize.STRING(255), allowNull: true },
        notification_type: { type: Sequelize.ENUM('WHATSAPP', 'EMAIL'), allowNull: false },
        event_type: { type: Sequelize.STRING(100), allowNull: false },
        subject: { type: Sequelize.STRING(255), allowNull: true },
        message: { type: Sequelize.TEXT, allowNull: false },
        payload: { type: Sequelize.JSON, allowNull: true },
        recipient: { type: Sequelize.STRING(255), allowNull: true },
        idempotency_key: { type: Sequelize.STRING(191), allowNull: false },
        scheduled_at: { type: Sequelize.DATE, allowNull: false },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        delivery_status: {
          type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        provider_status: { type: Sequelize.STRING(50), allowNull: true },
        provider_message_id: { type: Sequelize.STRING(255), allowNull: true },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    await queryInterface.addIndex('notification_logs', ['idempotency_key'], { unique: true, name: 'uq_notification_logs_idempotency' });
    await queryInterface.addIndex('notification_logs', ['user_id', 'created_at'], { name: 'idx_notification_logs_user_created' });
    await queryInterface.addIndex('notification_logs', ['user_id', 'delivery_status'], { name: 'idx_notification_logs_user_status' });
    await queryInterface.addIndex('notification_logs', ['task_id'], { name: 'idx_notification_logs_task' });
    await queryInterface.addIndex('notification_logs', ['scheduled_at'], { name: 'idx_notification_logs_scheduled' });
    await queryInterface.addIndex('notification_logs', ['provider_message_id'], { name: 'idx_notification_logs_provider_msg' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_logs');
  },
};
