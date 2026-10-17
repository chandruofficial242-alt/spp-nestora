import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.ts';
import { db } from './db.ts';
import { emailService } from './emailService.ts';

const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, async () => {
    console.log(`[SPP Nestora] Production Server listening on ${HOST}:${PORT}`);
    emailService.verifyConnection().catch(() => {});

    // Safe Admin Password Recovery Fallback via Environment Variable (No Render Shell needed)
    const adminNewPassword = process.env.ADMIN_NEW_PASSWORD;
    if (adminNewPassword && adminNewPassword.trim().length >= 6) {
      try {
        await db.waitForInitialization();
        const trimmed = adminNewPassword.trim();
        const adminUser = db.getAdminUser();
        const isAlreadySet = adminUser && db.verifyPassword(adminUser.email, trimmed);

        if (isAlreadySet) {
          console.log(`[SPP Nestora Recovery] Admin password for ${adminUser.email} is active and verified. (Safe: You can now remove ADMIN_NEW_PASSWORD from Render Environment Variables).`);
        } else {
          console.log('[SPP Nestora Recovery] Detected ADMIN_NEW_PASSWORD in environment. Synchronizing admin credentials to PostgreSQL...');
          const res = await db.emergencyResetAdminPasswordAsync(trimmed);
          if (res.success) {
            console.log(`[SPP Nestora Recovery] Admin account credentials successfully updated for: ${res.adminEmail}`);
          } else {
            console.warn(`[SPP Nestora Recovery] Admin credential synchronization failed: ${res.error}`);
          }
        }
      } catch (err: any) {
        console.warn(`[SPP Nestora Recovery] Unexpected error during admin recovery:`, err.message || err);
      }
    }
  });
}

export default app;

