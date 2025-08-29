import { hash, verify } from '@node-rs/argon2';

const ARGON2_OPTIONS = {
  memoryCost: 2 ** 16, // 64MB
  timeCost: 3,
  parallelism: 1,
};

export async function hashPassword(plain: string) {
  return hash(plain, ARGON2_OPTIONS);
}

/**
 * Returns { ok: boolean, migratedHash?: string }
 * - If stored starts with $argon2, we verify and return ok.
 * - If stored does NOT start with $argon2, we compare as plaintext. If match, we return ok and a new argon2 hash to migrate.
 */
export async function verifyOrMigrate(stored: string | null, plain: string) {
  if (!stored) return { ok: false as const };
  if (stored.startsWith('$argon2')) {
    const ok = await verify(stored, plain, ARGON2_OPTIONS);
    return { ok } as const;
  }
  // Treat as plaintext seed
  const ok = stored === plain;
  if (!ok) return { ok: false as const };
  const migratedHash = await hashPassword(plain);
  return { ok: true as const, migratedHash };
}