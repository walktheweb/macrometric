import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool, withTransaction } from './db.js';
import { requireAuth } from './auth.js';

const ImportSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  userId: z.string(),
  data: z.record(z.string(), z.any()),
});

const LegacyMyFoodsSelectionSchema = z.object({
  version: z.number(),
  type: z.literal('my_foods_selection'),
  exportedAt: z.string(),
  foods: z.array(z.record(z.string(), z.any())),
});

const exportTables = [
  'my_foods',
  'food_logs',
  'presets',
  'goals',
  'checkins',
  'fasting_sessions',
  'step_goals',
  'trips',
  'race_goals',
  'event_goals',
  'milestones',
  'release_notes',
  'feature_requests',
] as const;

function normalizeImportRows(rows: unknown, userId: string) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({ ...(row as Record<string, unknown>), user_id: userId }));
}

const allowedColumnsByTable: Record<string, string[]> = {
  my_foods: [
    'id', 'user_id', 'name', 'brand', 'calories', 'protein', 'carbs', 'fat',
    'serving', 'serving_size', 'net_carbs', 'package_weight', 'package_count', 'created_at',
  ],
  food_logs: [
    'id', 'user_id', 'food_id', 'name', 'brand', 'calories', 'protein', 'carbs', 'fat',
    'serving', 'serving_size', 'net_carbs', 'package_weight', 'package_count', 'quantity', 'date', 'created_at',
  ],
  presets: [
    'id', 'user_id', 'name', 'brand', 'calories', 'protein', 'carbs', 'fat',
    'serving', 'serving_size', 'net_carbs', 'package_weight', 'package_count', 'created_at',
  ],
  goals: ['user_id', 'calories', 'protein', 'carbs', 'fat', 'weight', 'height', 'target_bmi'],
  checkins: [
    'id', 'user_id', 'date', 'checkin_time', 'weight', 'fast_start_time', 'first_meal_time',
    'ketones', 'glucose', 'heart_rate', 'bp_high', 'bp_low', 'steps', 'saturation',
    'cholesterol', 'ferritin', 'notes', 'created_at',
  ],
  fasting_sessions: ['id', 'user_id', 'date', 'start_time', 'end_time', 'source_checkin_id', 'created_at', 'updated_at'],
  step_goals: ['user_id', 'daily_goal', 'created_at'],
  trips: ['id', 'user_id', 'date', 'distance', 'duration', 'avg_speed', 'avg_heart_rate', 'description', 'created_at'],
  race_goals: ['user_id', 'event_name', 'start_date', 'race_date', 'target_weight', 'weekly_target'],
  event_goals: ['id', 'user_id', 'event_name', 'start_date', 'race_date', 'target_weight', 'weekly_target', 'created_at'],
  milestones: ['id', 'user_id', 'title', 'date', 'notes', 'done', 'created_at', 'updated_at'],
  release_notes: ['id', 'user_id', 'date', 'note', 'created_at'],
  feature_requests: ['id', 'user_id', 'text', 'created_at'],
};

function toSnakeCaseRecord(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const snake = key
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/-/g, '_')
        .toLowerCase();
      return [snake, value];
    })
  );
}

function sanitizeRowsForTable(table: string, rows: Record<string, unknown>[]) {
  const allowed = new Set(allowedColumnsByTable[table] || []);
  return rows.map((row) => {
    const normalized = toSnakeCaseRecord(row);
    return Object.fromEntries(
      Object.entries(normalized).filter(([key]) => allowed.has(key))
    );
  });
}

function normalizeImportPayload(payload: unknown) {
  const fullBackup = ImportSchema.safeParse(payload);
  if (fullBackup.success) {
    return {
      kind: 'backup' as const,
      data: fullBackup.data.data,
    };
  }

  const myFoodsSelection = LegacyMyFoodsSelectionSchema.safeParse(payload);
  if (myFoodsSelection.success) {
    const foods = myFoodsSelection.data.foods.map((food) => ({
      id: typeof food.id === 'string' ? food.id : crypto.randomUUID(),
      name: food.name ?? '',
      brand: food.brand ?? null,
      calories: food.calories ?? 0,
      protein: food.protein ?? 0,
      carbs: food.carbs ?? 0,
      fat: food.fat ?? 0,
      serving: food.serving ?? '1 serving',
      serving_size: food.servingSize ?? null,
      net_carbs: food.netCarbs ?? null,
      package_weight: food.packageWeight ?? null,
      package_count: food.packageCount ?? null,
      created_at: Date.now(),
    }));

    return {
      kind: 'my_foods_selection' as const,
      data: {
        my_foods: foods,
        food_logs: [],
        presets: [],
        goals: [],
        checkins: [],
        step_goals: [],
        fasting_sessions: [],
        trips: [],
        race_goals: [],
        event_goals: [],
        milestones: [],
        release_notes: [],
        feature_requests: [],
      },
    };
  }

  throw new Error('Unsupported import format');
}

