// src/backend/graphqlServer.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { redis } from './lib/redis';
import { pool } from './database/pool';

const GQL_PORT = Number(process.env.GQL_PORT ?? 4001);
const isProd = process.env.NODE_ENV === 'production';

/* ------------------------------ CORS allowlist ------------------------------ */
// CORS_ORIGIN is a comma-separated string (e.g., "http://localhost:3000,http://localhost:4000")
const allowList = new Set(
  (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // same-origin / curl
    if (allowList.has(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

/* ------------------------------ Apollo server ------------------------------ */
const apollo = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    // Embedded Apollo Sandbox at GET /graphql in dev
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
});

/* ------------------------------- Error handler ----------------------------- */
// Keep 4-arg signature so Express treats this as an error handler.
// Use `void _next` to acknowledge the param and silence "unused" warnings.
function errorBoundary(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  void _next;
  console.error('[GraphQL] Unhandled error:', err);
  res.status(500).json({ error: 'Internal error' });
}

/* --------------------------------- Startup -------------------------------- */
async function start() {
  await apollo.start();

  const app = express();
  app.set('trust proxy', 1);

  if (isProd) {
    app.use(helmet());
  } else {
    app.use(helmet({ contentSecurityPolicy: false }));
  }

  app.use(morgan(isProd ? 'combined' : 'dev'));
  app.use(express.json());

  // GET /graphql → Sandbox; POST /graphql → operations
  app.use(
    '/graphql',
    cors(corsOptions),
    expressMiddleware(apollo, {
      context: async ({ req }) => ({ req, redis }),
    })
  );

  // Error handler (last)
  app.use(errorBoundary);

  // Check DB connectivity once on boot (nice log)
  try {
    await pool.query('SELECT 1');
    const url = new URL(process.env.DATABASE_URL!);
    console.log(
      `[DB] Connected to ${url.hostname}:${url.port || '5432'}${url.pathname} — ${new Date().toString()}`
    );
  } catch (e) {
    console.warn('[DB] Connection check failed:', (e as Error)?.message ?? e);
  }

  app.listen(GQL_PORT, () => {
    console.log(
      `[GraphQL Standalone] listening on http://localhost:${GQL_PORT}/graphql`
    );
  });
}

start().catch((e) => {
  console.error('[GraphQL] Failed to start:', e);
  process.exit(1);
});
