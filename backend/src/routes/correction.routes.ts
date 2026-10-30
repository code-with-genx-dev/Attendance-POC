import { Router } from 'express';
import {
  submitCorrection,
  getMyCorrections,
  getAdminCorrections,
  reviewCorrection,
  getExceptions
} from '../controllers/correction.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Employee routes
router.post('/corrections', requireAuth, submitCorrection);
router.get('/corrections/me', requireAuth, getMyCorrections);

// Admin review & exceptions routes
router.get('/admin/corrections', requireAuth, requireAdmin, getAdminCorrections);
router.patch('/admin/corrections/:id', requireAuth, requireAdmin, reviewCorrection);
router.get('/admin/attendance/exceptions', requireAuth, requireAdmin, getExceptions);

export default router;
