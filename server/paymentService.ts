import crypto from 'crypto';
import { db } from './db.ts';
import type { Payment } from '../src/types/index.ts';

export interface PaymentMethodsStatus {
  upi: boolean;
  upiIntent: boolean;
  upiQr: boolean;
  card: boolean;
  netbanking: boolean;
  wallet: boolean;
  rawDetails?: any;
}

export interface PaymentOrderRequest {
  dealerId: string;
  dealerName: string;
  propertyId: string;
  propertyTitle: string;
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet';
  clientGivenAmount?: number;
}

export interface PaymentOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  keyId?: string;
  isSandbox: boolean;
  status: 'created';
  methods?: PaymentMethodsStatus;
}

export interface PaymentVerificationRequest {
  orderId: string;
  paymentId: string;
  signature?: string;
  dealerId: string;
  dealerName: string;
  propertyId: string;
  propertyTitle: string;
  method: 'upi' | 'card' | 'netbanking' | 'wallet';
}

export interface IPaymentGateway {
  readonly isSandbox: boolean;
  createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult>;
  verifyPayment(req: PaymentVerificationRequest): Promise<{ success: boolean; paymentRecord: Payment }>;
  getPaymentMethods(): Promise<PaymentMethodsStatus>;
}

/**
 * Production-Ready Razorpay Gateway
 * Handles live and test mode Razorpay orders with cryptographic HMAC SHA-256 signature verification.
 */
