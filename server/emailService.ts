import nodemailer from 'nodemailer';
import type { User, Property, Enquiry, SiteVisit, Payment } from '../src/types/index.ts';

// Official Admin Notification Destination
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OFFICIAL_EMAIL || 'chandruking901@gmail.com';
const APP_NAME = process.env.BUSINESS_NAME || 'SPP Nestora';
const OFFICIAL_PHONE = process.env.OFFICIAL_PHONE || '9715673055';

interface EmailPayload {
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: any = null;
  private isConfigured = false;

  constructor() {
    this.initTransport();
  }

  private initTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: {
            user,
            pass
          }
        });
        this.isConfigured = true;
        console.log(`[Email Service] SMTP Transport configured for ${host}:${port}`);
      } catch (err: any) {
        console.warn('[Email Service] Failed to initialize SMTP transport:', err.message);
        this.isConfigured = false;
      }
    } else {
      console.log('[Email Service] SMTP credentials not provided in environment. Email notifications will operate in safe diagnostic log mode.');
      this.isConfigured = false;
    }
  }

  public async sendNotification(payload: EmailPayload): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    const recipient = ADMIN_NOTIFICATION_EMAIL;

    console.log(`[Admin Email Notification Dispatch]
To: ${recipient}
Subject: ${payload.subject}
Timestamp: ${new Date().toISOString()}
`);

    if (!this.isConfigured || !this.transporter) {
      console.log(`[Safe Notification Log] (SMTP not configured, email logged safely):\n${payload.text}\n`);
      return { success: true, delivered: false };
    }

    try {
      const fromAddress = process.env.SMTP_FROM || `"${APP_NAME} Notifications" <${process.env.SMTP_USER || 'no-reply@sppnestora.com'}>`;
      
      await this.transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject: payload.subject,
        text: payload.text,
        html: payload.html
      });

      console.log(`[Email Service] Successfully delivered email notification to ${recipient}`);
      return { success: true, delivered: true };
    } catch (err: any) {
      console.warn(`[Email Service Warning] Failed to deliver email notification to ${recipient}:`, err.message);
      return { success: false, delivered: false, error: err.message };
    }
  }

  // 1. New Customer / Contact Enquiry Notification
  public async sendCustomerEnquiryNotification(enquiry: Enquiry): Promise<void> {
    const subject = `New SPP Nestora Customer Enquiry – ${enquiry.id}`;
    const text = `SPP Nestora – New Customer Enquiry

Enquiry ID:
${enquiry.id}

Customer Name:
${enquiry.customerName}

Mobile:
${enquiry.customerPhone}

Email:
${enquiry.customerEmail || 'Not provided'}

Category:
${enquiry.propertyTitle || 'General Property Inquiry'}

Property ID:
${enquiry.propertyCode || enquiry.propertyId || 'General Desk'}

Message:
${enquiry.message}

Submitted At:
${new Date(enquiry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)

Status:
${enquiry.status.toUpperCase()}

Source:
Website
`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f3a22; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">SPP Nestora – New Customer Enquiry</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Central Support Desk Alert</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Enquiry ID:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${enquiry.id}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Customer Name:</td><td style="padding: 8px 0; font-weight: bold;">${enquiry.customerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Mobile Phone:</td><td style="padding: 8px 0; font-weight: bold; color: #047857;">${enquiry.customerPhone}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Email:</td><td style="padding: 8px 0;">${enquiry.customerEmail || 'Not provided'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Category / Title:</td><td style="padding: 8px 0; font-weight: bold;">${enquiry.propertyTitle || 'General Property Inquiry'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Property Code:</td><td style="padding: 8px 0; font-weight: bold;">${enquiry.propertyCode || enquiry.propertyId || 'General Desk'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Status:</td><td style="padding: 8px 0;"><span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">NEW</span></td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Submitted At:</td><td style="padding: 8px 0;">${new Date(enquiry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border-left: 4px solid #0f3a22; border-radius: 4px;">
            <strong style="display: block; margin-bottom: 4px; color: #334155;">Customer Message:</strong>
            <p style="margin: 0; color: #0f172a; white-space: pre-wrap;">${enquiry.message}</p>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">
          SPP Nestora Central Real-Estate Platform • Official Desk: +91 ${OFFICIAL_PHONE}
        </div>
      </div>
    `;

    await this.sendNotification({ subject, text, html });
  }

  // 2. New Customer Registration Notification
  public async sendCustomerRegistrationNotification(user: User): Promise<void> {
    const subject = `New Customer Registration – SPP Nestora – ${user.id}`;
    const text = `SPP Nestora – New Registration

User ID:
${user.id}

Name:
${user.name}

Email:
${user.email}

Mobile:
${user.phone}

Role:
Customer

Registration Date:
${new Date(user.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)

Account Status:
Active
`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f3a22; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">New Customer Registration</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">SPP Nestora User Management</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">User ID:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${user.id}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Full Name:</td><td style="padding: 8px 0; font-weight: bold;">${user.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Email:</td><td style="padding: 8px 0;">${user.email}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Mobile:</td><td style="padding: 8px 0; font-weight: bold;">${user.phone}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Role:</td><td style="padding: 8px 0; font-weight: bold; color: #0f3a22;">Customer</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Registered At:</td><td style="padding: 8px 0;">${new Date(user.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Account Status:</td><td style="padding: 8px 0;"><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">ACTIVE</span></td></tr>
          </table>
        </div>
      </div>
    `;

    await this.sendNotification({ subject, text, html });
  }

  // 3. New Dealer Registration Notification
  public async sendDealerRegistrationNotification(dealer: User, propertyCount = 0): Promise<void> {
    const subject = `New Dealer Registration – SPP Nestora – ${dealer.id}`;
    const text = `SPP Nestora – New Registration

User ID:
${dealer.id}

Name:
${dealer.name}

Business Name:
${dealer.businessName || 'Individual Dealer'}

Email:
${dealer.email}

Mobile:
${dealer.phone}

District / City:
${dealer.district || ''}, ${dealer.city || ''}

Dealer Type:
${dealer.dealerType || 'agent'}

Role:
Dealer

Registration Date:
${new Date(dealer.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)

Account Status:
${(dealer.dealerStatus || 'pending').toUpperCase()}

Number of properties:
${propertyCount}
`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f3a22; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">New Dealer Registration (Review Required)</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">SPP Nestora Partner Onboarding</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Dealer ID:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${dealer.id}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Full Name:</td><td style="padding: 8px 0; font-weight: bold;">${dealer.name}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Business Name:</td><td style="padding: 8px 0; font-weight: bold;">${dealer.businessName || 'Individual Dealer'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Email:</td><td style="padding: 8px 0;">${dealer.email}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Mobile:</td><td style="padding: 8px 0; font-weight: bold; color: #047857;">${dealer.phone}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">District / City:</td><td style="padding: 8px 0;">${dealer.district || ''}, ${dealer.city || ''}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Dealer Type:</td><td style="padding: 8px 0; font-weight: bold;">${dealer.dealerType || 'agency'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Registered At:</td><td style="padding: 8px 0;">${new Date(dealer.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Verification Status:</td><td style="padding: 8px 0;"><span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${(dealer.dealerStatus || 'pending').toUpperCase()}</span></td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Number of Properties:</td><td style="padding: 8px 0; font-weight: bold;">${propertyCount}</td></tr>
          </table>
        </div>
      </div>
    `;

    await this.sendNotification({ subject, text, html });
  }

  // 4. ₹10 Payment Verified Notification
  public async sendPaymentVerifiedNotification(payment: Payment): Promise<void> {
    const subject = `₹10 Payment Verified – Receipt #${payment.receiptNumber} – ${payment.propertyTitle}`;
    const text = `SPP Nestora – ₹10 Listing Fee Payment Verified

Receipt Number:
${payment.receiptNumber}

Payment ID (Transaction Ref):
${payment.transactionRef}

Amount:
₹${payment.amount}.00

Payment Method:
${payment.method.toUpperCase()}

Dealer Name:
${payment.dealerName} (ID: ${payment.dealerId})

Property Title:
${payment.propertyTitle} (ID: ${payment.propertyId})

Payment Date:
${new Date(payment.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)

Status:
SUCCESS - Verified via Gateway

Property Status:
PENDING ADMIN APPROVAL
`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #047857; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">₹10 Listing Fee Payment Verified</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Official Payment Receipt #${payment.receiptNumber}</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Receipt Number:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${payment.receiptNumber}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Payment ID:</td><td style="padding: 8px 0; font-family: monospace;">${payment.transactionRef}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Amount Paid:</td><td style="padding: 8px 0; font-weight: bold; font-size: 16px; color: #047857;">₹${payment.amount}.00</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Method:</td><td style="padding: 8px 0; font-weight: bold;">${payment.method.toUpperCase()}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Dealer Name:</td><td style="padding: 8px 0;">${payment.dealerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Property:</td><td style="padding: 8px 0; font-weight: bold;">${payment.propertyTitle}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Paid At:</td><td style="padding: 8px 0;">${new Date(payment.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Status:</td><td style="padding: 8px 0;"><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">VERIFIED</span></td></tr>
          </table>
        </div>
      </div>
    `;

    await this.sendNotification({ subject, text, html });
  }

  // 5. New Property Submission / Pending Approval Notification
  public async sendPropertyPendingApprovalNotification(property: Property): Promise<void> {
    const subject = `New Property Submitted for Approval – [${property.propertyCode}] ${property.title}`;
    const text = `SPP Nestora – New Property Submitted for Review

Property Code:
${property.propertyCode}

Title:
${property.title}

Type:
${property.type}

Price:
₹${property.price.toLocaleString('en-IN')}

Location:
${property.area}, ${property.district} (Tamil Nadu)

Dealer:
${property.dealerName || property.dealerId}

Submitted At:
${new Date(property.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)

Status:
PENDING ADMIN APPROVAL
`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f3a22; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">New Property Pending Approval</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Admin Review Queue</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Property Code:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${property.propertyCode}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Title:</td><td style="padding: 8px 0; font-weight: bold;">${property.title}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Category:</td><td style="padding: 8px 0; text-transform: capitalize;">${property.type.replace('_', ' ')}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Price:</td><td style="padding: 8px 0; font-weight: bold; font-size: 16px; color: #0f3a22;">₹${property.price.toLocaleString('en-IN')}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Location:</td><td style="padding: 8px 0;">${property.area}, ${property.district}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Dealer:</td><td style="padding: 8px 0; font-weight: bold;">${property.dealerName || property.dealerId}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Submitted At:</td><td style="padding: 8px 0;">${new Date(property.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td></tr>
          </table>
        </div>
      </div>
    `;

    await this.sendNotification({ subject, text, html });
  }

  // 6. Site Visit Request Notification
  public async sendSiteVisitNotification(visit: SiteVisit): Promise<void> {
    const subject = `New Site Visit Request – ${visit.propertyCode} – ${visit.customerName}`;
    const text = `SPP Nestora – New Site Visit Request

Visit ID:
${visit.id}

Property Code:
${visit.propertyCode}

Property Title:
${visit.propertyTitle}

Customer Name:
${visit.customerName}

Customer Phone:
${visit.customerPhone}

Requested Date:
${visit.date}

Requested Time:
${visit.time}

Customer Notes:
${visit.notes || 'None'}

Submitted At:
${new Date(visit.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)
`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #0f3a22; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">New Site Visit Scheduled</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.85;">Customer Appointment Alert</p>
        </div>
        <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Property Code:</td><td style="padding: 8px 0; font-weight: bold; font-family: monospace;">${visit.propertyCode}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Property:</td><td style="padding: 8px 0; font-weight: bold;">${visit.propertyTitle}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Customer Name:</td><td style="padding: 8px 0; font-weight: bold;">${visit.customerName}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Mobile:</td><td style="padding: 8px 0; font-weight: bold; color: #047857;">${visit.customerPhone}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Preferred Date:</td><td style="padding: 8px 0; font-weight: bold;">${visit.date}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Preferred Time:</td><td style="padding: 8px 0; font-weight: bold;">${visit.time}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">Notes:</td><td style="padding: 8px 0;">${visit.notes || 'None'}</td></tr>
          </table>
        </div>
      </div>
    `;

    await this.sendNotification({ subject, text, html });
  }
}

export const emailService = new EmailService();
