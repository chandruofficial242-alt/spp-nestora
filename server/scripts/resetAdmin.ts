/**
 * SPP Nestora — Emergency Admin Account Recovery CLI Utility
 * 
 * Safely resets the admin password for the SPP Nestora platform without
 * hardcoded credentials, without disabling authentication, and without
 * resetting or deleting production users, properties, or payments.
 * 
 * Usage:
 *   npx tsx server/scripts/resetAdmin.ts [newPassword]
 *   OR:
 *   ADMIN_NEW_PASSWORD="YourSecurePassword123!" npx tsx server/scripts/resetAdmin.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '../db.ts';

async function main() {
  const newPassword = process.argv[2] || process.env.ADMIN_NEW_PASSWORD;

  if (!newPassword) {
    console.error('====================================================');
    console.error('SPP NESTORA — EMERGENCY ADMIN RECOVERY ERROR');
    console.error('====================================================');
    console.error('Please provide a new password as a CLI argument or via ADMIN_NEW_PASSWORD environment variable.');
    console.error('Example: npx tsx server/scripts/resetAdmin.ts MyNewSecurePass2026!');
    console.error('====================================================');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  // Allow database initialization to hydrate
  await new Promise(resolve => setTimeout(resolve, 800));

  const result = await db.emergencyResetAdminPasswordAsync(newPassword);

  if (!result.success) {
    console.error(`Emergency reset failed: ${result.error}`);
    process.exit(1);
  }

  console.log('====================================================');
  console.log('SPP NESTORA — ADMIN ACCOUNT RECOVERY COMPLETED');
  console.log('====================================================');
  console.log(`Admin account email: ${result.adminEmail}`);
  console.log('Password has been successfully updated using PBKDF2 SHA-512 encryption.');
  console.log('You can now log into the Admin dashboard:');
  console.log('1. Go to: https://spp-nestora.onrender.com/login');
  console.log('2. Select tab: "Admin"');
  console.log(`3. Enter email: ${result.adminEmail}`);
  console.log('4. Enter your new password and click Sign In.');
  console.log('====================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Unexpected recovery script error:', err.message || err);
  process.exit(1);
});
