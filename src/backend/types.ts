import type { Request } from 'express';

export type AuthedRequest = Request & {
  auth?: {
    userId: string;
    roles: string[];
  };
};