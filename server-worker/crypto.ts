import type { User, UserRole } from '../src/types/index.ts';
import type { AuthTokenPayload } from './types.ts';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function base64urlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? textEncoder.encode(data) : data;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * PBKDF2 SHA-512 Password Hash (100% compatible with existing Node crypto pbkdf2Sync)
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: textEncoder.encode(salt),
      iterations: 1000,
      hash: 'SHA-512'
    },
    keyMaterial,
    64 * 8 // 64 bytes = 512 bits
  );

  return bufferToHex(derived);
}

/**
 * Verify password against stored PBKDF2 hash
 */
export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  if (!password || !salt || !hash) return false;
  const calculated = await hashPassword(password, salt);
  return calculated.toLowerCase() === hash.toLowerCase();
}

/**
 * Generates a random cryptographic salt
 */
export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes);
}

/**
 * Generates signed HS256 stateless session token
 */
export async function generateAuthToken(user: User, secret: string): Promise<string> {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };

  const headerB64 = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(dataToSign));
  const signatureB64 = base64urlEncode(new Uint8Array(signature));

  return `${dataToSign}.${signatureB64}`;
}

/**
 * Verifies signed HS256 stateless session token
 */
export async function verifyAuthToken(token: string, secret: string): Promise<AuthTokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const dataToSign = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64urlDecode(signatureB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      textEncoder.encode(dataToSign)
    );

    if (!isValid) return null;

    const payloadJson = textDecoder.decode(base64urlDecode(payloadB64));
    const payload: AuthTokenPayload = JSON.parse(payloadJson);

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generates Cloudinary SHA-1 upload signature for direct client uploads
 */
export async function generateCloudinarySignature(params: Record<string, string | number>, apiSecret: string): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const toHash = `${serialized}${apiSecret}`;
  const hashBuffer = await crypto.subtle.digest('SHA-1', textEncoder.encode(toHash));
  return bufferToHex(hashBuffer);
}
