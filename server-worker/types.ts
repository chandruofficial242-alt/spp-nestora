import type { 
  User, 
  Property, 
  Enquiry, 
  SiteVisit, 
  Payment, 
  AdminSettings, 
  AppNotification, 
  PropertyStatus, 
  DealerStatus,
  UserRole
} from '../src/types/index.ts';

export interface Env {
  DATABASE_URL?: string;
  SESSION_SECRET?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  CLOUDINARY_UPLOAD_PRESET?: string;
  CLOUDINARY_FOLDER?: string;
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  GMAIL_SENDER_EMAIL?: string;
  OFFICIAL_PHONE?: string;
  OFFICIAL_WHATSAPP?: string;
  OFFICIAL_EMAIL?: string;
  BUSINESS_NAME?: string;
  ADMIN_NOTIFICATION_EMAIL?: string;
  RESEND_API_KEY?: string;
  ENVIRONMENT?: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  exp: number;
}

export type DbUser = User & { 
  passwordHash?: string; 
  salt?: string; 
  resetTokenHash?: string; 
  resetTokenExpiry?: string; 
};
