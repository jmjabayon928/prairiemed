// src/types/apollo-server-express4.d.ts
import type { ApolloServer, BaseContext } from '@apollo/server';
import type { RequestHandler, Request, Response } from 'express';

declare module '@apollo/server/express4' {
  export interface ExpressContextFunctionArgument {
    req: Request;
    res: Response;
  }

  type MaybePromise<T> = T | Promise<T>;

  export function expressMiddleware<TContext extends BaseContext = BaseContext>(
    server: ApolloServer<TContext>,
    options?: {
      context?: (ctx: ExpressContextFunctionArgument) => MaybePromise<TContext>;
    }
  ): RequestHandler;
}
