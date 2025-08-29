// src/backend/middleware/errorHandler.ts
import { type NextFunction, type Request, type Response } from 'express';

type HttpErrorLike = {
  status?: number;
  statusCode?: number;
  message?: string;
  stack?: string;
};

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  const e = err as HttpErrorLike;

  const status =
    typeof e.status === 'number'
      ? e.status
      : typeof e.statusCode === 'number'
        ? e.statusCode
        : 500;

  const message =
    typeof e.message === 'string' && e.message.length > 0
      ? e.message
      : 'Server error';

  // keep stack traces in dev/test
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(status).json({ error: message });
}
