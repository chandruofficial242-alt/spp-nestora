import crypto from 'crypto';
import express from 'express';
import { db } from './db.ts';
import { authenticate, requireRole, generateAuthToken, type AuthenticatedRequest } from './auth.ts';
import { sanitizePropertyForPublic, sanitizePropertiesListForPublic, sanitizeUser } from './sanitizer.ts';
import { emailService, sanitizeRedirectUri, sanitizeClientId } from './emailService.ts';
import { uploadMiddleware, processUploadedFile } from './uploadService.ts';
import { createRateLimiter } from './rateLimiter.ts';
import type { User, Property, PropertyStatus, EnquiryStatus, SiteVisitStatus, DealerStatus } from '../src/types/index.ts';

export const router = express.Router();

// Rate limiters for sensitive endpoints
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many login attempts. Please try again after 15 minutes.' });
const registerLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many accounts registered from this IP. Please try again later.' });
const paymentLimiter = createRateLimiter({ windowMs: 1 * 60 * 1000, maxRequests: 30, message: 'Payment rate limit exceeded. Please wait a moment.' });

// ==========================================
// 1. AUTHENTICATION & TERMS
// ==========================================

router.post('/auth/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, role, businessName, district, city, address, dealerType } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }

    // Security check: Public registration as ADMIN is strictly prohibited!
    if (role === 'admin') {
      return res.status(403).json({ error: 'Admin registration is not publicly available.' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const newUser = db.createUser(
      {
        name,
        email,
        phone,
        role: role === 'dealer' ? 'dealer' : 'customer',
        businessName,
        district,
        city,
        address,
        dealerType
      },
      password
    );

    // Record terms acceptance if IP available
    db.recordTermsAcceptance({
      userId: newUser.id,
      userEmail: newUser.email,
      ipAddress: req.ip || req.socket.remoteAddress,
      termsVersion: 'v1.0',
      language: req.body.language || 'en'
    });

    // Create In-App Notification for Admin
    db.createNotification({
      targetRole: 'admin',
      title: `New ${newUser.role === 'dealer' ? 'Dealer' : 'Customer'} Registered: ${newUser.name}`,
      titleTa: `புதிய ${newUser.role === 'dealer' ? 'டீலர்' : 'வாடிக்கையாளர்'} பதிவு: ${newUser.name}`,
      message: `${newUser.name} (${newUser.email}, ${newUser.phone}) registered as ${newUser.role}.`,
      messageTa: `${newUser.name} (${newUser.email}) புதிய ${newUser.role} ஆக பதிவு செய்துள்ளார்.`,
      link: newUser.role === 'dealer' ? '/admin' : '/admin'
    });

    // Send Email Notification to Admin (chandruking901@gmail.com)
    if (newUser.role === 'dealer') {
      try {
        await emailService.sendDealerRegistrationNotification(newUser as User, 0);
      } catch (e: any) {
        console.warn('[Email Service Dealer Registration Error]:', e.message || e);
      }
    } else {
      try {
        await emailService.sendCustomerRegistrationNotification(newUser as User);
      } catch (e: any) {
        console.warn('[Email Service Customer Registration Error]:', e.message || e);
      }
    }

    const token = generateAuthToken(newUser as User);
    return res.status(201).json({
      user: sanitizeUser(newUser as User),
      token
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/auth/login', authLimiter, (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({ error: `This account is registered as a ${user.role}, not ${role}.` });
    }

    const token = generateAuthToken(user);
    return res.json({
      user: sanitizeUser(user),
      token
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

router.post('/auth/logout', authenticate, (req: AuthenticatedRequest, res) => {
  // Stateless token invalidation acknowledgement
  return res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const tokenInfo = db.createPasswordResetToken(normalizedEmail);

    if (tokenInfo) {
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      const origin = req.get('origin') || process.env.CLIENT_URL || `${protocol}://${host}`;
      const resetUrl = `${origin}/reset-password?token=${tokenInfo.rawToken}`;

      try {
        await emailService.sendPasswordResetEmail(tokenInfo.deliveryEmail, resetUrl, tokenInfo.user.name);
      } catch (e: any) {
        console.warn('[Password Reset Email Error]:', e.message || e);
      }
    }

    // Verification without leaking account existence
    return res.json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been sent.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to process password reset request.' });
  }
});

router.get('/auth/verify-reset-token', (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Missing reset token.' });
    }

    const check = db.verifyPasswordResetToken(token);
    if (!check.valid || !check.user) {
      return res.status(400).json({ valid: false, error: check.error || 'Invalid or expired token.' });
    }

    const emailParts = check.user.email.split('@');
    const maskedEmail = emailParts[0].length > 3
      ? `${emailParts[0].slice(0, 3)}***@${emailParts[1]}`
      : `${emailParts[0][0]}***@${emailParts[1]}`;

    return res.json({
      valid: true,
      email: maskedEmail
    });
  } catch (err: any) {
    return res.status(500).json({ valid: false, error: err.message || 'Token verification failed.' });
  }
});

router.post('/auth/reset-password', authLimiter, (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const result = db.resetPasswordWithToken(token, newPassword);
    if (!result.success || !result.user) {
      return res.status(400).json({ error: result.error || 'Password reset failed. The link may have expired or already been used.' });
    }

    return res.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Password reset failed.' });
  }
});

router.get('/auth/me', authenticate, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user });
});

