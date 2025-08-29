// src/backend/database/pool.ts
import 'dotenv/config'; // ensure .env is loaded no matter who imports us
import { Pool } from 'pg';

function parseDatabaseUrl(raw?: string) {
  if (!raw) {
    throw new Error('DATABASE_URL is not set');
  }
  const u = new URL(raw);

  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 5432,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password), // <-- force string
    database: u.pathname.replace(/^\//, ''),
  };
}

const cfg = parseDatabaseUrl(process.env.DATABASE_URL);

export const pool = new Pool({
  host: cfg.host,
  port: cfg.port,
  user: cfg.user,
  password: cfg.password,
  database: cfg.database,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Optional: one-time connection sanity log (no secrets)
void (async () => {
  try {
    const { rows } = await pool.query<{ now: string }>('SELECT NOW() AS now');
    const stamp = rows[0]?.now ?? new Date().toISOString();
    console.log(`[DB] Connected to ${cfg.host}:${cfg.port}/${cfg.database} — ${stamp}`);
  } catch (e) {
    console.error('[DB] Connection test failed:', (e as Error).message);
  }
})();
