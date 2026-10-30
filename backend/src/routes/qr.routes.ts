import { Router } from 'express';
import { getCurrentQr, rotateQr } from '../controllers/qr.controller';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Office display screen / monitor endpoint
router.get('/qr/current', getCurrentQr);

// Admin manual rotation override
router.post('/admin/qr/rotate', requireAuth, requireAdmin, rotateQr);

export default router;