router.post('/terms/accept', (req, res) => {
  const { userEmail, language, termsVersion } = req.body;
  const record = db.recordTermsAcceptance({
    userEmail,
    ipAddress: req.ip || req.socket.remoteAddress,
    termsVersion: termsVersion || 'v1.0',
    language: language || 'en'
  });
  return res.json({ success: true, record });
});

// ==========================================
// 2. MEDIA UPLOAD (Cloudinary / Disk Storage)
// ==========================================

// Single Image Upload (Dealer & Admin only)
router.post('/upload/image', authenticate, requireRole(['dealer', 'admin']), uploadMiddleware.single('image'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const uploaded = await processUploadedFile(req.file);
    return res.json({ success: true, ...uploaded });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Image upload failed' });
  }
});

// Multiple Images Upload (Up to 10 photos, Dealer & Admin only)
router.post('/upload/multiple', authenticate, requireRole(['dealer', 'admin']), uploadMiddleware.array('images', 10), async (req: AuthenticatedRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const uploadResults = await Promise.all(
      files.map(file => processUploadedFile(file))
    );

    return res.json({ success: true, files: uploadResults });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Multiple images upload failed' });
  }
});

// Video Upload (Up to 50MB, Dealer & Admin only)
router.post('/upload/video', authenticate, requireRole(['dealer', 'admin']), uploadMiddleware.single('video'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }
    const uploaded = await processUploadedFile(req.file);
    return res.json({ success: true, ...uploaded });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Video upload failed' });
  }
});


// ==========================================
// 3. SETTINGS (Centralized Contact Desk)
// ==========================================

router.get('/settings', (req, res) => {
  return res.json(db.getSettings());
});

router.patch('/settings', authenticate, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const updated = db.updateSettings(req.body);
  return res.json({ success: true, settings: updated });
});

// ==========================================
// 4. PROPERTIES & DEALER PRIVACY
// ==========================================

// Public listings (Strip dealer private info)
router.get('/properties', (req, res) => {
  const settings = db.getSettings();
  const rawProperties = db.getProperties(true); // only available
  const sanitized = sanitizePropertiesListForPublic(rawProperties, settings);
  return res.json(sanitized);
});

// Public single property details (Strip dealer private info)
router.get('/properties/:id', (req, res) => {
  const id = req.params.id as string;
  const prop = db.getPropertyById(id);
  if (!prop) {
    return res.status(404).json({ error: 'Property not found or is no longer available' });
  }

  // If not available and requester is not admin or property owner, block public view
  if (prop.status !== 'available') {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.substring(7);
      const user = db.findUserById(token);
      if (user && (user.role === 'admin' || user.id === prop.dealerId)) {
        return res.json(prop);
      }
    }
    return res.status(404).json({ error: 'Property is currently unavailable' });
  }

  const settings = db.getSettings();
  const sanitized = sanitizePropertyForPublic(prop, settings);
  return res.json(sanitized);
});

