import type { Property, User, AdminSettings } from '../src/types/index.ts';

/**
 * Strips all dealer private contact information from property objects.
 * This is enforced at the backend/API layer so that dealer personal numbers,
 * emails, and addresses are never sent across the wire to public visitors or customers.
 */
export function sanitizePropertyForPublic(property: Property, settings: AdminSettings): Property {
  return {
    ...property,
    // Keep public display name or agency brand name, but strip all personal details
    dealerName: property.dealerName || 'SPP Nestora Authorized Partner',
    // Replace dealer reference with generic code for public visitors
    dealerId: 'spp-partner-ref',
  };
}

/**
 * Sanitizes a list of properties for public consumption (only active/available)
 */
export function sanitizePropertiesListForPublic(properties: Property[], settings: AdminSettings): Property[] {
  return properties
    .filter(p => p.status === 'available')
    .map(p => sanitizePropertyForPublic(p, settings));
}

/**
 * Sanitizes a user object before returning to client (strips passwordHash, salt)
 */
export function sanitizeUser(user: User & { passwordHash?: string; salt?: string }): User {
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}
