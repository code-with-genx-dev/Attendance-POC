import { Router } from 'express';
import { listEmployees, createEmployee, getAdminAttendance, exportAttendanceCsv } from '../controllers/admin.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Employee management
router.get('/admin/employees', requireAuth, requireAdmin, listEmployees);
router.post('/admin/employees', requireAuth, requireAdmin, createEmployee);

// Attendance report management
router.get('/admin/attendance', requireAuth, requireAdmin, getAdminAttendance);
router.get('/admin/reports/export', requireAuth, requireAdmin, exportAttendanceCsv);

export default router;