// Dealer submission
router.post('/properties', authenticate, requireRole(['dealer', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const dealer = req.user!;
    
    // Check if dealer is verified (unless admin)
    if (dealer.role === 'dealer' && dealer.dealerStatus !== 'verified' && !db.getSettings().autoApproveDealers) {
      return res.status(403).json({ error: 'Your dealer account is currently under review by SPP Nestora Admin.' });
    }

    const { title, type, price, district, city } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Property title is required.' });
    }

    if (!['land_sale', 'house_sale', 'house_rent'].includes(type)) {
      return res.status(400).json({ error: 'Valid property type (land_sale, house_sale, or house_rent) is required.' });
    }

    if (price === undefined || Number(price) <= 0 || isNaN(Number(price))) {
      return res.status(400).json({ 
        error: type === 'house_rent' 
          ? 'Valid positive monthly rent is required.' 
          : 'Valid positive selling price is required.' 
      });
    }

    if (!district || typeof district !== 'string' || !district.trim()) {
      return res.status(400).json({ error: 'Tamil Nadu district is required.' });
    }

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'City / Town / Village is required.' });
    }

    const created = db.createProperty(req.body, dealer);

    // In-app Notification for Admin
    db.createNotification({
      targetRole: 'admin',
      title: `New Property Submitted: [${created.propertyCode}] ${created.title}`,
      titleTa: `புதிய சொத்து சமர்ப்பிக்கப்பட்டது: [${created.propertyCode}] ${created.title}`,
      message: `${created.dealerName || dealer.name} submitted a new ${created.type} listing in ${created.district}.`,
      messageTa: `${created.dealerName || dealer.name} புதிய சொத்தை சமர்ப்பித்துள்ளார்.`,
      link: `/properties/${created.id}`
    });

    // Email Notification to Admin
    try {
      await emailService.sendPropertyPendingApprovalNotification(created);
    } catch (e: any) {
      console.warn('[Email Service Property Submission Error]:', e.message || e);
    }

    return res.status(201).json({ success: true, property: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit property' });
  }
});

// Property status update (Sold, Rented, Hidden, Approve, Reject)
router.patch('/properties/:id/status', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const { status, reason } = req.body as { status: PropertyStatus; reason?: string };
    const user = req.user!;

    const prop = db.getPropertyById(id);
    if (!prop) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Authorization check: Dealer can only modify own property; Admin can modify all
    if (user.role !== 'admin' && prop.dealerId !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to update this property.' });
    }

    // Security check: Dealers cannot approve their own listings or bypass the approval queue
    if (user.role !== 'admin' && ['available', 'pending_approval', 'rejected'].includes(status)) {
      return res.status(403).json({ error: 'Dealers cannot approve their own listings or alter review states. Only SPP Nestora Admin can approve listings.' });
    }

    const updated = db.updatePropertyStatus(id, status, user.id, user.role, reason);
    return res.json({ success: true, property: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update property status' });
  }
});

// Soft Delete / Archive Property
router.delete('/properties/:id', authenticate, (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const user = req.user!;
  const prop = db.getPropertyById(id);
  if (!prop) return res.status(404).json({ error: 'Property not found' });

  if (user.role !== 'admin' && prop.dealerId !== user.id) {
    return res.status(403).json({ error: 'Unauthorized to archive this property' });
  }

  const archived = db.updatePropertyStatus(id, 'archived', user.id, user.role, 'Archived by user');
  return res.json({ success: true, property: archived });
});

// ==========================================
// 5. ₹10 MANUAL UPI QR LISTING FEE PAYMENTS
// ==========================================

// Manual UPI Payment Submission (Dealer submits UTR + optional screenshot after scanning QR)
router.post('/payments/submit-manual', paymentLimiter, authenticate, requireRole(['dealer', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { propertyId, utr, screenshotUrl, confirmed } = req.body;
    const dealer = req.user!;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required to submit payment details' });
    }

    if (!utr || typeof utr !== 'string' || !utr.trim()) {
      return res.status(400).json({ error: 'UPI transaction reference / UTR is required' });
    }

    const trimmedUtr = utr.trim();
    if (trimmedUtr.length < 6 || trimmedUtr.length > 30) {
      return res.status(400).json({ error: 'Please provide a valid UPI transaction reference / UTR (6 to 30 characters)' });
    }

    if (!confirmed) {
      return res.status(400).json({ error: 'You must confirm that you have paid exactly ₹10 to the UPI QR' });
    }

    const prop = db.getPropertyById(propertyId);
    if (!prop) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (dealer.role !== 'admin' && prop.dealerId !== dealer.id) {
      return res.status(403).json({ error: 'Unauthorized: cannot submit payment for another dealer\'s property' });
    }

    // Check if this UTR was already verified for another property
    if (db.isUtrDuplicateVerified(trimmedUtr, propertyId)) {
      return res.status(400).json({ error: 'This UPI transaction reference (UTR) has already been verified for another property. Duplicate submissions are strictly prohibited.' });
    }

    const result = db.submitManualPayment({
      propertyId,
      dealerId: dealer.id,
      dealerName: dealer.businessName || dealer.name,
      utr: trimmedUtr,
      screenshotUrl
    });

    // Notify Admin of new manual UPI submission
    db.createNotification({
      targetRole: 'admin',
      title: `Manual UPI Payment Submitted: ₹10 for [${prop.propertyCode}]`,
      titleTa: `கையேடு UPI கட்டணம் சமர்ப்பிக்கப்பட்டது: ₹10 [${prop.propertyCode}]`,
      message: `${dealer.name} submitted UTR: ${trimmedUtr} for property "${prop.title}". Please verify against bank statement.`,
      messageTa: `${dealer.name} ₹10 கட்டண விவரங்களை (UTR: ${trimmedUtr}) சமர்ப்பித்துள்ளார்.`,
      link: '/admin'
    });

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to submit manual payment' });
  }
});

