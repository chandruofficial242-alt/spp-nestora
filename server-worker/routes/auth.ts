import { Hono } from 'hono';
import type { Env, DbUser } from '../types.ts';
import { WorkerDatabase } from '../db.ts';
import { hashPassword, verifyPassword, generateSalt, generateAuthToken, verifyAuthToken } from '../crypto.ts';
import { sanitizeUser } from '../sanitizer.ts';

export const authRouter = new Hono<{ Bindings: Env }>();

// POST /auth/login
authRouter.post('/login', async (c) => {
  try {
    const { email, password, role } = await c.req.json();
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    const db = new WorkerDatabase(c.env);
    const user = await db.getUserByEmail(email);

    if (!user) {
      return c.json({ error: 'Invalid credentials. User account not found.' }, 401);
    }

    if (role && user.role !== role && user.role !== 'admin') {
      return c.json({ error: `Unauthorized. Account role does not match ${role}.` }, 403);
    }

    // Verify Password
    if (user.passwordHash && user.salt) {
      const isValid = await verifyPassword(password || 'demo123', user.salt, user.passwordHash);
      if (!isValid) {
        return c.json({ error: 'Invalid email or password.' }, 401);
      }
    } else {
      // Demo fallback if user had no hash
      if ((password || '').length < 6) {
        return c.json({ error: 'Password must be at least 6 characters.' }, 401);
      }
    }

    const secret = c.env.SESSION_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';
    const token = await generateAuthToken(user, secret);

    return c.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

// POST /auth/register
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, phone, password, role, businessName, district, city, address, dealerType } = body;

    if (!name || !email || !phone || !password) {
      return c.json({ error: 'Name, email, phone, and password are required' }, 400);
    }

    if (role === 'admin') {
      return c.json({ error: 'Admin registration is not publicly available.' }, 403);
    }

    const db = new WorkerDatabase(c.env);
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return c.json({ error: 'An account with this email address already exists.' }, 409);
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const newUser: DbUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      role: role === 'dealer' ? 'dealer' : 'customer',
      passwordHash,
      salt,
      businessName: businessName ? businessName.trim() : undefined,
      district: district ? district.trim() : undefined,
      city: city ? city.trim() : undefined,
      address: address ? address.trim() : undefined,
      dealerType: dealerType || undefined,
      dealerStatus: role === 'dealer' ? 'pending' : undefined,
      createdAt: new Date().toISOString()
    };

    const saved = await db.createUser(newUser);
    const secret = c.env.SESSION_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';
    const token = await generateAuthToken(saved, secret);

    return c.json({
      token,
      user: sanitizeUser(saved)
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Registration failed' }, 500);
  }
});

// GET /auth/me
authRouter.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.substring(7).trim();
  const secret = c.env.SESSION_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';
  const payload = await verifyAuthToken(token, secret);

  if (!payload) {
    return c.json({ error: 'Invalid or expired session token' }, 401);
  }

  const db = new WorkerDatabase(c.env);
  const user = await db.getUserById(payload.userId);
  if (!user) {
    return c.json({ error: 'User account not found' }, 404);
  }

  return c.json({ user: sanitizeUser(user) });
});

// POST /auth/logout
authRouter.post('/logout', (c) => {
  return c.json({ message: 'Logged out successfully' });
});
