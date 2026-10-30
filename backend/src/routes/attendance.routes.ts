import { Router } from 'express';
import { scanAttendance, getMyAttendance } from '../controllers/attendance.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Employee QR scan endpoint
router.post('/attendance/scan', requireAuth, scanAttendance);

// Personal attendance history endpoint
router.get('/attendance/me', requireAuth, getMyAttendance);

export default router;
