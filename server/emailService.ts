import dns from 'dns';
import nodemailer from 'nodemailer';
import type { User, Property, Enquiry, SiteVisit, Payment } from '../src/types/index.ts';

// Force IPv4 resolution to prevent ENETUNREACH on Render Linux containers
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

// Helper to resolve an IPv4 address for a hostname
async function resolveIpv4Host(hostname: string): Promise<string> {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return hostname;
  }
  try {
    const addresses = await dns.promises.resolve4(hostname);
    if (addresses && addresses.length > 0) {
      return addresses[0];
    }
  } catch (_) {
    try {
      const result = await dns.promises.lookup(hostname, { family: 4 });
      if (result && result.address) {
        return result.address;
      }
    } catch (_) {}
  }
  return hostname;
}

interface EmailPayload {
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: any = null;
  private isConfigured = false;
  private lastCheckedConfig: string = '';

  constructor() {
    this.initTransport();
  }

  private getConfig() {
    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    const resendFrom = (process.env.RESEND_FROM || process.env.EMAIL_FROM || 'SPP Nestora <onboarding@resend.dev>').trim();

    const rawUser = process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.EMAIL_USER || process.env.GMAIL_USER || '';
    const user = rawUser.trim();

    const rawPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || '';
    const pass = rawPass.replace(/\s+/g, '');

    const explicitHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const isGmail = Boolean((explicitHost && explicitHost.includes('gmail')) || user.toLowerCase().endsWith('@gmail.com'));
    const host = explicitHost || 'smtp.gmail.com';

    const portEnv = process.env.SMTP_PORT || process.env.EMAIL_PORT;
    const port = portEnv ? Number(portEnv) : 587;

    const secureEnv = process.env.SMTP_SECURE;
    const secure = secureEnv !== undefined ? (secureEnv === 'true' || secureEnv === '1') : (port === 465);

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.OFFICIAL_EMAIL || 'chandru.official242@gmail.com';
    const appName = process.env.BUSINESS_NAME || 'SPP Nestora';
    const officialPhone = process.env.OFFICIAL_PHONE || '9715673055';

    const isResend = Boolean(resendApiKey && resendApiKey.startsWith('re_'));

    return {
      isResend,
      resendApiKey,
      resendFrom,
      host,
      port,
      secure,
      user,
      pass,
      isGmail,
      adminEmail,
      appName,
      officialPhone
    };
  }

