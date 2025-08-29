// src/backend/repositories/userRepo.ts
import { query } from '../db';

export type DbUser = {
  user_id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  organization_id: string;
  facility_id: string | null;
};

export type PublicProfile = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  organization_id: string;
  facility_id: string | null;
};

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const sql = `
    SELECT
      u.user_id,
      u.email,
      u.password_hash,
      u.is_active,
      u.organization_id,
      u.facility_id
    FROM users u
    WHERE LOWER(u.email) = LOWER($1)
    LIMIT 1
  `;
  const { rows } = await query<DbUser>(sql, [email]);
  return rows[0] ?? null;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const sql = `
    SELECT r.name
    FROM roles r
    INNER JOIN user_roles ur ON ur.role_id = r.role_id
    WHERE ur.user_id = $1
    ORDER BY r.name
  `;
  const { rows } = await query<{ name: string }>(sql, [userId]);
  return rows.map((r) => r.name);
}

export async function migrateUserPassword(userId: string, newHash: string): Promise<void> {
  const sql = `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE user_id = $1`;
  await query(sql, [userId, newHash]);
}

export async function getUserPublicProfile(userId: string): Promise<PublicProfile> {
  const sql = `
    SELECT
      u.user_id,
      u.email,
      up.first_name,
      up.last_name,
      up.title,
      u.organization_id,
      u.facility_id
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.user_id
    WHERE u.user_id = $1
    LIMIT 1
  `;
  const { rows } = await query<PublicProfile>(sql, [userId]);
  // If there is somehow no row, synthesize minimal shape to avoid undefined
  return rows[0] ?? {
    user_id: userId,
    email: '',
    first_name: null,
    last_name: null,
    title: null,
    organization_id: '',
    facility_id: null,
  };
}