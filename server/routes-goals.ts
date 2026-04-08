import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool, withTransaction } from './db.js';
import { requireAuth } from './auth.js';
import { generateId, now, toDateString, toEventGoal, toMilestone, toNumber } from './lib.js';

const GoalSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  weight: z.number().optional(),
  height: z.number().optional(),
  targetBmi: z.number().optional(),
});

const RaceGoalSchema = z.object({
  eventName: z.string(),
  startDate: z.string().optional(),
  raceDate: z.string(),
  targetWeight: z.number(),
  weeklyTarget: z.number(),
});

const EventGoalSchema = RaceGoalSchema.extend({
  id: z.string().optional(),
});

const MilestoneSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  date: z.string(),
  notes: z.string().optional(),
  done: z.boolean().optional(),
});

export async function registerGoalRoutes(app: FastifyInstance) {
  app.get('/api/step-goal', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT daily_goal FROM step_goals WHERE user_id = $1 LIMIT 1', [request.user!.id]);
    reply.send({ dailyGoal: toNumber(result.rows[0]?.daily_goal) ?? 10000 });
  });

  app.put('/api/step-goal', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = z.object({ dailyGoal: z.number() }).parse(request.body);
    await pool.query(
      `
        INSERT INTO step_goals (user_id, daily_goal, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET daily_goal = EXCLUDED.daily_goal
      `,
      [request.user!.id, body.dailyGoal, now()]
    );
    reply.send({ ok: true });
  });

  app.get('/api/goals', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM goals WHERE user_id = $1 LIMIT 1', [request.user!.id]);
    const row = result.rows[0];
    reply.send(row ? {
      calories: toNumber(row.calories) ?? 1500,
      protein: toNumber(row.protein) ?? 20,
      carbs: toNumber(row.carbs) ?? 5,
      fat: toNumber(row.fat) ?? 75,
      weight: toNumber(row.weight),
      height: toNumber(row.height),
      targetBmi: toNumber(row.target_bmi),
    } : {
      calories: 1500,
      protein: 20,
      carbs: 5,
      fat: 75,
      weight: 83,
      height: 169,
    });
  });

  app.put('/api/goals', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = GoalSchema.parse(request.body);
    await pool.query(
      `
        INSERT INTO goals (user_id, calories, protein, carbs, fat, weight, height, target_bmi)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          calories = EXCLUDED.calories,
          protein = EXCLUDED.protein,
          carbs = EXCLUDED.carbs,
          fat = EXCLUDED.fat,
          weight = EXCLUDED.weight,
          height = EXCLUDED.height,
          target_bmi = EXCLUDED.target_bmi
      `,
      [request.user!.id, body.calories, body.protein, body.carbs, body.fat, body.weight ?? null, body.height ?? null, body.targetBmi ?? null]
    );
    reply.send(body);
  });

  app.get('/api/race-goal', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM race_goals WHERE user_id = $1 LIMIT 1', [request.user!.id]);
    const row = result.rows[0];
    reply.send(row ? {
      eventName: row.event_name ?? '',
      startDate: toDateString(row.start_date),
      raceDate: toDateString(row.race_date) ?? '2026-05-23',
      targetWeight: toNumber(row.target_weight) ?? 80,
      weeklyTarget: toNumber(row.weekly_target) ?? 0.5,
    } : {
      eventName: '',
      raceDate: '2026-05-23',
      targetWeight: 80,
      weeklyTarget: 0.5,
    });
  });

  app.put('/api/race-goal', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = RaceGoalSchema.parse(request.body);
    await pool.query(
      `
        INSERT INTO race_goals (user_id, event_name, start_date, race_date, target_weight, weekly_target)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          event_name = EXCLUDED.event_name,
          start_date = EXCLUDED.start_date,
          race_date = EXCLUDED.race_date,
          target_weight = EXCLUDED.target_weight,
          weekly_target = EXCLUDED.weekly_target
      `,
      [request.user!.id, body.eventName, body.startDate ?? null, body.raceDate, body.targetWeight, body.weeklyTarget]
    );
    reply.send(body);
  });

  app.get('/api/event-goals', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM event_goals WHERE user_id = $1 ORDER BY created_at DESC', [request.user!.id]);
    reply.send({ eventGoals: result.rows.map(toEventGoal) });
  });

  app.post('/api/event-goals', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = EventGoalSchema.parse(request.body);
    if (body.id === 'primary') {
      await pool.query(
        `
          INSERT INTO race_goals (user_id, event_name, start_date, race_date, target_weight, weekly_target)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id) DO UPDATE SET
            event_name = EXCLUDED.event_name,
            start_date = EXCLUDED.start_date,
            race_date = EXCLUDED.race_date,
            target_weight = EXCLUDED.target_weight,
            weekly_target = EXCLUDED.weekly_target
        `,
        [request.user!.id, body.eventName, body.startDate ?? null, body.raceDate, body.targetWeight, body.weeklyTarget]
      );
      reply.send({ id: 'primary', ...body, createdAt: 0, isPrimary: true });
      return;
    }

    const id = body.id ?? generateId();
    const result = await pool.query(
      `
        INSERT INTO event_goals (id, user_id, event_name, start_date, race_date, target_weight, weekly_target, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          event_name = EXCLUDED.event_name,
          start_date = EXCLUDED.start_date,
          race_date = EXCLUDED.race_date,
          target_weight = EXCLUDED.target_weight,
          weekly_target = EXCLUDED.weekly_target,
          created_at = event_goals.created_at
        RETURNING *
      `,
      [id, request.user!.id, body.eventName, body.startDate ?? null, body.raceDate, body.targetWeight, body.weeklyTarget, now()]
    );
    reply.send(toEventGoal(result.rows[0]));
  });

  app.delete('/api/event-goals/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const id = (request.params as Record<string, string>).id;
    if (id === 'primary') {
      reply.send({ ok: true });
      return;
    }
    await pool.query('DELETE FROM event_goals WHERE id = $1 AND user_id = $2', [id, request.user!.id]);
    reply.send({ ok: true });
  });

  app.post('/api/event-goals/:id/set-primary', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const id = (request.params as Record<string, string>).id;
    if (id === 'primary') {
      reply.send({ ok: true });
      return;
    }

    await withTransaction(async (client) => {
      const selectedResult = await client.query('SELECT * FROM event_goals WHERE id = $1 AND user_id = $2 LIMIT 1', [id, request.user!.id]);
      const selected = selectedResult.rows[0];
      if (!selected) {
        throw new Error('Selected event goal not found');
      }

      const currentResult = await client.query('SELECT * FROM race_goals WHERE user_id = $1 LIMIT 1', [request.user!.id]);
      const current = currentResult.rows[0];

      if (current) {
        await client.query(
          `
            INSERT INTO event_goals (id, user_id, event_name, start_date, race_date, target_weight, weekly_target, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          `,
          [generateId(), request.user!.id, current.event_name ?? '', current.start_date ?? null, current.race_date, current.target_weight, current.weekly_target, now()]
        );
      }

      await client.query(
        `
          INSERT INTO race_goals (user_id, event_name, start_date, race_date, target_weight, weekly_target)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (user_id) DO UPDATE SET
            event_name = EXCLUDED.event_name,
            start_date = EXCLUDED.start_date,
            race_date = EXCLUDED.race_date,
            target_weight = EXCLUDED.target_weight,
            weekly_target = EXCLUDED.weekly_target
        `,
        [request.user!.id, selected.event_name ?? '', selected.start_date ?? null, selected.race_date, selected.target_weight, selected.weekly_target]
      );

      await client.query('DELETE FROM event_goals WHERE id = $1 AND user_id = $2', [id, request.user!.id]);
    });

    reply.send({ ok: true });
  });

  app.get('/api/milestones', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM milestones WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [request.user!.id]);
    reply.send({ milestones: result.rows.map(toMilestone) });
  });

  app.post('/api/milestones', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = MilestoneSchema.parse(request.body);
    const result = await pool.query(
      `
        INSERT INTO milestones (id, user_id, title, date, notes, done, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          date = EXCLUDED.date,
          notes = EXCLUDED.notes,
          done = EXCLUDED.done,
          created_at = milestones.created_at,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [body.id ?? generateId(), request.user!.id, body.title, body.date, body.notes ?? '', body.done ?? false, now(), now()]
    );
    reply.send(toMilestone(result.rows[0]));
  });

  app.delete('/api/milestones/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM milestones WHERE id = $1 AND user_id = $2', [(request.params as Record<string, string>).id, request.user!.id]);
    reply.send({ ok: true });
  });
}
