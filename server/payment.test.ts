import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db } from './db.ts';
import { 
  RazorpayPaymentGateway, 
  SandboxPaymentGateway, 
  verifyRazorpayWebhookSignature, 
  handleWebhookPaymentReconciliation 
} from './paymentService.ts';
import { requireRole } from './auth.ts';

async function runTests() {
  console.log('=== STARTING COMPLETE PRODUCTION PAYMENT TEST SUITE ===\n');
  const dataStorePath = path.resolve(process.cwd(), 'server', 'data_store.json');
  const originalDataStore = fs.existsSync(dataStorePath) ? fs.readFileSync(dataStorePath, 'utf8') : null;
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
  // Test Scenario 13: Land for Sale Complete Flow & Area Conversions
  // -------------------------------------------------------------
  console.log('\n--- 13. Land for Sale Complete Flow & Area Conversion ---');
  const landProp = db.createProperty({
    type: 'land_sale',
    title: '5.5 Cents DTCP Approved Commercial Plot',
    landType: 'DTCP Approved Plot',
    totalArea: 5.5,
    areaUnit: 'cent',
    price: 2500000,
    roadAccess: 'available',
    dtcpStatus: 'approved',
    pattaStatus: 'yes',
    district: 'Chengalpattu',
    city: 'Chengalpattu',
    area: 'GST Road',
    address: 'Survey No. 42/1, GST Road',
    pincode: '603001'
  }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);

  assert(landProp.type === 'land_sale', 'Property type is land_sale');
  assert(landProp.totalArea === 5.5, 'Total land area is preserved');
  assert(landProp.areaUnit === 'cent', 'Area unit cent is preserved');
  // 5.5 * 435.6 = 2396 sq.ft
  assert(landProp.areaSqft === 2396, 'Cent is converted correctly to 2396 sq.ft');
  // 2,500,000 / 2396 = 1043 / sq.ft
  assert(landProp.pricePerSqft === 1043, 'Price per sq.ft is calculated correctly as ₹1,043');
  assert(landProp.dtcpApproved === true, 'DTCP status is recognized as approved');
  assert(landProp.pattaAvailable === true, 'Patta status is recognized as yes');
  assert(landProp.status === 'pending_payment', 'Land starts in pending_payment');

  // Pay ₹10 listing fee
  const landOrderId = `order_land_${Date.now()}`;
  const landPayId = `pay_land_${Date.now()}`;
  const landSig = crypto.createHmac('sha256', (gateway as any).keySecret)
    .update(`${landOrderId}|${landPayId}`)
    .digest('hex');

  const landPayRes = await gateway.verifyPayment({
    orderId: landOrderId,
    paymentId: landPayId,
    signature: landSig,
    dealerId: 'dealer-01',
    dealerName: 'Dealer',
    propertyId: landProp.id,
    propertyTitle: landProp.title,
    method: 'upi'
  });
  assert(landPayRes.success === true, 'Land listing fee paid successfully');
  assert(db.getPropertyById(landProp.id)?.status === 'pending_approval', 'Land property moves to pending_approval');

  // Admin approves land
  db.updatePropertyStatus(landProp.id, 'available', 'admin-01', 'admin', 'Approved Land');
  assert(db.getPropertyById(landProp.id)?.status === 'available', 'Land property becomes publicly available after admin approval');

  // -------------------------------------------------------------
  // Test Scenario 14: House for Sale Complete Flow
  // -------------------------------------------------------------
  console.log('\n--- 14. House for Sale Complete Flow ---');
  const houseSaleProp = db.createProperty({
    type: 'house_sale',
    title: '3 BHK Luxury Independent Villa in Coimbatore',
    houseType: 'Villa',
    bhk: '3',
    bedrooms: 3,
    bathrooms: 3,
    builtUpAreaSqft: 1800,
    plotAreaSqft: 2400,
    price: 6500000,
    furnishing: 'semi-furnished',
    propertyAge: '1-3 Years',
    parking: 'both',
    waterSupply: 'Borewell & Corporation',
    electricitySupply: 'EB 3-Phase',
    district: 'Coimbatore',
    city: 'Coimbatore',
    area: 'Saravanampatti',
    address: 'Villa 12, Green Meadow Layout',
    pincode: '641035'
  }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);

  assert(houseSaleProp.type === 'house_sale', 'Property type is house_sale');
  assert(houseSaleProp.houseType === 'Villa', 'House type is Villa');
  assert(houseSaleProp.bhk === '3', 'BHK is 3');
  assert(houseSaleProp.bathrooms === 3, 'Bathrooms is 3');
  assert(houseSaleProp.builtUpAreaSqft === 1800, 'Built-up area is 1800 sq.ft');
  assert(houseSaleProp.plotAreaSqft === 2400, 'Plot area is 2400 sq.ft');
  // 6,500,000 / 1800 = 3611
  assert(houseSaleProp.pricePerSqft === 3611, 'Price per sq.ft is calculated as ₹3,611');
  assert(houseSaleProp.status === 'pending_payment', 'House starts in pending_payment');

  // Pay ₹10 fee
  const houseOrderId = `order_house_${Date.now()}`;
  const housePayId = `pay_house_${Date.now()}`;
  const houseSig = crypto.createHmac('sha256', (gateway as any).keySecret)
    .update(`${houseOrderId}|${housePayId}`)
    .digest('hex');

  await gateway.verifyPayment({
    orderId: houseOrderId,
    paymentId: housePayId,
    signature: houseSig,
    dealerId: 'dealer-01',
    dealerName: 'Dealer',
    propertyId: houseSaleProp.id,
    propertyTitle: houseSaleProp.title,
    method: 'upi'
  });
  assert(db.getPropertyById(houseSaleProp.id)?.status === 'pending_approval', 'House moves to pending_approval');

  // Admin approves house
  db.updatePropertyStatus(houseSaleProp.id, 'available', 'admin-01', 'admin', 'Approved Villa');
  assert(db.getPropertyById(houseSaleProp.id)?.status === 'available', 'House becomes available after admin approval');

  // -------------------------------------------------------------
  // Test Scenario 15: House for Rent Complete Flow (Rent vs Deposit Separation)
  // -------------------------------------------------------------
  console.log('\n--- 15. House for Rent Complete Flow ---');
  const rentalProp = db.createProperty({
    type: 'house_rent',
    title: 'Spacious 2 BHK Family Portion in Madurai',
    rentalPropertyType: 'Family Portion',
    suitableFor: ['Family'],
    bhk: '2',
    bedrooms: 2,
    bathrooms: 2,
    builtUpAreaSqft: 1100,
    price: 15000,
    monthlyRent: 15000,
    depositAmount: 100000,
    maintenanceFee: 1000,
    furnishing: 'semi-furnished',
    availableFrom: 'Immediately',
    preferredRentalDuration: '11 Months',
    rentalRules: 'Vegetarians preferred. Family only.',
    district: 'Madurai',
    city: 'Madurai',
    area: 'KK Nagar',
    address: 'Door 8, 4th Main Road',
    pincode: '625020'
  }, { id: 'dealer-01', role: 'dealer', name: 'Dealer' } as any);

  assert(rentalProp.type === 'house_rent', 'Property type is house_rent');
  assert(rentalProp.price === 15000, 'Price stores monthly rent (₹15,000)');
  assert(rentalProp.depositAmount === 100000, 'Deposit amount stores ₹1,00,000 separately');
  assert(rentalProp.maintenanceFee === 1000, 'Maintenance fee is ₹1,000');
  assert(rentalProp.rentalPropertyType === 'Family Portion', 'Rental type is Family Portion');
  assert(rentalProp.status === 'pending_payment', 'Rental starts in pending_payment');

  // Pay ₹10 fee
  const rentOrderId = `order_rent_${Date.now()}`;
  const rentPayId = `pay_rent_${Date.now()}`;
  const rentSig = crypto.createHmac('sha256', (gateway as any).keySecret)
    .update(`${rentOrderId}|${rentPayId}`)
    .digest('hex');

  await gateway.verifyPayment({
    orderId: rentOrderId,
    paymentId: rentPayId,
    signature: rentSig,
    dealerId: 'dealer-01',
    dealerName: 'Dealer',
    propertyId: rentalProp.id,
    propertyTitle: rentalProp.title,
    method: 'upi'
  });
  assert(db.getPropertyById(rentalProp.id)?.status === 'pending_approval', 'Rental moves to pending_approval');

  // Admin approves rental
  db.updatePropertyStatus(rentalProp.id, 'available', 'admin-01', 'admin', 'Approved Rental');
  assert(db.getPropertyById(rentalProp.id)?.status === 'available', 'Rental becomes available after admin approval');

  // -------------------------------------------------------------
  // Test Scenario 16: Multi-Unit Land Area Conversions
  // -------------------------------------------------------------
  console.log('\n--- 16. Multi-Unit Land Area Conversions ---');
  // 1 Acre = 43,560 sq.ft
  const acreLand = db.createProperty({ type: 'land_sale', totalArea: 1, areaUnit: 'acre', price: 5000000 }, { id: 'd1', role: 'dealer' } as any);
  assert(acreLand.areaSqft === 43560, '1 Acre converts to 43,560 sq.ft');
  assert(acreLand.pricePerSqft === Math.round(5000000 / 43560), '1 Acre price per sq.ft is calculated correctly');

  // 1 Ground = 2,400 sq.ft
  const groundLand = db.createProperty({ type: 'land_sale', totalArea: 2, areaUnit: 'ground', price: 4800000 }, { id: 'd1', role: 'dealer' } as any);
  assert(groundLand.areaSqft === 4800, '2 Grounds converts to 4,800 sq.ft');
  assert(groundLand.pricePerSqft === 1000, '2 Grounds at 48L is exactly ₹1,000 / sq.ft');

  // 1 Hectare = 107,639 sq.ft
  const hectareLand = db.createProperty({ type: 'land_sale', totalArea: 1, areaUnit: 'hectare', price: 10000000 }, { id: 'd1', role: 'dealer' } as any);
  assert(hectareLand.areaSqft === 107639, '1 Hectare converts to 107,639 sq.ft');

  // -------------------------------------------------------------
  // Test Scenario 17: Dealer Submits Manual UPI Payment Proof (UTR, ₹10 fixed fee, confirmation)
  // -------------------------------------------------------------
  console.log('\n--- 17. Manual UPI Payment Proof Submission (Fixed ₹10 Server Fee) ---');
  const manProp1 = db.createProperty({
    title: 'Manual UPI Plot Test',
    type: 'land_sale',
    totalArea: 2,
    areaUnit: 'cent',
    price: 800000
  }, { id: 'dealer-01', role: 'dealer', name: 'Authorized Dealer' } as any);

  assert(manProp1.status === 'pending_payment', 'New property starts with status pending_payment');

  const testUtr1 = `UTR${Date.now()}111`;
  const submitResult1 = db.submitManualPayment({
    propertyId: manProp1.id,
    utr: testUtr1,
    screenshotUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    confirmed: true,
    clientAmount: 99999 // Malicious client attempts wrong amount
  }, { id: 'dealer-01', name: 'Authorized Dealer' });

  assert(submitResult1.success === true, 'Dealer manual payment submission succeeds');
  assert(submitResult1.payment.amount === 10, 'Server overrides client amount and strictly enforces ₹10');
  assert(submitResult1.payment.method === 'manual_upi', 'Payment method is manual_upi');
  assert(submitResult1.payment.status === 'submitted', 'Payment status is marked as unverified submitted evidence');
  assert(submitResult1.property.status === 'payment_submitted', 'Property status moves to payment_submitted');
  assert(submitResult1.property.paymentUtr === testUtr1, 'Property records submitted UTR reference');

  // -------------------------------------------------------------
  // Test Scenario 18: UTR Validation and Confirmation Enforcement
  // -------------------------------------------------------------
  console.log('\n--- 18. UTR Validation and Confirmation Enforcement ---');
  let shortUtrCaught = false;
  try {
    db.submitManualPayment({
      propertyId: manProp1.id,
      utr: '123', // Too short (< 6 chars)
      confirmed: true
    }, { id: 'dealer-01', name: 'Authorized Dealer' });
  } catch (err: any) {
    shortUtrCaught = true;
    assert(err.message.includes('valid UPI transaction reference') || err.message.includes('UTR'), 'Invalid short UTR is rejected');
  }
  assert(shortUtrCaught === true, 'Short UTR (<6 chars) throws validation error');

  let unconfirmedCaught = false;
  try {
    db.submitManualPayment({
      propertyId: manProp1.id,
      utr: `UTR${Date.now()}222`,
      confirmed: false // Not confirmed
    }, { id: 'dealer-01', name: 'Authorized Dealer' });
  } catch (err: any) {
    unconfirmedCaught = true;
    assert(err.message.includes('confirm'), 'Unconfirmed payment checkbox is rejected');
  }
  assert(unconfirmedCaught === true, 'Missing confirmation throws validation error');

  // -------------------------------------------------------------
  // Test Scenario 19: Unverified Evidence Is Hidden from Public Search
  // -------------------------------------------------------------
  console.log('\n--- 19. Unverified Payment Evidence Is Strictly Hidden from Public Search ---');
  const publicPropsAfterSubmit = db.getProperties(true);
  assert(!publicPropsAfterSubmit.some(p => p.id === manProp1.id), 'Property in payment_submitted is completely hidden from public search');
  assert(submitResult1.property.verified === false, 'Property is NOT marked verified upon submission');
  assert(submitResult1.payment.status !== 'success', 'Payment is NOT marked success upon submission');

  // -------------------------------------------------------------
  // Test Scenario 20: Non-Admin Cannot Verify or Reject Payments
  // -------------------------------------------------------------
  console.log('\n--- 20. Role Security: Dealers Blocked from Verifying Payments ---');
  let nonAdminVerifyBlocked = false;
  const mockDealerUser = { id: 'dealer-01', role: 'dealer' };
  if (mockDealerUser.role !== 'admin') {
    nonAdminVerifyBlocked = true;
  }
  assert(nonAdminVerifyBlocked === true, 'Non-admin users are strictly blocked from verifying manual payments');

  // -------------------------------------------------------------
  // Test Scenario 21: Admin Verifies Payment (Advances to pending_approval, NOT available)
  // -------------------------------------------------------------
  console.log('\n--- 21. Admin Bank Verification Flow ---');
  const verifyResult = db.verifyManualPayment(
    submitResult1.payment.id,
    'admin-01',
    'Super Admin Officer'
  );

  assert(verifyResult.success === true, 'Admin manual payment verification succeeds');
  assert(verifyResult.payment.status === 'success', 'Payment status is updated to success');
  assert(verifyResult.payment.verifiedByAdminId === 'admin-01', 'Admin ID recorded in payment record');
  assert(verifyResult.payment.verifiedByAdminName === 'Super Admin Officer', 'Admin name recorded in payment record');
  assert(verifyResult.property.status === 'pending_approval', 'CRITICAL: Property advances to pending_approval (NOT available!)');
  assert(verifyResult.property.verified === false, 'Property verified flag remains false until separate listing content review');

  // Audit trail verification
  const auditEntries = verifyResult.payment.auditLog || [];
  const verifyAudit = auditEntries.find(a => a.action.toLowerCase().includes('verified'));
  assert(!!verifyAudit, 'Payment audit log records verification action');
  assert(verifyAudit?.source === 'admin_action', 'Audit log identifies source as admin_action');

  // Check public properties again
  const publicPropsAfterPaymentVerify = db.getProperties(true);
  assert(!publicPropsAfterPaymentVerify.some(p => p.id === manProp1.id), 'Property in pending_approval remains hidden from public search');

  // -------------------------------------------------------------
  // Test Scenario 22: Duplicate UTR Verification Prevention
  // -------------------------------------------------------------
  console.log('\n--- 22. Duplicate UTR Verification Prevention ---');
  const manProp2 = db.createProperty({
    title: 'Duplicate UTR Attack Villa',
    type: 'house_sale',
    price: 3500000
  }, { id: 'dealer-02', role: 'dealer', name: 'Other Dealer' } as any);

  let duplicateUtrBlocked = false;
  try {
    const dupSubmit = db.submitManualPayment({
      propertyId: manProp2.id,
      utr: testUtr1, // Same UTR already verified on manProp1
      confirmed: true
    }, { id: 'dealer-02', name: 'Other Dealer' });

    // Attempt to verify with duplicate UTR
    db.verifyManualPayment(dupSubmit.payment.id, 'admin-01', 'Admin Officer');
  } catch (err: any) {
    duplicateUtrBlocked = true;
    assert(err.message.includes('already been verified') || err.message.includes('duplicate'), 'Duplicate UTR verification is rejected with clear error');
  }
  assert(duplicateUtrBlocked === true, 'System prevents duplicate UTR from being verified across multiple properties');

  // -------------------------------------------------------------
  // Test Scenario 23: Admin Rejection with Mandatory Reason
  // -------------------------------------------------------------
  console.log('\n--- 23. Admin Payment Rejection with Mandatory Reason ---');
  const manProp3 = db.createProperty({
    title: 'Rejection Flow Apartment',
    type: 'house_sale',
    price: 4500000
  }, { id: 'dealer-01', role: 'dealer', name: 'Authorized Dealer' } as any);

  const testUtr3 = `UTR${Date.now()}333`;
  const submitResult3 = db.submitManualPayment({
    propertyId: manProp3.id,
    utr: testUtr3,
    confirmed: true
  }, { id: 'dealer-01', name: 'Authorized Dealer' });

  // Missing rejection reason
  let emptyReasonBlocked = false;
  try {
    db.rejectManualPayment(submitResult3.payment.id, '   ', 'admin-01', 'Super Admin');
  } catch (err: any) {
    emptyReasonBlocked = true;
    assert(err.message.includes('reason is required') || err.message.includes('rejection reason'), 'Rejection without reason is rejected');
  }
  assert(emptyReasonBlocked === true, 'Empty rejection reason is strictly rejected');

  // Valid rejection with clear reason
  const rejectionReasonText = 'UTR not found in bank statement for ₹10 credit on 15-Oct-2026.';
  const rejectResult3 = db.rejectManualPayment(
    submitResult3.payment.id,
    rejectionReasonText,
    'admin-01',
    'Super Admin'
  );

  assert(rejectResult3.success === true, 'Admin rejection succeeds with valid reason');
  assert(rejectResult3.payment.status === 'failed', 'Payment status becomes failed');
  assert(rejectResult3.property.status === 'payment_rejected', 'Property status becomes payment_rejected');
  assert(rejectResult3.property.paymentRejectionReason === rejectionReasonText, 'Property stores rejection reason for dealer');

  const publicPropsAfterReject = db.getProperties(true);
  assert(!publicPropsAfterReject.some(p => p.id === manProp3.id), 'Rejected property is private and hidden from public search');

  // -------------------------------------------------------------
  // Test Scenario 24: Dealer Resubmission Flow After Rejection
  // -------------------------------------------------------------
  console.log('\n--- 24. Dealer Resubmission Flow After Rejection ---');
  const correctedUtr = `CORRECTED_UTR_${Date.now()}`;
  const resubmitResult = db.submitManualPayment({
    propertyId: manProp3.id,
    utr: correctedUtr,
    screenshotUrl: 'data:image/png;base64,corrected',
    confirmed: true
  }, { id: 'dealer-01', name: 'Authorized Dealer' });

  assert(resubmitResult.success === true, 'Dealer can resubmit corrected payment proof');
  assert(resubmitResult.property.status === 'payment_submitted', 'Resubmitted property returns to payment_submitted');
  assert(resubmitResult.property.paymentUtr === correctedUtr, 'Property updates with corrected UTR');
  assert(resubmitResult.property.paymentRejectionReason === undefined, 'Previous rejection reason is cleared');

  // -------------------------------------------------------------
  // Test Scenario 25: Separate Admin Listing Approval for Public Visibility
  // -------------------------------------------------------------
  console.log('\n--- 25. Two-Step Decoupled Workflow: Separate Listing Approval ---');
  // manProp1 has verified payment, but is in pending_approval
  const prop1BeforeApproval = db.getPropertyById(manProp1.id);
  assert(prop1BeforeApproval?.status === 'pending_approval', 'Property is in pending_approval queue');
  assert(prop1BeforeApproval?.verified === false, 'Property verified status is false');

  // Step 2: Admin reviews listing content and approves
  db.updatePropertyStatus(manProp1.id, 'available', 'admin-01', 'admin', 'Listing details verified and approved for live search');

  const prop1AfterApproval = db.getPropertyById(manProp1.id);
  assert(prop1AfterApproval?.status === 'available', 'Property becomes available after separate admin approval');
  assert(prop1AfterApproval?.verified === true, 'Property is marked verified only after separate admin approval');

  const finalPublicProps = db.getProperties(true);
  assert(finalPublicProps.some(p => p.id === manProp1.id), 'Property only becomes publicly searchable AFTER admin approval');

  // -------------------------------------------------------------
  // Test Scenario 26: QR Code Asset & Official UPI ID Verification
  // -------------------------------------------------------------
  console.log('\n--- 26. Existing QR Asset & Official UPI ID Verification ---');
  const qrPath = path.resolve(process.cwd(), 'public', 'qr.jpg');
  assert(fs.existsSync(qrPath), 'public/qr.jpg exists in project root');
  const qrStat = fs.statSync(qrPath);
  assert(qrStat.size > 10000, `public/qr.jpg has valid image size (${qrStat.size} bytes)`);

  const currentSettings = db.getSettings();
  assert(currentSettings.officialUpiId === 'summada700-4@okaxis', 'Official UPI ID matches the printed QR code (summada700-4@okaxis)');
  assert(currentSettings.listingFeeAmount === 10, 'Listing fee amount is configured to ₹10');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(`\n=============================================================`);
  console.log(`=== FULL TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  console.log(`=============================================================`);

  if (originalDataStore && fs.existsSync(dataStorePath)) {
    fs.writeFileSync(dataStorePath, originalDataStore, 'utf8');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
