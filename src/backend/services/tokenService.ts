// src/backend/services/tokenService.ts
import {
  SignJWT,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyOptions,
  createRemoteJWKSet,
  decodeProtectedHeader
} from 'jose';
import { randomUUID } from 'node:crypto';   // ✅ built-in, no extra deps
import { env } from '../config/env';

// ---- HS256 secrets ----
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// ---- Optional JWKS (RS256 verify if you ever receive RS256 tokens) ----
const jwks = env.AUTH_JWKS_URL ? createRemoteJWKSet(new URL(env.AUTH_JWKS_URL)) : null;

export type AccessClaims = {
  typ: 'access';
  email?: string;
  roles?: string[];
} & Pick<JWTPayload, 'sub' | 'iss' | 'aud' | 'iat' | 'exp' | 'jti'>;

export type RefreshClaims = {
  typ: 'refresh';
} & Pick<JWTPayload, 'sub' | 'iss' | 'aud' | 'iat' | 'exp' | 'jti'>;

function baseVerifyOptions(): Omit<JWTVerifyOptions, 'algorithms'> {
  return {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    clockTolerance: 60
  };
}

async function verifyWithAutoAlg<T extends JWTPayload>(
  token: string,
  preferAlgs: string[]
): Promise<T> {
  const header = decodeProtectedHeader(token);
  const alg = header.alg;

  const options: JWTVerifyOptions = {
    ...baseVerifyOptions(),
    algorithms: preferAlgs.slice() // mutable array for TS
  };

  if (alg === 'RS256') {
    if (!jwks) {
      throw new Error('RS256 token received but AUTH_JWKS_URL is not configured');
    }
    const { payload } = await jwtVerify(token, jwks, options);
    return payload as T;
  }

  const { payload } = await jwtVerify(token, accessSecret, { ...options, algorithms: ['HS256'] });
  return payload as T;
}

export async function signAccessToken(input: {
  user_id: string;
  email: string;
  roles: string[];
}) {
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({
    typ: 'access',
    email: input.email,
    roles: input.roles
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setSubject(String(input.user_id))
    .setIssuedAt(now)
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);

  return { token: jwt };
}

export async function signRefreshToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const jti = randomUUID();  // ✅ replaces uuid.v4()

  const jwt = await new SignJWT({
    typ: 'refresh',
    jti
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setSubject(String(userId))
    .setIssuedAt(now)
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refreshSecret);

  return { token: jwt, jti };
}

export async function verifyAccess(token: string): Promise<AccessClaims> {
  const payload = await verifyWithAutoAlg<AccessClaims>(token, jwks ? ['RS256', 'HS256'] : ['HS256']);
  return payload;
}

export async function verifyRefresh(token: string): Promise<RefreshClaims> {
  const options: JWTVerifyOptions = {
    ...baseVerifyOptions(),
    algorithms: ['HS256']
  };
  const { payload } = await jwtVerify(token, refreshSecret, options);
  return payload as RefreshClaims;
}
