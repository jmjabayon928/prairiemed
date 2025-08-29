// src/backend/config/env.ts
import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),

  DATABASE_URL: required('DATABASE_URL'),

  JWT_ISSUER: required('JWT_ISSUER'),
  JWT_AUDIENCE: required('JWT_AUDIENCE'),
  JWT_ACCESS_TTL: required('JWT_ACCESS_TTL'),
  JWT_REFRESH_TTL: required('JWT_REFRESH_TTL'),
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),

  AUTH_JWKS_URL: process.env.AUTH_JWKS_URL, // optional
  CORS_ORIGIN: (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  PASSWORD_MIGRATE_ON_LOGIN: process.env.PASSWORD_MIGRATE_ON_LOGIN === 'true'
};

// ✅ export a simple boolean
export const isProd = process.env.NODE_ENV === 'production';
