import { 
  User, 
  Property, 
  Enquiry, 
  SiteVisit, 
  Payment, 
  AdminSettings, 
  PropertyStatus, 
  EnquiryStatus, 
  SiteVisitStatus, 
  DealerStatus 
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('spp_nestora_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const apiService = {
  // --- AUTH ---
  async login(email: string, password?: string, role?: string): Promise<{ user: User; token: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: password || 'demo123', role })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Login failed');
      }
      const data = await res.json();
      if (data.token) localStorage.setItem('spp_nestora_token', data.token);
      return data;
    } catch (e: any) {
      throw e;
    }
  },

  async register(userData: Partial<User>, password?: string): Promise<{ user: User; token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, password: password || 'demo123' })
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Registration failed');
    }
    const data = await res.json();
    if (data.token) localStorage.setItem('spp_nestora_token', data.token);
    return data;
  },

  async acceptTerms(email?: string, language?: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/terms/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: email, language, termsVersion: 'v1.0' })
      });
    } catch (e) {}
  },

  // --- SETTINGS ---
  async getSettings(): Promise<AdminSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to load platform settings');
    return res.json();
  },

  async updateSettings(settings: Partial<AdminSettings>): Promise<AdminSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update platform settings');
    const data = await res.json();
    return data.settings;
  },

  // --- PROPERTIES ---
  async getProperties(): Promise<Property[]> {
    const res = await fetch(`${API_BASE}/properties`);
    if (!res.ok) throw new Error('Failed to fetch public properties');
    return res.json();
  },

  async getProperty(id: string): Promise<Property> {
    const res = await fetch(`${API_BASE}/properties/${id}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Property not found');
    return res.json();
  },

  async createProperty(property: Partial<Property>): Promise<{ property: Property }> {
    const res = await fetch(`${API_BASE}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(property)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit property');
    }
    return res.json();
  },

  async updatePropertyStatus(id: string, status: PropertyStatus, reason?: string): Promise<Property> {
    const res = await fetch(`${API_BASE}/properties/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reason })
    });
    if (!res.ok) throw new Error('Failed to update status');
    const data = await res.json();
    return data.property;
  },

  async deleteProperty(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/properties/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to delete property');
  },

  // --- MEDIA UPLOAD ---
  async uploadImage(file: File): Promise<{ url: string; isVideo: boolean }> {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload image');
    }
    return res.json();
  },

  async uploadMultipleImages(files: File[]): Promise<{ files: Array<{ url: string }> }> {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    const res = await fetch(`${API_BASE}/upload/multiple`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload multiple images');
    }
    return res.json();
  },

  async uploadVideo(file: File): Promise<{ url: string; isVideo: boolean }> {
    const formData = new FormData();
    formData.append('video', file);
    const res = await fetch(`${API_BASE}/upload/video`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload video');
    }
    return res.json();
  },

  // --- PAYMENTS ---
  async createPaymentOrder(propertyId: string, propertyTitle: string, method: string) {
    const res = await fetch(`${API_BASE}/payments/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ propertyId, propertyTitle, method })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create payment order');
    }
    return res.json();
  },

  async verifyPayment(params: {
    orderId: string;
    paymentId?: string;
    signature?: string;
    propertyId: string;
    propertyTitle: string;
    method: string;
  }) {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Payment verification failed');
    }
    return res.json();
  },

  // --- ENQUIRIES & SITE VISITS ---
  async submitEnquiry(enquiry: any): Promise<Enquiry> {
    const res = await fetch(`${API_BASE}/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiry)
    });
    if (!res.ok) throw new Error('Failed to submit enquiry');
    const data = await res.json();
    return data.enquiry;
  },

  async updateEnquiryStatus(id: string, status: EnquiryStatus, adminNotes?: string): Promise<Enquiry> {
    const res = await fetch(`${API_BASE}/enquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, adminNotes })
    });
    if (!res.ok) throw new Error('Failed to update enquiry');
    const data = await res.json();
    return data.enquiry;
  },

  async scheduleSiteVisit(visit: any): Promise<SiteVisit> {
    const res = await fetch(`${API_BASE}/site-visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visit)
    });
    if (!res.ok) throw new Error('Failed to schedule site visit');
    const data = await res.json();
    return data.siteVisit;
  },

  async updateSiteVisitStatus(id: string, status: SiteVisitStatus, notes?: string): Promise<SiteVisit> {
    const res = await fetch(`${API_BASE}/site-visits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, notes })
    });
    if (!res.ok) throw new Error('Failed to update site visit status');
    const data = await res.json();
    return data.siteVisit;
  },

  // --- ADMIN DEALER OPERATIONS ---
  async getDealers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/admin/dealers`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to fetch dealers');
    return res.json();
  },

  async updateDealerStatus(id: string, status: DealerStatus, reason?: string): Promise<User> {
    const res = await fetch(`${API_BASE}/admin/dealers/${id}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, reason })
    });
    if (!res.ok) throw new Error('Failed to update dealer status');
    const data = await res.json();
    return data.dealer;
  }
};