  private async createTransporterInstance(host: string, port: number, secure: boolean, user: string, pass: string) {
    const targetHost = await resolveIpv4Host(host);
    const isIp = targetHost !== host;

    return nodemailer.createTransport({
      host: targetHost,
      port,
      secure,
      requireTLS: !secure,
      family: 4,
      auth: {
        user,
        pass
      },
      tls: {
        servername: isIp ? host : undefined,
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    } as any);
  }

  public async initTransport(): Promise<boolean> {
    const config = this.getConfig();

    if (config.isResend) {
      this.isConfigured = true;
      return true;
    }

    const configKey = `${config.host}:${config.port}:${config.secure}:${config.user}:${config.pass ? 'hasPass' : 'noPass'}`;

    if (configKey === this.lastCheckedConfig && this.transporter) {
      return this.isConfigured;
    }

    this.lastCheckedConfig = configKey;

    if (config.user && config.pass) {
      try {
        const host = config.host || 'smtp.gmail.com';
        this.transporter = await this.createTransporterInstance(host, config.port, config.secure, config.user, config.pass);
        this.isConfigured = true;
        console.log(`[Email Service] SMTP Transport configured for ${host} (Port: ${config.port}, Secure: ${config.secure}, Strict IPv4)`);
        return true;
      } catch (err: any) {
        console.warn('[Email Service] Failed to initialize SMTP transport:', err.message || err);
        this.isConfigured = false;
        this.transporter = null;
        return false;
      }
    } else {
      this.isConfigured = false;
      this.transporter = null;
      return false;
    }
  }

  public async verifyConnection(): Promise<{ verified: boolean; error?: string; errorCode?: string }> {
    const config = this.getConfig();

    // 1. Resend API Verification
    if (config.isResend) {
      try {
        const res = await fetch('https://api.resend.com/api-keys', {
          headers: {
            'Authorization': `Bearer ${config.resendApiKey}`
          }
        });
        if (res.ok) {
          console.log('[Email Service] Resend API connection verified successfully');
          console.log('[Email Diagnostic] Resend API connection verified');
          return { verified: true };
        } else {
          const errData: any = await res.json().catch(() => ({}));
          const safeError = errData.message || `Resend API error status ${res.status}`;
          console.warn('[Email Service] Resend API verification failed:', safeError);
          return { verified: false, error: safeError, errorCode: errData.name || 'RESEND_AUTH_ERROR' };
        }
      } catch (e: any) {
        const safeError = e.message || 'Network error connecting to Resend API';
        console.warn('[Email Service] Resend connection check error:', safeError);
        return { verified: false, error: safeError, errorCode: 'RESEND_NETWORK_ERROR' };
      }
    }

    // 2. SMTP Verification Fallback
    if (!config.user || !config.pass) {
      console.log('[Email Service] Email service credentials not configured in environment (RESEND_API_KEY / SMTP missing). Notification logged safely.');
      return { verified: false, error: 'Email service credentials not provided in environment', errorCode: 'NO_CREDENTIALS' };
    }

    await this.initTransport();

    if (!this.transporter) {
      console.warn('[Email Service] SMTP transporter could not be initialized');
      return { verified: false, error: 'Transporter could not be created', errorCode: 'INIT_ERROR' };
    }

    try {
      await this.transporter.verify();
      console.log('[Email Service] SMTP IPv4 connection verified');
      console.log('[Email Diagnostic] SMTP IPv4 connection verified');
      return { verified: true };
    } catch (err: any) {
      const fallbackPort = config.port === 587 ? 465 : 587;
      const fallbackSecure = fallbackPort === 465;
      console.log(`[Email Service] Primary SMTP check on port ${config.port} encountered: ${err.message}. Retrying IPv4 fallback port ${fallbackPort}...`);
      
      try {
        const fallbackTransporter = await this.createTransporterInstance(
          config.host || 'smtp.gmail.com',
          fallbackPort,
          fallbackSecure,
          config.user,
          config.pass
        );
        await fallbackTransporter.verify();
        this.transporter = fallbackTransporter;
        console.log(`[Email Service] SMTP IPv4 connection verified via fallback port ${fallbackPort}`);
        console.log('[Email Diagnostic] SMTP IPv4 connection verified');
        return { verified: true };
      } catch (fallbackErr: any) {
        const safeError = err.message || fallbackErr.message || 'SMTP verification failed';
        console.warn('[Email Service] SMTP authentication failed:', safeError);
        console.warn(`[Email Diagnostic] LIVE EMAIL TEST FAILED`);
        console.warn(`[Email Diagnostic] Error code: ${err.code || fallbackErr.code || 'AUTH_FAILED'}`);
        console.warn(`[Email Diagnostic] Error message: ${safeError}`);
        return { verified: false, error: safeError, errorCode: err.code || fallbackErr.code || 'AUTH_FAILED' };
      }
    }
  }

  public async getDiagnosticStatus(): Promise<{
    configured: boolean;
    provider: string;
    host: string;
    port: number;
    secure: boolean;
    senderEmail: string;
    recipientEmail: string;
    hasPassword: boolean;
    verified: boolean;
    verifyError?: string;
    verifyErrorCode?: string;
  }> {
    const config = this.getConfig();

    if (config.isResend) {
      const check = await this.verifyConnection();
      return {
        configured: true,
        provider: 'Resend REST API (api.resend.com:443 HTTPS)',
        host: 'api.resend.com',
        port: 443,
        secure: true,
        senderEmail: config.resendFrom,
        recipientEmail: config.adminEmail,
        hasPassword: true,
        verified: check.verified,
        verifyError: check.error,
        verifyErrorCode: check.errorCode
      };
    }

    const hasCreds = Boolean(config.user && config.pass);
    let verified = false;
    let verifyError: string | undefined;
    let verifyErrorCode: string | undefined;

    if (hasCreds) {
      const check = await this.verifyConnection();
      verified = check.verified;
      verifyError = check.error;
      verifyErrorCode = check.errorCode;
    }

    return {
      configured: hasCreds,
      provider: config.isGmail ? `Gmail Service (${config.host || 'smtp.gmail.com'}:${config.port} ${config.secure ? 'SSL' : 'STARTTLS'})` : (config.host || 'none'),
      host: config.host || (config.isGmail ? 'smtp.gmail.com' : 'none'),
      port: config.port,
      secure: config.secure,
      senderEmail: config.user ? `${config.user.slice(0, 3)}***@${config.user.split('@')[1] || ''}` : 'Not set',
      recipientEmail: config.adminEmail,
      hasPassword: Boolean(config.pass),
      verified,
      verifyError,
      verifyErrorCode
    };
  }

  public async sendTestEmail(): Promise<{
    success: boolean;
    delivered: boolean;
    recipient: string;
    messageId?: string;
    error?: string;
    errorCode?: string;
  }> {
    const config = this.getConfig();
    const recipient = config.adminEmail;

    console.log('[Email Diagnostic] Starting LIVE email test');

    const payload: EmailPayload = {
      subject: `SPP Nestora – Production Resend Email Test (${new Date().toLocaleTimeString('en-IN')})`,
      text: `SPP Nestora – Production Resend Email Test

This is an automated verification email from SPP Nestora Production API Server.
If you are seeing this message, your Resend API production email integration is operating successfully!

Timestamp:
${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)

Recipient:
${recipient}

Status:
SUCCESS - Live Resend API Delivery Verified
`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; border: 1px solid #10b981; border-radius: 12px; overflow: hidden; background: #ffffff;">
          <div style="background: #0f3a22; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">SPP Nestora Email Test</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #a7f3d0;">Live Resend Email Integration Verification</p>
          </div>
          <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">This email confirms that the official <strong>SPP Nestora</strong> email notification system is functioning properly on Render production via Resend.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Destination:</td><td style="padding: 8px 0; font-weight: bold; color: #0f3a22;">${recipient}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Delivered At:</td><td style="padding: 8px 0;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b;">Status:</td><td style="padding: 8px 0;"><span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">ACTIVE & VERIFIED</span></td></tr>
            </table>
          </div>
        </div>
      `
    };

    console.log(`[Email Diagnostic] Sending test email to ${recipient}`);
    const res = await this.sendNotification(payload);
    return { ...res, recipient };
  }

  public async sendNotification(payload: EmailPayload): Promise<{
    success: boolean;
    delivered: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
  }> {
    const config = this.getConfig();
    const recipient = config.adminEmail;

    console.log('[Email Service] Attempting admin notification...');
    console.log(`[Email Service] Sending to: ${recipient}`);
    console.log(`[Admin Email Notification Dispatch]
To: ${recipient}
Subject: ${payload.subject}
Timestamp: ${new Date().toISOString()}
`);

    // 1. Resend Dispatch
    if (config.isResend) {
      try {
        console.log(`[Email Service] Dispatching via Resend API (from: ${config.resendFrom})...`);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: config.resendFrom,
            to: [recipient],
            subject: payload.subject,
            text: payload.text,
            html: payload.html
          })
        });

        const data: any = await response.json();

        if (!response.ok) {
          const safeError = data.message || `Resend dispatch failed with status ${response.status}`;
          console.warn('[Email Service] Resend API error:', safeError);
          console.warn('[Email Diagnostic] LIVE EMAIL TEST FAILED');
          console.warn(`[Email Diagnostic] Error code: ${data.name || 'RESEND_API_ERROR'}`);
          console.warn(`[Email Diagnostic] Error message: ${safeError}`);

          return {
            success: false,
            delivered: false,
            error: safeError,
            errorCode: data.name || 'RESEND_API_ERROR'
          };
        }

        console.log(`[Email Service] Resend email sent successfully. Message ID: ${data.id}`);
        console.log('[Email Diagnostic] Resend accepted message');
        console.log(`[Email Diagnostic] Message ID: ${data.id}`);
        console.log('[Email Diagnostic] LIVE EMAIL TEST SUCCESS');

        return {
          success: true,
          delivered: true,
          messageId: data.id
        };
      } catch (fetchErr: any) {
        const safeError = fetchErr.message || 'Resend HTTP request failed';
        console.warn('[Email Service] Resend network error:', safeError);
        return {
          success: false,
          delivered: false,
          error: safeError,
          errorCode: 'RESEND_NETWORK_ERROR'
        };
      }
    }

    // 2. Fallback SMTP Dispatch
    await this.initTransport();

    if (!this.isConfigured || !this.transporter) {
      console.log('[Email Service] Email service credentials not configured in environment. Notification logged safely.');
      console.log(`[Safe Notification Log]:\n${payload.text}\n`);
      return { success: true, delivered: false };
    }

    console.log('[Email Service] SMTP transporter ready');

    try {
      const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || `"${config.appName}" <${config.user}>`;

      let info;
      try {
        info = await this.transporter.sendMail({
          from: fromAddress,
          to: recipient,
          subject: payload.subject,
          text: payload.text,
          html: payload.html
        });
      } catch (sendErr: any) {
        const fallbackPort = config.port === 587 ? 465 : 587;
        const fallbackSecure = fallbackPort === 465;
        console.log(`[Email Service] Primary SMTP send encountered: ${sendErr.message}. Retrying via fallback port ${fallbackPort}...`);
        const fallbackTransporter = await this.createTransporterInstance(
          config.host || 'smtp.gmail.com',
          fallbackPort,
          fallbackSecure,
          config.user,
          config.pass
        );
        info = await fallbackTransporter.sendMail({
          from: fromAddress,
          to: recipient,
          subject: payload.subject,
          text: payload.text,
          html: payload.html
        });
        this.transporter = fallbackTransporter;
      }

      console.log('[Email Service] SMTP IPv4 connection verified');
      console.log('[Email Service] Email sent successfully');
      console.log(`[Email Service] Admin notification sent successfully to ${recipient}`);
      console.log('[Email Diagnostic] SMTP accepted message');
      console.log(`[Email Diagnostic] Message ID: ${info.messageId || 'generated'}`);
      console.log('[Email Diagnostic] LIVE EMAIL TEST SUCCESS');

      return {
        success: true,
        delivered: true,
        messageId: info.messageId
      };
    } catch (err: any) {
      const safeError = err.message || 'Unknown SMTP error';
      console.warn('[Email Service] SMTP authentication failed or delivery error');
      console.warn(`[Email Service] Email send failed: ${safeError}`);
      console.warn('[Email Diagnostic] LIVE EMAIL TEST FAILED');
      console.warn(`[Email Diagnostic] Error code: ${err.code || 'SMTP_ERROR'}`);
      console.warn(`[Email Diagnostic] Error message: ${safeError}`);

      return {
        success: false,
        delivered: false,
        error: safeError,
        errorCode: err.code || 'SMTP_ERROR'
      };
    }
  }

  // 1. New Customer / Contact Enquiry Notification
  public async sendCustomerEnquiryNotification(enquiry: Enquiry): Promise<{
    success: boolean;
    delivered: boolean;
    messageId?: string;
    error?: string;
  }> {
    const config = this.getConfig();
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
          SPP Nestora Central Real-Estate Platform • Official Desk: +91 ${config.officialPhone}
        </div>
      </div>
    `;

    return await this.sendNotification({ subject, text, html });
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
