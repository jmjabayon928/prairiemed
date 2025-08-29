import { query } from '../db';

export type DbSession = {
  session_id: string;
  user_id: string;
  refresh_jti: string;
  refresh_expires_at: string; // ISO from Postgres
  revoked: boolean;
};

export async function createSession(userId: string, refreshJti: string, expiresAtIso: string, meta?: { ip?: string | null; userAgent?: string | null }) {
  const sql = `
    INSERT INTO auth_sessions (session_id, user_id, refresh_jti, refresh_expires_at, ip, user_agent)
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
    RETURNING session_id;
  `;
  const { rows } = await query(sql, [userId, refreshJti, expiresAtIso, meta?.ip ?? null, meta?.userAgent ?? null]);
  return rows[0]?.session_id as string;
}

export async function getSessionByJti(jti: string) {
  const sql = `SELECT * FROM auth_sessions WHERE refresh_jti = $1 LIMIT 1;`;
  const { rows } = await query<DbSession>(sql, [jti]);
  return rows[0] ?? null;
}

export async function revokeSessionByJti(jti: string) {
  const sql = `UPDATE auth_sessions SET revoked = TRUE WHERE refresh_jti = $1;`;
  await query(sql, [jti]);
}