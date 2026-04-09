import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { generateId, now, toCheckin, todayIso } from './lib.js';
import type { AutoDailyExportConfig } from './export-data.js';
import { writeAutomaticDailyExport } from './export-data.js';

const CheckinSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  checkinTime: z.string().optional(),
  weight: z.number().optional(),
  fastStartTime: z.string().nullable().optional(),
  firstMealTime: z.string().nullable().optional(),
  ketones: z.number().optional(),
  glucose: z.number().optional(),
  heartRate: z.number().optional(),
  bpHigh: z.number().optional(),
  bpLow: z.number().optional(),
  steps: z.number().optional(),
  saturation: z.number().optional(),
  cholesterol: z.number().optional(),
  ferritin: z.number().optional(),
  notes: z.string().optional(),
});

export async function registerCheckinRoutes(app: FastifyInstance, autoDailyExport: AutoDailyExportConfig) {
  app.get('/api/checkins', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM checkins WHERE user_id = $1 ORDER BY date DESC, checkin_time DESC NULLS LAST, created_at DESC', [request.user!.id]);
    reply.send({ checkins: result.rows.map(toCheckin) });
  });

  app.get('/api/checkins/today', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query(
      'SELECT * FROM checkins WHERE user_id = $1 AND date = $2 ORDER BY checkin_time DESC NULLS LAST, created_at DESC LIMIT 1',
      [request.user!.id, todayIso()]
    );
    reply.send({ checkin: result.rows[0] ? toCheckin(result.rows[0]) : null });
  });

  app.get('/api/checkins/by-date/:date', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const date = (request.params as Record<string, string>).date;
    const result = await pool.query(
      'SELECT * FROM checkins WHERE user_id = $1 AND date = $2 ORDER BY checkin_time ASC NULLS LAST',
      [request.user!.id, date]
    );
    reply.send({ checkins: result.rows.map(toCheckin) });
  });

  app.post('/api/checkins', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = CheckinSchema.parse(request.body);
    const result = await pool.query(
      `
        INSERT INTO checkins (
          id, user_id, date, checkin_time, weight, fast_start_time, first_meal_time, ketones,
          glucose, heart_rate, bp_high, bp_low, steps, saturation, cholesterol, ferritin, notes, created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date,
          checkin_time = EXCLUDED.checkin_time,
          weight = EXCLUDED.weight,
          fast_start_time = EXCLUDED.fast_start_time,
          first_meal_time = EXCLUDED.first_meal_time,
          ketones = EXCLUDED.ketones,
          glucose = EXCLUDED.glucose,
          heart_rate = EXCLUDED.heart_rate,
          bp_high = EXCLUDED.bp_high,
          bp_low = EXCLUDED.bp_low,
          steps = EXCLUDED.steps,
          saturation = EXCLUDED.saturation,
          cholesterol = EXCLUDED.cholesterol,
          ferritin = EXCLUDED.ferritin,
          notes = EXCLUDED.notes,
          created_at = checkins.created_at
        RETURNING *
      `,
      [
        body.id ?? generateId(),
        request.user!.id,
        body.date,
        body.checkinTime ?? null,
        body.weight ?? null,
        body.fastStartTime ?? null,
        body.firstMealTime ?? null,
        body.ketones ?? null,
        body.glucose ?? null,
        body.heartRate ?? null,
        body.bpHigh ?? null,
        body.bpLow ?? null,
        body.steps ?? null,
        body.saturation ?? null,
        body.cholesterol ?? null,
        body.ferritin ?? null,
        body.notes ?? null,
        now(),
      ]
    );
    const saved = toCheckin(result.rows[0]);
    try {
      const countResult = await pool.query(
        'SELECT COUNT(*)::int AS count FROM checkins WHERE user_id = $1 AND date = $2',
        [request.user!.id, body.date]
      );
      const dailyCount = Number(countResult.rows[0]?.count) || 0;
      if (dailyCount === 1) {
        const backupResult = await writeAutomaticDailyExport({
          userId: request.user!.id,
          userLabel: request.user?.email,
          date: body.date,
          config: autoDailyExport,
        });
        if (backupResult.status === 'saved') {
          app.log.info({ userId: request.user!.id, date: body.date, filePath: backupResult.filePath }, 'Automatic daily backup saved');
        } else if (backupResult.status === 'skipped') {
          app.log.info({ userId: request.user!.id, date: body.date }, 'Automatic daily backup already exists for this user/day');
        }
      }
    } catch (error) {
      app.log.error({ err: error, userId: request.user!.id, date: body.date }, 'Automatic daily backup failed');
    }
    reply.send(saved);
  });

  app.delete('/api/checkins/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM checkins WHERE id = $1 AND user_id = $2', [(request.params as Record<string, string>).id, request.user!.id]);
    reply.send({ ok: true });
  });

  app.post('/api/checkins/:id/clear-fasting', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query(
      'UPDATE checkins SET fast_start_time = NULL, first_meal_time = NULL WHERE id = $1 AND user_id = $2',
      [(request.params as Record<string, string>).id, request.user!.id]
    );
    reply.send({ ok: true });
  });
}
