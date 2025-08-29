import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Zod-powered validator middleware.
 * - Validates req[from] with the given schema
 * - Replaces req[from] with the parsed (typed) value
 * - Avoids `any` by using generics + `unknown`
 */
export function validate<T>(
  schema: ZodSchema<T>,
  from: 'body' | 'query' | 'params' = 'body'
): RequestHandler {
  return (req, res, next) => {
    const data = req[from] as unknown;

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    // Mutate the request in a type-safe way without using `any`
    (req as Record<typeof from, unknown>)[from] = parsed.data as unknown;

    next();
  };
}
