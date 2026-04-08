import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { pool } from './db.js';
import { generateId, now, SESSION_COOKIE } from './lib.js';

export async function createPasswordHash(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPasswordHash(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string, persistent = false) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionId = generateId();
  const expiresAt = persistent ? now() + 1000 * 60 * 60 * 24 * 30 : now() + 1000 * 60 * 60 * 24 * 7;
  await pool.query(
    'INSERT INTO sessions (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
    [sessionId, userId, token, expiresAt, now()]
  );
  return { token, expiresAt };
}

export function setSessionCookie(reply: FastifyReply, token: string, persistent = false, secure = false) {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    ...(persistent ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export async function registerAuthHook(app: FastifyInstance) {
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (request) => {
    if (
      request.url.startsWith('/api/auth/login') ||
      request.url.startsWith('/api/auth/signup') ||
      request.url.startsWith('/api/health') ||
      request.url.startsWith('/api/docs') ||
      request.url.startsWith('/api/openapi.json')
    ) {
      return;
    }

    const token = request.cookies[SESSION_COOKIE];
    if (!token) {
      request.user = null;
      return;
    }

    const result = await pool.query(
      `
        SELECT users.id, users.email
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = $1
          AND (sessions.expires_at IS NULL OR sessions.expires_at > $2)
        LIMIT 1
      `,
      [token, now()]
    );

    request.user = result.rows[0] ? { id: String(result.rows[0].id), email: String(result.rows[0].email) } : null;
  });
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!request.user) {
    reply.code(401).send({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
