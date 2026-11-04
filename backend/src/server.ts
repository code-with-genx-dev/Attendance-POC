import app from './app';
import { config } from './config';
import { verifyConnection } from './db';

const PORT = config.port;

// Verify database connection before starting server
async function startServer() {
  console.log('🔄 Initializing Attendance Automation API...');
  console.log('');
  
  // Verify MySQL connection
  await verifyConnection();
  console.log('');
  
  // Start HTTP server
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║ 🚀 ATTENDANCE AUTOMATION API - SERVER STARTED                 ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Port:         ${String(PORT).padEnd(47)}║`);
    console.log(`║ Environment:  ${config.env.padEnd(47)}║`);
    console.log(`║ Timezone:     ${config.attendance.timezone.padEnd(47)}║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Local:        http://localhost:${PORT}/api${' '.repeat(23)}║`);
    console.log(`║ Health Check: http://localhost:${PORT}/api/health${' '.repeat(15)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ API is ready to accept requests');
    console.log('');
  });

  // Graceful shutdown handlers
  const shutdown = (signal: string) => {
    console.log('');
    console.log(`⚠️  ${signal} signal received: closing HTTP server...`);
    server.close(() => {
      console.log('✅ HTTP server closed gracefully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start the server
startServer().catch((err) => {
  console.error('');
  console.error('╔═══════════════════════════════════════════════════════════════╗');
  console.error('║ ❌ FATAL ERROR: SERVER STARTUP FAILED                         ║');
  console.error('╠═══════════════════════════════════════════════════════════════╣');
  console.error(`║ ${err.message.substring(0, 61).padEnd(61)}║`);
  console.error('╚═══════════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
});

