// src/types/express/index.d.ts
import 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        roles: string[];
      };
    }
  }
}

export {};