// Admin Verify Manual UPI Payment (Cross-checked against bank statement)
router.post('/payments/manual/:id/verify', authenticate, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  try {
    const paymentIdOrPropId = req.params.id as string;
    const admin = req.user!;

    const result = db.verifyManualPayment({
      paymentIdOrPropertyId: paymentIdOrPropId,
      adminId: admin.id,
      adminName: admin.name
    });

    // In-app Notification to Dealer
    db.createNotification({
      userId: result.property.dealerId,
      targetRole: 'dealer',
      title: `₹10 Listing Fee Verified for [${result.property.propertyCode}]`,
      titleTa: `[${result.property.propertyCode}] க்கான ₹10 கட்டணம் சரிபார்க்கப்பட்டது`,
      message: `Your ₹10 UPI payment (UTR: ${result.payment.utr}) has been confirmed. The property is now in the listing approval queue.`,
      messageTa: `உங்கள் ₹10 கட்டணம் சரிபார்க்கப்பட்டது. சொத்து இறுதி ஒப்புதலுக்கு நகர்த்தப்பட்டுள்ளது.`,
      link: '/dealer'
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to verify manual payment' });
  }
});

// Admin Reject Manual UPI Payment (With required reason)
router.post('/payments/manual/:id/reject', authenticate, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  try {
    const paymentIdOrPropId = req.params.id as string;
    const { reason } = req.body;
    const admin = req.user!;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ error: 'A rejection reason is required' });
    }

    const result = db.rejectManualPayment({
      paymentIdOrPropertyId: paymentIdOrPropId,
      adminId: admin.id,
      adminName: admin.name,
      reason: reason.trim()
    });

    // In-app Notification to Dealer
    db.createNotification({
      userId: result.property.dealerId,
      targetRole: 'dealer',
      title: `Payment Rejected for [${result.property.propertyCode}]`,
      titleTa: `[${result.property.propertyCode}] க்கான கட்டணம் நிராகரிக்கப்பட்டது`,
      message: `Your payment was rejected: ${reason.trim()}. Please review and resubmit your payment details.`,
      messageTa: `உங்கள் கட்டணம் நிராகரிக்கப்பட்டது: ${reason.trim()}. தயவுசெய்து சரியான விவரங்களை மீண்டும் சமர்ப்பிக்கவும்.`,
      link: '/dealer'
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to reject manual payment' });
  }
});

// Admin Get All Manual UPI Payments
router.get('/payments/manual', authenticate, requireRole(['admin']), (_req: AuthenticatedRequest, res) => {
  const manualPayments = db.getManualPayments();
  return res.json(manualPayments);
});

// Payment status check endpoint for dealer / property details
router.get('/payments/status/:propertyId', authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const propertyId = req.params.propertyId as string;
    const user = req.user!;
    const property = db.getPropertyById(propertyId);

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    if (user.role !== 'admin' && property.dealerId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this payment status' });
    }

    const payment = db.getPaymentByPropertyId(propertyId);

    return res.json({
      paymentStatus: payment?.status || 'pending',
      propertyStatus: property.status,
      payment: payment || null
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to check payment status' });
  }
});

router.get('/payments', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const allPayments = db.getSnapshot().payments;

  if (user.role === 'admin') {
    return res.json(allPayments);
  }

  // Dealer gets only own payments
  const dealerPayments = allPayments.filter(p => p.dealerId === user.id);
  return res.json(dealerPayments);
});

// ==========================================
// 6. ENQUIRIES CRM & SITE VISITS
// ==========================================

