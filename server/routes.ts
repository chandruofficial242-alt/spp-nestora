import express from 'express';
import { db } from './db.ts';
import { authenticate, requireRole, generateAuthToken, AuthenticatedRequest } from './auth.ts';
import { sanitizePropertyForPublic, sanitizePropertiesListForPublic, sanitizeUser } from './sanitizer.ts';
import { paymentGateway } from './paymentService.ts';
import { uploadMiddleware, processUploadedFile } from './uploadService.ts';
import { createRateLimiter } from './rateLimiter.ts';
import { User, Property, PropertyStatus, EnquiryStatus, SiteVisitStatus, DealerStatus } from '../src/types/index.ts';

export const router = express.Router();

// Rate limiters for sensitive endpoints
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 20, message: 'Too many login attempts. Please try again after 15 minutes.' });
const registerLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many accounts registered from this IP. Please try again later.' });
const paymentLimiter = createRateLimiter({ windowMs: 1 * 60 * 1000, maxRequests: 30, message: 'Payment rate limit exceeded. Please wait a moment.' });

// ==========================================
// 1. AUTHENTICATION & TERMS
// ==========================================

router.post('/auth/register', registerLimiter, (req, res) => {
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

router.post('/auth/forgot-password', authLimiter, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  // Verification without leaking account existence
  return res.json({ success: true, message: 'If the email exists, a password reset link has been dispatched.' });
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

// Single Image Upload
router.post('/upload/image', authenticate, uploadMiddleware.single('image'), async (req: AuthenticatedRequest, res) => {
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

// Multiple Images Upload (Up to 10 photos)
router.post('/upload/multiple', authenticate, uploadMiddleware.array('images', 10), async (req: AuthenticatedRequest, res) => {
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

// Video Upload (Up to 50MB)
router.post('/upload/video', authenticate, uploadMiddleware.single('video'), async (req: AuthenticatedRequest, res) => {
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
router.post('/properties', authenticate, requireRole(['dealer', 'admin']), (req: AuthenticatedRequest, res) => {
  try {
    const dealer = req.user!;
    
    // Check if dealer is verified (unless admin)
    if (dealer.role === 'dealer' && dealer.dealerStatus !== 'verified' && !db.getSettings().autoApproveDealers) {
      return res.status(403).json({ error: 'Your dealer account is currently under review by SPP Nestora Admin.' });
    }

    const created = db.createProperty(req.body, dealer);
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
// 5. ₹10 LISTING FEE PAYMENTS
// ==========================================

router.post('/payments/create-order', paymentLimiter, authenticate, requireRole(['dealer', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { propertyId, propertyTitle, method } = req.body;
    const dealer = req.user!;

    const order = await paymentGateway.createOrder({
      dealerId: dealer.id,
      dealerName: dealer.businessName || dealer.name,
      propertyId,
      propertyTitle,
      paymentMethod: method || 'upi'
    });

    return res.json(order);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to initiate listing payment' });
  }
});

router.post('/payments/verify', paymentLimiter, authenticate, requireRole(['dealer', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId, paymentId, signature, propertyId, propertyTitle, method } = req.body;
    const dealer = req.user!;

    const result = await paymentGateway.verifyPayment({
      orderId,
      paymentId: paymentId || `pay_${Date.now()}`,
      signature,
      dealerId: dealer.id,
      dealerName: dealer.businessName || dealer.name,
      propertyId,
      propertyTitle,
      method: method || 'upi'
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Payment verification failed' });
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

router.post('/enquiries', (req, res) => {
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

router.post('/site-visits', (req, res) => {
  try {
    const { propertyId, propertyCode, propertyTitle, propertyAddress, dealerId, customerId, customerName, customerPhone, date, time, notes } = req.body;

    const visit = db.createSiteVisit({
      propertyId,
      propertyCode,
      propertyTitle,
      propertyAddress,
      dealerId: dealerId || 'admin-desk',
      customerId: customerId || 'guest',
      customerName,
      customerPhone,
      date,
      time,
      status: 'requested',
      notes
    });

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
// 7. ADMIN DEALER & REVENUE OPERATIONS
// ==========================================

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
