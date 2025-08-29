// src/lib/auth/server.ts
import { cookies } from 'next/headers';
import {
  jwtVerify,
  createRemoteJWKSet,
  type JWTPayload,
  type JWTVerifyGetKey,
  type KeyLike,
  type JWTVerifyOptions,
} from 'jose';
import {
  AUTH_COOKIE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from './constants';

// =====================
// Types
// =====================
export interface VerifiedUser {
  id: string;
  email?: string; // optional; omit when unknown
  roles: string[];
  claims: JWTPayload;
}

// =====================
// Config helpers (cached)
// =====================
const HS_ALG = 'HS256' as const;
const RS_ALG = 'RS256' as const;

let cachedHsKey: Uint8Array | null = null;
let cachedRemoteJwks: JWTVerifyGetKey | null = null;

function getExpectedAlg(): typeof HS_ALG | typeof RS_ALG {
  const a = (process.env.AUTH_JWT_ALG || HS_ALG).toUpperCase();
  return a === RS_ALG ? RS_ALG : HS_ALG;
}

/** HS256 key from env; falls back to JWT_ACCESS_SECRET for convenience */
function getHsKey(): Uint8Array {
  const secret =
    process.env.AUTH_JWT_SECRET ||
    process.env.JWT_ACCESS_SECRET; // reuse your API secret
  if (!secret) {
    throw new Error(
      'HS256 verification requires AUTH_JWT_SECRET or JWT_ACCESS_SECRET.',
    );
  }
  if (!cachedHsKey) {
    cachedHsKey = new TextEncoder().encode(secret);
  }
  return cachedHsKey;
}

/** RS256 via remote JWKS */
function getRemoteJwks(): JWTVerifyGetKey {
  const jwksUrl = process.env.AUTH_JWKS_URL;
  if (!jwksUrl) {
    throw new Error(
      'RS256 verification requires AUTH_JWKS_URL (and set AUTH_JWT_ALG=RS256).',
    );
  }
  if (!cachedRemoteJwks) {
    cachedRemoteJwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return cachedRemoteJwks;
}

/** Build JWT verify options without including undefined optionals */
function getVerifyOptions(): JWTVerifyOptions {
  const issuerEnv = process.env.AUTH_ISSUER || process.env.JWT_ISSUER || '';
  const audienceEnv = process.env.AUTH_AUDIENCE || process.env.JWT_AUDIENCE || '';

  const algorithms: string[] = [getExpectedAlg()];

  const opts: JWTVerifyOptions = {
    algorithms,
    clockTolerance: 30, // seconds
  };

  if (issuerEnv) {
    opts.issuer = issuerEnv; // string | string[]
  }
  if (audienceEnv) {
    opts.audience = audienceEnv; // string | string[]
  }

  return opts;
}

// =====================
// Token verification (HS256 or RS256)
// =====================
export async function verifyToken(token: string): Promise<VerifiedUser | null> {
  try {
    const alg = getExpectedAlg();
    const key: KeyLike | Uint8Array | JWTVerifyGetKey =
      alg === RS_ALG ? getRemoteJwks() : getHsKey();

    const options = getVerifyOptions();

    // Narrow the overload explicitly
    const { payload } =
      typeof key === 'function'
        ? // RS256/JWKS path
          await jwtVerify(token, key, options)
        : // HS256 (or other concrete key) path
          await jwtVerify(token, key, options);

    const id = typeof payload.sub === 'string' ? payload.sub : '';
    if (!id) return null;

    const maybeEmail =
      typeof payload.email === 'string' ? (payload.email as string) : undefined;

    // Normalize roles: support `roles: string[]` or `role: string`
    let roles: string[] = [];
    const anyPayload = payload as Record<string, unknown>;
    if (Array.isArray(anyPayload.roles)) {
      roles = (anyPayload.roles as unknown[]).map((r) => String(r));
    } else if (typeof anyPayload.role === 'string') {
      roles = [String(anyPayload.role)];
    }

    const base: Omit<VerifiedUser, 'email'> = { id, roles, claims: payload };
    return maybeEmail ? { ...base, email: maybeEmail } : base;
  } catch {
    return null; // invalid/expired/wrong audience/issuer/signature, etc.
  }
}

// =====================
// Public helpers
// =====================
export async function getUser(): Promise<VerifiedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;

  const hasValid =
    value !== undefined &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value);

  if (hasValid) {
    return value as SupportedLocale;
  }
  return SUPPORTED_LOCALES[0];
}
