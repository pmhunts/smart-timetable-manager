'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'password_resets',
      {
        id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        token_hash: { type: Sequelize.STRING(255), allowNull: false },
        expires_at: { type: Sequelize.DATE, allowNull: false },
        used_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      },
      { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' }
    );
    await queryInterface.addIndex('password_resets', ['token_hash'], { unique: true, name: 'uq_password_resets_token' });
    await queryInterface.addIndex('password_resets', ['user_id'], { name: 'idx_password_resets_user' });
    await queryInterface.addIndex('password_resets', ['expires_at'], { name: 'idx_password_resets_expires' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('password_resets');
  },
};