export class RazorpayPaymentGateway implements IPaymentGateway {
  private keyId: string;
  private keySecret: string;
  public readonly isSandbox: boolean;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.isSandbox = keyId.startsWith('rzp_test_');
  }

  async getPaymentMethods(): Promise<PaymentMethodsStatus> {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/methods', {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        }
      });
      if (response.ok) {
        const data: any = await response.json();
        return {
          upi: Boolean(data.upi),
          upiIntent: Boolean(data.upi_intent),
          upiQr: Boolean(data.upi || data.upi_intent),
          card: Boolean(data.card),
          netbanking: Boolean(data.netbanking && Object.keys(data.netbanking).length > 0),
          wallet: Boolean(data.wallet && Object.keys(data.wallet).length > 0)
        };
      }
    } catch (err: any) {
      console.warn('[Razorpay] Methods API inspection notice:', err?.message || err);
    }
    return {
      upi: true,
      upiIntent: true,
      upiQr: true,
      card: true,
      netbanking: true,
      wallet: true
    };
  }

  async createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult> {
    // 1. Resolve listing fee from authoritative backend settings
    const settings = db.getSettings();
    const serverVerifiedAmount = settings.listingFeeAmount || 10;
    const amountInPaise = Math.round(serverVerifiedAmount * 100);

    // 2. Prevent duplicate active payments for already paid properties
    const existingPayments = db.getSnapshot().payments;
    const alreadyPaid = existingPayments.find(p => p.propertyId === req.propertyId && p.status === 'success');
    if (alreadyPaid) {
      throw new Error(`Property ${req.propertyId} already has a confirmed listing fee payment (${alreadyPaid.transactionRef || alreadyPaid.id}).`);
    }

    // 3. Make official Razorpay API order creation call
    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `rcpt_${req.propertyId.slice(-8)}_${Date.now() % 100000}`,
          notes: {
            propertyId: req.propertyId,
            propertyTitle: req.propertyTitle.slice(0, 40),
            dealerId: req.dealerId,
            dealerName: req.dealerName,
            feeType: 'property_listing_fee'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Razorpay Error] Order creation failed:', errorData);
        throw new Error(`Razorpay Order Creation Failed: ${(errorData as any)?.error?.description || response.statusText}`);
      }

      const orderData: any = await response.json();

      // Record pending payment in database for tracking and webhook matching
      db.recordPayment({
        dealerId: req.dealerId,
        dealerName: req.dealerName,
        propertyId: req.propertyId,
        propertyTitle: req.propertyTitle,
        amount: serverVerifiedAmount,
        currency: 'INR',
        method: req.paymentMethod || 'upi',
        status: 'pending',
        orderId: orderData.id,
        transactionRef: `ORD-${orderData.id}`,
        verificationMethod: 'razorpay_signature',
        auditLog: [
          {
            action: 'Razorpay order created',
            timestamp: new Date().toISOString(),
            source: 'checkout_callback',
            details: `Order ID: ${orderData.id}`
          }
        ]
      });

      let methods: PaymentMethodsStatus | undefined;
      try {
        methods = await this.getPaymentMethods();
      } catch (_) {}

      return {
        orderId: orderData.id,
        amount: serverVerifiedAmount,
        currency: 'INR',
        keyId: this.keyId,
        isSandbox: this.isSandbox,
        status: 'created',
        methods
      };
    } catch (err: any) {
      console.error('[Razorpay] Network/API exception:', err.message);
      throw new Error(`Razorpay gateway error: ${err.message}`);
    }
  }

  async verifyPayment(req: PaymentVerificationRequest): Promise<{ success: boolean; paymentRecord: Payment }> {
    const settings = db.getSettings();
    const serverVerifiedAmount = settings.listingFeeAmount || 10;

    if (!req.signature) {
      throw new Error('Missing Razorpay payment signature from client payload.');
    }

    // 1. Verify HMAC SHA-256 signature
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${req.orderId}|${req.paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(req.signature, 'utf8');
    const isValid = expectedBuf.length === signatureBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf);

    if (!isValid) {
      console.warn(`[Razorpay Security Alert] Invalid signature for Order ${req.orderId} / Payment ${req.paymentId}`);
      throw new Error('Payment signature verification failed. Possible tampering detected.');
    }

    // 2. Prevent duplicate receipt/payment record
    const existing = db.getSnapshot().payments.find(p => p.transactionRef === `RZP-${req.paymentId}` || (p.orderId === req.orderId && p.status === 'success'));
    if (existing) {
      return { success: true, paymentRecord: existing };
    }

    // 3. Save verified payment in persistent relational DB
    const paymentRecord = db.recordPayment({
      dealerId: req.dealerId,
      dealerName: req.dealerName,
      propertyId: req.propertyId,
      propertyTitle: req.propertyTitle,
      amount: serverVerifiedAmount,
      currency: 'INR',
      method: req.method || 'upi',
      status: 'success',
      orderId: req.orderId,
      paymentId: req.paymentId,
      transactionRef: `RZP-${req.paymentId}`,
      verificationMethod: 'razorpay_signature',
      verifiedAt: new Date().toISOString(),
      auditLog: [
        {
          action: 'Payment verified via Razorpay Checkout signature',
          timestamp: new Date().toISOString(),
          source: 'checkout_callback',
          details: `Payment ID: ${req.paymentId}, Order ID: ${req.orderId}`
        }
      ]
    });

    // 4. Update property status to pending_approval (Admin review required; NEVER publish directly)
    db.updatePropertyStatus(req.propertyId, 'pending_approval', req.dealerId, 'dealer', 'Listing fee paid successfully via Razorpay Checkout');

    return {
      success: true,
      paymentRecord
    };
  }
}

/**
 * Sandbox Simulation Gateway
 * Used automatically when live Razorpay API keys are not supplied in .env
 */
export class SandboxPaymentGateway implements IPaymentGateway {
  public readonly isSandbox = true;

  async getPaymentMethods(): Promise<PaymentMethodsStatus> {
    return {
      upi: true,
      upiIntent: true,
      upiQr: true,
      card: true,
      netbanking: true,
      wallet: true
    };
  }

