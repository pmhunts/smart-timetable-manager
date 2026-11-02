'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'users',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(150), allowNull: false },
        email: { type: Sequelize.STRING(255), allowNull: false },
        country_code: { type: Sequelize.STRING(6), allowNull: false, defaultValue: '+1' },
        phone_number: { type: Sequelize.STRING(20), allowNull: false },
        password: { type: Sequelize.STRING(255), allowNull: false },
        timezone: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'UTC' },
        profile_image: { type: Sequelize.STRING(500), allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        token_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        last_login_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    await queryInterface.addIndex('users', ['email'], { unique: true, name: 'uq_users_email' });
    await queryInterface.addIndex('users', ['timezone'], { name: 'idx_users_timezone' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
