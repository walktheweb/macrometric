import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db.js';
import { requireAuth } from './auth.js';
import { generateId, now, toNumber } from './lib.js';

const FeatureRequestSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  createdAt: z.number().optional(),
});

export async function registerNoteRoutes(app: FastifyInstance) {
  app.get('/api/release-notes', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM release_notes WHERE user_id = $1 ORDER BY created_at DESC', [request.user!.id]);
    reply.send({
      releaseNotes: result.rows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        date: String(row.date ?? ''),
        note: String(row.note ?? ''),
        createdAt: toNumber(row.created_at) ?? now(),
      })),
    });
  });

  app.post('/api/release-notes', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = z.object({ note: z.string(), date: z.string() }).parse(request.body);
    await pool.query(
      'INSERT INTO release_notes (id, user_id, date, note, created_at) VALUES ($1,$2,$3,$4,$5)',
      [generateId(), request.user!.id, body.date, body.note, now()]
    );
    reply.send({ ok: true });
  });

  app.get('/api/feature-requests', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const result = await pool.query('SELECT * FROM feature_requests WHERE user_id = $1 ORDER BY created_at DESC', [request.user!.id]);
    reply.send({
      featureRequests: result.rows.map((row: Record<string, unknown>) => ({
        id: String(row.id),
        text: String(row.text ?? ''),
        createdAt: toNumber(row.created_at) ?? now(),
      })),
    });
  });

  app.post('/api/feature-requests', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = FeatureRequestSchema.parse(request.body);
    await pool.query(
      `
        INSERT INTO feature_requests (id, user_id, text, created_at)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (id) DO UPDATE SET
          text = EXCLUDED.text,
          created_at = EXCLUDED.created_at
      `,
      [body.id ?? generateId(), request.user!.id, body.text, body.createdAt ?? now()]
    );
    reply.send({ ok: true });
  });

  app.post('/api/feature-requests/reorder', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = z.object({ items: z.array(FeatureRequestSchema.extend({ id: z.string() })) }).parse(request.body);
    for (const item of body.items) {
      await pool.query(
        `
          INSERT INTO feature_requests (id, user_id, text, created_at)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            created_at = EXCLUDED.created_at
        `,
        [item.id, request.user!.id, item.text, item.createdAt ?? now()]
      );
    }
    reply.send({ ok: true });
  });

  app.delete('/api/feature-requests/:id', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    await pool.query('DELETE FROM feature_requests WHERE id = $1 AND user_id = $2', [(request.params as Record<string, string>).id, request.user!.id]);
    reply.send({ ok: true });
  });
}
