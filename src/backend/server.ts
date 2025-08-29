import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env';

import authRoutes from './routes/authRoutes';
import patientsRoutes from './routes/patientsRoutes';
import { errorHandler } from './middleware/errorHandler';

// Kafka (producer init; non-blocking)
import { initKafka } from './events/kafka';

const app = express();

/* --------------------------- Base middlewares ---------------------------- */
app.set('trust proxy', 1);

// In dev, relax CSP for tooling; production uses Helmet defaults.
// With exactOptionalPropertyTypes, don't pass undefined props—branch instead.
if (isProd) {
  app.use(helmet());
} else {
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
}

app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS allowlist (comma-separated origins in .env CORS_ORIGIN)
const allowList: string[] = String(env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowList.length === 0) return cb(null, true); // allow same-origin/tools in dev
    if (allowList.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

/* ------------------------------ Health ----------------------------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ----------------------------- i18n: set-locale --------------------------- */
const LOCALE_COOKIE = 'pm_locale';
const SUPPORTED_LOCALES = ['en', 'fr'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

app.post('/i18n/set-locale', (req, res) => {
  const nextRaw = String(req.body.locale ?? 'en');
  const returnTo = String(req.body.returnTo ?? '/');
  const locale: SupportedLocale = isSupportedLocale(nextRaw) ? nextRaw : 'en';

  res.cookie(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: isProd,
    httpOnly: false,
  });

  res.redirect(returnTo);
});

/* ------------------------------ REST routes ------------------------------- */
app.use('/auth', authRoutes);
app.use('/patients', patientsRoutes);

/* ----------------------- Dev route: list all routes ----------------------- */
// Keep types narrow and avoid unnecessary assertions.
type MethodsMap = Record<string, boolean>;
interface RouteRecord {
  path: string;
  methods: string[];
}
type StackHandle = { stack?: unknown[] };
interface RouteLike {
  path?: unknown;
  methods?: unknown;
}
interface RouterStackLayer {
  route?: RouteLike;
  name?: unknown;
  handle?: StackHandle;
}

function isRouterStackLayer(x: unknown): x is RouterStackLayer {
  return typeof x === 'object' && x !== null;
}

function getAppStack(appInst: express.Express): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeStack = (appInst as any)?._router?.stack as unknown;
  return Array.isArray(maybeStack) ? maybeStack : [];
}

function asPath(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asMethods(value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return [];
  return Object.keys(value as MethodsMap);
}

function collectLayer(layer: unknown, out: RouteRecord[]): void {
  if (!isRouterStackLayer(layer)) return;

  const route = layer.route;
  const maybePath = route ? asPath(route.path) : null;

  if (maybePath) {
    out.push({
      path: maybePath,
      methods: route ? asMethods(route.methods) : [],
    });
  }

  const handle = layer.handle;
  if (layer.name === 'router' && handle && Array.isArray(handle.stack)) {
    for (const child of handle.stack) {
      collectLayer(child, out);
    }
  }
}

function extractRoutes(appInst: express.Express): RouteRecord[] {
  const out: RouteRecord[] = [];
  const stack = getAppStack(appInst);
  for (const layer of stack) collectLayer(layer, out);
  return out;
}

app.get('/__routes', (_req, res) => {
  res.json(extractRoutes(app));
});

/* -------------------------- 404 & error handlers -------------------------- */
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

/* --------------------------- Background inits ----------------------------- */
(async () => {
  try {
    await initKafka();
    console.log('[Kafka] Producer connected');
  } catch (e) {
    console.warn(
      '[Kafka] Producer failed to connect (continuing):',
      (e as Error)?.message ?? e
    );
  }

  app.listen(env.PORT, () => {
    console.log(`[PrairieMed API] listening on http://localhost:${env.PORT}`);
  });
})();

export default app;