router.post('/enquiries', async (req, res) => {
  try {
    const { propertyId, propertyCode, propertyTitle, propertyType, propertyLocation, propertyPrice, dealerId, customerId, customerName, customerPhone, customerEmail, channel, message, preferredTime } = req.body;

    if (!customerName || !customerPhone || !message) {
      return res.status(400).json({ error: 'Customer name, phone, and message are required' });
    }

    const enquiry = db.createEnquiry({
      propertyId: propertyId || 'general',
      propertyCode: propertyCode || 'SPP-GEN',
      propertyTitle: propertyTitle || 'General Platform Enquiry',
      propertyType: propertyType || 'house_sale',
      propertyLocation: propertyLocation || 'Tamil Nadu',
      propertyPrice: Number(propertyPrice) || 0,
      dealerId: dealerId || 'admin-desk',
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      channel: channel || 'form',
      message,
      preferredTime,
      status: 'new'
    });

    // In-app Notification for Admin
    db.createNotification({
      targetRole: 'admin',
      title: `New Customer Enquiry from ${customerName}`,
      titleTa: `புதிய வாடிக்கையாளர் விசாரணை - ${customerName}`,
      message: `${customerName} (${customerPhone}) submitted enquiry: "${message.slice(0, 80)}..."`,
      messageTa: `${customerName} (${customerPhone}) புதிய விசாரணையை சமர்ப்பித்துள்ளார்.`,
      link: '/admin'
    });

    // Email Notification to Admin (chandruking901@gmail.com)
    try {
      await emailService.sendCustomerEnquiryNotification(enquiry);
    } catch (e: any) {
      console.warn('[Email Service Enquiry Error]:', e.message || e);
    }

    return res.status(201).json({ success: true, enquiry });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to submit enquiry' });
  }
});

router.get('/enquiries', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const allEnquiries = db.getSnapshot().enquiries;

  if (user.role === 'admin') {
    return res.json(allEnquiries);
  }

  if (user.role === 'customer') {
    return res.json(allEnquiries.filter(e => e.customerId === user.id || e.customerEmail === user.email));
  }

  // Dealers only get enquiries if explicitly assigned by admin
  return res.json(allEnquiries.filter(e => e.dealerId === user.id && e.status === 'site_visit_scheduled'));
});

router.patch('/enquiries/:id', authenticate, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const { status, adminNotes } = req.body as { status: EnquiryStatus; adminNotes?: string };
  const updated = db.updateEnquiryStatus(id, status, adminNotes);
  if (!updated) return res.status(404).json({ error: 'Enquiry not found' });
  return res.json({ success: true, enquiry: updated });
});

router.post('/site-visits', async (req, res) => {
  try {
    const { propertyId, propertyCode, propertyTitle, propertyAddress, dealerId, customerId, customerName, customerPhone, date, time, notes } = req.body;

    if (!customerName || !customerPhone || !date || !time) {
      return res.status(400).json({ error: 'Customer name, phone, date, and time are required' });
    }

    const visit = db.createSiteVisit({
      propertyId: propertyId || 'general',
      propertyCode: propertyCode || 'SPP-GEN',
      propertyTitle: propertyTitle || 'Property Visit',
      propertyAddress: propertyAddress || 'Tamil Nadu',
      dealerId: dealerId || 'admin-desk',
      customerId: customerId || 'guest',
      customerName,
      customerPhone,
      date,
      time,
      status: 'requested',
      notes
    });

    // In-app Notification for Admin
    db.createNotification({
      targetRole: 'admin',
      title: `Site Visit Scheduled by ${customerName}`,
      titleTa: `தள பார்வை திட்டமிடப்பட்டது - ${customerName}`,
      message: `${customerName} requested visit for ${visit.propertyCode} on ${date} at ${time}.`,
      messageTa: `${customerName} (${customerPhone}) தள பார்வையை கோரியுள்ளார்.`,
      link: '/admin'
    });

    // Email Notification to Admin
    try {
      await emailService.sendSiteVisitNotification(visit);
    } catch (e: any) {
      console.warn('[Email Service Site Visit Error]:', e.message || e);
    }

    return res.status(201).json({ success: true, siteVisit: visit });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to schedule site visit' });
  }
});

router.get('/site-visits', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const allVisits = db.getSnapshot().site_visits;

  if (user.role === 'admin') {
    return res.json(allVisits);
  }

  return res.json(allVisits.filter(v => v.customerId === user.id || v.customerPhone === user.phone));
});

router.patch('/site-visits/:id', authenticate, requireRole(['admin']), (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const { status, notes } = req.body as { status: SiteVisitStatus; notes?: string };
  const updated = db.updateSiteVisitStatus(id, status, notes);
  if (!updated) return res.status(404).json({ error: 'Site visit not found' });
  return res.json({ success: true, siteVisit: updated });
});

// ==========================================
// 7. ADMIN USER & DEALER OPERATIONS
// ==========================================

router.get('/admin/users', authenticate, requireRole(['admin']), (req, res) => {
  const users = db.getAdminUsers();
  return res.json(users);
});