  async createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult> {
    const settings = db.getSettings();
    const serverVerifiedAmount = settings.listingFeeAmount || 10;

    const existingPayments = db.getSnapshot().payments;
    const alreadyPaid = existingPayments.find(p => p.propertyId === req.propertyId && p.status === 'success');
    if (alreadyPaid) {
      throw new Error(`Property ${req.propertyId} already has a confirmed listing fee payment (${alreadyPaid.transactionRef || alreadyPaid.id}).`);
    }

    const orderId = `order_sb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Track pending payment
    db.recordPayment({
      dealerId: req.dealerId,
      dealerName: req.dealerName,
      propertyId: req.propertyId,
      propertyTitle: req.propertyTitle,
      amount: serverVerifiedAmount,
      currency: 'INR',
      method: req.paymentMethod || 'upi',
      status: 'pending',
      orderId,
      transactionRef: `ORD-${orderId}`,
      verificationMethod: 'sandbox_simulation',
      auditLog: [
        {
          action: 'Sandbox payment order initialized',
          timestamp: new Date().toISOString(),
          source: 'checkout_callback',
          details: `Order ID: ${orderId}`
        }
      ]
    });

    return {
      orderId,
      amount: serverVerifiedAmount,
      currency: 'INR',
      keyId: 'rzp_test_spp_nestora_sandbox',
      isSandbox: true,
      status: 'created',
      methods: {
        upi: true,
        upiIntent: true,
        upiQr: true,
        card: true,
        netbanking: true,
        wallet: true
      }
    };
  }

  async verifyPayment(req: PaymentVerificationRequest): Promise<{ success: boolean; paymentRecord: Payment }> {
    const settings = db.getSettings();
    const serverVerifiedAmount = settings.listingFeeAmount || 10;

    // Prevent duplicate payment verification for same property
    const existingPayments = db.getSnapshot().payments;
    const alreadyPaid = existingPayments.find(p => p.propertyId === req.propertyId && p.status === 'success');
    if (alreadyPaid) {
      throw new Error(`Property ${req.propertyId} already has a confirmed listing fee payment (${alreadyPaid.transactionRef || alreadyPaid.id}). Duplicate payments are blocked.`);
    }

    const paymentId = req.paymentId || `sb_pay_${Date.now()}`;
    const transactionRef = `SB-TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    
    const paymentRecord = db.recordPayment({
      dealerId: req.dealerId,
      dealerName: req.dealerName,
      propertyId: req.propertyId,
      propertyTitle: req.propertyTitle,
      amount: serverVerifiedAmount,
      currency: 'INR',
      method: req.method || 'upi',
      status: 'success',
      orderId: req.orderId,
      paymentId,
      transactionRef,
      verificationMethod: 'sandbox_simulation',
      verifiedAt: new Date().toISOString(),
      auditLog: [
        {
          action: 'Payment verified in Sandbox mode',
          timestamp: new Date().toISOString(),
          source: 'checkout_callback',
          details: `Ref: ${transactionRef}`
        }
      ]
    });

    // Advance property to pending_approval (Admin review required)
    db.updatePropertyStatus(req.propertyId, 'pending_approval', req.dealerId, 'dealer', 'Listing fee paid in Sandbox mode');

    return {
      success: true,
      paymentRecord
    };
  }
}

