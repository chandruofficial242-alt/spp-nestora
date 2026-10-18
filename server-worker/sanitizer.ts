import type { Property, User, AdminSettings } from '../src/types/index.ts';

/**
 * Strips all dealer private contact information from property objects.
 * Enforced at the API layer so that personal numbers, emails, and exact addresses
 * are never exposed to public visitors.
 */
export function sanitizePropertyForPublic(property: Property, _settings?: AdminSettings): Property {
  return {
    ...property,
    dealerName: property.dealerName || 'SPP Nestora Authorized Partner',
    dealerId: 'spp-partner-ref',
    dealerPhonePrivate: undefined,
    dealerEmailPrivate: undefined
  };
}

/**
 * Sanitizes an array of properties for public consumption (only available/active properties)
 */
export function sanitizePropertiesListForPublic(properties: Property[], settings?: AdminSettings): Property[] {
  return properties
    .filter(p => p.status === 'available')
    .map(p => sanitizePropertyForPublic(p, settings));
}

/**
 * Sanitizes a user object before returning to client (removes password hashes & salts)
 */
export function sanitizeUser(user: User & { passwordHash?: string; salt?: string; resetTokenHash?: string; resetTokenExpiry?: string }): User {
  const { passwordHash, salt, resetTokenHash, resetTokenExpiry, ...safeUser } = user as any;
  return safeUser;
}