router.get('/admin/dealers', authenticate, requireRole(['admin']), (req, res) => {
  const dealers = db.getSnapshot().users.filter(u => u.role === 'dealer').map(sanitizeUser);
  return res.json(dealers);
});

router.patch('/admin/dealers/:id/verify', authenticate, requireRole(['admin']), (req, res) => {
  const id = req.params.id as string;
  const { status, reason } = req.body as { status: DealerStatus; reason?: string };
  const updated = db.updateDealerStatus(id, status, reason);
  if (!updated) return res.status(404).json({ error: 'Dealer not found' });
  return res.json({ success: true, dealer: sanitizeUser(updated) });
});

router.get('/admin/revenue', authenticate, requireRole(['admin']), (req, res) => {
  const payments = db.getSnapshot().payments;
  const successfulPayments = payments.filter(p => p.status === 'success');
  const totalRevenue = successfulPayments.reduce((acc, p) => acc + p.amount, 0);

  return res.json({
    totalRevenue,
    successfulCount: successfulPayments.length,
    failedCount: payments.filter(p => p.status === 'failed').length,
    refundedCount: payments.filter(p => p.status === 'refunded').length,
    payments: successfulPayments
  });
});

// ==========================================
// 8. NOTIFICATIONS API
// ==========================================

router.get('/notifications', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifs = db.getNotifications(user.role, user.id);
  return res.json(notifs);
});

router.get('/notifications/unread-count', authenticate, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const notifs = db.getNotifications(user.role, user.id);
  const unreadCount = notifs.filter(n => !n.isRead).length;
  return res.json({ unreadCount });
});

router.patch('/notifications/:id/read', authenticate, (req: AuthenticatedRequest, res) => {
  const id = req.params.id as string;
  const success = db.markNotificationAsRead(id);
  return res.json({ success });
});

// ==========================================
// 9. SYSTEM SETTINGS
// ==========================================

router.get('/settings', (_req, res) => {
  return res.json(db.getSettings());
});

router.patch('/settings', authenticate, requireRole(['admin']), (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

// ==========================================
// 10. EMAIL DIAGNOSTICS & GMAIL API OAUTH 2.0 (SAFE - NO SECRETS IN LOGS)
// ==========================================

function generateOAuthState(): string {
  const secret = process.env.SESSION_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}:${random}`).digest('hex');
  return Buffer.from(JSON.stringify({ timestamp, random, sig: signature })).toString('base64url');
}

function verifyOAuthState(state: string): boolean {
  try {
    const secret = process.env.SESSION_SECRET || 'spp_nestora_super_secure_jwt_secret_2026_prod';
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const { timestamp, random, sig } = decoded;
    if (Date.now() - Number(timestamp) > 15 * 60 * 1000) return false; // 15 min expiry
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}:${random}`).digest('hex');
    return sig === expected;
  } catch {
    return false;
  }
}

function getOAuthRedirectUri(req: express.Request): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultUri = isProduction
    ? 'https://spp-nestora.onrender.com/api/auth/google/callback'
    : (() => {
        const host = req.get('host') || `localhost:${process.env.PORT || 5000}`;
        const isHttps = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https';
        const protocol = isHttps ? 'https' : 'http';
        return `${protocol}://${host}/api/auth/google/callback`;
      })();

  const rawRedirectUri = process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || '';
  return sanitizeRedirectUri(rawRedirectUri, defaultUri);
}

/**
 * 10.1 OAuth 2.0 Initiation Route
 * Directs administrator to Google's consent screen for least-privilege Gmail send scope.
 */
