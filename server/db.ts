import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  private isInitialized = false;

  constructor() {
    this.data = this.loadInitialData();
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  private loadInitialData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        return JSON.parse(fileContent);
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
      settings: INITIAL_SETTINGS,
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
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string) {
    return this.data.users.find(u => u.id === id);
  }

  public createUser(userData: Partial<User>, plainPassword?: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = plainPassword ? this.hashPassword(plainPassword, salt) : undefined;
    
    const newUser = {
      id: `usr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      name: userData.name || '',
      email: userData.email || '',
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
    return newUser;
  }

  public verifyPassword(email: string, plainPassword: string): User | null {
    const user = this.findUserByEmail(email);
    if (!user) return null;
    if (!user.passwordHash || !user.salt) {
      // Demo password fallback for pre-seeded users
      if (plainPassword.length >= 6) return user;
      return null;
    }
    const hash = this.hashPassword(plainPassword, user.salt);
    if (hash === user.passwordHash) {
      return user;
    }
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
