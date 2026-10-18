import { Hono } from 'hono';
import type { Env } from '../types.ts';
import { WorkerDatabase } from '../db.ts';
import { verifyAuthToken } from '../crypto.ts';

export const settingsRouter = new Hono<{ Bindings: Env }>();

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

// GET /settings (Public Admin Settings)
settingsRouter.get('/', async (c) => {
  try {
    const db = new WorkerDatabase(c.env);
    const settings = await db.getSettings();
    return c.json(settings);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch settings' }, 500);
  }
});

// PUT /settings (Admin updates settings)
settingsRouter.put('/', async (c) => {
  const user = await getAuthUser(c);
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden. Admin privileges required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const db = new WorkerDatabase(c.env);
    const updated = await db.updateSettings(body);
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update settings' }, 500);
  }
});
