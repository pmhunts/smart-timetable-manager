'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'notification_jobs',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        notification_log_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'notification_logs', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        job_type: { type: Sequelize.STRING(100), allowNull: false },
        scheduled_at: { type: Sequelize.DATE, allowNull: false },
        run_at: { type: Sequelize.DATE, allowNull: false },
        status: {
          type: Sequelize.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        last_error: { type: Sequelize.TEXT, allowNull: true },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        queue_job_id: { type: Sequelize.STRING(191), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    // One job per log -> no duplicate jobs for the same notification.
    await queryInterface.addIndex('notification_jobs', ['notification_log_id'], { unique: true, name: 'uq_notification_jobs_log' });
    await queryInterface.addIndex('notification_jobs', ['status', 'run_at'], { name: 'idx_notification_jobs_status_run' });
    await queryInterface.addIndex('notification_jobs', ['scheduled_at'], { name: 'idx_notification_jobs_scheduled' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_jobs');
  },
};
