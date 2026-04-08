import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { generateId, localDateIso, now, toFood, toFoodLog, todayIso } from './lib.js';

const FoodSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  brand: z.string().nullable(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  serving: z.string(),
  servingSize: z.number().optional(),
  netCarbs: z.number().optional(),
  packageWeight: z.number().optional(),
  packageCount: z.number().optional(),
});

const FoodLogSchema = FoodSchema.partial().extend({
  foodId: z.string().optional(),
  quantity: z.number().optional(),
  date: z.string().optional(),
});

export async function registerFoodRoutes(app: FastifyInstance) {
  app.get('/api/logs', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const query = z.object({ date: z.string().optional() }).parse(request.query);
    const params = [request.user!.id];
    let sql = 'SELECT * FROM food_logs WHERE user_id = $1';
    if (query.date) {
      params.push(query.date);
      sql += ` AND date = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    reply.send({ logs: result.rows.map(toFoodLog) });
  });

  app.get('/api/history', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const query = z.object({ days: z.coerce.number().optional() }).parse(request.query);
    const days = query.days ?? 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const result = await pool.query(
        'SELECT * FROM food_logs WHERE user_id = $1 AND date >= $2 ORDER BY date DESC, created_at DESC',
        [request.user!.id, localDateIso(startDate)]
      );
    reply.send({ logs: result.rows.map(toFoodLog) });
  });

  app.post('/api/logs', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = FoodLogSchema.parse(request.body);
    const payload = {
      id: body.id ?? generateId(),
      foodId: body.foodId ?? body.id ?? null,
      name: body.name ?? '',
      brand: body.brand ?? null,
      calories: body.calories ?? 0,
      protein: body.protein ?? 0,
      carbs: body.carbs ?? 0,
      fat: body.fat ?? 0,
      serving: body.serving ?? '1 serving',
      servingSize: body.servingSize ?? null,
      netCarbs: body.netCarbs ?? null,
      packageWeight: body.packageWeight ?? null,
      packageCount: body.packageCount ?? null,
      quantity: body.quantity ?? 1,
      date: body.date ?? todayIso(),
      createdAt: now(),
    };

    await pool.query(
      `
        INSERT INTO food_logs (
          id, user_id, food_id, name, brand, calories, protein, carbs, fat, serving,
          serving_size, net_carbs, package_weight, package_count, quantity, date, created_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17
        )
      `,
      [
        payload.id,
        request.user!.id,
        payload.foodId,
        payload.name,
        payload.brand,
        payload.calories,
        payload.protein,
        payload.carbs,
        payload.fat,
        payload.serving,
        payload.servingSize,
        payload.netCarbs,
        payload.packageWeight,
        payload.packageCount,
        payload.quantity,
        payload.date,
        payload.createdAt,
      ]
    );

    reply.send(
      toFoodLog({
        id: payload.id,
        food_id: payload.foodId,
        name: payload.name,
        brand: payload.brand,
        calories: payload.calories,
        protein: payload.protein,
        carbs: payload.carbs,
        fat: payload.fat,
        serving: payload.serving,
        serving_size: payload.servingSize,
        net_carbs: payload.netCarbs,
        package_weight: payload.packageWeight,
        package_count: payload.packageCount,
        quantity: payload.quantity,
        date: payload.date,
        created_at: payload.createdAt,
      })
    );
  });

  app.put('/api/logs/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = FoodLogSchema.parse(request.body);
    const updates: Record<string, unknown> = {};
    if (body.foodId !== undefined) updates.food_id = body.foodId;
    if (body.name !== undefined) updates.name = body.name;
    if (body.brand !== undefined) updates.brand = body.brand;
    if (body.calories !== undefined) updates.calories = body.calories;
    if (body.protein !== undefined) updates.protein = body.protein;
    if (body.carbs !== undefined) updates.carbs = body.carbs;
    if (body.fat !== undefined) updates.fat = body.fat;
    if (body.serving !== undefined) updates.serving = body.serving;
    if (body.servingSize !== undefined) updates.serving_size = body.servingSize;
    if (body.netCarbs !== undefined) updates.net_carbs = body.netCarbs;
    if (body.packageWeight !== undefined) updates.package_weight = body.packageWeight;
    if (body.packageCount !== undefined) updates.package_count = body.packageCount;
    if (body.quantity !== undefined) updates.quantity = body.quantity;
    if (body.date !== undefined) updates.date = body.date;

    const entries = Object.entries(updates);
    if (!entries.length) {
      reply.send(null);
      return;
    }

    const assignments = entries.map(([key], index) => `${key} = $${index + 1}`).join(', ');
    const values = entries.map(([, value]) => value);
    const result = await pool.query(
      `UPDATE food_logs SET ${assignments} WHERE id = $${values.length + 1} AND user_id = $${values.length + 2} RETURNING *`,
      [...values, (request.params as Record<string, string>).id, request.user!.id]
    );
    reply.send(result.rows[0] ? toFoodLog(result.rows[0]) : null);
  });

  app.delete('/api/logs/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM food_logs WHERE id = $1 AND user_id = $2', [(request.params as Record<string, string>).id, request.user!.id]);
    reply.send({ ok: true });
  });

  app.get('/api/presets', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM presets WHERE user_id = $1 ORDER BY created_at DESC', [request.user!.id]);
    reply.send({ presets: result.rows.map((row: Record<string, unknown>) => ({ ...toFood(row), id: String(row.id) })) });
  });

  app.post('/api/presets', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = FoodSchema.parse(request.body);
    const id = generateId();
    await pool.query(
      `
        INSERT INTO presets (
          id, user_id, name, brand, calories, protein, carbs, fat, serving, serving_size, net_carbs, package_weight, package_count, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `,
      [id, request.user!.id, body.name, body.brand, body.calories, body.protein, body.carbs, body.fat, body.serving, body.servingSize ?? null, body.netCarbs ?? null, body.packageWeight ?? null, body.packageCount ?? null, now()]
    );
    reply.send({ ...body, id });
  });

  app.delete('/api/presets/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM presets WHERE id = $1 AND user_id = $2', [(request.params as Record<string, string>).id, request.user!.id]);
    reply.send({ ok: true });
  });

  app.get('/api/my-foods', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM my_foods WHERE user_id = $1 ORDER BY created_at DESC', [request.user!.id]);
    reply.send({ foods: result.rows.map(toFood) });
  });

  app.post('/api/my-foods', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = FoodSchema.omit({ id: true }).parse(request.body);
    const id = generateId();
    await pool.query(
      `
        INSERT INTO my_foods (
          id, user_id, name, brand, calories, protein, carbs, fat, serving, serving_size, net_carbs, package_weight, package_count, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `,
      [id, request.user!.id, body.name, body.brand, body.calories, body.protein, body.carbs, body.fat, body.serving, body.servingSize ?? null, body.netCarbs ?? null, body.packageWeight ?? null, body.packageCount ?? null, now()]
    );
    reply.send({ ...body, id });
  });

  app.put('/api/my-foods/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const params = request.params as Record<string, string>;
    const body = FoodSchema.parse({ ...(request.body as Record<string, unknown>), id: params.id });
    await pool.query(
      `
        UPDATE my_foods
        SET name = $1, brand = $2, calories = $3, protein = $4, carbs = $5, fat = $6,
            serving = $7, serving_size = $8, net_carbs = $9, package_weight = $10, package_count = $11
        WHERE id = $12 AND user_id = $13
      `,
      [body.name, body.brand, body.calories, body.protein, body.carbs, body.fat, body.serving, body.servingSize ?? null, body.netCarbs ?? null, body.packageWeight ?? null, body.packageCount ?? null, body.id, request.user!.id]
    );
    reply.send(body);
  });

  app.delete('/api/my-foods/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM my_foods WHERE id = $1 AND user_id = $2', [(request.params as Record<string, string>).id, request.user!.id]);
    reply.send({ ok: true });
  });
}
