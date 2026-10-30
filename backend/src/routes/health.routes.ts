import { Router, Request, Response } from 'express';
import { config } from '../config';

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
      status: config.db.isConfigured ? 'configured' : 'mock_fallback',
      mode: config.db.isConfigured ? 'MySQL (Live Connection Target)' : 'Safe Local Mock (Awaiting User phpMyAdmin Credentials)',
      targetDatabase: config.db.database,
      targetHost: config.db.host,
      message: config.db.statusMessage
    }
  });
});

export default router;

