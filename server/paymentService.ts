import crypto from 'crypto';
import { db } from './db.ts';
import type { Payment } from '../src/types/index.ts';

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

      return {
        orderId: orderData.id,
        amount: serverVerifiedAmount,
        currency: 'INR',
        keyId: this.keyId,
        isSandbox: this.isSandbox,
        status: 'created'
      };
    } catch (err: any) {
      console.error('[Razorpay] Network/API exception:', err.message);
      // If live keys are invalid placeholders, inform safely
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

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(req.signature, 'utf8')
    );

    if (!isValid) {
      console.warn(`[Razorpay Security Alert] Invalid signature for Order ${req.orderId} / Payment ${req.paymentId}`);
      throw new Error('Payment signature verification failed. Possible tampering detected.');
    }

    // 2. Prevent duplicate receipt/payment record
    const existing = db.getSnapshot().payments.find(p => p.transactionRef === `RZP-${req.paymentId}`);
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
      method: req.method || 'upi',
      status: 'success',
      transactionRef: `RZP-${req.paymentId}`
    });

    // 4. Update property status to pending_approval and log audit trail
    db.updatePropertyStatus(req.propertyId, 'pending_approval', req.dealerId, 'dealer', 'Listing fee paid successfully via Razorpay');

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

  async createOrder(req: PaymentOrderRequest): Promise<PaymentOrderResult> {
    const settings = db.getSettings();
    const serverVerifiedAmount = settings.listingFeeAmount || 10;

    const existingPayments = db.getSnapshot().payments;
    const alreadyPaid = existingPayments.find(p => p.propertyId === req.propertyId && p.status === 'success');
    if (alreadyPaid) {
      throw new Error(`Property ${req.propertyId} already has a confirmed listing fee payment (${alreadyPaid.transactionRef || alreadyPaid.id}).`);
    }

    const orderId = `order_sb_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      orderId,
      amount: serverVerifiedAmount,
      currency: 'INR',
      keyId: 'rzp_test_spp_nestora_sandbox',
      isSandbox: true,
      status: 'created'
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

    const transactionRef = `SB-TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    
    const paymentRecord = db.recordPayment({
      dealerId: req.dealerId,
      dealerName: req.dealerName,
      propertyId: req.propertyId,
      propertyTitle: req.propertyTitle,
      amount: serverVerifiedAmount,
      method: req.method || 'upi',
      status: 'success',
      transactionRef
    });

    // Advance property to pending_approval
    db.updatePropertyStatus(req.propertyId, 'pending_approval', req.dealerId, 'dealer', 'Listing fee paid in Sandbox mode');

    return {
      success: true,
      paymentRecord
    };
  }
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


console.log(`[SPP Nestora Payment] Gateway initialized: ${isRealKeysConfigured ? 'Live/Test Razorpay Gateway' : 'Sandbox Gateway (No live keys provided)'}`);
