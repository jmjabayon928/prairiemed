// src/backend/controllers/authController.ts
import {type Response } from 'express';
import { z } from 'zod';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefresh,
} from '../services/tokenService';
import {
  findUserByEmail,
  getUserRoles,
  migrateUserPassword,
  getUserPublicProfile,
} from '../repositories/userRepo';
import {
  createSession,
  getSessionByJti,
  revokeSessionByJti,
} from '../repositories/sessionRepo';
import { env, isProd } from '../config/env';
import { verifyOrMigrate } from '../utils/password';
import type { AuthedRequest } from '../types'; 
import { LOCALE_COOKIE } from '@/lib/auth/constants'; 

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };
}

/**
 * POST /auth/login
 */
export async function loginHandler(req: AuthedRequest, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user?.is_active) return res.status(401).json({ error: 'Invalid credentials' });

  const { ok, migratedHash } = await verifyOrMigrate(user.password_hash, password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  if (migratedHash && env.PASSWORD_MIGRATE_ON_LOGIN) {
    await migrateUserPassword(user.user_id, migratedHash);
  }

  const roles = await getUserRoles(user.user_id);

  const { token: accessToken } = await signAccessToken({
    user_id: user.user_id,
    email: user.email,
    roles,
  });

  const { token: refreshToken, jti } = await signRefreshToken(user.user_id);

  // Decode refresh exp from JWT by verifying, then use .exp
  const refreshPayload = await verifyRefresh(refreshToken); // has `exp?: number`
  const exp =
    refreshPayload.exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // fallback 30d
  const expiresAtIso = new Date(exp * 1000).toISOString();

  const ip = (typeof req.ip === 'string' && req.ip.length > 0) ? req.ip : null;
  const userAgent = req.get('user-agent') ?? null;

  await createSession(
    user.user_id,
    jti,
    expiresAtIso,
    {
      ...(ip !== null ? { ip } : {}),
      ...(userAgent !== null ? { userAgent } : {}),
    }
  );

  // Set refresh cookie (httpOnly)
  res.cookie('refresh_token', refreshToken, {
    ...getCookieOptions(),
    expires: new Date(exp * 1000)
  });

  // Fetch profile for response AND locale
  const profile = await getUserPublicProfile(user.user_id);

  // Set readable locale cookie so Next.js can pick it up (use shared constant)
  const lang = (profile as { locale?: string }).locale ?? 'en';
  res.cookie(LOCALE_COOKIE, lang, {
    httpOnly: false, // readable by client & Next middleware
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  res.cookie('access_token', accessToken, {
    ...getCookieOptions(),
    maxAge: 15 * 60 * 1000
  });

  return res.json({ accessToken, user: { ...profile, roles } });
}

/**
 * POST /auth/refresh
 */
export async function refreshHandler(req: AuthedRequest, res: Response) {
  try {
    const token =
      (req.cookies?.refresh_token as string) || (req.body?.refreshToken as string);
    if (!token) return res.status(401).json({ error: 'Missing refresh token' });

    const { jti, sub } = await verifyRefresh(token);
    if (!jti || !sub)
      return res.status(401).json({ error: 'Invalid refresh token' });

    const session = await getSessionByJti(jti);
    if (!session || session.revoked)
      return res.status(401).json({ error: 'Refresh session revoked' });

    // Rotate refresh: revoke old, issue new
    await revokeSessionByJti(jti);

    const roles = await getUserRoles(sub);
    const { token: accessToken } = await signAccessToken({
      user_id: sub,
      email: '',
      roles,
    });
    const { token: newRefresh, jti: newJti } = await signRefreshToken(sub);

    const refreshPayload2 = await verifyRefresh(newRefresh);
    const exp = refreshPayload2.exp as number;
    const expiresAtIso = new Date(exp * 1000).toISOString();

    await createSession(
      sub,
      newJti,
      expiresAtIso,
      {
        ...(typeof req.ip === 'string' && req.ip.length > 0 ? { ip: req.ip } : {}),
        ...(req.get('user-agent') ? { userAgent: req.get('user-agent')! } : {}),
      }
    );

    res.cookie('refresh_token', newRefresh, {
      ...getCookieOptions(),
      expires: new Date(exp * 1000),
    });

    res.cookie('access_token', accessToken, {
      ...getCookieOptions(),
      maxAge: 15 * 60 * 1000
    });

    return res.json({ accessToken });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
}

/**
 * GET /auth/me
 */
export async function meHandler(req: AuthedRequest, res: Response) {
  const { userId, roles } = req.auth!;
  const profile = await getUserPublicProfile(userId);
  return res.json({ user: { ...profile, roles } });
}

/**
 * POST /auth/logout
 */
export async function logoutHandler(_req: AuthedRequest, res: Response) {
  try {
    const token =
      (res.req?.cookies?.refresh_token as string) ||
      (res.req?.body?.refreshToken as string);
    if (token) {
      const { jti } = await verifyRefresh(token);
      if (jti) await revokeSessionByJti(jti);
    }
  } catch {
    // best-effort logout
  }
  res.clearCookie('refresh_token', { path: '/' });
  res.clearCookie('access_token', { path: '/' });
  return res.json({ ok: true });
}
