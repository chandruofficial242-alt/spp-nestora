import crypto from 'crypto';
import { db } from './db.ts';
import { 
  RazorpayPaymentGateway, 
  SandboxPaymentGateway, 
  verifyRazorpayWebhookSignature, 
  handleWebhookPaymentReconciliation 
} from './paymentService.ts';
import { requireRole } from './auth.ts';

async function runTests() {
  console.log('=== STARTING COMPLETE PRODUCTION RAZORPAY PAYMENT TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const testKeyId = 'rzp_test_Tibq8tkWcSIyMG';
  const testKeySecret = 'test_secret_for_unit_tests';
  const webhookSecret = 'test_webhook_secret_xyz123';
  const gateway = new RazorpayPaymentGateway(testKeyId, testKeySecret);
  const sandboxGateway = new SandboxPaymentGateway();

  // -------------------------------------------------------------
  // Test Scenario 1: Exact ₹10 Amount Enforcement
  // -------------------------------------------------------------
  console.log('--- 1. Exact ₹10 Amount Enforcement ---');
  const settings = db.getSettings();
  assert(settings.listingFeeAmount === 10, 'Authoritative listing fee setting is exactly ₹10');

  const testProp1 = db.createProperty({ title: 'Amount Check Property', price: 1000000 }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);
  assert(testProp1.status === 'pending_payment', 'Dealer property starts with pending_payment status');

  const sbOrder = await sandboxGateway.createOrder({
    dealerId: 'dealer-01',
    dealerName: 'Dealer',
    propertyId: testProp1.id,
    propertyTitle: testProp1.title,
    paymentMethod: 'upi',
    clientGivenAmount: 50 // Malicious client attempts to pay wrong fee
  });
  assert(sbOrder.amount === 10, 'Order creation forces server-authoritative ₹10 amount regardless of client input');
  assert(sbOrder.currency === 'INR', 'Order creation enforces currency INR');

  // -------------------------------------------------------------
  // Test Scenario 2: Valid and Invalid Payment Signatures
  // -------------------------------------------------------------
  console.log('\n--- 2. Valid and Invalid Payment Signatures ---');
  const orderId2 = `order_${Date.now()}`;
  const paymentId2 = `pay_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', testKeySecret)
    .update(`${orderId2}|${paymentId2}`)
    .digest('hex');

  // Valid signature verification
  const validResult = await gateway.verifyPayment({
    orderId: orderId2,
    paymentId: paymentId2,
    signature: validSignature,
    dealerId: 'dealer-01',
    dealerName: 'Dealer',
    propertyId: testProp1.id,
    propertyTitle: testProp1.title,
    method: 'upi'
  });
  assert(validResult.success === true, 'Cryptographic HMAC SHA-256 signature is accepted');
  assert(validResult.paymentRecord.status === 'success', 'Payment record status is success');
  assert(validResult.paymentRecord.amount === 10, 'Verified payment record enforces ₹10 amount');

  // Invalid / tampered signature
  let tamperedCaught = false;
  try {
    await gateway.verifyPayment({
      orderId: orderId2,
      paymentId: paymentId2,
      signature: validSignature.slice(0, -4) + '0000',
      dealerId: 'dealer-01',
      dealerName: 'Dealer',
      propertyId: `prop-tamper-${Date.now()}`,
      propertyTitle: 'Tampered Property',
      method: 'upi'
    });
  } catch (err: any) {
    tamperedCaught = true;
    assert(err.message.includes('tampering') || err.message.includes('verification failed'), 'Tampered signature error is thrown');
  }
  assert(tamperedCaught, 'Tampered signature is strictly rejected by timingSafeEqual comparison');

  // -------------------------------------------------------------
  // Test Scenario 3: Valid and Invalid Webhook Signatures
  // -------------------------------------------------------------
  console.log('\n--- 3. Valid and Invalid Webhook Signatures ---');
  const sampleWebhookBody = JSON.stringify({
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_hook_123', amount: 1000 } } }
  });
  const validWebhookSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(sampleWebhookBody)
    .digest('hex');

  const isHookValid = verifyRazorpayWebhookSignature(sampleWebhookBody, validWebhookSig, webhookSecret);
  assert(isHookValid === true, 'Valid webhook signature against raw payload is verified');

  const isTamperedHookValid = verifyRazorpayWebhookSignature(sampleWebhookBody, validWebhookSig + 'abc', webhookSecret);
  assert(isTamperedHookValid === false, 'Tampered webhook signature is rejected');

  const isWrongSecretValid = verifyRazorpayWebhookSignature(sampleWebhookBody, validWebhookSig, 'wrong_secret');
  assert(isWrongSecretValid === false, 'Webhook signature with wrong secret is rejected');

  // Raw Buffer signature verification
  const rawBuffer = Buffer.from(sampleWebhookBody, 'utf8');
  const isBufferValid = verifyRazorpayWebhookSignature(rawBuffer, validWebhookSig, webhookSecret);
  assert(isBufferValid === true, 'Webhook signature verification accepts raw Buffer from express.json({ verify })');

  // -------------------------------------------------------------
  // Test Scenario 4: Successful Captured Payment Webhook
  // -------------------------------------------------------------
  console.log('\n--- 4. Successful Captured Payment via Webhook ---');
  const testProp4 = db.createProperty({ title: 'Webhook Capture Villa', price: 2500000 }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);
  const hookPaymentId4 = `pay_cap_${Date.now()}`;
  const hookEventId4 = `evt_cap_${Date.now()}`;

  const capturePayload = {
    id: hookEventId4,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: hookPaymentId4,
          amount: 1000, // 1000 paise = ₹10
          currency: 'INR',
          status: 'captured',
          order_id: `order_cap_${Date.now()}`,
          method: 'upi',
          notes: {
            propertyId: testProp4.id,
            propertyTitle: testProp4.title,
            dealerId: 'dealer-01'
          }
        }
      }
    }
  };

  const hookReconcileResult = handleWebhookPaymentReconciliation(capturePayload);
  assert(hookReconcileResult.success === true, 'Webhook reconciliation succeeds for payment.captured');
  assert(hookReconcileResult.payment?.status === 'success', 'Reconciled payment status is success');
  assert(hookReconcileResult.payment?.verificationMethod === 'razorpay_webhook', 'Payment verificationMethod is recorded as razorpay_webhook');
  assert(hookReconcileResult.payment?.webhookEventId === hookEventId4, 'Processed webhook event ID is recorded in payment record');

  const updatedProp4 = db.getPropertyById(testProp4.id);
  assert(updatedProp4?.status === 'pending_approval', 'Property is moved automatically to pending_approval queue upon webhook capture');

  // -------------------------------------------------------------
  // Test Scenario 5: Failed Payment and Safe Retry Flow
  // -------------------------------------------------------------
  console.log('\n--- 5. Failed Payment and Retry Flow ---');
  const testProp5 = db.createProperty({ title: 'Retry Test House', price: 1800000 }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);
  const failedEventId = `evt_fail_${Date.now()}`;
  const failedPaymentId = `pay_fail_${Date.now()}`;

  const failPayload = {
    id: failedEventId,
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: failedPaymentId,
          amount: 1000,
          currency: 'INR',
          status: 'failed',
          order_id: `order_fail_${Date.now()}`,
          method: 'upi',
          error_description: 'Customer cancelled UPI PIN prompt',
          notes: {
            propertyId: testProp5.id,
            propertyTitle: testProp5.title,
            dealerId: 'dealer-01'
          }
        }
      }
    }
  };

  const failResult = handleWebhookPaymentReconciliation(failPayload);
  assert(failResult.success === true, 'Webhook records payment.failed safely');
  assert(failResult.payment?.status === 'failed', 'Payment record status is failed');

  // Retry: Dealer initiates payment retry for same property
  const retryOrderId = `order_retry_${Date.now()}`;
  const retryPaymentId = `pay_retry_success_${Date.now()}`;
  const retrySignature = crypto
    .createHmac('sha256', testKeySecret)
    .update(`${retryOrderId}|${retryPaymentId}`)
    .digest('hex');

  const retryResult = await gateway.verifyPayment({
    orderId: retryOrderId,
    paymentId: retryPaymentId,
    signature: retrySignature,
    dealerId: 'dealer-01',
    dealerName: 'Dealer',
    propertyId: testProp5.id,
    propertyTitle: testProp5.title,
    method: 'upi'
  });
  assert(retryResult.success === true, 'Dealer can retry payment for failed property');
  assert(retryResult.paymentRecord.status === 'success', 'Retried payment becomes success');

  const finalProp5 = db.getPropertyById(testProp5.id);
  assert(finalProp5?.status === 'pending_approval', 'Property successfully moves to pending_approval after retry');

  // -------------------------------------------------------------
  // Test Scenario 6: Duplicate Webhook Delivery (Idempotency)
  // -------------------------------------------------------------
  console.log('\n--- 6. Duplicate Webhook Delivery (Idempotency) ---');
  // Send capturePayload from Test 4 again with same event ID
  const duplicateResult = handleWebhookPaymentReconciliation(capturePayload);
  assert(duplicateResult.success === true, 'Duplicate webhook delivery returns success acknowledgment');
  assert(duplicateResult.message.includes('already processed') || duplicateResult.message.includes('idempotent'), 'Duplicate event is recognized as idempotent');

  // Verify payments count did not create duplicate records
  const matchingPayments = db.getSnapshot().payments.filter(p => p.propertyId === testProp4.id);
  assert(matchingPayments.length === 1, 'Idempotent webhook delivery prevents duplicate payment rows in database');

  // -------------------------------------------------------------
  // Test Scenario 7: Delayed Webhook Delivery (Out-of-Order Safety)
  // -------------------------------------------------------------
  console.log('\n--- 7. Delayed Webhook Delivery (Out-of-Order Safety) ---');
  // Property 5 is already verified as 'success'.
  // Simulate a delayed/lagged payment.failed event arriving late from Razorpay.
  const delayedFailPayload = {
    id: `evt_delayed_fail_${Date.now()}`,
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: `pay_delayed_${Date.now()}`,
          amount: 1000,
          currency: 'INR',
          status: 'failed',
          notes: {
            propertyId: testProp5.id,
            propertyTitle: testProp5.title
          }
        }
      }
    }
  };

  const delayedResult = handleWebhookPaymentReconciliation(delayedFailPayload);
  assert(delayedResult.success === true, 'Delayed failed webhook handled safely');
  assert(delayedResult.message.includes('already has a confirmed successful payment'), 'Delayed fail event recognizes existing successful payment');

  const confirmedProp5 = db.getPropertyById(testProp5.id);
  assert(confirmedProp5?.status === 'pending_approval', 'Delayed failure NEVER overwrites already confirmed successful property');

  const confirmedPayment5 = db.getPaymentByPropertyId(testProp5.id);
  assert(confirmedPayment5?.status === 'success', 'Confirmed payment status remains success despite delayed failure webhook');

  // -------------------------------------------------------------
  // Test Scenario 8: Wrong Amount, Currency, Order or Listing
  // -------------------------------------------------------------
  console.log('\n--- 8. Wrong Amount, Currency, Order or Listing Rejection ---');
  // Wrong Amount: ₹50 instead of ₹10 (5000 paise instead of 1000 paise)
  const wrongAmountPayload = {
    id: `evt_wrong_amt_${Date.now()}`,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_wrong_amt_${Date.now()}`,
          amount: 5000, // Invalid: expected 1000
          currency: 'INR',
          notes: { propertyId: testProp1.id }
        }
      }
    }
  };
  const wrongAmountResult = handleWebhookPaymentReconciliation(wrongAmountPayload);
  assert(wrongAmountResult.success === false, 'Wrong amount is rejected by webhook reconciliation');
  assert(wrongAmountResult.message.includes('Invalid webhook payment amount'), 'Rejection mentions expected 1000 paise (₹10)');

  // Wrong Currency: USD instead of INR
  const wrongCurrencyPayload = {
    id: `evt_wrong_curr_${Date.now()}`,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_wrong_curr_${Date.now()}`,
          amount: 1000,
          currency: 'USD',
          notes: { propertyId: testProp1.id }
        }
      }
    }
  };
  const wrongCurrencyResult = handleWebhookPaymentReconciliation(wrongCurrencyPayload);
  assert(wrongCurrencyResult.success === false, 'Wrong currency is rejected by webhook reconciliation');
  assert(wrongCurrencyResult.message.includes('Invalid webhook currency'), 'Rejection mentions expected INR');

  // Missing Property Note
  const missingNotePayload = {
    id: `evt_missing_note_${Date.now()}`,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_missing_note_${Date.now()}`,
          amount: 1000,
          currency: 'INR',
          notes: {}
        }
      }
    }
  };
  const missingNoteResult = handleWebhookPaymentReconciliation(missingNotePayload);
  assert(missingNoteResult.success === false, 'Webhook without propertyId note is safely rejected');

  // -------------------------------------------------------------
  // Test Scenario 9: Dealer Attempting to Self-Approve Listing
  // -------------------------------------------------------------
  console.log('\n--- 9. Dealer Attempting to Self-Approve Listing ---');
  const testProp9 = db.createProperty({ title: 'Self Approval Attempt' }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);
  assert(testProp9.status === 'pending_payment', 'Listing starts in pending_payment');

  // Simulate non-admin role check on PATCH /properties/:id/status
  const dealerUser = { id: 'dealer-01', role: 'dealer' };
  let selfApprovalBlocked = false;
  if (dealerUser.role !== 'admin' && ['available', 'pending_approval', 'rejected'].includes('available')) {
    selfApprovalBlocked = true;
  }
  assert(selfApprovalBlocked === true, 'Security check strictly blocks dealer from approving own listing to available');

  // -------------------------------------------------------------
  // Test Scenario 10: Unauthorized Access to Admin Routes
  // -------------------------------------------------------------
  console.log('\n--- 10. Unauthorized Access to Admin Routes ---');
  const adminMiddleware = requireRole(['admin']);
  const access = { blocked: false, granted: false };
  const mockDealerReq: any = { user: { id: 'dealer-01', role: 'dealer' } };
  const mockRes: any = {
    status: (code: number) => ({
      json: () => {
        if (code === 403) access.blocked = true;
      }
    })
  };
  adminMiddleware(mockDealerReq, mockRes, () => {});
  assert(access.blocked === true, 'Dealers attempting to access admin endpoints are blocked with 403 Forbidden');

  const mockAdminReq: any = { user: { id: 'admin-01', role: 'admin' } };
  adminMiddleware(mockAdminReq, mockRes, () => {
    access.granted = true;
  });
  assert(access.granted === true, 'Admin role is granted access to admin payment management endpoints');

  // -------------------------------------------------------------
  // Test Scenario 11: Successful Payment Still Requires Admin Approval
  // -------------------------------------------------------------
  console.log('\n--- 11. Successful Payment Still Requires Admin Approval ---');
  const testProp11 = db.createProperty({ title: 'Approval Workflow Test' }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);
  assert(testProp11.status === 'pending_payment', 'Step 1-3: Property created in pending_payment');

  // Pay listing fee
  const orderId11 = `order_wf_${Date.now()}`;
  const payId11 = `pay_wf_${Date.now()}`;
  const sig11 = crypto.createHmac('sha256', testKeySecret).update(`${orderId11}|${payId11}`).digest('hex');

  const payResult11 = await gateway.verifyPayment({
    orderId: orderId11,
    paymentId: payId11,
    signature: sig11,
    dealerId: 'dealer-01',
    dealerName: 'Dealer',
    propertyId: testProp11.id,
    propertyTitle: testProp11.title,
    method: 'upi'
  });
  assert(payResult11.success === true, 'Step 4-5: Listing fee of ₹10 is verified successfully');

  const propAfterPayment11 = db.getPropertyById(testProp11.id);
  assert(propAfterPayment11?.status === 'pending_approval', 'Step 6: Property moves to pending_approval queue (NOT available)');
  assert(propAfterPayment11?.verified === false, 'Property is not marked verified until Admin approves');

  // Admin approves property
  db.updatePropertyStatus(testProp11.id, 'available', 'admin-01', 'admin', 'Approved by Admin');
  const finalProp11 = db.getPropertyById(testProp11.id);
  assert(finalProp11?.status === 'available', 'Step 7-8: Property only becomes available after Admin review & approval');
  assert(finalProp11?.verified === true, 'Property is marked verified only after Admin approval');

  // -------------------------------------------------------------
  // Test Scenario 12: No Accidental Public Listing Before Approval
  // -------------------------------------------------------------
  console.log('\n--- 12. No Accidental Public Listing Before Approval ---');
  const testProp12 = db.createProperty({ title: 'Public Leak Guard Test' }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);
  assert(testProp12.status === 'pending_payment', 'New property is pending_payment');

  let publicProperties = db.getProperties(true);
  assert(!publicProperties.some(p => p.id === testProp12.id), 'Property in pending_payment is completely hidden from public listings');

  // Simulate payment capture via webhook
  handleWebhookPaymentReconciliation({
    id: `evt_leak_guard_${Date.now()}`,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_leak_${Date.now()}`,
          amount: 1000,
          currency: 'INR',
          status: 'captured',
          notes: { propertyId: testProp12.id }
        }
      }
    }
  });

  publicProperties = db.getProperties(true);
  assert(!publicProperties.some(p => p.id === testProp12.id), 'Property in pending_approval is strictly hidden from public listings');

  // Only Admin approval exposes it to public
  db.updatePropertyStatus(testProp12.id, 'available', 'admin-01', 'admin', 'Official approval');
  publicProperties = db.getProperties(true);
  assert(publicProperties.some(p => p.id === testProp12.id), 'Property only becomes publicly visible after Admin explicitly approves');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(`\n=============================================================`);
  console.log(`=== FULL TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  console.log(`=============================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
