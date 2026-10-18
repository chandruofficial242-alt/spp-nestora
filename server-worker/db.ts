import { Pool } from '@neondatabase/serverless';
import type { 
  User, 
  Property, 
  Enquiry, 
  SiteVisit, 
  Payment, 
  AdminSettings, 
  AppNotification, 
  PropertyStatus 
} from '../src/types/index.ts';
import type { DbUser, Env } from './types.ts';

// In-memory fallback dataset for offline local unit testing
import localSeedData from '../server/data_store.json';

let globalMemoryStore: any = null;

export class WorkerDatabase {
  private pool: Pool | null = null;
  private memoryStore: any = null;

  constructor(private env: Env) {
    if (env.DATABASE_URL && !env.DATABASE_URL.includes('placeholder') && !env.DATABASE_URL.includes('username:password')) {
      try {
        this.pool = new Pool({ connectionString: env.DATABASE_URL });
      } catch (err) {
        console.warn('[Worker DB] Failed to initialize Neon Pool, falling back to memory store:', err);
      }
    }

    if (!this.pool) {
      if (!globalMemoryStore) {
        globalMemoryStore = JSON.parse(JSON.stringify(localSeedData));
      }
      this.memoryStore = globalMemoryStore;
    }
  }

  // --- USERS ---
  async getUserByEmail(email: string): Promise<DbUser | null> {
    const normEmail = email.toLowerCase().trim();
    if (this.pool) {
      const res = await this.pool.query(
        `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [normEmail]
      );
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
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
        resetTokenHash: r.reset_token_hash,
        resetTokenExpiry: r.reset_token_expiry ? new Date(r.reset_token_expiry).toISOString() : undefined,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      };
    }

    const u = this.memoryStore.users.find((x: any) => x.email.toLowerCase() === normEmail);
    return u || null;
  }

  async getUserById(id: string): Promise<DbUser | null> {
    if (this.pool) {
      const res = await this.pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
      if (res.rows.length === 0) return null;
      const r = res.rows[0];
      return {
        id: r.id,
        name: r.name,
        email: r.email,
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
    }

    const u = this.memoryStore.users.find((x: any) => x.id === id);
    return u || null;
  }

  async createUser(user: DbUser): Promise<DbUser> {
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO users (id, name, email, phone, role, password_hash, salt, avatar, business_name, district, city, address, dealer_type, dealer_status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (email) DO NOTHING`,
        [
          user.id,
          user.name,
          user.email.toLowerCase().trim(),
          user.phone,
          user.role,
          user.passwordHash || null,
          user.salt || null,
          user.avatar || null,
          user.businessName || null,
          user.district || null,
          user.city || null,
          user.address || null,
          user.dealerType || null,
          user.dealerStatus || (user.role === 'dealer' ? 'pending' : null),
          user.createdAt || new Date().toISOString()
        ]
      );
    } else {
      this.memoryStore.users.push(user);
    }
    return user;
  }