async function upsertRows(client: any, table: string, rows: Record<string, unknown>[], conflict: string) {
  let count = 0;
  for (const row of sanitizeRowsForTable(table, rows)) {
    const keys = Object.keys(row);
    if (!keys.length) continue;
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const updates = keys
      .filter((key) => key !== conflict)
      .map((key) => `${key} = EXCLUDED.${key}`)
      .join(', ');
    await client.query(
      `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO UPDATE SET ${updates}`,
      keys.map((key) => row[key])
    );
    count += 1;
  }
  return count;
}

function deriveFastingSessionsFromLegacyCheckins(checkins: Record<string, unknown>[]) {
  return checkins
    .map((row) => toSnakeCaseRecord(row))
    .filter((row) => row.fast_start_time)
    .map((row) => ({
      id: typeof row.id === 'string' ? `legacy-${row.id}` : crypto.randomUUID(),
      date: row.date,
      start_time: row.fast_start_time,
      end_time: row.first_meal_time ?? null,
      source_checkin_id: typeof row.id === 'string' ? row.id : null,
      created_at: typeof row.created_at === 'number' ? row.created_at : Date.now(),
      updated_at: Date.now(),
    }));
}

export async function registerImportExportRoutes(app: FastifyInstance) {
  app.get('/api/export', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const data: Record<string, unknown[]> = {};
    for (const table of exportTables) {
      const result = await pool.query(`SELECT * FROM ${table} WHERE user_id = $1`, [request.user!.id]);
      data[table] = result.rows;
    }
    reply.send({
      version: 1,
      exportedAt: new Date().toISOString(),
      userId: request.user!.id,
      data,
    });
  });

  app.post('/api/import', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const normalized = normalizeImportPayload(request.body);
    const userId = request.user!.id;
    const imported = await withTransaction(async (client) => {
      let total = 0;
      total += await upsertRows(client, 'my_foods', normalizeImportRows(normalized.data.my_foods, userId), 'id');
      total += await upsertRows(client, 'food_logs', normalizeImportRows(normalized.data.food_logs, userId), 'id');
      total += await upsertRows(client, 'presets', normalizeImportRows(normalized.data.presets, userId), 'id');
      total += await upsertRows(client, 'goals', normalizeImportRows(normalized.data.goals, userId), 'user_id');
      total += await upsertRows(client, 'checkins', normalizeImportRows(normalized.data.checkins, userId), 'id');
      const importedFastingRows = Array.isArray(normalized.data.fasting_sessions) && normalized.data.fasting_sessions.length
        ? normalizeImportRows(normalized.data.fasting_sessions, userId)
        : normalizeImportRows(deriveFastingSessionsFromLegacyCheckins(normalized.data.checkins as Record<string, unknown>[]), userId);
      total += await upsertRows(client, 'fasting_sessions', importedFastingRows, 'id');
      total += await upsertRows(client, 'step_goals', normalizeImportRows(normalized.data.step_goals, userId), 'user_id');
      total += await upsertRows(client, 'trips', normalizeImportRows(normalized.data.trips, userId), 'id');
      total += await upsertRows(client, 'race_goals', normalizeImportRows(normalized.data.race_goals, userId), 'user_id');
      total += await upsertRows(client, 'event_goals', normalizeImportRows(normalized.data.event_goals, userId), 'id');
      total += await upsertRows(client, 'milestones', normalizeImportRows(normalized.data.milestones, userId), 'id');
      total += await upsertRows(client, 'release_notes', normalizeImportRows(normalized.data.release_notes, userId), 'id');
      total += await upsertRows(client, 'feature_requests', normalizeImportRows(normalized.data.feature_requests, userId), 'id');
      return total;
    });

    reply.send({ imported });
  });
}
