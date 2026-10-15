export type Language = 'en' | 'ta';

export type UserRole = 'customer' | 'dealer' | 'admin';

export type DealerStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export type PropertyType = 'land_sale' | 'house_sale' | 'house_rent';

export type PropertyStatus = 
  | 'available' 
  | 'under_discussion' 
  | 'sold' 
  | 'rented' 
  | 'hidden' 
  | 'pending_payment'
  | 'payment_submitted'
  | 'payment_verified'
  | 'payment_rejected'
  | 'pending_approval' 
  | 'rejected'
  | 'archived';

export type EnquiryStatus = 
  | 'new' 
  | 'contacted' 
  | 'follow_up' 
  | 'site_visit_scheduled' 
  | 'completed' 
  | 'closed';

export type SiteVisitStatus = 
  | 'requested' 
  | 'scheduled' 
  | 'confirmed' 
  | 'completed' 
  | 'cancelled';

export type PaymentStatus = 'pending' | 'submitted' | 'success' | 'failed' | 'rejected' | 'refunded';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  // Specific for dealers
  businessName?: string;
  district?: string;
  city?: string;
  address?: string;
  dealerType?: 'individual' | 'agency' | 'builder' | 'promoter';
  dealerStatus?: DealerStatus;
  rejectionReason?: string;
  verifiedAt?: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  caption?: string;
  isCover?: boolean;
}

export interface Property {
  id: string;
  propertyCode: string; // e.g., SPP-CHN-000101
  title: string;
  titleTa?: string;
  description: string;
  descriptionTa?: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  priceNegotiable?: boolean;
  rentalPeriod?: 'monthly' | 'yearly';
  depositAmount?: number;
  maintenanceFee?: number;
  
  // Location
  state: string; // "Tamil Nadu"
  district: string;
  city: string;
  taluk?: string;
  area: string;
  locality?: string;
  address: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  
  // Specs
  areaSqft: number;
  plotDimensions?: string; // e.g. "30 x 40 ft"
  zoningType?: 'residential' | 'commercial' | 'agricultural' | 'industrial';
  dtcpApproved?: boolean;
  reraApproved?: boolean;
  pattaAvailable?: boolean;
  
  // House specs
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  floors?: number;
  floorNo?: number;
  facing?: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West';
  furnishing?: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
  parking?: 'none' | 'two-wheeler' | 'four-wheeler' | 'both';
  ageOfProperty?: string;
  waterSource?: string[];
  
  // Specific to Land for Sale
  landType?: string; // Residential Plot, DTCP Approved Plot, Agricultural Land, Farm Land, Commercial Land, Other
  totalArea?: number;
  areaUnit?: 'sqft' | 'cent' | 'ground' | 'acre' | 'hectare';
  pricePerSqft?: number;
  roadAccess?: 'available' | 'not_available';
  dtcpStatus?: 'approved' | 'not_approved' | 'not_applicable' | 'unknown';
  pattaStatus?: 'yes' | 'no' | 'unknown';

  // Specific to House for Sale
  houseType?: string; // Independent House, Villa, Apartment, Flat, Other
  bhk?: string | number; // 1, 2, 3, 4, 5+
  builtUpAreaSqft?: number;
  plotAreaSqft?: number;
  propertyAge?: string; // New Construction, Under 1 Year, 1-5 Years, 5-10 Years, 10+ Years
  totalFloors?: number;

  // Specific to House for Rent
  rentalPropertyType?: string; // Independent House, Family Portion, Bachelor Room, Apartment, Flat, Villa, Other
  suitableFor?: string[]; // Family, Bachelors, Working Professionals, Students, Anyone
  monthlyRent?: number;
  availableFrom?: string;
  preferredRentalDuration?: string; // Short-Term, 6 Months, 11 Months, Long-Term, Other
  rentalRules?: string;

  // Utilities & Shared Specs
  waterSupply?: string; // Corporation, Borewell, Both, Tanker
  electricitySupply?: string; // 3-Phase, Single-Phase, Solar
  landmark?: string;

  // Features & Amenities
  amenities: string[];
  
  // Media
  images: PropertyImage[];
  videoUrl?: string; // Video file or walkthrough URL
  
  // Dealer reference (Internal only - NEVER exposed to public visitors)
  dealerId: string;
  dealerName?: string;

  // Manual UPI Payment Evidence & Audit
  paymentUtr?: string;
  paymentScreenshotUrl?: string;
  paymentSubmittedAt?: string;
  paymentVerifiedAt?: string;
  paymentRejectionReason?: string;
  
  // Metadata & Admin review
  verified: boolean;
  featured?: boolean;
  rejectionReason?: string;
  viewsCount: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyFilter {
  type?: PropertyType | 'all';
  district?: string;
  city?: string;
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  maxSqft?: number;
  bedrooms?: number | string | 'any';
  furnishing?: string;
  parking?: boolean | string;
  verifiedOnly?: boolean;
  dtcpReraOnly?: boolean;
  searchQuery?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'sqft_desc' | 'popular';
}

export interface Enquiry {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyType: PropertyType;
  propertyLocation: string;
  propertyPrice: number;
  dealerId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  channel: 'whatsapp' | 'call' | 'form';
  message: string;
  preferredTime?: string;
  status: EnquiryStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SiteVisit {
  id: string;
  propertyId: string;
  propertyCode: string;
  propertyTitle: string;
  propertyAddress: string;
  dealerId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  status: SiteVisitStatus;
  notes?: string;
  createdAt: string;
}

export interface PaymentAuditEntry {
  action: string;
  timestamp: string;
  details?: string;
  adminId?: string;
  adminName?: string;
  reason?: string;
  source?: 'dealer_submission' | 'admin_action' | 'checkout_callback' | 'webhook' | 'status_poll' | 'system';
}

export interface Payment {
  id: string;
  receiptNumber: string;
  dealerId: string;
  dealerName: string;
  propertyId: string;
  propertyTitle: string;
  amount: number;
  currency: string;
  purpose: string; // "Property Listing Fee — ₹10"
  method: 'upi' | 'card' | 'netbanking' | 'wallet' | 'manual_upi';
  status: PaymentStatus;
  transactionRef: string;
  utr?: string;
  screenshotUrl?: string;
  rejectionReason?: string;
  verifiedByAdminId?: string;
  verifiedByAdminName?: string;
  orderId?: string;
  paymentId?: string;
  verificationMethod?: 'manual_upi_verification' | 'razorpay_signature' | 'razorpay_webhook' | 'sandbox_simulation';
  webhookEventId?: string;
  createdAt: string;
  verifiedAt?: string;
  updatedAt?: string;
  auditLog?: PaymentAuditEntry[];
}

export interface AppNotification {
  id: string;
  userId?: string; // If undefined, broadcast to admin
  targetRole?: UserRole | 'all';
  title: string;
  titleTa?: string;
  message: string;
  messageTa?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AdminSettings {
  appName: string;
  officialPhone: string;
  officialPhoneDisplay: string;
  officialWhatsApp: string; // with country code, e.g. 919876543210
  officialWhatsAppDisplay: string;
  officialEmail: string;
  officialUpiId?: string; // e.g. "summada700-4@okaxis"
  supportHours: string;
  officeAddress: string;
  listingFeeAmount: number; // default 10
  currencySymbol: string;
  currencyCode: string;
  autoApproveDealers: boolean;
  autoApproveProperties: boolean;
  bannerNoticeEn?: string;
  bannerNoticeTa?: string;
}
