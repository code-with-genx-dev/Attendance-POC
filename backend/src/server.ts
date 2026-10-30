import app from './app';
import { config } from './config';

const PORT = config.port;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 Attendance Automation API running on port ${PORT} (0.0.0.0)`);
  console.log(`🌍 Environment: ${config.env}`);
  console.log(`🕒 Office Timezone: ${config.attendance.timezone}`);
  console.log(`📊 Local Health: http://localhost:${PORT}/api/health`);
  console.log(`📱 LAN Mobile URL: http://192.168.1.49:${PORT}/api`);
  console.log(`💾 Database Status: ${config.db.statusMessage}`);
  console.log('====================================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

