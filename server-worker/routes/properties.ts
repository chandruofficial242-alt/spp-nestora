import { Hono } from 'hono';
import type { Env } from '../types.ts';
import type { Property } from '../../src/types/index.ts';
import { WorkerDatabase } from '../db.ts';
import { verifyAuthToken } from '../crypto.ts';
import { sanitizePropertyForPublic, sanitizePropertiesListForPublic } from '../sanitizer.ts';

export const propertiesRouter = new Hono<{ Bindings: Env }>();

// Auth Helper Middleware
async function getAuthenticatedUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  const secret = c.env.SESSION_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';
  const payload = await verifyAuthToken(token, secret);
  if (!payload) return null;
  const db = new WorkerDatabase(c.env);
  return db.getUserById(payload.userId);
}

// GET /properties (Public available properties with privacy sanitization)
propertiesRouter.get('/', async (c) => {
  try {
    const db = new WorkerDatabase(c.env);
    const properties = await db.getAllProperties();
    const settings = await db.getSettings();

    const district = c.req.query('district');
    const type = c.req.query('type');
    const minPrice = c.req.query('minPrice');
    const maxPrice = c.req.query('maxPrice');
    const bedrooms = c.req.query('bedrooms');
    const search = c.req.query('search')?.toLowerCase().trim();

    let filtered = properties.filter(p => p.status === 'available');

    if (district && district !== 'all') {
      filtered = filtered.filter(p => p.district.toLowerCase() === district.toLowerCase());
    }
    if (type && type !== 'all') {
      filtered = filtered.filter(p => p.type === type);
    }
    if (minPrice) {
      filtered = filtered.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(p => p.price <= Number(maxPrice));
    }
    if (bedrooms && bedrooms !== 'all') {
      filtered = filtered.filter(p => p.bedrooms === Number(bedrooms) || (p as any).bhk === bedrooms);
    }
    if (search) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(search) || 
        p.propertyCode.toLowerCase().includes(search) ||
        p.area.toLowerCase().includes(search) ||
        p.city.toLowerCase().includes(search)
      );
    }

    const sanitized = sanitizePropertiesListForPublic(filtered, settings);
    return c.json(sanitized);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch properties' }, 500);
  }
});

// GET /properties/:id
propertiesRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new WorkerDatabase(c.env);
    const prop = await db.getPropertyById(id);

    if (!prop) {
      return c.json({ error: 'Property not found' }, 404);
    }

    const user = await getAuthenticatedUser(c);
    const isOwner = user && (user.id === prop.dealerId || user.role === 'admin');

    if (isOwner) {
      return c.json(prop);
    }

    if (prop.status !== 'available') {
      return c.json({ error: 'Property is not publicly available' }, 404);
    }

    const settings = await db.getSettings();
    return c.json(sanitizePropertyForPublic(prop, settings));
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch property' }, 500);
  }
});

// GET /dealer/properties (Dealer's own properties)
propertiesRouter.get('/dealer/my-properties', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || (user.role !== 'dealer' && user.role !== 'admin')) {
    return c.json({ error: 'Unauthorized. Dealer access required.' }, 403);
  }

  const db = new WorkerDatabase(c.env);
  const all = await db.getAllProperties();
  const mine = user.role === 'admin' ? all : all.filter(p => p.dealerId === user.id);
  return c.json(mine);
});

// POST /dealer/properties (Create new property)
propertiesRouter.post('/dealer/create', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || (user.role !== 'dealer' && user.role !== 'admin')) {
    return c.json({ error: 'Unauthorized. Dealer access required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const db = new WorkerDatabase(c.env);
    const settings = await db.getSettings();

    const propId = `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const propCode = `SPP-${(body.district || 'TN').substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newProperty: Property = {
      ...body,
      id: propId,
      propertyCode: propCode,
      dealerId: user.id,
      dealerName: user.businessName || user.name,
      dealerPhonePrivate: user.phone,
      dealerEmailPrivate: user.email,
      status: settings.autoApproveProperties ? 'available' : 'pending_approval',
      verified: Boolean(user.dealerStatus === 'verified'),
      featured: false,
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await db.createProperty(newProperty);
    return c.json(saved, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create property' }, 500);
  }
});

// PATCH /admin/properties/:id/status (Admin approval / rejection)
propertiesRouter.patch('/admin/:id/status', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden. Admin privileges required.' }, 403);
  }

  const id = c.req.param('id');
  const { status, reason } = await c.req.json();
  const db = new WorkerDatabase(c.env);
  const updated = await db.updatePropertyStatus(id, status, reason, user.id);

  if (!updated) {
    return c.json({ error: 'Property not found' }, 404);
  }

  return c.json(updated);
});
