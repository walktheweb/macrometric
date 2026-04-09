import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { initDatabase } from './db.js';
import { registerAuthHook } from './auth.js';
import { registerAuthRoutes } from './routes-auth.js';
import { registerFoodRoutes } from './routes-foods.js';
import { registerGoalRoutes } from './routes-goals.js';
import { registerCheckinRoutes } from './routes-checkins.js';
import { registerFastingRoutes } from './routes-fasting.js';
import { registerTripRoutes } from './routes-trips.js';
import { registerNoteRoutes } from './routes-notes.js';
import { registerImportExportRoutes } from './routes-import-export.js';

const app = Fastify({ logger: true });

const env = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  autoDailyExportEnabled: process.env.AUTO_DAILY_EXPORT_ENABLED === 'true',
  autoDailyExportDir: process.env.AUTO_DAILY_EXPORT_DIR ?? '',
};

await app.register(cookie);
await app.register(cors, {
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    cb(null, /^http:\/\/(localhost|127\.0\.0\.1):5173$/i.test(origin));
  },
});
await app.register(swagger, {
  openapi: {
    info: {
      title: 'MacroMetric API',
      version: '1.0.0',
    },
  },
});
await app.register(swaggerUi, {
  routePrefix: '/api/docs',
});

await registerAuthHook(app);

app.get('/api/health', async () => ({ ok: true }));
app.get('/api/openapi.json', async () => app.swagger());

await registerAuthRoutes(app, env.cookieSecure);
await registerFoodRoutes(app);
await registerGoalRoutes(app);
await registerCheckinRoutes(app, {
  enabled: env.autoDailyExportEnabled,
  directory: env.autoDailyExportDir,
});
await registerFastingRoutes(app);
await registerTripRoutes(app);
await registerNoteRoutes(app);
await registerImportExportRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  if ((error as any).name === 'ZodError') {
    reply.code(400).send({ error: 'Invalid request payload' });
    return;
  }
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  reply.code(500).send({ error: message });
});

await initDatabase();
await app.listen({ port: env.port, host: env.host });
