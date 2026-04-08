import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { generateId, now, toTrip, todayIso } from './lib.js';

const TripSchema = z.object({
  distance: z.number(),
  duration: z.number(),
  avgSpeed: z.number(),
  avgHeartRate: z.number(),
  description: z.string().optional(),
});

export async function registerTripRoutes(app: FastifyInstance) {
  app.get('/api/trips', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM trips WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [request.user!.id]);
    reply.send({ trips: result.rows.map(toTrip) });
  });

  app.get('/api/trips/range', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const query = z.object({ startDate: z.string(), endDate: z.string() }).parse(request.query);
    const result = await pool.query(
      'SELECT * FROM trips WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC, created_at DESC',
      [request.user!.id, query.startDate, query.endDate]
    );
    reply.send({ trips: result.rows.map(toTrip) });
  });

  app.post('/api/trips', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = TripSchema.parse(request.body);
    const id = generateId();
    const createdAt = now();
    const date = todayIso();
    await pool.query(
      'INSERT INTO trips (id, user_id, date, distance, duration, avg_speed, avg_heart_rate, description, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [id, request.user!.id, date, body.distance, body.duration, body.avgSpeed, body.avgHeartRate, body.description ?? null, createdAt]
    );
    reply.send({ id, date, createdAt, ...body });
  });

  app.put('/api/trips/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = TripSchema.parse(request.body);
    await pool.query(
      'UPDATE trips SET distance = $1, duration = $2, avg_speed = $3, avg_heart_rate = $4, description = $5 WHERE id = $6 AND user_id = $7',
      [body.distance, body.duration, body.avgSpeed, body.avgHeartRate, body.description ?? null, (request.params as Record<string, string>).id, request.user!.id]
    );
    reply.send({ ok: true });
  });

  app.delete('/api/trips/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM trips WHERE id = $1 AND user_id = $2', [(request.params as Record<string, string>).id, request.user!.id]);
    reply.send({ ok: true });
  });
}
