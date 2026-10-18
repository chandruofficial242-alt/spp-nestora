import { Hono } from 'hono';
import type { Env } from '../types.ts';
import type { Payment } from '../../src/types/index.ts';
import { WorkerDatabase } from '../db.ts';
import { verifyAuthToken } from '../crypto.ts';

export const paymentsRouter = new Hono<{ Bindings: Env }>();

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

// Handler for manual UPI submission
async function handleManualSubmit(c: any) {
  const user = await getAuthUser(c);
  if (!user || (user.role !== 'dealer' && user.role !== 'admin')) {
    return c.json({ error: 'Unauthorized. Dealer access required.' }, 403);
  }

  try {
    const { propertyId, utr, screenshotUrl } = await c.req.json();
    if (!propertyId || !utr) {
      return c.json({ error: 'propertyId and utr are required.' }, 400);
    }

    const db = new WorkerDatabase(c.env);
    const prop = await db.getPropertyById(propertyId);
    if (!prop) {
      return c.json({ error: 'Property not found.' }, 404);
    }

    const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const receiptNumber = `RCP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment: Payment = {
      id: paymentId,
      receiptNumber,
      orderId: `order-${paymentId}`,
      dealerId: user.id,
      dealerName: user.businessName || user.name,
      propertyId: prop.id,
      propertyTitle: prop.title,
      amount: 10,
      currency: 'INR',
      status: 'pending',
      feeType: 'listing_fee',
      method: 'manual_upi_qr',
      transactionRef: utr.trim(),
      createdAt: new Date().toISOString()
    };

    (newPayment as any).utr = utr.trim();
    (newPayment as any).screenshotUrl = screenshotUrl || null;
    (newPayment as any).auditLog = [{
      timestamp: new Date().toISOString(),
      action: 'dealer_submitted_upi',
      utr: utr.trim(),
      actorId: user.id
    }];

    const saved = await db.createPayment(newPayment);
    return c.json({
      success: true,
      payment: saved,
      property: prop,
      message: 'Payment proof submitted successfully'
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to submit payment' }, 500);
  }
}

// POST /payments/submit-manual (Matches frontend apiService.submitManualPayment)
paymentsRouter.post('/submit-manual', handleManualSubmit);

// POST /payments/manual-upi/submit (Backwards-compatible alias)
paymentsRouter.post('/manual-upi/submit', handleManualSubmit);

// GET /payments/manual (Matches frontend apiService.getManualPayments)
paymentsRouter.get('/manual', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new WorkerDatabase(c.env);
  const payments = await db.getPayments(user.role === 'admin' ? undefined : user.id);
  return c.json(payments);
});

// GET /payments (Matches frontend apiService.getPayments)
paymentsRouter.get('/', async (c) => {
  const user = await getAuthUser(c);
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  const db = new WorkerDatabase(c.env);
  const payments = await db.getPayments(user.role === 'admin' ? undefined : user.id);
  return c.json(payments);
});

// GET /payments/status/:propertyId (Matches frontend apiService.checkPaymentStatus)
paymentsRouter.get('/status/:propertyId', async (c) => {
  const propertyId = c.req.param('propertyId');
  const db = new WorkerDatabase(c.env);
  const prop = await db.getPropertyById(propertyId);
  const payments = await db.getPayments();
  const payment = payments.find(p => p.propertyId === propertyId);

  return c.json({
    paymentStatus: payment ? payment.status : 'not_started',
    propertyStatus: prop ? prop.status : undefined,
    payment
  });
});

// POST /payments/manual/:id/verify (Matches frontend apiService.verifyManualPayment)
paymentsRouter.post('/manual/:id/verify', async (c) => {
  const user = await getAuthUser(c);
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden. Admin privileges required.' }, 403);
  }

  const id = c.req.param('id');
  const db = new WorkerDatabase(c.env);
  const updated = await db.updatePaymentVerification(id, 'success', user.id, user.name);

  if (!updated) {
    return c.json({ error: 'Payment record not found' }, 404);
  }

  const prop = await db.getPropertyById(updated.propertyId);
  return c.json({
    success: true,
    payment: updated,
    property: prop,
    message: 'Manual payment verified successfully'
  });
});

// POST /payments/manual/:id/reject (Matches frontend apiService.rejectManualPayment)
paymentsRouter.post('/manual/:id/reject', async (c) => {
  const user = await getAuthUser(c);
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden. Admin privileges required.' }, 403);
  }

  const id = c.req.param('id');
  const { reason } = await c.req.json();
  const db = new WorkerDatabase(c.env);
  const updated = await db.updatePaymentVerification(id, 'failed', user.id, user.name, reason);

  if (!updated) {
    return c.json({ error: 'Payment record not found' }, 404);
  }

  const prop = await db.getPropertyById(updated.propertyId);
  return c.json({
    success: true,
    payment: updated,
    property: prop,
    message: 'Manual payment rejected'
  });
});
