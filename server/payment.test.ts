import crypto from 'crypto';
import { db } from './db.ts';
import { RazorpayPaymentGateway, SandboxPaymentGateway } from './paymentService.ts';

async function runTests() {
  console.log('=== STARTING RAZORPAY PAYMENT GATEWAY TEST SUITE ===\n');
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
  const gateway = new RazorpayPaymentGateway(testKeyId, testKeySecret);
  const sandboxGateway = new SandboxPaymentGateway();

  // Test 1: Authoritative ₹10 Listing Fee enforcement
  console.log('--- Test 1: Authoritative ₹10 Listing Fee Enforcement ---');
  const settings = db.getSettings();
  assert(settings.listingFeeAmount === 10, 'Authoritative listing fee in database settings is ₹10');

  // Test 2: Razorpay Methods API Inspection Contract
  console.log('\n--- Test 2: Razorpay Methods API Inspection Contract ---');
  try {
    const methods = await gateway.getPaymentMethods();
    assert(typeof methods.card === 'boolean', 'Methods API reports card status as boolean');
    assert(typeof methods.netbanking === 'boolean', 'Methods API reports netbanking status as boolean');
    assert(typeof methods.wallet === 'boolean', 'Methods API reports wallet status as boolean');
    assert(typeof methods.upi === 'boolean', 'Methods API reports UPI status as boolean');
    assert(typeof methods.upiIntent === 'boolean', 'Methods API reports UPI Intent status as boolean');
    assert(typeof methods.upiQr === 'boolean', 'Methods API reports UPI QR status as boolean');
    console.log('  Live Razorpay Methods for Key:', JSON.stringify(methods));
  } catch (err: any) {
    assert(false, `Methods API failed with error: ${err.message}`);
  }

  // Test 3: Sandbox Gateway Payment Methods Contract
  console.log('\n--- Test 3: Sandbox Gateway Payment Methods Contract ---');
  const sbMethods = await sandboxGateway.getPaymentMethods();
  assert(sbMethods.upi === true && sbMethods.card === true && sbMethods.netbanking === true, 'Sandbox gateway reports all methods active');

  // Test 4: HMAC SHA-256 Cryptographic Signature Verification (Valid)
  console.log('\n--- Test 4: HMAC SHA-256 Signature Verification (Valid) ---');
  const testOrderId = `order_test_${Date.now()}`;
  const testPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', testKeySecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const testPropId = `prop-test-${Date.now()}`;

  try {
    const verifyRes = await gateway.verifyPayment({
      orderId: testOrderId,
      paymentId: testPaymentId,
      signature: validSignature,
      dealerId: 'dealer-01',
      dealerName: 'Ramasamy Sundaram',
      propertyId: testPropId,
      propertyTitle: 'Test Signature Villa',
      method: 'upi'
    });
    assert(verifyRes.success === true, 'Valid HMAC SHA-256 signature is accepted');
    assert(verifyRes.paymentRecord.amount === 10, 'Payment record authoritatively records ₹10 fee');
    assert(verifyRes.paymentRecord.status === 'success', 'Payment status is marked as success');
    assert(verifyRes.paymentRecord.transactionRef === `RZP-${testPaymentId}`, 'Transaction reference matches Razorpay payment ID');
  } catch (err: any) {
    assert(false, `Valid signature was unexpectedly rejected: ${err.message}`);
  }

  // Test 5: HMAC SHA-256 Cryptographic Signature Verification (Tampered Signature)
  console.log('\n--- Test 5: Cryptographic Signature Verification (Tampered Signature) ---');
  const tamperedSignature = validSignature.slice(0, -4) + 'abcd';
  let tamperedCaught = false;
  try {
    await gateway.verifyPayment({
      orderId: testOrderId,
      paymentId: testPaymentId,
      signature: tamperedSignature,
      dealerId: 'dealer-01',
      dealerName: 'Ramasamy Sundaram',
      propertyId: `prop-tamper-${Date.now()}`,
      propertyTitle: 'Tampered Property',
      method: 'upi'
    });
  } catch (err: any) {
    tamperedCaught = true;
    assert(err.message.includes('tampering') || err.message.includes('verification failed'), 'Tampered signature is strictly rejected');
  }
  assert(tamperedCaught, 'Tampered signature throws security rejection exception');

  // Test 6: Missing Signature Rejection
  console.log('\n--- Test 6: Missing Signature Rejection ---');
  let missingCaught = false;
  try {
    await gateway.verifyPayment({
      orderId: testOrderId,
      paymentId: testPaymentId,
      signature: '',
      dealerId: 'dealer-01',
      dealerName: 'Ramasamy Sundaram',
      propertyId: `prop-missing-${Date.now()}`,
      propertyTitle: 'Missing Signature Property',
      method: 'upi'
    });
  } catch (err: any) {
    missingCaught = true;
    assert(err.message.includes('Missing Razorpay payment signature'), 'Missing signature is rejected');
  }
  assert(missingCaught, 'Missing signature throws security rejection exception');

  // Test 7: Duplicate Payment Prevention
  console.log('\n--- Test 7: Duplicate Payment Prevention ---');
  let duplicateCaught = false;
  try {
    await gateway.createOrder({
      dealerId: 'dealer-01',
      dealerName: 'Ramasamy Sundaram',
      propertyId: testPropId, // Already paid in Test 4
      propertyTitle: 'Test Signature Villa',
      paymentMethod: 'upi'
    });
  } catch (err: any) {
    duplicateCaught = true;
    assert(err.message.includes('already has a confirmed listing fee payment'), 'Duplicate payment for paid property is prevented');
  }
  assert(duplicateCaught, 'Creating order for already paid property throws duplicate prevention exception');

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
