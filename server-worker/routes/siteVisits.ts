import { Hono } from 'hono';
import type { Env } from '../types.ts';
import type { SiteVisit } from '../../src/types/index.ts';
import { WorkerDatabase } from '../db.ts';
import { verifyAuthToken } from '../crypto.ts';

export const siteVisitsRouter = new Hono<{ Bindings: Env }>();

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

// POST /site-visits (Customer schedules visit)
siteVisitsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { propertyId, customerName, customerPhone, visitDate, visitTime } = body;

    if (!propertyId || !customerName || !customerPhone || !visitDate || !visitTime) {
      return c.json({ error: 'propertyId, customerName, customerPhone, visitDate, and visitTime are required' }, 400);
    }

    const db = new WorkerDatabase(c.env);
    const property = await db.getPropertyById(propertyId);
    if (!property) {
      return c.json({ error: 'Property not found' }, 404);
    }

    const user = await getAuthUser(c);

    const newVisit: SiteVisit = {
      id: `sv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      propertyId: property.id,
      propertyCode: property.propertyCode,
      propertyTitle: property.title,
      propertyAddress: property.address,
      dealerId: property.dealerId,
      customerId: user ? user.id : undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      visitDate,
      visitTime,
      status: 'requested',
      notes: body.notes ? body.notes.trim() : undefined,
      createdAt: new Date().toISOString()
    };

    const saved = await db.createSiteVisit(newVisit);
    return c.json(saved, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to book site visit' }, 500);
  }
});

// GET /site-visits (Dealer or Admin visits)
siteVisitsRouter.get('/my-visits', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new WorkerDatabase(c.env);
  const visits = await db.getSiteVisits(user.role === 'admin' ? undefined : user.id);
  return c.json(visits);
});
