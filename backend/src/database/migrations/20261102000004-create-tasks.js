'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'tasks',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        timetable_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'timetables', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        title: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        schedule_date: { type: Sequelize.DATEONLY, allowNull: false },
        start_time: { type: Sequelize.TIME, allowNull: false },
        end_time: { type: Sequelize.TIME, allowNull: false },
        start_at_utc: { type: Sequelize.DATE, allowNull: false },
        end_at_utc: { type: Sequelize.DATE, allowNull: false },
        category: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'Personal' },
        priority: { type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH'), allowNull: false, defaultValue: 'MEDIUM' },
        status: {
          type: Sequelize.ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'SKIPPED', 'MISSED'),
          allowNull: false,
          defaultValue: 'UPCOMING',
        },
        repeat_type: { type: Sequelize.ENUM('NONE', 'DAILY', 'WEEKLY', 'CUSTOM'), allowNull: false, defaultValue: 'NONE' },
        repeat_days: { type: Sequelize.JSON, allowNull: true },
        repeat_until: { type: Sequelize.DATEONLY, allowNull: true },
        repeat_exceptions: { type: Sequelize.JSON, allowNull: true },
        source_task_id: {
          type: Sequelize.BIGINT,
          allowNull: true,
          references: { model: 'tasks', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        },
        allow_overlap: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        reminder_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        whatsapp_reminder: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        email_reminder: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        schedule_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    await queryInterface.addIndex('tasks', ['timetable_id'], { name: 'idx_tasks_timetable' });
    await queryInterface.addIndex('tasks', ['user_id', 'schedule_date'], { name: 'idx_tasks_user_date' });
    await queryInterface.addIndex('tasks', ['status', 'start_at_utc'], { name: 'idx_tasks_status_start' });
    await queryInterface.addIndex('tasks', ['status', 'end_at_utc'], { name: 'idx_tasks_status_end' });
    // A recurring task produces at most one occurrence per date.
    await queryInterface.addIndex('tasks', ['source_task_id', 'schedule_date'], { unique: true, name: 'uq_tasks_source_date' });
    // Defence in depth: the API validates this too.
    await queryInterface.sequelize.query('ALTER TABLE tasks ADD CONSTRAINT chk_tasks_time CHECK (end_time > start_time)');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tasks');
  },
};
