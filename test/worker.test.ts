import app from '../server-worker/index.ts';

const mockEnv = {
  SESSION_SECRET: 'test_super_secure_session_secret_for_local_tests_2026',
  CLOUDINARY_CLOUD_NAME: 'test_cloud',
  CLOUDINARY_API_KEY: 'test_key',
  CLOUDINARY_API_SECRET: 'test_secret'
};

async function runTests() {
  console.log('======================================================');
  console.log('🧪 RUNNING CLOUDFLARE WORKERS HONO BACKEND TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // Test 1: Health endpoint
  await test('GET /health returns HTTP 200 and OK', async () => {
    const res = await app.fetch(new Request('http://localhost/health'), mockEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const text = await res.text();
    if (text !== 'OK') throw new Error(`Expected OK, got ${text}`);
  });

  // Test 2: API Health endpoint
  await test('GET /api/health returns JSON with cloudflare_workers runtime', async () => {
    const res = await app.fetch(new Request('http://localhost/api/health'), mockEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const json = await res.json() as any;
    if (json.status !== 'ok' || json.runtime !== 'cloudflare_workers') {
      throw new Error(`Unexpected payload: ${JSON.stringify(json)}`);
    }
  });

  // Test 3: Public properties with privacy sanitization
  await test('GET /api/properties returns available properties with sanitized dealer info', async () => {
    const res = await app.fetch(new Request('http://localhost/api/properties'), mockEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const properties = await res.json() as any[];
    if (!Array.isArray(properties)) throw new Error('Expected array of properties');
    if (properties.length === 0) throw new Error('Expected at least 1 property');
    for (const p of properties) {
      if (p.dealerPhonePrivate || p.dealerEmailPrivate) {
        throw new Error(`Privacy violation: Private dealer info leaked for property ${p.id}`);
      }
      if (p.status !== 'available') {
        throw new Error(`Status violation: Non-available property ${p.id} returned in public endpoint`);
      }
    }
  });

  // Test 4: Auth login with PBKDF2 hash verification
  await test('POST /api/auth/login succeeds and returns valid token for pre-seeded user', async () => {
    const res = await app.fetch(new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dealer@sppnestora.com', password: 'dealer123', role: 'dealer' })
    }), mockEnv);

    if (res.status !== 200) {
      const err = await res.json() as any;
      throw new Error(`Login failed with status ${res.status}: ${err.error}`);
    }

    const data = await res.json() as any;
    if (!data.token || typeof data.token !== 'string') throw new Error('Missing token');
    if (!data.user || data.user.email !== 'dealer@sppnestora.com') throw new Error('Invalid user object');
    if (data.user.passwordHash || data.user.salt) throw new Error('Security leak: passwordHash or salt returned in user object');
  });

  // Test 5: Cloudinary signature generation for direct uploads
  await test('POST /api/upload/sign returns valid Cloudinary upload signature', async () => {
    const res = await app.fetch(new Request('http://localhost/api/upload/sign', {
      method: 'POST'
    }), mockEnv);

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json() as any;
    if (!data.configured || !data.signature || !data.timestamp || !data.uploadUrl) {
      throw new Error(`Missing expected signed upload parameters: ${JSON.stringify(data)}`);
    }
  });

  // Test 6: Public settings endpoint
  await test('GET /api/settings returns official platform contact defaults', async () => {
    const res = await app.fetch(new Request('http://localhost/api/settings'), mockEnv);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    const data = await res.json() as any;
    if (!data.appName || !data.officialPhone || !data.officialEmail) {
      throw new Error(`Missing settings fields: ${JSON.stringify(data)}`);
    }
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
