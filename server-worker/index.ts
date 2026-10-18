import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types.ts';
import { authRouter } from './routes/auth.ts';
import { propertiesRouter } from './routes/properties.ts';
import { enquiriesRouter } from './routes/enquiries.ts';
import { siteVisitsRouter } from './routes/siteVisits.ts';
import { paymentsRouter } from './routes/payments.ts';
import { uploadRouter } from './routes/upload.ts';
import { settingsRouter } from './routes/settings.ts';
import { notificationsRouter } from './routes/notifications.ts';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all incoming cross-origin requests
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  maxAge: 86400
}));

// Health check endpoints
app.get('/health', (c) => c.text('OK'));
app.get('/api/health', (c) => c.json({
  status: 'ok',
  app: 'SPP Nestora Real-Estate Production API (Cloudflare Worker Edge)',
  tagline: 'Find Your Place. Build Your Future.',
  runtime: 'cloudflare_workers',
  timestamp: new Date().toISOString()
}));

// Mount API sub-routers
app.route('/api/auth', authRouter);
app.route('/api/properties', propertiesRouter);
app.route('/api/enquiries', enquiriesRouter);
app.route('/api/site-visits', siteVisitsRouter);
app.route('/api/payments', paymentsRouter);
app.route('/api/upload', uploadRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/notifications', notificationsRouter);

// Aliases for dealer and admin property routes matching frontend apiService endpoints
app.get('/api/dealer/properties', async (c) => {
  return propertiesRouter.fetch(new Request(new URL('/dealer/my-properties', c.req.url), c.req.raw), c.env);
});
app.post('/api/dealer/properties', async (c) => {
  return propertiesRouter.fetch(new Request(new URL('/dealer/create', c.req.url), c.req.raw), c.env);
});
app.patch('/api/admin/properties/:id/status', async (c) => {
  const id = c.req.param('id');
  return propertiesRouter.fetch(new Request(new URL(`/admin/${id}/status`, c.req.url), c.req.raw), c.env);
});

export default app;
