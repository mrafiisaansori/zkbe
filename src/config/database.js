const { Sequelize } = require('sequelize');
const env = require('./env');

// Koneksi ke database MySQL yang sama dengan POS CodeIgniter existing.
// Charset latin1 mengikuti dump asli (lavenia1_pos.sql).
const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: false,
  define: {
    timestamps: false,
    freezeTableName: true,
  },
  dialectOptions: {
    charset: 'latin1',
  },
});

module.exports = sequelize;
