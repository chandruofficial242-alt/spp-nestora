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

export interface DatabaseSchema {
  users: (User & { passwordHash?: string; salt?: string })[];
  properties: Property[];
  enquiries: Enquiry[];
  site_visits: SiteVisit[];
  payments: Payment[];
  notifications: AppNotification[];
  settings: AdminSettings;
  terms_acceptances: TermsRecord[];
  status_history: StatusHistoryRecord[];
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
      listingFeeAmount: process.env.DEFAULT_LISTING_FEE ? Number(process.env.DEFAULT_LISTING_FEE) : INITIAL_SETTINGS.listingFeeAmount
    };

    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(fileContent);
        // Ensure settings have latest env vars & updated official contact numbers
        parsed.settings = {
          ...parsed.settings,
          ...defaultSettings,
          officialPhone: defaultSettings.officialPhone,
          officialPhoneDisplay: defaultSettings.officialPhoneDisplay,
          officialWhatsApp: defaultSettings.officialWhatsApp,
          officialWhatsAppDisplay: defaultSettings.officialWhatsAppDisplay,
          officialEmail: defaultSettings.officialEmail
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
      status_history: []
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
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
          const pgUser: User & { passwordHash?: string; salt?: string } = {
            id: r.id,
            name: r.name,
            email: r.email.toLowerCase().trim(),
            phone: r.phone,
            role: r.role,
            passwordHash: r.password_hash,
            salt: r.salt,
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
    return this.data.users.find(u => u.email.toLowerCase().trim() === normalized);
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

    const newProperty: Property = {
      id: `prop-${Date.now()}`,
      propertyCode,
      title: propertyData.title || '',
      titleTa: propertyData.titleTa,
      description: propertyData.description || '',
      descriptionTa: propertyData.descriptionTa,
      type: propertyData.type || 'house_sale',
      status: this.data.settings.autoApproveProperties ? 'available' : 'pending_approval',
      price: Number(propertyData.price) || 0,
      priceNegotiable: propertyData.priceNegotiable ?? true,
      rentalPeriod: propertyData.rentalPeriod || 'monthly',
      depositAmount: Number(propertyData.depositAmount) || 0,
      maintenanceFee: Number(propertyData.maintenanceFee) || 0,
      state: 'Tamil Nadu',
      district: propertyData.district || 'Chennai',
      city: propertyData.city || 'Chennai',
      taluk: propertyData.taluk,
      area: propertyData.area || '',
      locality: propertyData.locality,
      address: propertyData.address || '',
      pincode: propertyData.pincode,
      areaSqft: Number(propertyData.areaSqft) || 1000,
      plotDimensions: propertyData.plotDimensions,
      zoningType: propertyData.zoningType || 'residential',
      dtcpApproved: propertyData.dtcpApproved ?? false,
      reraApproved: propertyData.reraApproved ?? false,
      pattaAvailable: propertyData.pattaAvailable ?? true,
      bedrooms: propertyData.bedrooms ? Number(propertyData.bedrooms) : undefined,
      bathrooms: propertyData.bathrooms ? Number(propertyData.bathrooms) : undefined,
      balconies: propertyData.balconies ? Number(propertyData.balconies) : undefined,
      floors: propertyData.floors ? Number(propertyData.floors) : 1,
      facing: propertyData.facing || 'East',
      furnishing: propertyData.furnishing || 'unfurnished',
      parking: propertyData.parking || 'none',
      waterSource: propertyData.waterSource || ['Borewell'],
      amenities: propertyData.amenities || [],
      images: propertyData.images && propertyData.images.length > 0 ? propertyData.images : [
        { id: `img-${Date.now()}`, url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', isCover: true }
      ],
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
  public recordPayment(paymentData: {
    dealerId: string;
    dealerName: string;
    propertyId: string;
    propertyTitle: string;
    amount: number;
    method: 'upi' | 'card' | 'netbanking' | 'wallet';
    status: 'success' | 'failed' | 'refunded' | 'pending';
    transactionRef?: string;
  }): Payment {
    const receiptNumber = `SPP-REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const payment: Payment = {
      id: `pay-${Date.now()}`,
      receiptNumber,
      dealerId: paymentData.dealerId,
      dealerName: paymentData.dealerName,
      propertyId: paymentData.propertyId,
      propertyTitle: paymentData.propertyTitle,
      amount: paymentData.amount,
      currency: 'INR',
      purpose: `Property Listing Fee — ₹${paymentData.amount}`,
      method: paymentData.method,
      status: paymentData.status,
      transactionRef: paymentData.transactionRef || `${paymentData.method.toUpperCase()}-TXN-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    this.data.payments.unshift(payment);
    this.saveToFile(this.data);

    if (this.pool && this.isPostgresConnected) {
      this.pool.query(
        `INSERT INTO payments (id, receipt_number, dealer_id, dealer_name, property_id, property_title, amount, currency, method, status, transaction_ref)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [payment.id, payment.receiptNumber, payment.dealerId, payment.dealerName, payment.propertyId, payment.propertyTitle, payment.amount, payment.currency, payment.method, payment.status, payment.transactionRef]
      ).catch(e => console.warn('[DB Postgres Sync Error] payment insert:', e.message));
    }

    return payment;
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
