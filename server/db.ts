import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pg from 'pg';
const { Pool } = pg;

import type { 
  User, 
  Property, 
  Enquiry, 
  SiteVisit, 
  Payment, 
  PaymentAuditEntry,
  AdminSettings, 
  AppNotification, 
  PropertyStatus,
  DealerStatus
} from '../src/types/index.ts';
import { 
  INITIAL_SETTINGS, 
  INITIAL_USERS, 
  INITIAL_PROPERTIES, 
  INITIAL_ENQUIRIES, 
  INITIAL_SITE_VISITS, 
  INITIAL_PAYMENTS, 
  INITIAL_NOTIFICATIONS 
} from '../src/data/seedData.ts';

export interface TermsRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  termsVersion: string;
  language: string;
  acceptedAt: string;
}

export interface StatusHistoryRecord {
  id: string;
  propertyId: string;
  propertyCode: string;
  previousStatus: PropertyStatus;
  newStatus: PropertyStatus;
  changedByUserId: string;
  changedByRole: string;
  reason?: string;
  timestamp: string;
}

export type DbUser = User & { 
  passwordHash?: string; 
  salt?: string; 
  resetTokenHash?: string; 
  resetTokenExpiry?: string; 
};

export interface DatabaseSchema {
  users: DbUser[];
  properties: Property[];
  enquiries: Enquiry[];
  site_visits: SiteVisit[];
  payments: Payment[];
  notifications: AppNotification[];
  settings: AdminSettings;
  terms_acceptances: TermsRecord[];
  status_history: StatusHistoryRecord[];
  webhook_events?: { eventId: string; eventType: string; processedAt: string; payload?: any }[];
}

const DB_FILE_PATH = path.resolve(process.cwd(), 'server', 'data_store.json');

class RelationalStore {
  private data: DatabaseSchema;
  private pool: pg.Pool | null = null;
  private isPostgresConnected = false;

  constructor() {
    this.data = this.loadInitialData();
    this.initPostgreSQL();
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  private loadInitialData(): DatabaseSchema {
    // Merge environment variable overrides into default settings
    const defaultSettings: AdminSettings = {
      ...INITIAL_SETTINGS,
      appName: process.env.BUSINESS_NAME || INITIAL_SETTINGS.appName,
      officialPhone: process.env.OFFICIAL_PHONE || INITIAL_SETTINGS.officialPhone,
      officialPhoneDisplay: process.env.OFFICIAL_PHONE ? `+91 ${process.env.OFFICIAL_PHONE.replace(/^\+?91/, '').trim()}` : INITIAL_SETTINGS.officialPhoneDisplay,
      officialWhatsApp: process.env.OFFICIAL_WHATSAPP || process.env.OFFICIAL_WHATSAP || INITIAL_SETTINGS.officialWhatsApp,
      officialWhatsAppDisplay: (process.env.OFFICIAL_WHATSAPP || process.env.OFFICIAL_WHATSAP) 
        ? `+91 ${(process.env.OFFICIAL_WHATSAPP || process.env.OFFICIAL_WHATSAP || '').replace(/^\+?91/, '').trim()}` 
        : INITIAL_SETTINGS.officialWhatsAppDisplay,
      officialEmail: process.env.OFFICIAL_EMAIL || INITIAL_SETTINGS.officialEmail,
      officialUpiId: process.env.OFFICIAL_UPI_ID || INITIAL_SETTINGS.officialUpiId || 'summada700-4@okaxis',
      listingFeeAmount: process.env.DEFAULT_LISTING_FEE ? Number(process.env.DEFAULT_LISTING_FEE) : INITIAL_SETTINGS.listingFeeAmount
    };

    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        parsed.webhook_events = parsed.webhook_events || [];
        // Ensure settings have latest env vars & updated official contact numbers
        parsed.settings = {
          ...parsed.settings,
          ...defaultSettings,
          officialPhone: defaultSettings.officialPhone,
          officialPhoneDisplay: defaultSettings.officialPhoneDisplay,
          officialWhatsApp: defaultSettings.officialWhatsApp,
          officialWhatsAppDisplay: defaultSettings.officialWhatsAppDisplay,
          officialEmail: defaultSettings.officialEmail,
          officialUpiId: defaultSettings.officialUpiId
        };
        return parsed;
      }
    } catch (e) {
      console.warn('[DB] Failed to read existing store file, falling back to seed data:', e);
    }

    // Default Seed DB with hashed passwords
    const salt = 'spp_nestora_secure_salt_2026';
    const usersWithAuth = INITIAL_USERS.map(u => ({
      ...u,
      salt,
      passwordHash: this.hashPassword(
        u.role === 'admin' ? 'admin123' : u.role === 'dealer' ? 'dealer123' : 'customer123',
        salt
      )
    }));

    const initialSchema: DatabaseSchema = {
      users: usersWithAuth,
      properties: INITIAL_PROPERTIES,
      enquiries: INITIAL_ENQUIRIES,
      site_visits: INITIAL_SITE_VISITS,
      payments: INITIAL_PAYMENTS,
      notifications: INITIAL_NOTIFICATIONS,
      settings: defaultSettings,
      terms_acceptances: [
        {
          id: 'terms-seed-01',
          userEmail: 'customer@sppnestora.com',
          termsVersion: 'v1.0',
          language: 'en',
          acceptedAt: '2026-02-01T08:00:00Z'
        }
      ],
      status_history: [],
      webhook_events: []
    };

