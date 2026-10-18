import { Hono } from 'hono';
import type { Env } from '../types.ts';
import { WorkerDatabase } from '../db.ts';
import { verifyAuthToken } from '../crypto.ts';

export const notificationsRouter = new Hono<{ Bindings: Env }>();

async function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  const secret = c.env.SESSION_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';
  const payload = await verifyAuthToken(token, secret);
  if (!payload) return null;
  const db = new WorkerDatabase(c.env);
  return db.getUserById(payload.userId);
}

// GET /notifications
notificationsRouter.get('/', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new WorkerDatabase(c.env);
  const notifications = await db.getNotifications(user.id);
  return c.json(notifications);
});
