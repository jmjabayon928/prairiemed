// src/backend/middleware/authMiddleware.ts
import { type Request, type Response, type NextFunction } from 'express';
import { verifyAccess } from '../services/tokenService';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    const token = auth.slice('Bearer '.length);
    const payload = await verifyAccess(token);
    req.auth = { userId: String(payload.sub), roles: payload.roles ?? [] };
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};