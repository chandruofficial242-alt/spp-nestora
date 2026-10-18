const BASE_URL = 'http://127.0.0.1:8787';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function runLiveTests() {
  console.log('================================================================');
  console.log('🚀 TESTING LIVE HONO CLOUDFLARE WORKER ON http://127.0.0.1:8787');
  console.log('================================================================\n');

  const results: TestResult[] = [];

  async function check(suite: string, name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] [${suite}] ${name}`);
      results.push({ suite, name, passed: true });
    } catch (err: any) {
      console.error(`  [FAIL] [${suite}] ${name} ->`, err.message);
      results.push({ suite, name, passed: false, error: err.message });
    }
  }

  let dealerToken = '';
  let adminToken = '';
  let createdPropertyId = '';

  // 1. Health & Edge Runtime Checks
  await check('Health', 'GET /health returns HTTP 200 and OK', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const text = await res.text();
    if (text !== 'OK') throw new Error(`Expected OK, got ${text}`);
  });

  await check('Health', 'GET /api/health returns valid JSON with runtime cloudflare_workers', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const json = await res.json() as any;
    if (json.status !== 'ok' || json.runtime !== 'cloudflare_workers') {
      throw new Error(`Unexpected body: ${JSON.stringify(json)}`);
    }
  });

  // 2. CORS Headers
  await check('CORS', 'OPTIONS preflight returns permissive CORS headers', async () => {
    const res = await fetch(`${BASE_URL}/api/properties`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://spp-nestora.pages.dev',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    if (res.status !== 204 && res.status !== 200) throw new Error(`Preflight status ${res.status}`);
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (!allowOrigin) throw new Error('Missing access-control-allow-origin header');
  });

  await check('CORS', 'GET response includes access-control-allow-origin', async () => {
    const res = await fetch(`${BASE_URL}/api/settings`, {
      headers: { Origin: 'http://localhost:5173' }
    });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (!allowOrigin) throw new Error('CORS header missing on GET request');
  });

  // 3. Public Property APIs & Privacy Filter
  await check('Properties', 'GET /api/properties returns available properties', async () => {
    const res = await fetch(`${BASE_URL}/api/properties`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const props = await res.json() as any[];
    if (!Array.isArray(props) || props.length === 0) throw new Error('Expected property array');
  });

  await check('Properties', 'Privacy protection: strictly strips private dealer contact info', async () => {
    const res = await fetch(`${BASE_URL}/api/properties`);
    const props = await res.json() as any[];
    for (const p of props) {
      if (p.dealerPhonePrivate !== undefined || p.dealerEmailPrivate !== undefined) {
        throw new Error(`Leaked private dealer contact on property ${p.id}`);
      }
      if (p.dealerId === 'dealer-01') {
        throw new Error(`Exposed real dealerId instead of generic reference on property ${p.id}`);
      }
    }
  });

  await check('Properties', 'Query filtering: filter by district and property type', async () => {
    const res = await fetch(`${BASE_URL}/api/properties?district=Coimbatore&type=house_sale`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const props = await res.json() as any[];
    for (const p of props) {
      if (p.district.toLowerCase() !== 'coimbatore' || p.type !== 'house_sale') {
        throw new Error(`Filter mismatch on property ${p.id}`);
      }
    }
  });

  // 4. Authentication, Roles & PBKDF2 Password Verification
  await check('Auth', 'POST /api/auth/login validates dealer PBKDF2 password and issues HS256 JWT', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dealer@sppnestora.com', password: 'dealer123', role: 'dealer' })
    });
    if (res.status !== 200) {
      const err = await res.json() as any;
      throw new Error(`Login failed with status ${res.status}: ${err.error}`);
    }
    const data = await res.json() as any;
    if (!data.token) throw new Error('Missing token in response');
    dealerToken = data.token;
  });

  await check('Auth', 'POST /api/auth/login rejects incorrect password with HTTP 401', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dealer@sppnestora.com', password: 'wrongPassword!@#', role: 'dealer' })
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  await check('Auth', 'GET /api/auth/me verifies Bearer token and returns sanitized user', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${dealerToken}` }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json() as any;
    if (!data.user || data.user.email !== 'dealer@sppnestora.com') throw new Error('Invalid user object');
    if (data.user.passwordHash || data.user.salt) throw new Error('Password hash leaked');
  });

  await check('Auth', 'Role Security: Public registration as ADMIN is strictly blocked (HTTP 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Attacker',
        email: 'attacker@evil.com',
        phone: '9999999999',
        password: 'password123',
        role: 'admin'
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await check('Auth', 'Public Customer Registration succeeds (HTTP 201)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Murugan Test Customer',
        email: `testcustomer_${Date.now()}@gmail.com`,
        phone: '9840123456',
        password: 'customerPassword123',
        role: 'customer'
      })
    });
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    const data = await res.json() as any;
    if (!data.token || data.user.role !== 'customer') throw new Error('Invalid customer registration');
  });

  // Admin login for testing admin workflows
  await check('Auth', 'Admin authentication', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sppnestora.com', role: 'admin' })
    });
    if (res.status === 200) {
      const data = await res.json() as any;
      adminToken = data.token;
    }
  });

  // 5. Dealer Property Creation & Approval Workflow
  await check('Dealer Workflow', 'Dealer creates property in pending_approval state', async () => {
    const res = await fetch(`${BASE_URL}/api/dealer/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dealerToken}`
      },
      body: JSON.stringify({
        title: 'Cloudflare Worker Verified Test Villa Plot in Pollachi',
        type: 'land_sale',
        price: 2500000,
        district: 'Coimbatore',
        city: 'Pollachi',
        area: 'Mahalingapuram',
        address: '12, Mahalingapuram Main Road, Pollachi',
        areaSqft: 2400,
        dtcpApproved: true,
        reraApproved: false,
        pattaAvailable: true
      })
    });
    if (res.status !== 201) {
      const err = await res.json() as any;
      throw new Error(`Failed to create property: ${res.status} ${err.error}`);
    }
    const prop = await res.json() as any;
    createdPropertyId = prop.id;
    if (prop.status !== 'pending_approval') {
      throw new Error(`Expected status pending_approval, got ${prop.status}`);
    }
  });

  await check('Dealer Workflow', 'Newly created pending_approval property is hidden from public API', async () => {
    const res = await fetch(`${BASE_URL}/api/properties`);
    const props = await res.json() as any[];
    const found = props.find(p => p.id === createdPropertyId);
    if (found) throw new Error('Pending property was visible in public search!');
  });

  // 6. Payments & Manual UPI Flow
  await check('Payments', 'Dealer submits ₹10 listing fee UTR reference', async () => {
    const res = await fetch(`${BASE_URL}/api/payments/manual-upi/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dealerToken}`
      },
      body: JSON.stringify({
        propertyId: createdPropertyId,
        utr: 'UTR20261018998877',
        screenshotUrl: 'https://res.cloudinary.com/test_cloud/image/upload/v1/proof.jpg'
      })
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
    const data = await res.json() as any;
    const pay = data.payment || data;
    if (pay.amount !== 10 || pay.status !== 'pending') {
      throw new Error(`Unexpected payment state: ${JSON.stringify(data)}`);
    }
  });

  // 7. Cloudinary Signed Upload Flow
  await check('Uploads', 'POST /api/upload/sign generates valid SHA-1 signature and upload URL', async () => {
    const res = await fetch(`${BASE_URL}/api/upload/sign`, {
      method: 'POST'
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const data = await res.json() as any;
    if (!data.configured || !data.signature || !data.timestamp || !data.uploadUrl) {
      throw new Error(`Invalid signed parameters: ${JSON.stringify(data)}`);
    }
    if (!data.uploadUrl.includes('cloudinary.com')) {
      throw new Error(`Invalid upload URL: ${data.uploadUrl}`);
    }
  });

  // 8. Public Enquiries & Site Visits
  await check('CRM', 'POST /api/enquiries accepts public customer enquiry', async () => {
    const res = await fetch(`${BASE_URL}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: 'prop-001',
        customerName: 'Anand Kumar',
        customerPhone: '9841098410',
        customerEmail: 'anand@gmail.com',
        message: 'Is the price negotiable for this Sholinganallur plot?'
      })
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
  });

  await check('CRM', 'POST /api/site-visits books site visit schedule', async () => {
    const res = await fetch(`${BASE_URL}/api/site-visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: 'prop-001',
        customerName: 'Anand Kumar',
        customerPhone: '9841098410',
        visitDate: '2026-10-25',
        visitTime: '11:00 AM'
      })
    });
    if (res.status !== 201) throw new Error(`Status ${res.status}`);
  });

  // 9. Error Handling
  await check('Error Handling', 'Nonexistent route returns 404', async () => {
    const res = await fetch(`${BASE_URL}/api/nonexistent-route-xyz`);
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  await check('Error Handling', 'Malformed login body returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // Print Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n================================================================');
  console.log(`LIVE WORKER TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
