import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { generateId, now, toFastingSession, todayIso } from './lib.js';

const StartFastSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().optional(),
});

const EndFastSchema = z.object({
  endTime: z.string().optional(),
});

const UpdateFastSchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string().nullable().optional(),
});

function currentTimeString() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

async function getActiveSession(userId: string) {
  const result = await pool.query(
    'SELECT * FROM fasting_sessions WHERE user_id = $1 AND end_time IS NULL ORDER BY date DESC, start_time DESC, created_at DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] ? toFastingSession(result.rows[0]) : null;
}

export async function registerFastingRoutes(app: FastifyInstance) {
  app.get('/api/fasting', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query(
      'SELECT * FROM fasting_sessions WHERE user_id = $1 ORDER BY date DESC, start_time DESC, created_at DESC',
      [request.user!.id]
    );
    reply.send({ sessions: result.rows.map(toFastingSession) });
  });

  app.get('/api/fasting/active', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    reply.send({ session: await getActiveSession(request.user!.id) });
  });

  app.post('/api/fasting/start', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = StartFastSchema.parse(request.body ?? {});
    const active = await getActiveSession(request.user!.id);
    if (active) {
      reply.code(409).send({ error: 'You already have an active fasting session.' });
      return;
    }

    const result = await pool.query(
      `
        INSERT INTO fasting_sessions (id, user_id, date, start_time, end_time, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NULL, $5, $5)
        RETURNING *
      `,
      [generateId(), request.user!.id, body.date ?? todayIso(), body.startTime ?? currentTimeString(), now()]
    );
    reply.send(toFastingSession(result.rows[0]));
  });

  app.post('/api/fasting/:id/end', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = EndFastSchema.parse(request.body ?? {});
    const result = await pool.query(
      `
        UPDATE fasting_sessions
        SET end_time = COALESCE($1, end_time, CURRENT_TIME::time(0)), updated_at = $2
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `,
      [body.endTime ?? null, now(), (request.params as Record<string, string>).id, request.user!.id]
    );
    if (!result.rows[0]) {
      reply.code(404).send({ error: 'Fasting session not found.' });
      return;
    }
    reply.send(toFastingSession(result.rows[0]));
  });

  app.put('/api/fasting/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = UpdateFastSchema.parse(request.body ?? {});
    const result = await pool.query(
      `
        UPDATE fasting_sessions
        SET date = $1, start_time = $2, end_time = $3, updated_at = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `,
      [body.date, body.startTime, body.endTime ?? null, now(), (request.params as Record<string, string>).id, request.user!.id]
    );
    if (!result.rows[0]) {
      reply.code(404).send({ error: 'Fasting session not found.' });
      return;
    }
    reply.send(toFastingSession(result.rows[0]));
  });

  app.delete('/api/fasting/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM fasting_sessions WHERE id = $1 AND user_id = $2', [
      (request.params as Record<string, string>).id,
      request.user!.id,
    ]);
    reply.send({ ok: true });
  });
}