  // --- PROPERTIES ---
  async getAllProperties(): Promise<Property[]> {
    if (this.pool) {
      const res = await this.pool.query(`SELECT * FROM properties ORDER BY created_at DESC`);
      return res.rows.map(row => {
        const pData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
        return {
          ...pData,
          id: row.id,
          propertyCode: row.property_code,
          title: row.title,
          titleTa: row.title_ta || pData.titleTa,
          description: row.description,
          descriptionTa: row.description_ta || pData.descriptionTa,
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
      });
    }

    return this.memoryStore.properties || [];
  }

  async getPropertyById(id: string): Promise<Property | null> {
    if (this.pool) {
      const res = await this.pool.query(`SELECT * FROM properties WHERE id = $1 LIMIT 1`, [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      const pData = typeof row.data === 'string' ? JSON.parse(row.data) : (row.data || {});
      return {
        ...pData,
        id: row.id,
        propertyCode: row.property_code,
        title: row.title,
        status: row.status,
        price: Number(row.price),
        district: row.district,
        city: row.city,
        area: row.area,
        areaSqft: Number(row.area_sqft),
        dealerId: row.dealer_id,
        dealerName: row.dealer_name
      };
    }

    const p = this.memoryStore.properties.find((x: any) => x.id === id);
    return p || null;
  }

  async createProperty(property: Property): Promise<Property> {
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO properties (id, property_code, title, title_ta, description, type, status, price, district, city, area, area_sqft, dealer_id, dealer_name, data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (property_code) DO NOTHING`,
        [
          property.id,
          property.propertyCode,
          property.title,
          property.titleTa || null,
          property.description || '',
          property.type,
          property.status,
          property.price,
          property.district,
          property.city,
          property.area,
          property.areaSqft,
          property.dealerId,
          property.dealerName,
          JSON.stringify(property),
          property.createdAt,
          property.updatedAt
        ]
      );
    } else {
      this.memoryStore.properties.unshift(property);
    }
    return property;
  }

  async updatePropertyStatus(id: string, status: PropertyStatus, reason?: string, adminUserId = 'admin'): Promise<Property | null> {
    const prop = await this.getPropertyById(id);
    if (!prop) return null;

    const previousStatus = prop.status;
    prop.status = status;
    prop.updatedAt = new Date().toISOString();

    if (this.pool) {
      await this.pool.query(
        `UPDATE properties SET status = $1, data = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [status, JSON.stringify(prop), id]
      );
      await this.pool.query(
        `INSERT INTO status_history (id, property_id, property_code, previous_status, new_status, changed_by_user_id, changed_by_role, reason, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
        [`sh-${Date.now()}`, id, prop.propertyCode, previousStatus, status, adminUserId, 'admin', reason || null]
      ).catch(() => {});
    } else {
      const idx = this.memoryStore.properties.findIndex((x: any) => x.id === id);
      if (idx >= 0) this.memoryStore.properties[idx] = prop;
    }

    return prop;
  }

  // --- ENQUIRIES ---
  async getEnquiries(dealerId?: string): Promise<Enquiry[]> {
    if (this.pool) {
      const q = dealerId 
        ? `SELECT * FROM enquiries WHERE dealer_id = $1 ORDER BY created_at DESC`
        : `SELECT * FROM enquiries ORDER BY created_at DESC`;
      const res = await this.pool.query(q, dealerId ? [dealerId] : []);
      return res.rows.map(r => ({
        id: r.id,
        propertyId: r.property_id,
        propertyCode: r.property_code,
        propertyTitle: r.property_title,
        propertyPrice: Number(r.property_price),
        propertyDistrict: r.property_district,
        propertyArea: r.property_area,
        dealerId: r.dealer_id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        message: r.message,
        channel: r.channel,
        status: r.status,
        adminNotes: r.admin_notes,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    const all: Enquiry[] = this.memoryStore.enquiries || [];
    return dealerId ? all.filter(e => e.dealerId === dealerId) : all;
  }

  async createEnquiry(enquiry: Enquiry): Promise<Enquiry> {
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO enquiries (id, property_id, property_code, property_title, property_price, property_district, property_area, dealer_id, customer_id, customer_name, customer_phone, customer_email, message, channel, status, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          enquiry.id,
          enquiry.propertyId,
          enquiry.propertyCode,
          enquiry.propertyTitle,
          enquiry.propertyPrice,
          enquiry.propertyDistrict,
          enquiry.propertyArea,
          enquiry.dealerId,
          enquiry.customerId || null,
          enquiry.customerName,
          enquiry.customerPhone,
          enquiry.customerEmail || null,
          enquiry.message,
          enquiry.channel,
          enquiry.status,
          JSON.stringify(enquiry),
          enquiry.createdAt
        ]
      );
    } else {
      this.memoryStore.enquiries.unshift(enquiry);
    }
    return enquiry;
  }

  // --- SITE VISITS ---
  async getSiteVisits(dealerId?: string): Promise<SiteVisit[]> {
    if (this.pool) {
      const q = dealerId 
        ? `SELECT * FROM site_visits WHERE dealer_id = $1 ORDER BY created_at DESC`
        : `SELECT * FROM site_visits ORDER BY created_at DESC`;
      const res = await this.pool.query(q, dealerId ? [dealerId] : []);
      return res.rows.map(r => ({
        id: r.id,
        propertyId: r.property_id,
        propertyCode: r.property_code,
        propertyTitle: r.property_title,
        propertyAddress: r.property_address,
        dealerId: r.dealer_id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        visitDate: r.visit_date,
        visitTime: r.visit_time,
        status: r.status,
        notes: r.notes,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    const all: SiteVisit[] = this.memoryStore.site_visits || [];
    return dealerId ? all.filter(s => s.dealerId === dealerId) : all;
  }

  async createSiteVisit(visit: SiteVisit): Promise<SiteVisit> {
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO site_visits (id, property_id, property_code, property_title, property_address, dealer_id, customer_id, customer_name, customer_phone, visit_date, visit_time, status, notes, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          visit.id,
          visit.propertyId,
          visit.propertyCode,
          visit.propertyTitle,
          visit.propertyAddress,
          visit.dealerId,
          visit.customerId || null,
          visit.customerName,
          visit.customerPhone,
          visit.visitDate,
          visit.visitTime,
          visit.status,
          visit.notes || null,
          JSON.stringify(visit),
          visit.createdAt
        ]
      );
    } else {
      this.memoryStore.site_visits.unshift(visit);
    }
    return visit;
  }

  // --- PAYMENTS ---
  async getPayments(dealerId?: string): Promise<Payment[]> {
    if (this.pool) {
      const q = dealerId 
        ? `SELECT * FROM payments WHERE dealer_id = $1 ORDER BY created_at DESC`
        : `SELECT * FROM payments ORDER BY created_at DESC`;
      const res = await this.pool.query(q, dealerId ? [dealerId] : []);
      return res.rows.map(r => ({
        id: r.id,
        orderId: r.order_id,
        paymentId: r.payment_id,
        receiptId: r.receipt_id || r.receipt_number,
        receiptNumber: r.receipt_number || r.receipt_id,
        propertyId: r.property_id,
        propertyTitle: r.property_title,
        dealerId: r.dealer_id,
        dealerName: r.dealer_name,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        feeType: r.fee_type || 'listing_fee',
        method: r.payment_method || r.method || 'upi',
        transactionRef: r.transaction_ref,
        auditLog: r.audit_log || [],
        utr: r.utr,
        screenshotUrl: r.screenshot_url,
        rejectionReason: r.rejection_reason,
        verifiedByAdminId: r.verified_by_admin_id,
        verifiedByAdminName: r.verified_by_admin_name,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    const all: Payment[] = this.memoryStore.payments || [];
    return dealerId ? all.filter(p => p.dealerId === dealerId) : all;
  }

  async createPayment(payment: Payment): Promise<Payment> {
    if (this.pool) {
      await this.pool.query(
        `INSERT INTO payments (id, order_id, payment_id, receipt_id, receipt_number, property_id, property_title, dealer_id, dealer_name, amount, currency, status, fee_type, payment_method, transaction_ref, utr, screenshot_url, audit_log, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          payment.id,
          payment.orderId || payment.id,
          payment.paymentId || null,
          payment.receiptId || payment.receiptNumber || payment.id,
          payment.receiptNumber || payment.receiptId || payment.id,
          payment.propertyId,
          payment.propertyTitle,
          payment.dealerId,
          payment.dealerName,
          payment.amount,
          payment.currency,
          payment.status,
          payment.feeType,
          payment.method,
          payment.transactionRef || null,
          (payment as any).utr || null,
          (payment as any).screenshotUrl || null,
          JSON.stringify((payment as any).auditLog || []),
          payment.createdAt
        ]
      );
    } else {
      this.memoryStore.payments.unshift(payment);
    }
    return payment;
  }

  async updatePaymentVerification(
    paymentId: string, 
    status: 'success' | 'failed', 
    adminId: string, 
    adminName: string, 
    rejectionReason?: string
  ): Promise<Payment | null> {
    const payments = await this.getPayments();
    const p = payments.find(x => x.id === paymentId);
    if (!p) return null;

    p.status = status;
    (p as any).verifiedByAdminId = adminId;
    (p as any).verifiedByAdminName = adminName;
    if (rejectionReason) (p as any).rejectionReason = rejectionReason;

    if (this.pool) {
      await this.pool.query(
        `UPDATE payments SET status = $1, verified_by_admin_id = $2, verified_by_admin_name = $3, rejection_reason = $4, verified_at = CURRENT_TIMESTAMP WHERE id = $5`,
        [status, adminId, adminName, rejectionReason || null, paymentId]
      );
    } else {
      const idx = this.memoryStore.payments.findIndex((x: any) => x.id === paymentId);
      if (idx >= 0) this.memoryStore.payments[idx] = p;
    }
    return p;
  }

  // --- SETTINGS ---
  async getSettings(): Promise<AdminSettings> {
    if (this.pool) {
      const res = await this.pool.query(`SELECT * FROM admin_settings WHERE id = 'main_settings' LIMIT 1`);
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          appName: r.app_name,
          officialPhone: r.official_phone,
          officialPhoneDisplay: r.official_phone_display,
          officialWhatsapp: r.official_whatsapp,
          officialWhatsappDisplay: r.official_whatsapp_display,
          officialEmail: r.official_email,
          supportHours: r.support_hours,
          officeAddress: r.office_address,
          listingFeeAmount: Number(r.listing_fee_amount),
          currencySymbol: r.currency_symbol,
          currencyCode: r.currency_code,
          autoApproveDealers: r.auto_approve_dealers,
          autoApproveProperties: r.auto_approve_properties,
          bannerNoticeEn: r.banner_notice_en || undefined,
          bannerNoticeTa: r.banner_notice_ta || undefined,
          updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
        };
      }
    }

    return this.memoryStore.settings || {
      appName: 'SPP Nestora',
      officialPhone: '9715673055',
      officialPhoneDisplay: '+91 97156 73055',
      officialWhatsapp: '919715673055',
      officialWhatsappDisplay: '+91 97156 73055',
      officialEmail: 'chandruking901@gmail.com',
      supportHours: 'Mon - Sat: 9:00 AM - 8:00 PM IST',
      officeAddress: 'SPP Nestora HQ, Tamil Nadu',
      listingFeeAmount: 10,
      currencySymbol: '₹',
      currencyCode: 'INR',
      autoApproveDealers: false,
      autoApproveProperties: false,
      updatedAt: new Date().toISOString()
    };
  }

  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };

    if (this.pool) {
      await this.pool.query(
        `INSERT INTO admin_settings (id, app_name, official_phone, official_phone_display, official_whatsapp, official_whatsapp_display, official_email, support_hours, office_address, listing_fee_amount, currency_symbol, currency_code, auto_approve_dealers, auto_approve_properties, banner_notice_en, banner_notice_ta, updated_at)
         VALUES ('main_settings', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           app_name = EXCLUDED.app_name,
           official_phone = EXCLUDED.official_phone,
           official_phone_display = EXCLUDED.official_phone_display,
           official_whatsapp = EXCLUDED.official_whatsapp,
           official_whatsapp_display = EXCLUDED.official_whatsapp_display,
           official_email = EXCLUDED.official_email,
           support_hours = EXCLUDED.support_hours,
           office_address = EXCLUDED.office_address,
           listing_fee_amount = EXCLUDED.listing_fee_amount,
           auto_approve_dealers = EXCLUDED.auto_approve_dealers,
           auto_approve_properties = EXCLUDED.auto_approve_properties,
           banner_notice_en = EXCLUDED.banner_notice_en,
           banner_notice_ta = EXCLUDED.banner_notice_ta,
           updated_at = CURRENT_TIMESTAMP`,
        [
          updated.appName,
          updated.officialPhone,
          updated.officialPhoneDisplay,
          updated.officialWhatsapp,
          updated.officialWhatsappDisplay,
          updated.officialEmail,
          updated.supportHours,
          updated.officeAddress,
          updated.listingFeeAmount,
          updated.currencySymbol,
          updated.currencyCode,
          updated.autoApproveDealers,
          updated.autoApproveProperties,
          updated.bannerNoticeEn || null,
          updated.bannerNoticeTa || null,
          updated.updatedAt
        ]
      );
    } else {
      this.memoryStore.settings = updated;
    }
    return updated;
  }

  // --- NOTIFICATIONS ---
  async getNotifications(userId?: string): Promise<AppNotification[]> {
    if (this.pool) {
      const q = userId
        ? `SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50`
        : `SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`;
      const res = await this.pool.query(q, userId ? [userId] : []);
      return res.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        titleTa: r.title_ta,
        message: r.message,
        messageTa: r.message_ta,
        type: r.type,
        read: r.read,
        link: r.link,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
    }

    const all: AppNotification[] = this.memoryStore.notifications || [];
    return userId ? all.filter(n => !n.userId || n.userId === userId) : all;
  }
}
