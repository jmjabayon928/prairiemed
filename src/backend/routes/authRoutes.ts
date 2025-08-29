import { Router } from 'express';
import { loginHandler, refreshHandler, meHandler, logoutHandler } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);
router.get('/me', requireAuth, meHandler);
router.post('/logout', logoutHandler);

export default router;