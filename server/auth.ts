import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { User, UserRole } from '../src/types/index.ts';
import { sanitizeUser } from './sanitizer.ts';

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';


export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Creates a signed stateless session token
 */
export function generateAuthToken(user: User): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verifies a signed session token
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

    if (signature !== expectedSignature) return null;

    const payload: AuthTokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware to authenticate requests
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[Auth Warning] Unauthorized access to ${req.method} ${req.originalUrl || req.path}: Missing Bearer token header`);
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.substring(7);
  const payload = verifyAuthToken(token);
  if (!payload) {
    console.warn(`[Auth Warning] Unauthorized access to ${req.method} ${req.originalUrl || req.path}: Invalid or expired token`);
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  let user = db.findUserById(payload.userId);
  if (!user && payload.email) {
    user = db.findUserByEmail(payload.email);
  }

  if (!user) {
    console.warn(`[Auth Warning] User ${payload.userId} (${payload.email}) not found in database`);
    return res.status(401).json({ error: 'User account no longer exists' });
  }

  req.user = sanitizeUser(user);
  next();
}

/**
 * Middleware to require specific roles
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[Auth Warning] Access forbidden: User ${req.user.id} with role '${req.user.role}' attempted to access endpoint restricted to [${allowedRoles.join(', ')}]`);
      return res.status(403).json({ error: `Access denied. Requires role: ${allowedRoles.join(', ')}` });
    }

    next();
  };
}