router.get('/auth/google', (req, res) => {
  const rawClientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const rawClientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const clientId = sanitizeClientId(rawClientId);
  const clientSecret = rawClientSecret.trim().replace(/^["']+|["']+$/g, '').trim();

  if (!clientId || !clientSecret) {
    console.warn(`[Google OAuth] Initiation failed: Client ID=${clientId ? 'configured' : 'MISSING'}, Client Secret=${clientSecret ? 'configured' : 'MISSING'}`);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SPP Nestora — Gmail OAuth Setup Incomplete</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; }
          h1 { color: #f87171; font-size: 22px; margin-top: 0; }
          code { background: #0f172a; color: #38bdf8; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
          pre { background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; }
          .btn { display: inline-block; background: #10b981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ Gmail OAuth Credentials Required</h1>
          <p>Before initiating Google Authorization, please configure your Google Cloud OAuth Client credentials in your environment variables:</p>
          <pre>GMAIL_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_google_client_secret</pre>
          <p>Once set in Render (or your local <code>.env</code>), reload and visit this URL again.</p>
        </div>
      </body>
      </html>
    `);
  }

  const redirectUri = getOAuthRedirectUri(req);
  const state = generateOAuthState();

  // Safe diagnostic log (never log secret or full sensitive credentials)
  console.log(`[Google OAuth] Initiating authorization redirect: Client ID: ${clientId.substring(0, 14)}...${clientId.substring(clientId.indexOf('.apps'))} | Redirect URI: ${redirectUri}`);

  const authUrl = emailService.getGoogleAuthUrl(state, redirectUri);
  return res.redirect(authUrl);
});

/**
 * 10.2 OAuth 2.0 Callback Route
 * Receives code from Google, exchanges it for refresh_token, and displays secure instructions for administrator.
 */
router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query as Record<string, string | undefined>;

  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SPP Nestora — Google Authorization Failed</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #ef4444; }
          h1 { color: #f87171; font-size: 22px; margin-top: 0; }
          .btn { display: inline-block; background: #3b82f6; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ Authorization Denied</h1>
          <p>Google returned an authorization error: <strong>${error}</strong></p>
          <p>${error_description || 'The user cancelled or authorization was denied.'}</p>
          <a href="/api/auth/google" class="btn">Try Again</a>
        </div>
      </body>
      </html>
    `);
  }

  if (!code || !state) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SPP Nestora — Invalid OAuth Callback</title>
        <style>body { font-family: sans-serif; padding: 40px; background: #0f172a; color: #fff; }</style>
      </head>
      <body>
        <h2>Invalid Request</h2>
        <p>Missing authorization code or state parameter.</p>
        <a href="/api/auth/google" style="color: #38bdf8;">Restart Authorization</a>
      </body>
      </html>
    `);
  }

  if (!verifyOAuthState(state)) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SPP Nestora — Security State Verification Failed</title>
        <style>body { font-family: sans-serif; padding: 40px; background: #0f172a; color: #fff; }</style>
      </head>
      <body>
        <h2>Security State Verification Failed</h2>
        <p>The state parameter is invalid or has expired (15-minute window). Please restart the authorization.</p>
        <a href="/api/auth/google" style="color: #38bdf8;">Restart Authorization</a>
      </body>
      </html>
    `);
  }

  const redirectUri = getOAuthRedirectUri(req);
  const result = await emailService.exchangeCodeForTokens(code, redirectUri);

  if (!result.success) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SPP Nestora — Token Exchange Failed</title>
        <style>body { font-family: sans-serif; padding: 40px; background: #0f172a; color: #fff; }</style>
      </head>
      <body>
        <h2>Token Exchange Failed</h2>
        <p>Failed to exchange code with Google: <strong>${result.error}</strong></p>
        <a href="/api/auth/google" style="color: #38bdf8;">Try Again</a>
      </body>
      </html>
    `);
  }

  const refreshToken = result.refreshToken;

  if (!refreshToken) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SPP Nestora — Refresh Token Missing</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px 20px; line-height: 1.6; }
          .container { max-width: 620px; margin: 0 auto; background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #f59e0b; }
          h1 { color: #fbbf24; font-size: 22px; margin-top: 0; }
          .btn { display: inline-block; background: #10b981; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>⚠️ No Refresh Token Returned</h1>
          <p>Google approved the authorization, but did not return a new refresh token because consent was previously recorded without requesting a new token.</p>
          <p>Please click the button below to re-authorize with forced consent so Google generates a brand-new refresh token:</p>
          <a href="/api/auth/google" class="btn">Force Re-authorization</a>
        </div>
      </body>
      </html>
    `);
  }

  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SPP Nestora — Gmail OAuth 2.0 Authorization Success</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0b1512; color: #f8fafc; padding: 40px 20px; line-height: 1.6; }
        .container { max-width: 680px; margin: 0 auto; background: #11221b; padding: 36px; border-radius: 16px; border: 1px solid #10b981; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .badge { display: inline-block; background: #064e3b; color: #34d399; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 13px; margin-bottom: 12px; }
        h1 { color: #ffffff; font-size: 24px; margin: 0 0 8px 0; }
        p { color: #cbd5e1; font-size: 15px; margin: 8px 0; }
        .token-box { background: #061510; border: 1px solid #047857; border-radius: 8px; padding: 16px; margin: 20px 0; position: relative; }
        .token-label { font-size: 12px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 8px; }
        .token-val { word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: #a7f3d0; background: transparent; user-select: all; }
        .btn-row { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
        .btn { display: inline-block; background: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: none; cursor: pointer; transition: background 0.2s; }
        .btn:hover { background: #10b981; }
        .btn-secondary { background: #1e293b; color: #94a3b8; }
        .btn-secondary:hover { background: #334155; color: #ffffff; }
        .steps { background: #0d1e17; padding: 20px; border-radius: 8px; border: 1px solid #1e3a2f; margin-top: 24px; }
        .steps ol { margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; }
        .steps li { margin: 8px 0; }
        code { background: #061510; color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="badge">OAUTH 2.0 VERIFIED</div>
        <h1>Google Authorization Successful</h1>
        <p>SPP Nestora is now authorized to send admin notifications to <strong>chandruking901@gmail.com</strong> via the Gmail REST API (least-privilege <code>gmail.send</code> scope).</p>
        
        <div class="token-box">
          <div class="token-label">Your Gmail Refresh Token:</div>
          <div id="refreshToken" class="token-val">${refreshToken}</div>
        </div>

        <button class="btn" onclick="copyToken()">📋 Copy Refresh Token</button>

        <div class="steps">
          <strong style="color: #6ee7b7; display: block; margin-bottom: 8px;">Persistent Production Setup (Render Dashboard):</strong>
          <ol>
            <li>Go to your Render Dashboard &rarr; SPP Nestora Web Service &rarr; <strong>Environment</strong>.</li>
            <li>Add or update the variable: <code>GMAIL_REFRESH_TOKEN</code> with the copied value.</li>
            <li>Ensure <code>GMAIL_CLIENT_ID</code>, <code>GMAIL_CLIENT_SECRET</code>, and <code>GMAIL_SENDER_EMAIL=chandruking901@gmail.com</code> are also saved.</li>
            <li>Click <strong>Save Changes</strong>.</li>
          </ol>
        </div>

        <div class="btn-row">
          <a href="/api/diagnostics/email/test" target="_blank" class="btn">🚀 Test Send Admin Email Now</a>
          <a href="/api/diagnostics/email" target="_blank" class="btn btn-secondary">🔍 Check Diagnostic Status</a>
        </div>
      </div>

      <script>
        function copyToken() {
          const text = document.getElementById('refreshToken').innerText.trim();
          navigator.clipboard.writeText(text).then(() => {
            alert('Refresh token copied to clipboard! Paste it into GMAIL_REFRESH_TOKEN on Render.');
          }).catch(() => {
            alert('Please select and copy the text manually.');
          });
        }
      </script>
    </body>
    </html>
  `);
});

/**
 * 10.3 Email Diagnostics (Safe - No Secrets)
 */
router.get('/diagnostics/email', async (_req, res) => {
  try {
    const status = await emailService.getDiagnosticStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Diagnostic check failed' });
  }
});

router.post('/diagnostics/email/test', async (_req, res) => {
  try {
    const result = await emailService.sendTestEmail();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Test email failed' });
  }
});

// Also allow GET on test endpoint for convenient browser testing
router.get('/diagnostics/email/test', async (_req, res) => {
  try {
    const result = await emailService.sendTestEmail();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Test email failed' });
  }
});

/**
 * 10.4 Safe OAuth Diagnostics (Safe - Never leaks secrets or tokens)
 */
router.get('/diagnostics/oauth', (req, res) => {
  const rawClientId = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || '';
  const rawClientSecret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
  const rawRefreshToken = process.env.GMAIL_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || '';
  const clientId = sanitizeClientId(rawClientId);
  const redirectUri = getOAuthRedirectUri(req);

  const envVarFound = process.env.GMAIL_CLIENT_ID
    ? 'GMAIL_CLIENT_ID'
    : process.env.GOOGLE_CLIENT_ID
    ? 'GOOGLE_CLIENT_ID'
    : process.env.GOOGLE_OAUTH_CLIENT_ID
    ? 'GOOGLE_OAUTH_CLIENT_ID'
    : 'NONE';

  const maskedClientId = clientId.length > 20
    ? `${clientId.substring(0, 14)}...${clientId.substring(clientId.indexOf('.apps'))}`
    : (clientId ? 'Present (short)' : 'MISSING');

  return res.json({
    configured: Boolean(clientId && rawClientSecret),
    envVarSource: envVarFound,
    clientIdMasked: maskedClientId,
    clientIdHasHyphen: clientId.includes('-'),
    clientIdLength: clientId.length,
    redirectUri,
    hasClientSecret: Boolean(rawClientSecret),
    hasRefreshToken: Boolean(rawRefreshToken || emailService.getRuntimeRefreshToken()),
    intendedRecipient: 'chandruking901@gmail.com',
    scope: 'https://www.googleapis.com/auth/gmail.send'
  });
});


