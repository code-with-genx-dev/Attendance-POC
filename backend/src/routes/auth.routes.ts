import { Router } from 'express';
import { login, changePassword, getMe } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Public route: Sign in
router.post('/auth/login', login);

// Authenticated route: Change temporary/existing password
router.post('/auth/change-password', requireAuth, changePassword);

// Authenticated route: Current profile & permissions
router.get('/me', requireAuth, getMe);

export default router;