    this.saveToFile(initialSchema);
    return initialSchema;
  }

  private async initPostgreSQL() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || dbUrl.includes('placeholder') || dbUrl.includes('username:password')) {
      console.log('[Database] PostgreSQL DATABASE_URL not set. Running in local persistent JSON store mode.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      });

      // Test connection
      const client = await this.pool.connect();
      this.isPostgresConnected = true;
      console.log('[Database] Connected to PostgreSQL successfully.');

      // Initialize Tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(32) NOT NULL,
          role VARCHAR(32) NOT NULL,
          password_hash VARCHAR(255),
          salt VARCHAR(64),
          reset_token_hash VARCHAR(255),
          reset_token_expiry TIMESTAMP WITH TIME ZONE,
          avatar TEXT,
          business_name VARCHAR(255),
          district VARCHAR(100),
          city VARCHAR(100),
          address TEXT,
          dealer_type VARCHAR(64),
          dealer_status VARCHAR(32),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS properties (
          id VARCHAR(64) PRIMARY KEY,
          property_code VARCHAR(32) UNIQUE NOT NULL,
          title VARCHAR(500) NOT NULL,
          title_ta VARCHAR(500),
          description TEXT,
          type VARCHAR(32) NOT NULL,
          status VARCHAR(32) NOT NULL,
          price NUMERIC(15, 2) NOT NULL,
          district VARCHAR(100) NOT NULL,
          city VARCHAR(100) NOT NULL,
          area VARCHAR(150) NOT NULL,
          area_sqft NUMERIC(10, 2) NOT NULL,
          dealer_id VARCHAR(64) NOT NULL,
          dealer_name VARCHAR(255) NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(64) PRIMARY KEY,
          receipt_number VARCHAR(100) UNIQUE,
          dealer_id VARCHAR(64) NOT NULL,
          dealer_name VARCHAR(255) NOT NULL,
          property_id VARCHAR(64) NOT NULL,
          property_title VARCHAR(500) NOT NULL,
          amount NUMERIC(10, 2) NOT NULL,
          currency VARCHAR(8) DEFAULT 'INR',
          method VARCHAR(64),
          status VARCHAR(32) NOT NULL,
          transaction_ref VARCHAR(255),
          order_id VARCHAR(100),
          payment_id VARCHAR(100),
          verification_method VARCHAR(64),
          webhook_event_id VARCHAR(100),
          verified_at TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          audit_log JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS webhook_events (
          event_id VARCHAR(100) PRIMARY KEY,
          event_type VARCHAR(64) NOT NULL,
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          payload JSONB
        );

        CREATE TABLE IF NOT EXISTS enquiries (
          id VARCHAR(64) PRIMARY KEY,
          property_id VARCHAR(64),
          property_code VARCHAR(32),
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(32) NOT NULL,
          customer_email VARCHAR(255),
          message TEXT NOT NULL,
          channel VARCHAR(32) NOT NULL,
          status VARCHAR(32) NOT NULL,
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS site_visits (
          id VARCHAR(64) PRIMARY KEY,
          property_id VARCHAR(64) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          customer_phone VARCHAR(32) NOT NULL,
          visit_date VARCHAR(32),
          visit_time VARCHAR(32),
          status VARCHAR(32) NOT NULL,
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          target_role VARCHAR(32),
          title VARCHAR(500) NOT NULL,
          title_ta VARCHAR(500),
          message TEXT NOT NULL,
          message_ta TEXT,
          link TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Safe Migrations for existing deployments
      await client.query(`
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_method VARCHAR(64);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS webhook_event_id VARCHAR(100);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS audit_log JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS utr VARCHAR(100);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by_admin_id VARCHAR(64);
        ALTER TABLE payments ADD COLUMN IF NOT EXISTS verified_by_admin_name VARCHAR(255);
        CREATE TABLE IF NOT EXISTS webhook_events (
          event_id VARCHAR(100) PRIMARY KEY,
          event_type VARCHAR(64) NOT NULL,
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          payload JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_payments_property_id ON payments(property_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        CREATE INDEX IF NOT EXISTS idx_payments_utr ON payments(utr);

        -- Safe column migrations for properties table
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_type VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_unit VARCHAR(32);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_area NUMERIC(15, 2);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS price_per_sqft NUMERIC(15, 2);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS road_access VARCHAR(32);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS dtcp_status VARCHAR(32);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS patta_status VARCHAR(32);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS house_type VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS bhk VARCHAR(32);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS built_up_area_sqft NUMERIC(10, 2);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS plot_area_sqft NUMERIC(10, 2);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_age VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS total_floors INT;
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS rental_property_type VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS suitable_for JSONB;
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(15, 2);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS available_from VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS preferred_rental_duration VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS rental_rules TEXT;
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS water_supply VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS electricity_supply VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS landmark VARCHAR(255);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS pincode VARCHAR(32);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_utr VARCHAR(100);
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_submitted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE properties ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;

        -- Safe column migrations for users table (admin recovery & password reset)
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP WITH TIME ZONE;
        CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token_hash);
      `);

      // Sync Users between PostgreSQL and memory
      const usersRes = await client.query('SELECT * FROM users');
      if (usersRes.rows.length === 0) {
        // Populate Postgres with seed users
        for (const u of this.data.users) {
          await client.query(
            `INSERT INTO users (id, name, email, phone, role, password_hash, salt, avatar, business_name, district, city, address, dealer_type, dealer_status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT (email) DO NOTHING`,
            [u.id, u.name, u.email.toLowerCase().trim(), u.phone, u.role, u.passwordHash || null, u.salt || null, u.avatar || null, u.businessName || null, u.district || null, u.city || null, u.address || null, u.dealerType || null, u.dealerStatus || null, u.createdAt || new Date().toISOString()]
          );
        }
      } else {
        // Merge Postgres users into memory
        for (const r of usersRes.rows) {
          const pgUser: DbUser = {
            id: r.id,
            name: r.name,
            email: r.email.toLowerCase().trim(),
            phone: r.phone,
            role: r.role,
            passwordHash: r.password_hash,
            salt: r.salt,
            resetTokenHash: r.reset_token_hash || undefined,
            resetTokenExpiry: r.reset_token_expiry ? new Date(r.reset_token_expiry).toISOString() : undefined,
            avatar: r.avatar,
            businessName: r.business_name,
            district: r.district,
            city: r.city,
            address: r.address,
            dealerType: r.dealer_type,
            dealerStatus: r.dealer_status,
            createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
          };
          const idx = this.data.users.findIndex(u => u.email.toLowerCase() === pgUser.email.toLowerCase());
          if (idx >= 0) {
            this.data.users[idx] = { ...this.data.users[idx], ...pgUser };
          } else {
            this.data.users.push(pgUser);
          }
        }
      }

      // Sync Properties
      const propsRes = await client.query('SELECT * FROM properties');
      if (propsRes.rows.length === 0) {
        for (const p of this.data.properties) {
          await client.query(
            `INSERT INTO properties (id, property_code, title, title_ta, description, type, status, price, district, city, area, area_sqft, dealer_id, dealer_name, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             ON CONFLICT (property_code) DO NOTHING`,
            [p.id, p.propertyCode, p.title, p.titleTa || null, p.description || '', p.type, p.status, p.price, p.district, p.city, p.area, p.areaSqft, p.dealerId, p.dealerName, JSON.stringify(p), p.createdAt, p.updatedAt]
          );
        }
      } else {
        for (const row of propsRes.rows) {
          const pData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          const prop: Property = {
            ...pData,
            id: row.id,
            propertyCode: row.property_code,
            title: row.title,
            type: row.type,
            status: row.status,
            price: Number(row.price),
            district: row.district,
            city: row.city,
            area: row.area,
            areaSqft: Number(row.area_sqft),
            dealerId: row.dealer_id,
            dealerName: row.dealer_name,
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : pData.createdAt,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : pData.updatedAt
          };
          const idx = this.data.properties.findIndex(p => p.id === prop.id || p.propertyCode === prop.propertyCode);
          if (idx >= 0) {
            this.data.properties[idx] = prop;
          } else {
            this.data.properties.push(prop);
          }
        }
      }

      // Sync Payments
      const paymentsRes = await client.query('SELECT * FROM payments');
      if (paymentsRes.rows.length > 0) {
        for (const row of paymentsRes.rows) {
          const payment: Payment = {
            id: row.id,
            receiptNumber: row.receipt_number,
            dealerId: row.dealer_id,
            dealerName: row.dealer_name,
            propertyId: row.property_id,
            propertyTitle: row.property_title,
            amount: Number(row.amount),
            currency: row.currency || 'INR',
            purpose: 'Property Listing Fee — ₹10',
            method: row.method,
            status: row.status,
            transactionRef: row.transaction_ref,
            orderId: row.order_id || undefined,
            paymentId: row.payment_id || undefined,
            verificationMethod: row.verification_method || undefined,
            webhookEventId: row.webhook_event_id || undefined,
            verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
            updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
            auditLog: typeof row.audit_log === 'string' ? JSON.parse(row.audit_log) : (row.audit_log || []),
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()
          };
          const idx = this.data.payments.findIndex(pm => pm.id === payment.id || (pm.receiptNumber && pm.receiptNumber === payment.receiptNumber));
          if (idx >= 0) {
            this.data.payments[idx] = payment;
          } else {
            this.data.payments.push(payment);
          }
        }
      }

      // Sync Webhook Events
      const webhookRes = await client.query('SELECT * FROM webhook_events');
      if (webhookRes.rows.length > 0) {
        this.data.webhook_events = webhookRes.rows.map(r => ({
          eventId: r.event_id,
          eventType: r.event_type,
          processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : new Date().toISOString(),
          payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload
        }));
      }

      client.release();
      console.log('[Database] PostgreSQL tables verified and hydrated into memory successfully.');
    } catch (err: any) {
      console.warn('[Database] PostgreSQL connection failed. Operating with persistent file store fallback:', err.message);
      this.isPostgresConnected = false;
    }
  }

  private saveToFile(schema: DatabaseSchema): void {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(schema, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to write database to disk:', err);
    }
  }

  public getSnapshot(): DatabaseSchema {
    return this.data;
  }

  // --- USER METHODS ---
  public findUserByEmail(email: string) {
    if (!email) return undefined;
    const normalized = email.toLowerCase().trim();
    const directMatch = this.data.users.find(u => u.email.toLowerCase().trim() === normalized);
    if (directMatch) return directMatch;

    // Check alias for configured admin email or admin@sppnestora.com
    const configuredAdminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OFFICIAL_EMAIL || '').toLowerCase().trim();
    if (configuredAdminEmail && normalized === configuredAdminEmail) {
      const adminUser = this.data.users.find(u => u.role === 'admin');
      if (adminUser) return adminUser;
    }
    if (normalized === 'admin@sppnestora.com') {
      const adminUser = this.data.users.find(u => u.role === 'admin');
      if (adminUser) return adminUser;
    }
    return undefined;
  }

  public findUserById(id: string) {
    if (!id) return undefined;
    return this.data.users.find(u => u.id === id);
  }

  public createUser(userData: Partial<User>, plainPassword?: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = plainPassword ? this.hashPassword(plainPassword, salt) : undefined;
    
    const newUser = {
      id: `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      name: userData.name || '',
      email: (userData.email || '').toLowerCase().trim(),
      phone: userData.phone || '',
      role: userData.role || 'customer',
      avatar: userData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || 'User')}`,
      createdAt: new Date().toISOString(),
      businessName: userData.businessName,
      district: userData.district,
      city: userData.city,
      address: userData.address,
      dealerType: userData.dealerType,
      dealerStatus: (userData.role === 'dealer' ? (this.data.settings.autoApproveDealers ? 'verified' : 'pending') : undefined) as DealerStatus | undefined,
      passwordHash,
      salt
    };

    this.data.users.push(newUser);
    this.saveToFile(this.data);

    // Async sync to Postgres if connected
    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO users (id, name, email, phone, role, password_hash, salt, avatar, business_name, district, city, address, dealer_type, dealer_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone`,
        [newUser.id, newUser.name, newUser.email, newUser.phone, newUser.role, newUser.passwordHash, newUser.salt, newUser.avatar, newUser.businessName, newUser.district, newUser.city, newUser.address, newUser.dealerType, newUser.dealerStatus]
      ).catch(e => console.warn('[DB Postgres Sync Error] users insert:', e.message));
    }

    return newUser;
  }

  public verifyPassword(email: string, plainPassword: string): User | null {
    if (!email || !plainPassword) return null;
    const normalizedEmail = email.toLowerCase().trim();
    const user = this.findUserByEmail(normalizedEmail);
    if (!user) {
      console.log(`[Auth Diagnostic] Login attempt failed: user with email ${normalizedEmail} not found`);
      return null;
    }

    // Direct hash verification
    if (user.passwordHash && user.salt) {
      const hash = this.hashPassword(plainPassword, user.salt);
      if (hash === user.passwordHash) {
        console.log(`[Auth Diagnostic] User ${normalizedEmail} authenticated successfully via PBKDF2 hash.`);
        return user;
      }
      console.log(`[Auth Diagnostic] Password verification failed for user ${normalizedEmail}`);
      return null;
    }

    // Seed account default credentials fallback
    if (
      (normalizedEmail === 'admin@sppnestora.com' && plainPassword === 'admin123') ||
      (normalizedEmail === 'dealer@sppnestora.com' && plainPassword === 'dealer123') ||
      (normalizedEmail === 'customer@sppnestora.com' && plainPassword === 'customer123')
    ) {
      console.log(`[Auth Diagnostic] Seed account ${normalizedEmail} authenticated via seed credentials.`);
      return user;
    }

    // If user has no passwordHash set yet (legacy record), accept password >= 6 and set hash
    if (!user.passwordHash || !user.salt) {
      if (plainPassword.length >= 6) {
        const salt = crypto.randomBytes(16).toString('hex');
        user.salt = salt;
        user.passwordHash = this.hashPassword(plainPassword, salt);
        this.saveToFile(this.data);
        console.log(`[Auth Diagnostic] User ${normalizedEmail} password initialized.`);
        return user;
      }
    }

    console.log(`[Auth Diagnostic] Password verification failed for user ${normalizedEmail}`);
    return null;
  }

  /**
   * Generates a single-use cryptographically secure random reset token.
   * Only the SHA-256 hash is saved to the store/PostgreSQL.
   * Expiration is strictly enforced at 1 hour.
   */
  public createPasswordResetToken(email: string): { user: User; rawToken: string; deliveryEmail: string } | null {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    const user = this.findUserByEmail(normalized);
    if (!user) return null;

    const configuredAdminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OFFICIAL_EMAIL || '').toLowerCase().trim();
    let deliveryEmail = user.email;
    if (user.role === 'admin' && configuredAdminEmail) {
      deliveryEmail = configuredAdminEmail;
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour expiry

    user.resetTokenHash = tokenHash;
    user.resetTokenExpiry = expiry;
    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE users SET reset_token_hash = $1, reset_token_expiry = $2 WHERE id = $3`,
        [tokenHash, expiry, user.id]
      ).catch(e => console.warn('[DB Postgres Sync Error] reset token update:', e.message));
    }

    return { user, rawToken, deliveryEmail };
  }

  /**
   * Verifies that a reset token exists and has not expired.
   */
  public verifyPasswordResetToken(rawToken: string): { valid: boolean; user?: User; error?: string } {
    if (!rawToken || typeof rawToken !== 'string') {
      return { valid: false, error: 'Missing or invalid reset token.' };
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const user = this.data.users.find(u => u.resetTokenHash === tokenHash);

    if (!user) {
      return { valid: false, error: 'Invalid or already used password reset link.' };
    }

    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry).getTime() < Date.now()) {
      return { valid: false, error: 'Password reset link has expired. Please request a new one.' };
    }

    return { valid: true, user };
  }

  /**
   * Resets password using a validated token. Single-use: clears token immediately.
   * Never logs password or hash.
   */
  public resetPasswordWithToken(rawToken: string, newPassword: string): { success: boolean; user?: User; error?: string } {
    if (!rawToken || !newPassword) {
      return { success: false, error: 'Reset token and new password are required.' };
    }

    if (newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    const user = this.data.users.find(u => u.resetTokenHash === tokenHash);

    if (!user) {
      return { success: false, error: 'Invalid or already used password reset link.' };
    }

    if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry).getTime() < Date.now()) {
      return { success: false, error: 'Password reset link has expired. Please request a new one.' };
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = this.hashPassword(newPassword, newSalt);

    user.salt = newSalt;
    user.passwordHash = newHash;
    user.resetTokenHash = undefined;
    user.resetTokenExpiry = undefined;

    // For admin, if configuredAdminEmail is set and user email was default seed, sync to configuredAdminEmail
    const configuredAdminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OFFICIAL_EMAIL || '').toLowerCase().trim();
    if (user.role === 'admin' && configuredAdminEmail && user.email.toLowerCase() !== configuredAdminEmail) {
      const exists = this.data.users.find(u => u.id !== user.id && u.email.toLowerCase() === configuredAdminEmail);
      if (!exists) {
        user.email = configuredAdminEmail;
      }
    }

    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE users SET password_hash = $1, salt = $2, email = $3, reset_token_hash = NULL, reset_token_expiry = NULL WHERE id = $4`,
        [newHash, newSalt, user.email, user.id]
      ).catch(e => console.warn('[DB Postgres Sync Error] password reset update:', e.message));
    }

    return { success: true, user };
  }

  /**
   * Emergency CLI Admin password reset. Does not require token.
   * Can be invoked via `npm run reset-admin [newPassword]`.
   */
  public emergencyResetAdminPassword(newPassword: string): { success: boolean; adminEmail: string; error?: string } {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, adminEmail: '', error: 'Password must be at least 6 characters long.' };
    }

    const configuredAdminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OFFICIAL_EMAIL || '').toLowerCase().trim();
    let admin = this.data.users.find(u => u.role === 'admin');

    if (!admin) {
      return { success: false, adminEmail: '', error: 'No admin user found in database.' };
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = this.hashPassword(newPassword, newSalt);

    admin.salt = newSalt;
    admin.passwordHash = newHash;
    admin.resetTokenHash = undefined;
    admin.resetTokenExpiry = undefined;

    if (configuredAdminEmail && admin.email.toLowerCase() !== configuredAdminEmail) {
      const exists = this.data.users.find(u => u.id !== admin.id && u.email.toLowerCase() === configuredAdminEmail);
      if (!exists) {
        admin.email = configuredAdminEmail;
      }
    }

    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE users SET password_hash = $1, salt = $2, email = $3, reset_token_hash = NULL, reset_token_expiry = NULL WHERE id = $4`,
        [newHash, newSalt, admin.email, admin.id]
      ).catch(e => console.warn('[DB Postgres Sync Error] emergency admin reset:', e.message));
    }

    return { success: true, adminEmail: admin.email };
  }

  /**
   * Asynchronous version of emergencyResetAdminPassword that awaits PostgreSQL write
   * before returning, ensuring CLI processes don't exit before Postgres commits.
   */
  public async emergencyResetAdminPasswordAsync(newPassword: string): Promise<{ success: boolean; adminEmail: string; error?: string }> {
    const res = this.emergencyResetAdminPassword(newPassword);
    if (!res.success) return res;

    if (this.pool && this.isPostgresConnected) {
      try {
        const admin = this.data.users.find(u => u.role === 'admin');
        if (admin) {
          await this.pool.query(
            `UPDATE users SET password_hash = $1, salt = $2, email = $3, reset_token_hash = NULL, reset_token_expiry = NULL WHERE id = $4`,
            [admin.passwordHash, admin.salt, admin.email, admin.id]
          );
        }
      } catch (err: any) {
        console.warn('[DB Postgres Sync Error] emergency admin reset async:', err.message);
      }
    }

    return res;
  }

  public updateDealerStatus(dealerId: string, status: DealerStatus, reason?: string) {
    const dealer = this.data.users.find(u => u.id === dealerId && u.role === 'dealer');
    if (!dealer) return null;
    dealer.dealerStatus = status;
    dealer.rejectionReason = reason;
    if (status === 'verified') {
      dealer.verifiedAt = new Date().toISOString();
    }
    this.saveToFile(this.data);
    return dealer;
  }

  // --- PROPERTY METHODS ---
  public getProperties(onlyPublic = false): Property[] {
    if (onlyPublic) {
      return this.data.properties.filter(p => p.status === 'available');
    }
    return this.data.properties;
  }

  public getPropertyById(idOrCode: string): Property | undefined {
    return this.data.properties.find(
      p => p.id === idOrCode || p.propertyCode.toLowerCase() === idOrCode.toLowerCase()
    );
  }

  public createProperty(propertyData: Partial<Property>, dealer: User): Property {
    const districtCode = (propertyData.district || 'TN').substring(0, 3).toUpperCase();
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const propertyCode = `SPP-${districtCode}-${randomCode}`;

    const type = propertyData.type || 'house_sale';
    let areaSqft = Number(propertyData.areaSqft) || 0;
    let pricePerSqft = propertyData.pricePerSqft ? Number(propertyData.pricePerSqft) : undefined;
    const price = Number(propertyData.price) || 0;

    // Unit conversion factors for Land in Tamil Nadu
    const conversionFactors: Record<string, number> = {
      sqft: 1,
      cent: 435.6,
      ground: 2400,
      acre: 43560,
      hectare: 107639
    };

    if (type === 'land_sale') {
      const unit = (propertyData.areaUnit || 'sqft').toLowerCase();
      if (propertyData.totalArea && conversionFactors[unit]) {
        areaSqft = Math.round(Number(propertyData.totalArea) * conversionFactors[unit]);
      } else if (!areaSqft && propertyData.totalArea) {
        areaSqft = Math.round(Number(propertyData.totalArea));
      }
      if (!pricePerSqft && areaSqft > 0 && price > 0) {
        pricePerSqft = Math.round(price / areaSqft);
      }
    } else if (type === 'house_sale') {
      const builtUp = Number(propertyData.builtUpAreaSqft) || areaSqft || 1200;
      areaSqft = builtUp;
      if (!pricePerSqft && builtUp > 0 && price > 0) {
        pricePerSqft = Math.round(price / builtUp);
      }
    } else if (type === 'house_rent') {
      const builtUp = Number(propertyData.builtUpAreaSqft) || areaSqft || 1000;
      areaSqft = builtUp;
    }

    if (!areaSqft) areaSqft = 1000;

    const newProperty: Property = {
      id: `prop-${Date.now()}`,
      propertyCode,
      title: propertyData.title || '',
      titleTa: propertyData.titleTa,
      description: propertyData.description || '',
      descriptionTa: propertyData.descriptionTa,
      type,
      status: (dealer.role === 'dealer' ? 'pending_payment' : (this.data.settings.autoApproveProperties ? 'available' : 'pending_approval')) as PropertyStatus,
      price,
      priceNegotiable: propertyData.priceNegotiable ?? true,
      rentalPeriod: propertyData.rentalPeriod || 'monthly',
      depositAmount: Number(propertyData.depositAmount) || 0,
      maintenanceFee: Number(propertyData.maintenanceFee) || 0,
      state: 'Tamil Nadu',
      district: propertyData.district || 'Chennai',
      city: propertyData.city || propertyData.district || 'Chennai',
      taluk: propertyData.taluk,
      area: propertyData.area || propertyData.locality || '',
      locality: propertyData.locality || propertyData.area || '',
      address: propertyData.address || '',
      landmark: propertyData.landmark,
      pincode: propertyData.pincode,
      areaSqft,
      pricePerSqft,

      // Land for Sale specifics
      landType: propertyData.landType,
      totalArea: propertyData.totalArea ? Number(propertyData.totalArea) : undefined,
      areaUnit: propertyData.areaUnit,
      roadAccess: propertyData.roadAccess || 'available',
      dtcpStatus: propertyData.dtcpStatus || (propertyData.dtcpApproved ? 'approved' : 'unknown'),
      pattaStatus: propertyData.pattaStatus || (propertyData.pattaAvailable ? 'yes' : 'unknown'),
      plotDimensions: propertyData.plotDimensions,
      zoningType: propertyData.zoningType || 'residential',
      dtcpApproved: propertyData.dtcpStatus === 'approved' || propertyData.dtcpApproved === true,
      reraApproved: propertyData.reraApproved ?? false,
      pattaAvailable: propertyData.pattaStatus === 'yes' || propertyData.pattaAvailable === true,

      // House for Sale specifics
      houseType: propertyData.houseType,
      bhk: propertyData.bhk ? String(propertyData.bhk) : (propertyData.bedrooms ? String(propertyData.bedrooms) : undefined),
      builtUpAreaSqft: propertyData.builtUpAreaSqft ? Number(propertyData.builtUpAreaSqft) : areaSqft,
      plotAreaSqft: propertyData.plotAreaSqft ? Number(propertyData.plotAreaSqft) : undefined,
      propertyAge: propertyData.propertyAge || propertyData.ageOfProperty,
      ageOfProperty: propertyData.propertyAge || propertyData.ageOfProperty,
      totalFloors: propertyData.totalFloors !== undefined ? Number(propertyData.totalFloors) : (propertyData.floors || 1),

      // House for Rent specifics
      rentalPropertyType: propertyData.rentalPropertyType,
      suitableFor: Array.isArray(propertyData.suitableFor) ? propertyData.suitableFor : (propertyData.suitableFor ? [String(propertyData.suitableFor)] : ['Family']),
      monthlyRent: type === 'house_rent' ? (Number(propertyData.monthlyRent) || price) : undefined,
      availableFrom: propertyData.availableFrom || 'Immediately',
      preferredRentalDuration: propertyData.preferredRentalDuration || '11 Months',
      rentalRules: propertyData.rentalRules,

      // Shared housing & specs
      bedrooms: propertyData.bedrooms ? Number(propertyData.bedrooms) : (propertyData.bhk ? Number(propertyData.bhk) || 2 : undefined),
      bathrooms: propertyData.bathrooms ? Number(propertyData.bathrooms) : 1,
      balconies: propertyData.balconies ? Number(propertyData.balconies) : undefined,
      floors: propertyData.totalFloors !== undefined ? Number(propertyData.totalFloors) : (propertyData.floors || 1),
      floorNo: propertyData.floorNo !== undefined ? Number(propertyData.floorNo) : undefined,
      facing: propertyData.facing || 'East',
      furnishing: propertyData.furnishing || 'unfurnished',
      parking: propertyData.parking || 'none',
      waterSupply: propertyData.waterSupply || 'Borewell & Corporation',
      electricitySupply: propertyData.electricitySupply || 'EB 3-Phase',
      waterSource: propertyData.waterSource || [propertyData.waterSupply || 'Borewell'],
      amenities: propertyData.amenities || [],
      images: Array.isArray(propertyData.images) ? propertyData.images : [],
      videoUrl: propertyData.videoUrl,
      dealerId: dealer.id,
      dealerName: dealer.businessName || dealer.name,
      verified: false,
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.properties.unshift(newProperty);
    
    // Log initial history
    this.data.status_history.push({
      id: `hist-${Date.now()}`,
      propertyId: newProperty.id,
      propertyCode: newProperty.propertyCode,
      previousStatus: 'pending_approval',
      newStatus: newProperty.status,
      changedByUserId: dealer.id,
      changedByRole: dealer.role,
      timestamp: new Date().toISOString()
    });

    this.saveToFile(this.data);

    // Async sync to Postgres if connected
    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO properties (id, property_code, title, title_ta, description, type, status, price, district, city, area, area_sqft, dealer_id, dealer_name, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [newProperty.id, newProperty.propertyCode, newProperty.title, newProperty.titleTa, newProperty.description, newProperty.type, newProperty.status, newProperty.price, newProperty.district, newProperty.city, newProperty.area, newProperty.areaSqft, newProperty.dealerId, newProperty.dealerName, JSON.stringify(newProperty)]
      ).catch(e => console.warn('[DB Postgres Sync Error] property insert:', e.message));
    }

    return newProperty;
  }

  public updatePropertyStatus(
    propertyId: string, 
    newStatus: PropertyStatus, 
    userId: string, 
    userRole: string, 
    reason?: string
  ) {
    const prop = this.data.properties.find(p => p.id === propertyId);
    if (!prop) return null;

    const previousStatus = prop.status;
    prop.status = newStatus;
    prop.rejectionReason = reason;
    if (newStatus === 'available') {
      prop.verified = true;
    }
    prop.updatedAt = new Date().toISOString();

    // Log in history table
    this.data.status_history.push({
      id: `hist-${Date.now()}`,
      propertyId: prop.id,
      propertyCode: prop.propertyCode,
      previousStatus,
      newStatus,
      changedByUserId: userId,
      changedByRole: userRole,
      reason,
      timestamp: new Date().toISOString()
    });

    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE properties SET status = $1, data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [newStatus, JSON.stringify(prop), propertyId]
      ).catch(e => console.warn('[DB Postgres Sync Error] property status update:', e.message));
    }

    return prop;
  }

  // --- PAYMENT & INVOICE METHODS ---
  public getPaymentById(id: string): Payment | undefined {
    return this.data.payments.find(p => p.id === id);
  }

  public getPaymentByPropertyId(propertyId: string): Payment | undefined {
    return this.data.payments.find(p => p.propertyId === propertyId);
  }

  public getPaymentByOrderId(orderId: string): Payment | undefined {
    return this.data.payments.find(p => p.orderId === orderId);
  }

  public getPaymentByRazorpayPaymentId(paymentId: string): Payment | undefined {
    return this.data.payments.find(p => p.paymentId === paymentId || p.transactionRef === `RZP-${paymentId}`);
  }

  public isWebhookEventProcessed(eventId: string): boolean {
    if (!eventId) return false;
    return (this.data.webhook_events || []).some(e => e.eventId === eventId);
  }

  public recordWebhookEvent(eventId: string, eventType: string, payload?: any): void {
    if (!eventId) return;
    if (!this.data.webhook_events) {
      this.data.webhook_events = [];
    }
    if (this.isWebhookEventProcessed(eventId)) return;

    const eventRecord = {
      eventId,
      eventType,
      processedAt: new Date().toISOString(),
      payload
    };
    this.data.webhook_events.push(eventRecord);
    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO webhook_events (event_id, event_type, processed_at, payload)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (event_id) DO NOTHING`,
        [eventRecord.eventId, eventRecord.eventType, eventRecord.processedAt, JSON.stringify(payload || {})]
      ).catch(e => console.warn('[DB Postgres Sync Error] webhook_events insert:', e.message));
    }
  }

  public recordPayment(paymentData: {
    dealerId: string;
    dealerName: string;
    propertyId: string;
    propertyTitle: string;
    amount: number;
    currency?: string;
    method: 'upi' | 'card' | 'netbanking' | 'wallet';
    status: 'success' | 'failed' | 'refunded' | 'pending';
    transactionRef?: string;
    orderId?: string;
    paymentId?: string;
    verificationMethod?: 'razorpay_signature' | 'razorpay_webhook' | 'sandbox_simulation';
    webhookEventId?: string;
    verifiedAt?: string;
    auditLog?: PaymentAuditEntry[];
  }): Payment {
    const existingIndex = this.data.payments.findIndex(
      p => (paymentData.orderId && p.orderId === paymentData.orderId) ||
           (paymentData.propertyId && p.propertyId === paymentData.propertyId && p.status === 'pending')
    );

    const receiptNumber = `SPP-REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const payment: Payment = {
      id: `pay-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      receiptNumber,
      dealerId: paymentData.dealerId,
      dealerName: paymentData.dealerName,
      propertyId: paymentData.propertyId,
      propertyTitle: paymentData.propertyTitle,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      purpose: `Property Listing Fee — ₹${paymentData.amount}`,
      method: paymentData.method,
      status: paymentData.status,
      transactionRef: paymentData.transactionRef || `${paymentData.method.toUpperCase()}-TXN-${Date.now()}`,
      orderId: paymentData.orderId,
      paymentId: paymentData.paymentId,
      verificationMethod: paymentData.verificationMethod,
      webhookEventId: paymentData.webhookEventId,
      verifiedAt: paymentData.status === 'success' ? (paymentData.verifiedAt || now) : undefined,
      createdAt: now,
      updatedAt: now,
      auditLog: paymentData.auditLog || [
        {
          action: `Payment initialized as ${paymentData.status}`,
          timestamp: now,
          source: (paymentData.verificationMethod === 'razorpay_webhook' ? 'webhook' : 'checkout_callback')
        }
      ]
    };

    if (existingIndex >= 0) {
      payment.id = this.data.payments[existingIndex].id;
      payment.receiptNumber = this.data.payments[existingIndex].receiptNumber;
      payment.createdAt = this.data.payments[existingIndex].createdAt;
      payment.auditLog = [
        ...(this.data.payments[existingIndex].auditLog || []),
        {
          action: `Payment updated to ${paymentData.status}`,
          timestamp: now,
          source: (paymentData.verificationMethod === 'razorpay_webhook' ? 'webhook' : 'checkout_callback'),
          details: `Ref: ${payment.transactionRef}`
        }
      ];
      this.data.payments[existingIndex] = payment;
    } else {
      this.data.payments.unshift(payment);
    }

    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO payments (id, receipt_number, dealer_id, dealer_name, property_id, property_title, amount, currency, method, status, transaction_ref, order_id, payment_id, verification_method, webhook_event_id, verified_at, updated_at, audit_log)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           transaction_ref = EXCLUDED.transaction_ref,
           order_id = EXCLUDED.order_id,
           payment_id = EXCLUDED.payment_id,
           verification_method = EXCLUDED.verification_method,
           webhook_event_id = EXCLUDED.webhook_event_id,
           verified_at = EXCLUDED.verified_at,
           updated_at = EXCLUDED.updated_at,
           audit_log = EXCLUDED.audit_log`,
        [
          payment.id,
          payment.receiptNumber,
          payment.dealerId,
          payment.dealerName,
          payment.propertyId,
          payment.propertyTitle,
          payment.amount,
          payment.currency,
          payment.method,
          payment.status,
          payment.transactionRef,
          payment.orderId || null,
          payment.paymentId || null,
          payment.verificationMethod || null,
          payment.webhookEventId || null,
          payment.verifiedAt || null,
          payment.updatedAt || null,
          JSON.stringify(payment.auditLog || [])
        ]
      ).catch(e => console.warn('[DB Postgres Sync Error] payment upsert:', e.message));
    }

    return payment;
  }

  public updatePayment(
    paymentId: string, 
    updates: Partial<Payment>, 
    auditEntry?: PaymentAuditEntry
  ): Payment | null {
    const payment = this.data.payments.find(p => p.id === paymentId || p.orderId === paymentId || p.transactionRef === `RZP-${paymentId}`);
    if (!payment) return null;

    const now = new Date().toISOString();
    Object.assign(payment, updates);
    payment.updatedAt = now;

    if (updates.status === 'success' && !payment.verifiedAt) {
      payment.verifiedAt = now;
    }

    if (auditEntry) {
      if (!payment.auditLog) payment.auditLog = [];
      payment.auditLog.push({
        ...auditEntry,
        timestamp: auditEntry.timestamp || now
      });
    }

    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE payments SET
           status = $1,
           transaction_ref = $2,
           payment_id = $3,
           verification_method = $4,
           webhook_event_id = $5,
           verified_at = $6,
           updated_at = $7,
           audit_log = $8
         WHERE id = $9`,
        [
          payment.status,
          payment.transactionRef,
          payment.paymentId || null,
          payment.verificationMethod || null,
          payment.webhookEventId || null,
          payment.verifiedAt || null,
          payment.updatedAt || null,
          JSON.stringify(payment.auditLog || []),
          payment.id
        ]
      ).catch(e => console.warn('[DB Postgres Sync Error] payment update:', e.message));
    }

    return payment;
  }

  // --- MANUAL UPI QR PAYMENT METHODS ---
  public isUtrDuplicateVerified(utr: string, excludePropertyId?: string): boolean {
    if (!utr || !utr.trim()) return false;
    const normalized = utr.trim().toLowerCase();
    return this.data.payments.some(p => 
      p.status === 'success' &&
      p.utr &&
      p.utr.trim().toLowerCase() === normalized &&
      (!excludePropertyId || p.propertyId !== excludePropertyId)
    );
  }

  public submitManualPayment(
    params: {
      propertyId: string;
      dealerId?: string;
      dealerName?: string;
      utr: string;
      screenshotUrl?: string;
      confirmed?: boolean;
      clientAmount?: number;
    },
    userArg?: { id: string; name?: string }
  ): { success: boolean; payment: Payment; property: Property } {
    const finalDealerId = params.dealerId || userArg?.id || 'dealer-01';
    const finalDealerName = params.dealerName || userArg?.name || 'Dealer';

    const prop = this.data.properties.find(p => p.id === params.propertyId);
    if (!prop) {
      throw new Error('Property not found');
    }

    if (!params.utr || !params.utr.trim()) {
      throw new Error('UPI transaction reference (UTR) is required');
    }

    if (!params.confirmed) {
      throw new Error('You must confirm that the payment was transferred to the official UPI ID');
    }

    const trimmedUtr = params.utr.trim();
    if (trimmedUtr.length < 6 || trimmedUtr.length > 30) {
      throw new Error('Please enter a valid UPI transaction reference / UTR (6 to 30 characters)');
    }

    // Check if this UTR has already been verified for another property
    if (this.isUtrDuplicateVerified(trimmedUtr, params.propertyId)) {
      throw new Error('This UPI transaction reference (UTR) has already been verified for another property. Duplicate submissions are not allowed.');
    }

    const now = new Date().toISOString();
    // Authoritative fixed listing fee from server settings
    const fixedAmount = this.data.settings.listingFeeAmount || 10;

    let payment = this.data.payments.find(p => p.propertyId === params.propertyId);
    const auditEntry: PaymentAuditEntry = {
      action: `Manual UPI payment submitted with UTR: ${trimmedUtr}`,
      timestamp: now,
      source: 'dealer_submission',
      details: params.screenshotUrl ? 'Payment screenshot provided' : 'No screenshot attached'
    };

    if (payment) {
      payment.amount = fixedAmount;
      payment.method = 'manual_upi';
      payment.status = 'submitted';
      payment.utr = trimmedUtr;
      payment.transactionRef = trimmedUtr;
      if (params.screenshotUrl) {
        payment.screenshotUrl = params.screenshotUrl;
      }
      payment.rejectionReason = undefined;
      payment.updatedAt = now;
      if (!payment.auditLog) payment.auditLog = [];
      payment.auditLog.push(auditEntry);
    } else {
      const receiptNumber = `SPP-REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      payment = {
        id: `pay-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        receiptNumber,
        dealerId: finalDealerId,
        dealerName: finalDealerName || prop.dealerName || 'Dealer',
        propertyId: prop.id,
        propertyTitle: prop.title,
        amount: fixedAmount,
        currency: 'INR',
        purpose: `Property Listing Fee — ₹${fixedAmount}`,
        method: 'manual_upi',
        status: 'submitted',
        transactionRef: trimmedUtr,
        utr: trimmedUtr,
        screenshotUrl: params.screenshotUrl,
        createdAt: now,
        updatedAt: now,
        auditLog: [auditEntry]
      };
      this.data.payments.unshift(payment);
    }

    // Update Property state
    const previousStatus = prop.status;
    prop.status = 'payment_submitted';
    prop.paymentUtr = trimmedUtr;
    if (params.screenshotUrl) {
      prop.paymentScreenshotUrl = params.screenshotUrl;
    }
    prop.paymentSubmittedAt = now;
    prop.paymentRejectionReason = undefined;
    prop.updatedAt = now;

    // Log status history
    this.data.status_history.push({
      id: `hist-${Date.now()}`,
      propertyId: prop.id,
      propertyCode: prop.propertyCode,
      previousStatus,
      newStatus: 'payment_submitted',
      changedByUserId: finalDealerId,
      changedByRole: 'dealer',
      reason: `Manual UPI payment submitted with UTR: ${trimmedUtr}`,
      timestamp: now
    });

    this.saveToFile(this.data);

    // Sync to PostgreSQL if connected
    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO payments (id, receipt_number, dealer_id, dealer_name, property_id, property_title, amount, currency, method, status, transaction_ref, utr, screenshot_url, updated_at, audit_log)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           transaction_ref = EXCLUDED.transaction_ref,
           utr = EXCLUDED.utr,
           screenshot_url = EXCLUDED.screenshot_url,
           updated_at = EXCLUDED.updated_at,
           audit_log = EXCLUDED.audit_log`,
        [
          payment.id,
          payment.receiptNumber,
          payment.dealerId,
          payment.dealerName,
          payment.propertyId,
          payment.propertyTitle,
          payment.amount,
          payment.currency,
          payment.method,
          payment.status,
          payment.transactionRef,
          payment.utr || null,
          payment.screenshotUrl || null,
          payment.updatedAt,
          JSON.stringify(payment.auditLog || [])
        ]
      ).catch(e => console.warn('[DB Postgres Sync Error] manual payment submit:', e.message));

      this.pool.query(
        `UPDATE properties SET status = $1, payment_utr = $2, payment_screenshot_url = $3, payment_submitted_at = $4, data = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6`,
        [prop.status, prop.paymentUtr, prop.paymentScreenshotUrl || null, prop.paymentSubmittedAt, JSON.stringify(prop), prop.id]
      ).catch(e => console.warn('[DB Postgres Sync Error] property payment_submitted update:', e.message));
    }

    return { success: true, payment, property: prop };
  }

  public verifyManualPayment(
    paramsOrId: {
      paymentIdOrPropertyId: string;
      adminId: string;
      adminName: string;
    } | string,
    adminIdArg?: string,
    adminNameArg?: string
  ): { success: boolean; payment: Payment; property: Property } {
    const paymentIdOrPropertyId = typeof paramsOrId === 'string' ? paramsOrId : paramsOrId.paymentIdOrPropertyId;
    const adminId = typeof paramsOrId === 'string' ? (adminIdArg || 'admin-01') : paramsOrId.adminId;
    const adminName = typeof paramsOrId === 'string' ? (adminNameArg || 'Super Admin') : paramsOrId.adminName;

    const payment = this.data.payments.find(p => p.id === paymentIdOrPropertyId || p.propertyId === paymentIdOrPropertyId);
    if (!payment) {
      throw new Error('Payment record not found');
    }

    const prop = this.data.properties.find(p => p.id === payment.propertyId);
    if (!prop) {
      throw new Error('Associated property not found');
    }

    if (!payment.utr || !payment.utr.trim()) {
      throw new Error('Cannot verify payment: no UTR transaction reference was submitted.');
    }

    // Check duplicate UTR verified for other properties
    if (this.isUtrDuplicateVerified(payment.utr, payment.propertyId)) {
      throw new Error(`Cannot verify: UTR ${payment.utr} has already been verified for another property.`);
    }

    const now = new Date().toISOString();
    const auditEntry: PaymentAuditEntry = {
      action: 'Manual UPI payment verified by Admin',
      timestamp: now,
      adminId,
      adminName,
      details: `Verified ₹${payment.amount} against bank records (UTR: ${payment.utr})`,
      source: 'admin_action'
    };

    payment.status = 'success';
    payment.verificationMethod = 'manual_upi_verification';
    payment.verifiedAt = now;
    payment.verifiedByAdminId = adminId;
    payment.verifiedByAdminName = adminName;
    payment.updatedAt = now;
    payment.rejectionReason = undefined;
    if (!payment.auditLog) payment.auditLog = [];
    payment.auditLog.push(auditEntry);

    // Update Property state: Moves to pending_approval (NOT available!)
    const previousStatus = prop.status;
    prop.status = 'pending_approval';
    prop.paymentVerifiedAt = now;
    prop.paymentRejectionReason = undefined;
    prop.updatedAt = now;

    // Log status history
    this.data.status_history.push({
      id: `hist-${Date.now()}`,
      propertyId: prop.id,
      propertyCode: prop.propertyCode,
      previousStatus,
      newStatus: 'pending_approval',
      changedByUserId: adminId,
      changedByRole: 'admin',
      reason: `Listing fee payment verified by admin (${adminName}). Moved to pending listing approval queue.`,
      timestamp: now
    });

    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE payments SET
           status = $1,
           verification_method = $2,
           verified_at = $3,
           verified_by_admin_id = $4,
           verified_by_admin_name = $5,
           updated_at = $6,
           audit_log = $7
         WHERE id = $8`,
        [
          payment.status,
          payment.verificationMethod,
          payment.verifiedAt,
          payment.verifiedByAdminId,
          payment.verifiedByAdminName,
          payment.updatedAt,
          JSON.stringify(payment.auditLog || []),
          payment.id
        ]
      ).catch(e => console.warn('[DB Postgres Sync Error] verify manual payment:', e.message));

      this.pool.query(
        `UPDATE properties SET status = $1, payment_verified_at = $2, data = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [prop.status, prop.paymentVerifiedAt, JSON.stringify(prop), prop.id]
      ).catch(e => console.warn('[DB Postgres Sync Error] property pending_approval update:', e.message));
    }

    return { success: true, payment, property: prop };
  }

  public rejectManualPayment(
    paramsOrId: {
      paymentIdOrPropertyId: string;
      adminId: string;
      adminName: string;
      reason: string;
    } | string,
    reasonArg?: string,
    adminIdArg?: string,
    adminNameArg?: string
  ): { success: boolean; payment: Payment; property: Property } {
    const paymentIdOrPropertyId = typeof paramsOrId === 'string' ? paramsOrId : paramsOrId.paymentIdOrPropertyId;
    const rawReason = typeof paramsOrId === 'string' ? (reasonArg || '') : paramsOrId.reason;
    const adminId = typeof paramsOrId === 'string' ? (adminIdArg || 'admin-01') : paramsOrId.adminId;
    const adminName = typeof paramsOrId === 'string' ? (adminNameArg || 'Super Admin') : paramsOrId.adminName;

    if (!rawReason || !rawReason.trim()) {
      throw new Error('A specific rejection reason is required to reject a payment submission.');
    }

    const trimmedReason = rawReason.trim();
    const payment = this.data.payments.find(p => p.id === paymentIdOrPropertyId || p.propertyId === paymentIdOrPropertyId);
    if (!payment) {
      throw new Error('Payment record not found');
    }

    const prop = this.data.properties.find(p => p.id === payment.propertyId);
    if (!prop) {
      throw new Error('Associated property not found');
    }

    const now = new Date().toISOString();
    const auditEntry: PaymentAuditEntry = {
      action: 'Manual UPI payment rejected by Admin',
      timestamp: now,
      adminId,
      adminName,
      reason: trimmedReason,
      source: 'admin_action'
    };

    payment.status = 'failed';
    payment.rejectionReason = trimmedReason;
    payment.updatedAt = now;
    if (!payment.auditLog) payment.auditLog = [];
    payment.auditLog.push(auditEntry);

    // Update Property state: Moves to payment_rejected (dealer can resubmit)
    const previousStatus = prop.status;
    prop.status = 'payment_rejected';
    prop.paymentRejectionReason = trimmedReason;
    prop.rejectionReason = trimmedReason;
    prop.updatedAt = now;

    // Log status history
    this.data.status_history.push({
      id: `hist-${Date.now()}`,
      propertyId: prop.id,
      propertyCode: prop.propertyCode,
      previousStatus,
      newStatus: 'payment_rejected',
      changedByUserId: adminId,
      changedByRole: 'admin',
      reason: trimmedReason,
      timestamp: now
    });

    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE payments SET
           status = $1,
           rejection_reason = $2,
           updated_at = $3,
           audit_log = $4
         WHERE id = $5`,
        [
          payment.status,
          payment.rejectionReason,
          payment.updatedAt,
          JSON.stringify(payment.auditLog || []),
          payment.id
        ]
      ).catch(e => console.warn('[DB Postgres Sync Error] reject manual payment:', e.message));

      this.pool.query(
        `UPDATE properties SET status = $1, payment_rejection_reason = $2, data = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [prop.status, prop.paymentRejectionReason, JSON.stringify(prop), prop.id]
      ).catch(e => console.warn('[DB Postgres Sync Error] property payment_rejected update:', e.message));
    }

    return { success: true, payment, property: prop };
  }

  public getManualPayments(): Payment[] {
    return this.data.payments.filter(p => 
      p.method === 'upi' || 
      p.utr || 
      p.verificationMethod === 'manual_upi_verification'
    );
  }

  // --- ENQUIRIES CRM METHODS ---
  public createEnquiry(enqData: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt'>): Enquiry {
    const enquiry: Enquiry = {
      ...enqData,
      id: `enq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.enquiries.unshift(enquiry);
    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO enquiries (id, property_id, property_code, customer_name, customer_phone, customer_email, message, channel, status, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [enquiry.id, enquiry.propertyId, enquiry.propertyCode, enquiry.customerName, enquiry.customerPhone, enquiry.customerEmail, enquiry.message, enquiry.channel, enquiry.status, JSON.stringify(enquiry)]
      ).catch(e => console.warn('[DB Postgres Sync Error] enquiry insert:', e.message));
    }

    return enquiry;
  }

  public updateEnquiryStatus(id: string, status: any, adminNotes?: string) {
    const enq = this.data.enquiries.find(e => e.id === id);
    if (!enq) return null;
    enq.status = status;
    if (adminNotes !== undefined) enq.adminNotes = adminNotes;
    enq.updatedAt = new Date().toISOString();
    this.saveToFile(this.data);
    return enq;
  }

  // --- SITE VISITS METHODS ---
  public createSiteVisit(visitData: Omit<SiteVisit, 'id' | 'createdAt'>): SiteVisit {
    const visit: SiteVisit = {
      ...visitData,
      id: `sv-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.data.site_visits.unshift(visit);
    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO site_visits (id, property_id, customer_name, customer_phone, visit_date, visit_time, status, data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [visit.id, visit.propertyId, visit.customerName, visit.customerPhone, visit.date, visit.time, visit.status, JSON.stringify(visit)]
      ).catch(e => console.warn('[DB Postgres Sync Error] site_visit insert:', e.message));
    }

    return visit;
  }

  public updateSiteVisitStatus(id: string, status: any, notes?: string) {
    const sv = this.data.site_visits.find(s => s.id === id);
    if (!sv) return null;
    sv.status = status;
    if (notes !== undefined) sv.notes = notes;
    this.saveToFile(this.data);
    return sv;
  }

  // --- SETTINGS METHODS ---
  public getSettings(): AdminSettings {
    return this.data.settings;
  }

  public updateSettings(newSettings: Partial<AdminSettings>): AdminSettings {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.saveToFile(this.data);
    return this.data.settings;
  }

  // --- NOTIFICATION METHODS ---
  public createNotification(notifData: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { isRead?: boolean; type?: string; userId?: string }): AppNotification {
    const notif: AppNotification = {
      isRead: false,
      ...notifData,
      id: `notif-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(notif);
    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO notifications (id, user_id, target_role, title, title_ta, message, message_ta, link, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [notif.id, notif.userId || null, notif.targetRole || 'admin', notif.title, notif.titleTa || null, notif.message, notif.messageTa || null, notif.link || null, false, notif.createdAt]
      ).catch(e => console.warn('[DB Postgres Sync Error] notification insert:', e.message));
    }

    return notif;
  }

  public getNotifications(role?: string, userId?: string): AppNotification[] {
    if (role === 'admin') {
      return this.data.notifications.filter(n => !n.userId || n.targetRole === 'admin' || n.targetRole === 'all');
    }
    if (userId) {
      return this.data.notifications.filter(n => n.userId === userId || n.targetRole === role || n.targetRole === 'all');
    }
    return [];
  }

  public markNotificationAsRead(id: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id);
    if (!notif) return false;
    notif.isRead = true;
    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `UPDATE notifications SET is_read = TRUE WHERE id = $1`,
        [id]
      ).catch(e => console.warn('[DB Postgres Sync Error] notification mark read:', e.message));
    }

    return true;
  }

  // --- ADMIN USER MANAGEMENT METHODS ---
  public getAdminUsers(): Array<User & { propertyCount?: number }> {
    return this.data.users.map(u => {
      const propertyCount = u.role === 'dealer'
        ? this.data.properties.filter(p => p.dealerId === u.id).length
        : undefined;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        avatar: u.avatar,
        businessName: u.businessName,
        district: u.district,
        city: u.city,
        address: u.address,
        dealerType: u.dealerType,
        dealerStatus: u.dealerStatus,
        verifiedAt: u.verifiedAt,
        rejectionReason: u.rejectionReason,
        createdAt: u.createdAt,
        propertyCount
      };
    });
  }

  // --- TERMS ACCEPTANCE METHODS ---
  public recordTermsAcceptance(record: Omit<TermsRecord, 'id' | 'acceptedAt'>): TermsRecord {
    const termsRecord: TermsRecord = {
      ...record,
      id: `terms-${Date.now()}`,
      acceptedAt: new Date().toISOString()
    };
    this.data.terms_acceptances.push(termsRecord);
    this.saveToFile(this.data);
    return termsRecord;
  }
}

export const db = new RelationalStore();
