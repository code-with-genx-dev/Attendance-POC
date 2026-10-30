import { Router, Request, Response } from 'express';
import { config } from '../config';
import { getDatabaseStatus } from '../db';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  const now = new Date();
  
  let formattedTime = '';
  try {
    formattedTime = new Intl.DateTimeFormat('en-US', {
      timeZone: config.attendance.timezone,
      dateStyle: 'full',
      timeStyle: 'long'
    }).format(now);
  } catch {
    formattedTime = now.toLocaleString();
  }

  const dbStatus = getDatabaseStatus();

  res.json({
    status: 'ok',
    service: 'Employee Attendance Automation API',
    version: '1.0.0',
    environment: config.env,
    uptimeSeconds: Math.floor(process.uptime()),
    serverTimestamp: now.toISOString(),
    officeTimezone: config.attendance.timezone,
    currentOfficeTime: formattedTime,
    database: {
      status: dbStatus.isConnected ? 'connected' : (dbStatus.isConfigured ? 'connection_pending_or_error' : 'mock_fallback'),
      mode: dbStatus.mode,
      targetDatabase: dbStatus.targetDatabase,
      targetHost: dbStatus.targetHost,
      targetUser: dbStatus.targetUser,
      lastError: dbStatus.lastError,
      message: dbStatus.statusMessage
    }
  });
});

export default router;
