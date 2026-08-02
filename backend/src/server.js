require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       NyayaSahayak Backend API           ║
  ║       Bihar DM Court AI System           ║
  ╠══════════════════════════════════════════╣
  ║  Server:  http://localhost:${PORT}          ║
  ║  Mode:    ${process.env.NODE_ENV || 'development'}                 ║
  ╚══════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err.message);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
  process.exit(1);
});
