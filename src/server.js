const app = require('./app');
const env = require('./config/env');
const { sequelize } = require('./models');

async function start() {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('✅ Database terkoneksi:', env.db.name);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('⚠️  Gagal koneksi database (server tetap jalan, cek .env):', err.message);
  }

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 POS Backend berjalan di http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`📚 Swagger docs: http://localhost:${env.port}/api-docs`);
  });
}

start();
