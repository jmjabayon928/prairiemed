// src/backend/services/authService.ts
import { pool } from '../database/pool';
import { randomUUID } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { hash as aHash, verify as aVerify } from '@node-rs/argon2';

/* ------------------------------ Env helpers ------------------------------ */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const iss = requireEnv('JWT_ISSUER');
const aud = requireEnv('JWT_AUDIENCE');
const accessTTL = process.env.JWT_ACCESS_TTL || '900s';
const refreshTTL = process.env.JWT_REFRESH_TTL || '30d';
const ACCESS_SECRET = requireEnv('JWT_ACCESS_SECRET');
const REFRESH_SECRET = requireEnv('JWT_REFRESH_SECRET');

const accessKey = new TextEncoder().encode(ACCESS_SECRET);
const refreshKey = new TextEncoder().encode(REFRESH_SECRET);

/* --------------------------------- Types --------------------------------- */
// Shape of a user row as returned by your queries
export interface DBUserRow {
  user_id: string;
  organization_id: string | null;
  facility_id: string | null;
  email: string;
  password_hash: string;
  is_active: boolean;
}

// Public user claims we embed in the access token
export type JwtUser = {
  sub: string;
  email: string;
  org: string | null;
  fac: string | null;
  roles: string[];
  perms: string[];
};

/* --------------------------------- Queries -------------------------------- */
export async function findUserByEmail(email: string): Promise<DBUserRow | null> {
  const { rows } = await pool.query<DBUserRow>(
    `SELECT user_id, organization_id, facility_id, email, password_hash, is_active
     FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return rows[0] || null;
}

export async function findUserById(userId: string): Promise<DBUserRow | null> {
  const { rows } = await pool.query<DBUserRow>(
    `SELECT user_id, organization_id, facility_id, email, password_hash, is_active
     FROM users WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function getRolesAndPerms(userId: string): Promise<{ roles: string[]; perms: string[] }> {
  const rolesQ = `
    SELECT r.name
    FROM user_roles ur
    JOIN roles r ON r.role_id = ur.role_id
    WHERE ur.user_id = $1
  `;
  const permsQ = `
    SELECT DISTINCT p.slug
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.permission_id = rp.permission_id
    WHERE ur.user_id = $1
  `;
  const [rolesRes, permsRes] = await Promise.all([
    pool.query<{ name: string }>(rolesQ, [userId]),
    pool.query<{ slug: string }>(permsQ, [userId]),
  ]);
  return {
    roles: rolesRes.rows.map((r) => r.name),
    perms: permsRes.rows.map((p) => p.slug),
  };
}

/** Upgrade plaintext seed passwords to Argon2 on first login */
export async function verifyOrUpgradePassword(
  userId: string,
  stored: string,
  provided: string
): Promise<boolean> {
  const isArgon = stored?.startsWith('$argon2');
  if (isArgon) {
    return aVerify(stored, provided);
  }
  if (stored === provided) {
    const newHash = await aHash(provided);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE user_id = $2`, [newHash, userId]);
    return true;
  }
  return false;
}

/* ------------------------------ Token issuing ----------------------------- */
type AccessClaims = JwtUser;

export async function issueTokens(
  user: Pick<DBUserRow, 'user_id' | 'email' | 'organization_id' | 'facility_id'>,
  roles: string[],
  perms: string[]
): Promise<{ access: string; refresh: string; refreshJti: string }> {
  const refreshJti = randomUUID();

  const payload: AccessClaims = {
    sub: user.user_id,
    email: user.email,
    org: user.organization_id,
    fac: user.facility_id,
    roles,
    perms,
  };

  const access = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject(user.user_id)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(accessTTL)
    .sign(accessKey);

  const refresh = await new SignJWT({ sub: user.user_id, jti: refreshJti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject(user.user_id)
    .setJti(refreshJti)
    .setIssuedAt()
    .setExpirationTime(refreshTTL)
    .sign(refreshKey);

  return { access, refresh, refreshJti };
}

export async function persistRefreshSession(params: {
  userId: string;
  refreshJti: string;
  refreshToken: string;
  userAgent?: string;
  ip?: string | null;
}): Promise<void> {
  const refreshHash = await aHash(params.refreshToken);
  await pool.query(
    `INSERT INTO sessions (session_id, user_id, jwt_id, issued_at, expires_at, refresh_token_hash, user_agent, ip_address)
     VALUES (gen_random_uuid(), $1, $2, now(), now() + $3::interval, $4, $5, $6::inet)`,
    [params.userId, params.refreshJti, refreshTTL, refreshHash, params.userAgent || null, params.ip || null]
  );
}

export async function verifyRefreshTokenAndSession(
  token: string
): Promise<{ userId: string }> {
  await jwtVerify(token, refreshKey, { issuer: iss, audience: aud });

  const { rows } = await pool.query<{ user_id: string; refresh_token_hash: string }>(
    `SELECT user_id, refresh_token_hash
     FROM sessions
     WHERE expires_at > now()`
  );

  for (const row of rows) {
    if (await aVerify(row.refresh_token_hash, token)) {
      return { userId: row.user_id };
    }
  }
  throw new Error('Invalid/expired refresh token');
}