// Webhook signature validator (Supports raw Buffer or UTF-8 String)
export function verifyRazorpayWebhookSignature(rawBody: string | Buffer, signature: string, webhookSecret: string): boolean {
  if (!signature || !webhookSecret) return false;
  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureBuf = Buffer.from(signature, 'utf8');

    return expectedBuf.length === signatureBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

// Reconcile payment from webhook event
export function handleWebhookPaymentReconciliation(event: any): { success: boolean; message: string; payment?: Payment } {
  try {
    if (!event) {
      return { success: false, message: 'Empty webhook payload' };
    }

    const eventId = event.id;
    const eventType = event.event || 'payment.captured';

    // 1. Idempotency Check: Don't reprocess identical webhook event delivery
    if (eventId && db.isWebhookEventProcessed(eventId)) {
      const existingPayment = db.getPaymentByRazorpayPaymentId(event.payload?.payment?.entity?.id) ||
                              db.getPaymentByOrderId(event.payload?.payment?.entity?.order_id);
      return { 
        success: true, 
        message: `Webhook event ${eventId} already processed (idempotent acknowledgement)`, 
        payment: existingPayment 
      };
    }

    const paymentEntity = event?.payload?.payment?.entity || event?.payload?.order?.entity;
    if (!paymentEntity) {
      return { success: false, message: 'Missing payment entity in webhook payload' };
    }

    const propertyId = paymentEntity.notes?.propertyId;
    const propertyTitle = paymentEntity.notes?.propertyTitle || 'Property Listing';
    const dealerId = paymentEntity.notes?.dealerId || 'dealer';
    const paymentId = paymentEntity.id;
    const orderId = paymentEntity.order_id;
    const method = (paymentEntity.method || 'upi') as 'upi' | 'card' | 'netbanking' | 'wallet';

    if (!propertyId) {
      return { success: false, message: 'Webhook event has no propertyId note attached' };
    }

    // 2. Validate Currency (Must be INR)
    const currency = String(paymentEntity.currency || 'INR').toUpperCase();
    if (currency !== 'INR') {
      return { success: false, message: `Invalid webhook currency: expected INR, received ${currency}` };
    }

    // 3. Validate Amount (Must be exactly 1000 paise / ₹10)
    const amountInPaise = Number(paymentEntity.amount || 0);
    if (amountInPaise !== 1000) {
      return { success: false, message: `Invalid webhook payment amount: expected 1000 paise (₹10), received ${amountInPaise}` };
    }
    const amountInRupees = 10;

    // 4. Handle 'payment.failed'
    if (eventType === 'payment.failed') {
      // CRITICAL: Never allow a failed event to overwrite a previously confirmed successful payment
      const existingSuccess = db.getSnapshot().payments.find(
        p => (p.propertyId === propertyId && p.status === 'success') || 
             (p.transactionRef === `RZP-${paymentId}` && p.status === 'success')
      );

      if (existingSuccess) {
        if (eventId) db.recordWebhookEvent(eventId, eventType, event.payload);
        return { 
          success: true, 
          message: 'Ignored failed event: property already has a confirmed successful payment',
          payment: existingSuccess 
        };
      }

      // Record failed payment
      const failedPayment = db.recordPayment({
        dealerId,
        dealerName: 'Dealer',
        propertyId,
        propertyTitle,
        amount: amountInRupees,
        currency: 'INR',
        method,
        status: 'failed',
        orderId,
        paymentId,
        transactionRef: `RZP-${paymentId}`,
        verificationMethod: 'razorpay_webhook',
        webhookEventId: eventId,
        auditLog: [
          {
            action: 'Payment marked as failed via Razorpay webhook',
            timestamp: new Date().toISOString(),
            source: 'webhook',
            details: `Error: ${paymentEntity.error_description || 'Payment Failed'}`
          }
        ]
      });

      if (eventId) db.recordWebhookEvent(eventId, eventType, event.payload);
      return { success: true, message: 'Payment failure recorded safely', payment: failedPayment };
    }

    // 5. Handle 'payment.captured' or 'order.paid'
    const existing = db.getSnapshot().payments.find(
      p => p.transactionRef === `RZP-${paymentId}` || 
           (p.orderId && p.orderId === orderId && p.status === 'success') ||
           (p.propertyId === propertyId && p.status === 'success')
    );

    if (existing) {
      if (eventId) db.recordWebhookEvent(eventId, eventType, event.payload);
      return { success: true, message: 'Payment already reconciled', payment: existing };
    }

    const dealer = db.findUserById(dealerId) || db.findUserByEmail(paymentEntity.email);
    const dealerName = dealer?.businessName || dealer?.name || 'Authorized Dealer';

    const paymentRecord = db.recordPayment({
      dealerId: dealer?.id || dealerId,
      dealerName,
      propertyId,
      propertyTitle,
      amount: amountInRupees,
      currency: 'INR',
      method,
      status: 'success',
      orderId,
      paymentId,
      transactionRef: `RZP-${paymentId}`,
      verificationMethod: 'razorpay_webhook',
      webhookEventId: eventId,
      verifiedAt: new Date().toISOString(),
      auditLog: [
        {
          action: 'Payment verified and captured via Razorpay webhook',
          timestamp: new Date().toISOString(),
          source: 'webhook',
          details: `Event ID: ${eventId}, Payment ID: ${paymentId}`
        }
      ]
    });

    // Advance property to pending_approval for Admin review (NOT automatically published)
    db.updatePropertyStatus(propertyId, 'pending_approval', dealer?.id || dealerId, 'dealer', 'Listing fee reconciled automatically via Razorpay webhook');

    // Record webhook event for idempotency
    if (eventId) {
      db.recordWebhookEvent(eventId, eventType, event.payload);
    }

    return { success: true, message: 'Payment successfully reconciled via webhook', payment: paymentRecord };
  } catch (err: any) {
    return { success: false, message: err.message || 'Webhook reconciliation error' };
  }
}

// Server-side check for order payment status (Polled by frontend or fallback check)
export async function checkOrderStatus(orderId: string, propertyId?: string): Promise<{ status: string; payment?: Payment }> {
  // 1. Check local database first
  const existingPayment = db.getPaymentByOrderId(orderId) || (propertyId ? db.getPaymentByPropertyId(propertyId) : undefined);
  if (existingPayment && existingPayment.status === 'success') {
    return { status: 'success', payment: existingPayment };
  }

  // 2. If real Razorpay keys are configured, query official Orders API
  const rzpKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const rzpKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (rzpKeyId && rzpKeySecret && !rzpKeyId.includes('placeholder') && rzpKeyId.startsWith('rzp_')) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString('base64');
      const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
        headers: { 'Authorization': authHeader }
      });

      if (res.ok) {
        const data: any = await res.json();
        const items = data.items || [];
        const captured = items.find((item: any) => item.status === 'captured');

        if (captured && propertyId) {
          const prop = db.getPropertyById(propertyId);
          const paymentRecord = db.recordPayment({
            dealerId: captured.notes?.dealerId || prop?.dealerId || 'dealer',
            dealerName: captured.notes?.dealerName || prop?.dealerName || 'Dealer',
            propertyId,
            propertyTitle: captured.notes?.propertyTitle || prop?.title || 'Property Listing',
            amount: 10,
            currency: 'INR',
            method: (captured.method || 'upi') as any,
            status: 'success',
            orderId,
            paymentId: captured.id,
            transactionRef: `RZP-${captured.id}`,
            verificationMethod: 'razorpay_webhook',
            verifiedAt: new Date().toISOString(),
            auditLog: [
              {
                action: 'Payment verified via Razorpay Orders Status check',
                timestamp: new Date().toISOString(),
                source: 'status_poll',
                details: `Payment ID: ${captured.id}`
              }
            ]
          });

          db.updatePropertyStatus(propertyId, 'pending_approval', paymentRecord.dealerId, 'dealer', 'Listing fee verified via Order Status Check');
          return { status: 'success', payment: paymentRecord };
        }
      }
    } catch (err: any) {
      console.warn('[Razorpay Order Status Check Warning]:', err.message);
    }
  }

  return { status: existingPayment ? existingPayment.status : 'pending', payment: existingPayment };
}

// Instantiate proper gateway depending on environment
const rzpKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
const rzpKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

const isRealKeysConfigured = Boolean(
  rzpKeyId && 
  rzpKeySecret && 
  !rzpKeyId.includes('placeholder') && 
  rzpKeyId.startsWith('rzp_')
);

export const paymentGateway: IPaymentGateway = isRealKeysConfigured
  ? new RazorpayPaymentGateway(rzpKeyId, rzpKeySecret)
  : new SandboxPaymentGateway();

console.log(`[SPP Nestora Payment] Gateway initialized: ${isRealKeysConfigured ? (rzpKeyId.startsWith('rzp_live_') ? 'LIVE Razorpay Gateway' : 'TEST Razorpay Gateway') : 'Sandbox Gateway (No live keys provided)'}`);
