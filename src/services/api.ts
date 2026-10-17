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

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
      });
    } catch {}
    localStorage.removeItem('spp_nestora_token');
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Session expired or invalid');
    return res.json();
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to request password reset link.');
    }
    return res.json();
  },

  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({ valid: false, error: 'Network error verifying reset link.' }));
    if (!res.ok || !data.valid) {
      return { valid: false, error: data.error || 'Invalid or expired password reset link.' };
    }
    return data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to reset password.');
    }
    return res.json();
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      const res = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed with HTTP status ${res.status}`);
      }
      return res.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Image upload timed out. Please check your network connection and try again.');
      }
      throw e;
    }
  },

  async uploadMultipleImages(files: File[]): Promise<{ 
    files: Array<{ url: string; originalName?: string; format?: string; size?: number }>; 
    errors?: Array<{ originalName: string; error: string }> 
  }> {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s timeout for batch

    try {
      const res = await fetch(`${API_BASE}/upload/multiple`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed with HTTP status ${res.status}`);
      }
      return res.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Photo batch upload timed out. Please check your network connection and try again.');
      }
      throw e;
    }
  },

  async uploadVideo(file: File): Promise<{ url: string; isVideo: boolean }> {
    const formData = new FormData();
    formData.append('video', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 180s timeout

    try {
      const res = await fetch(`${API_BASE}/upload/video`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Video upload failed with HTTP status ${res.status}`);
      }
      return res.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Video upload timed out. Please check your network connection and try again.');
      }
      throw e;
    }
  },

  // --- MANUAL UPI QR PAYMENTS ---
  async submitManualPayment(params: {
    propertyId: string;
    amount?: number;
    utr: string;
    screenshotUrl?: string;
    confirmed: boolean;
  }): Promise<{ success: boolean; payment: Payment; property: Property; message?: string }> {
    const res = await fetch(`${API_BASE}/payments/submit-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit manual payment details');
    }
    return res.json();
  },

  async verifyManualPayment(paymentIdOrPropertyId: string): Promise<{ success: boolean; payment: Payment; property: Property; message?: string }> {
    const res = await fetch(`${API_BASE}/payments/manual/${paymentIdOrPropertyId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to verify manual payment');
    }
    return res.json();
  },

  async rejectManualPayment(paymentIdOrPropertyId: string, reason: string): Promise<{ success: boolean; payment: Payment; property: Property; message?: string }> {
    const res = await fetch(`${API_BASE}/payments/manual/${paymentIdOrPropertyId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reject manual payment');
    }
    return res.json();
  },

  async getManualPayments(): Promise<Payment[]> {
    const res = await fetch(`${API_BASE}/payments/manual`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch manual payments');
    }
    return res.json();
  },

  async checkPaymentStatus(propertyId: string): Promise<{ paymentStatus: string; propertyStatus?: string; payment?: Payment; message?: string }> {
    const res = await fetch(`${API_BASE}/payments/status/${propertyId}`, {
      headers: getAuthHeader()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to check payment status');
    }
    return res.json();
  },

  async getPayments(): Promise<Payment[]> {
    const res = await fetch(`${API_BASE}/payments`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to fetch payments');
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

  // --- ADMIN OPERATIONS ---
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
  },

  async getAdminUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: getAuthHeader()
    });
    if (!res.ok) throw new Error('Failed to fetch admin users');
    return res.json();
  },

  async getNotifications(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getAuthHeader()
    });
    if (!res.ok) return [];
    return res.json();
  },

  async markNotificationAsRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeader()
    });
  }
};


