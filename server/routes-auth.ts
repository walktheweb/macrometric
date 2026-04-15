import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from './db.js';
import { createPasswordHash, createSession, requireAuth, setSessionCookie, verifyPasswordHash } from './auth.js';
import { generateId, SESSION_COOKIE, now } from './lib.js';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const VerifyPasswordSchema = z.object({
  password: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance, secureCookie: boolean) {
  app.get('/api/auth/me', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    reply.send({ user: request.user });
  });

  app.post('/api/auth/signup', async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const email = body.email.toLowerCase();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rows[0]) {
      reply.code(400).send({ error: 'Email is already in use' });
      return;
    }

    const userId = generateId();
    const passwordHash = await createPasswordHash(body.password);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, $4)',
      [userId, email, passwordHash, now()]
    );
    const session = await createSession(userId, !!body.rememberMe);
    setSessionCookie(reply, session.token, !!body.rememberMe, secureCookie);
    reply.send({ user: { id: userId, email } });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const email = body.email.toLowerCase();
    const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1', [email]);
    const row = result.rows[0];
    if (!row || !(await verifyPasswordHash(body.password, String(row.password_hash)))) {
      reply.code(401).send({ error: 'Invalid email or password' });
      return;
    }

    const session = await createSession(String(row.id), !!body.rememberMe);
    setSessionCookie(reply, session.token, !!body.rememberMe, secureCookie);
    reply.send({ user: { id: String(row.id), email: String(row.email) } });
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    }
    reply.clearCookie(SESSION_COOKIE, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
    });
    reply.send({ ok: true });
  });

  app.post('/api/auth/verify-password', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = VerifyPasswordSchema.parse(request.body);
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [request.user!.id]);
    const valid = !!result.rows[0] && (await verifyPasswordHash(body.password, String(result.rows[0].password_hash)));
    reply.send({ valid });
  });

  app.post('/api/auth/change-password', async (request, reply) => {
    if (!requireAuth(request, reply)) return;
    const body = ChangePasswordSchema.parse(request.body);
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [request.user!.id]);
    const matches = !!result.rows[0] && (await verifyPasswordHash(body.currentPassword, String(result.rows[0].password_hash)));
    if (!matches) {
      reply.code(400).send({ error: 'Current password is incorrect' });
      return;
    }
    const passwordHash = await createPasswordHash(body.newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, request.user!.id]);
    reply.send({ success: true });
  });
}
