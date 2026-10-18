import { Hono } from 'hono';
import type { Env } from '../types.ts';
import type { Enquiry } from '../../src/types/index.ts';
import { WorkerDatabase } from '../db.ts';
import { verifyAuthToken } from '../crypto.ts';

export const enquiriesRouter = new Hono<{ Bindings: Env }>();

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

// POST /enquiries (Customer Enquiry submission)
enquiriesRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { propertyId, customerName, customerPhone, message, channel } = body;

    if (!propertyId || !customerName || !customerPhone) {
      return c.json({ error: 'propertyId, customerName, and customerPhone are required' }, 400);
    }

    const db = new WorkerDatabase(c.env);
    const property = await db.getPropertyById(propertyId);
    if (!property) {
      return c.json({ error: 'Property not found' }, 404);
    }

    const user = await getAuthUser(c);

    const newEnquiry: Enquiry = {
      id: `enq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      propertyId: property.id,
      propertyCode: property.propertyCode,
      propertyTitle: property.title,
      propertyPrice: property.price,
      propertyDistrict: property.district,
      propertyArea: property.area,
      dealerId: property.dealerId,
      customerId: user ? user.id : undefined,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: body.customerEmail ? body.customerEmail.trim() : undefined,
      message: message ? message.trim() : 'I am interested in this property.',
      channel: channel || 'form',
      status: 'new',
      createdAt: new Date().toISOString()
    };

    const saved = await db.createEnquiry(newEnquiry);
    return c.json(saved, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to submit enquiry' }, 500);
  }
});

// GET /enquiries (Dealer or Admin enquiries)
enquiriesRouter.get('/my-enquiries', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new WorkerDatabase(c.env);
  const enquiries = await db.getEnquiries(user.role === 'admin' ? undefined : user.id);
  return c.json(enquiries);
});
