import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Language, 
  User, 
  Property, 
  Enquiry, 
  SiteVisit, 
  Payment, 
  AdminSettings, 
  AppNotification, 
  PropertyFilter,
  PropertyStatus,
  EnquiryStatus,
  SiteVisitStatus,
  DealerStatus
} from '../types';
import { 
  INITIAL_SETTINGS, 
  INITIAL_USERS, 
  INITIAL_PROPERTIES, 
  INITIAL_ENQUIRIES, 
  INITIAL_SITE_VISITS, 
  INITIAL_PAYMENTS, 
  INITIAL_NOTIFICATIONS 
} from '../data/seedData';
import { translations, TranslationDict } from '../i18n/translations';
import { apiService } from '../services/api';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDict;
  termsAccepted: boolean;
  acceptTerms: () => void;
  
  // Auth
  currentUser: User | null;
  login: (email: string, passwordOrRole?: string, role?: string) => Promise<boolean>;
  register: (data: Partial<User>, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;

  
  // Properties
  properties: Property[];
  publicProperties: Property[];
  getPropertyById: (idOrCode: string) => Property | undefined;
  addProperty: (propertyData: Partial<Property>, paymentInfo: { method: 'upi' | 'card' | 'netbanking'; amount: number }) => Promise<{ success: boolean; property: Property; receipt: Payment }>;
  updateProperty: (id: string, data: Partial<Property>) => void;
  changePropertyStatus: (id: string, status: PropertyStatus, reason?: string) => void;
  deleteProperty: (id: string) => void;
  approveProperty: (id: string) => void;
  rejectProperty: (id: string, reason: string) => void;
  
  // Favorites & History
  favorites: string[];
  toggleFavorite: (propertyId: string) => void;
  isFavorite: (propertyId: string) => boolean;
  recentlyViewed: string[];
  trackView: (propertyId: string) => void;
  
  // Enquiries & CRM
  enquiries: Enquiry[];
  addEnquiry: (enquiry: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEnquiryStatus: (id: string, status: EnquiryStatus, adminNotes?: string) => void;
  
  // Site Visits
  siteVisits: SiteVisit[];
  scheduleSiteVisit: (visit: Omit<SiteVisit, 'id' | 'createdAt'>) => void;
  updateSiteVisitStatus: (id: string, status: SiteVisitStatus) => void;
  
  // Payments
  payments: Payment[];
  
  // Dealer Management
  dealers: User[];
  updateDealerStatus: (dealerId: string, status: DealerStatus, reason?: string) => void;
  
  // Settings
  settings: AdminSettings;
  updateSettings: (newSettings: Partial<AdminSettings>) => void;
  
  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  
  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  
  // WhatsApp & Phone Helpers
  getWhatsAppUrl: (propertyCode?: string, propertyTitle?: string, location?: string) => string;
  getCallUrl: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  LANG: 'spp_nestora_lang',
  TERMS: 'spp_nestora_terms_consent_v1',
  USER: 'spp_nestora_user',
  TOKEN: 'spp_nestora_token',
  USERS: 'spp_nestora_users_db',
  PROPERTIES: 'spp_nestora_properties_db',
  FAVORITES: 'spp_nestora_favorites',
  RECENT: 'spp_nestora_recently_viewed',
  ENQUIRIES: 'spp_nestora_enquiries_db',
  SITE_VISITS: 'spp_nestora_site_visits_db',
  PAYMENTS: 'spp_nestora_payments_db',
  SETTINGS: 'spp_nestora_admin_settings_db',
  NOTIFICATIONS: 'spp_nestora_notifications_db',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANG);
    return (saved === 'ta' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  };

  const t = translations[language];

  // Terms Consent Modal
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.TERMS) === 'true';
  });

  const acceptTerms = () => {
    setTermsAccepted(true);
    localStorage.setItem(STORAGE_KEYS.TERMS, 'true');
    showToast(language === 'ta' ? 'விதிமுறைகள் ஏற்றுக்கொள்ளப்பட்டது' : 'Terms accepted successfully', 'success');
  };

  // Settings
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<AdminSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    });
    showToast(language === 'ta' ? 'அமைப்புகள் சேமிக்கப்பட்டது' : 'Platform settings updated', 'success');
  };

  // Users DB
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Current Logged In User
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  });

  // Properties DB
  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROPERTIES);
    return saved ? JSON.parse(saved) : INITIAL_PROPERTIES;
  });

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return saved ? JSON.parse(saved) : ['prop-001', 'prop-002'];
  });

  // Recently Viewed
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECENT);
    return saved ? JSON.parse(saved) : ['prop-001', 'prop-003'];
  });

  // Enquiries
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ENQUIRIES);
    return saved ? JSON.parse(saved) : INITIAL_ENQUIRIES;
  });

  // Site Visits
  const [siteVisits, setSiteVisits] = useState<SiteVisit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SITE_VISITS);
    return saved ? JSON.parse(saved) : INITIAL_SITE_VISITS;
  });

  // Payments
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(enquiries));
  }, [enquiries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SITE_VISITS, JSON.stringify(siteVisits));
  }, [siteVisits]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  // Hydrate & validate token session on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (token) {
      apiService.getMe().then(res => {
        if (res && res.user) {
          setCurrentUser(res.user);
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
        }
      }).catch(() => {
        // If token expired, attempt fallback re-auth if user data exists
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            if (u && u.email) {
              const defaultPass = u.role === 'admin' ? 'admin123' : u.role === 'dealer' ? 'dealer123' : 'customer123';
              apiService.login(u.email, defaultPass, u.role).then(loginRes => {
                if (loginRes && loginRes.token) {
                  localStorage.setItem(STORAGE_KEYS.TOKEN, loginRes.token);
                  setCurrentUser(loginRes.user);
                }
              }).catch(() => {
                localStorage.removeItem(STORAGE_KEYS.TOKEN);
              });
            }
          } catch {}
        }
      });
    } else if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.email) {
          const defaultPass = u.role === 'admin' ? 'admin123' : u.role === 'dealer' ? 'dealer123' : 'customer123';
          apiService.login(u.email, defaultPass, u.role).then(loginRes => {
            if (loginRes && loginRes.token) {
              localStorage.setItem(STORAGE_KEYS.TOKEN, loginRes.token);
              setCurrentUser(loginRes.user);
            }
          }).catch(() => {});
        }
      } catch {}
    }
  }, []);

  // Auth Methods
  const login = async (email: string, passwordOrRole?: string, role?: string): Promise<boolean> => {
    let actualPassword = 'customer123';
    let actualRole = role;

    if (passwordOrRole === 'admin' || passwordOrRole === 'dealer' || passwordOrRole === 'customer') {
      actualRole = passwordOrRole;
      actualPassword = actualRole === 'admin' ? 'admin123' : actualRole === 'dealer' ? 'dealer123' : 'customer123';
    } else if (passwordOrRole) {
      actualPassword = passwordOrRole;
    } else {
      actualPassword = email.includes('admin') ? 'admin123' : email.includes('dealer') ? 'dealer123' : 'customer123';
    }

    try {
      const res = await apiService.login(email, actualPassword, actualRole);
      if (res && res.user && res.token) {
        setCurrentUser(res.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
        localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);

        // Sync user into allUsers if not present
        setAllUsers(prev => {
          const exists = prev.some(u => u.id === res.user.id);
          return exists ? prev.map(u => u.id === res.user.id ? res.user : u) : [res.user, ...prev];
        });

        showToast(language === 'ta' ? `நல்வரவு, ${res.user.name}!` : `Welcome back, ${res.user.name}!`, 'success');
        return true;
      }
    } catch (apiErr: any) {
      console.warn('Backend login error:', apiErr);
      showToast(apiErr.message || 'Login failed', 'error');
      return false;
    }
    return false;
  };

  const register = async (data: Partial<User>, password?: string): Promise<{ success: boolean; message?: string }> => {
    if (!data.email || !data.name || !data.phone) {
      return { success: false, message: 'All required fields must be filled.' };
    }

    try {
      const res = await apiService.register(data, password || 'customer123');
      if (res && res.user && res.token) {
        setCurrentUser(res.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
        localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
        setAllUsers(prev => [res.user, ...prev.filter(u => u.email !== res.user.email)]);

        // Admin notification
        const notif: AppNotification = {
          id: `notif-${Date.now()}`,
          targetRole: 'admin',
          title: `New ${res.user.role === 'dealer' ? 'Dealer' : 'Customer'} Registered`,
          titleTa: `புதிய ${res.user.role === 'dealer' ? 'டீலர்' : 'பயனர்'} பதிவு`,
          message: `${res.user.name} (${res.user.email}) just joined SPP Nestora.`,
          isRead: false,
          createdAt: new Date().toISOString()
        };
        setNotifications(prev => [notif, ...prev]);

        return { success: true };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed' };
    }
    return { success: false, message: 'Registration failed' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    apiService.logout().catch(() => {});
    showToast(language === 'ta' ? 'வெற்றிகரமாக வெளியேறினீர்கள்' : 'Logged out successfully', 'info');
  };


  const updateUser = (data: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    setAllUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    showToast(language === 'ta' ? 'சுயவிவரம் புதுப்பிக்கப்பட்டது' : 'Profile updated successfully', 'success');
  };

  // Public properties (only available status, not sold/rented/hidden/archived/pending)
  const publicProperties = properties.filter(p => p.status === 'available');

  const getPropertyById = (idOrCode: string) => {
    return properties.find(p => p.id === idOrCode || p.propertyCode.toLowerCase() === idOrCode.toLowerCase());
  };

  const addProperty = async (
    propertyData: Partial<Property>, 
    paymentInfo: { method: 'upi' | 'card' | 'netbanking'; amount: number }
  ) => {
    // Generate unique property code like SPP-CHN-000109
    const districtCode = (propertyData.district || 'TN').substring(0, 3).toUpperCase();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const propertyCode = `SPP-${districtCode}-${randomNum}`;
    const propId = `prop-${Date.now()}`;

    const newProperty: Property = {
      id: propId,
      propertyCode,
      title: propertyData.title || 'Untitled Property',
      titleTa: propertyData.titleTa,
      description: propertyData.description || '',
      descriptionTa: propertyData.descriptionTa,
      type: propertyData.type || 'house_sale',
      status: settings.autoApproveProperties ? 'available' : 'pending_approval',
      price: Number(propertyData.price) || 0,
      priceNegotiable: propertyData.priceNegotiable ?? true,
      rentalPeriod: propertyData.rentalPeriod || 'monthly',
      depositAmount: Number(propertyData.depositAmount) || 0,
      maintenanceFee: Number(propertyData.maintenanceFee) || 0,
      state: 'Tamil Nadu',
      district: propertyData.district || 'Chennai',
      city: propertyData.city || 'Chennai',
      taluk: propertyData.taluk || '',
      area: propertyData.area || '',
      locality: propertyData.locality || '',
      address: propertyData.address || '',
      pincode: propertyData.pincode || '',
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
      dealerId: currentUser?.id || 'dealer-01',
      dealerName: currentUser?.businessName || currentUser?.name || 'Authorized Dealer',
      verified: false,
      viewsCount: 0,
      favoritesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create Payment Receipt
    const receiptNumber = `SPP-REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      receiptNumber,
      dealerId: currentUser?.id || 'dealer-01',
      dealerName: currentUser?.businessName || currentUser?.name || 'Authorized Dealer',
      propertyId: propId,
      propertyTitle: newProperty.title,
      amount: paymentInfo.amount,
      currency: 'INR',
      purpose: `Property Listing Fee — ₹${paymentInfo.amount}`,
      method: paymentInfo.method,
      status: 'success',
      transactionRef: `${paymentInfo.method.toUpperCase()}-TXN-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // Update state
    setProperties(prev => [newProperty, ...prev]);
    setPayments(prev => [newPayment, ...prev]);

    // Add admin notification
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      targetRole: 'admin',
      title: 'New Property Listing Submitted',
      titleTa: 'புதிய சொத்து பதிவு சமர்ப்பிக்கப்பட்டது',
      message: `Property ${propertyCode} was submitted by ${newPayment.dealerName}. Listing fee ₹${paymentInfo.amount} paid.`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [notif, ...prev]);

    return { success: true, property: newProperty, receipt: newPayment };
  };

  const updateProperty = (id: string, data: Partial<Property>) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p));
    showToast(language === 'ta' ? 'சொத்து விவரங்கள் புதுப்பிக்கப்பட்டன' : 'Property updated successfully', 'success');
  };

  const changePropertyStatus = (id: string, status: PropertyStatus, reason?: string) => {
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return { 
          ...p, 
          status, 
          rejectionReason: reason || p.rejectionReason, 
          updatedAt: new Date().toISOString() 
        };
      }
      return p;
    }));
    showToast(
      language === 'ta' 
        ? `சொத்து நிலை மாற்றப்பட்டது: ${status}` 
        : `Property status changed to ${status.replace('_', ' ')}`, 
      'info'
    );
  };

  const deleteProperty = (id: string) => {
    // Soft delete by archiving to keep database integrity
    changePropertyStatus(id, 'archived');
  };

  const approveProperty = (id: string) => {
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: 'available', verified: true, updatedAt: new Date().toISOString() };
      }
      return p;
    }));
    showToast(language === 'ta' ? 'சொத்து அங்கீகரிக்கப்பட்டது & வெளியிடப்பட்டது' : 'Property approved and published live!', 'success');
  };

  const rejectProperty = (id: string, reason: string) => {
    setProperties(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: 'rejected', rejectionReason: reason, updatedAt: new Date().toISOString() };
      }
      return p;
    }));
    showToast(language === 'ta' ? 'சொத்து நிராகரிக்கப்பட்டது' : 'Property listing rejected', 'warning');
  };

  // Favorites
  const toggleFavorite = (propertyId: string) => {
    setFavorites(prev => {
      const exists = prev.includes(propertyId);
      if (exists) {
        showToast(language === 'ta' ? 'விருப்பப்பட்டியலில் இருந்து நீக்கப்பட்டது' : 'Removed from saved properties', 'info');
        return prev.filter(id => id !== propertyId);
      } else {
        showToast(language === 'ta' ? 'விருப்பப்பட்டியலில் சேர்க்கப்பட்டது' : 'Added to saved properties', 'success');
        return [...prev, propertyId];
      }
    });
  };

  const isFavorite = (propertyId: string) => favorites.includes(propertyId);

  // Recently Viewed & View Count
  const trackView = (propertyId: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== propertyId);
      return [propertyId, ...filtered].slice(0, 10);
    });
    setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, viewsCount: (p.viewsCount || 0) + 1 } : p));
  };

  // Enquiries
  const addEnquiry = (enquiryData: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEnq: Enquiry = {
      ...enquiryData,
      id: `enq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEnquiries(prev => [newEnq, ...prev]);

    // Admin Notification
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      targetRole: 'admin',
      title: `New Customer Enquiry for ${enquiryData.propertyCode}`,
      titleTa: `புதிய வாடிக்கையாளர் விசாரணை - ${enquiryData.propertyCode}`,
      message: `${enquiryData.customerName} inquired via ${enquiryData.channel.toUpperCase()}.`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [notif, ...prev]);
    showToast(language === 'ta' ? 'உங்கள் விசாரணை SPP நெஸ்டோராவிற்கு அனுப்பப்பட்டது' : 'Enquiry sent to SPP Nestora Admin team!', 'success');
  };

  const updateEnquiryStatus = (id: string, status: EnquiryStatus, adminNotes?: string) => {
    setEnquiries(prev => prev.map(e => e.id === id ? { 
      ...e, 
      status, 
      adminNotes: adminNotes ?? e.adminNotes,
      updatedAt: new Date().toISOString() 
    } : e));
    showToast(language === 'ta' ? 'விசாரணை நிலை புதுப்பிக்கப்பட்டது' : 'Enquiry status updated', 'success');
  };

  // Site Visits
  const scheduleSiteVisit = (visitData: Omit<SiteVisit, 'id' | 'createdAt'>) => {
    const newVisit: SiteVisit = {
      ...visitData,
      id: `sv-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setSiteVisits(prev => [newVisit, ...prev]);
    showToast(language === 'ta' ? 'தள பார்வை நேரம் பதிவு செய்யப்பட்டது' : 'Site visit scheduled with SPP Nestora!', 'success');
  };

  const updateSiteVisitStatus = (id: string, status: SiteVisitStatus) => {
    setSiteVisits(prev => prev.map(sv => sv.id === id ? { ...sv, status } : sv));
    showToast(language === 'ta' ? 'தள பார்வை நிலை புதுப்பிக்கப்பட்டது' : 'Site visit status updated', 'success');
  };

  // Dealers
  const dealers = allUsers.filter(u => u.role === 'dealer');

  const updateDealerStatus = (dealerId: string, status: DealerStatus, reason?: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === dealerId) {
        return {
          ...u,
          dealerStatus: status,
          rejectionReason: reason,
          verifiedAt: status === 'verified' ? new Date().toISOString() : u.verifiedAt
        };
      }
      return u;
    }));
    showToast(language === 'ta' ? `டீலர் நிலை மாற்றப்பட்டது: ${status}` : `Dealer status updated to ${status}`, 'success');
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  // Centralized WhatsApp & Call URL Generators
  const getWhatsAppUrl = (propertyCode?: string, propertyTitle?: string, location?: string) => {
    const phone = settings.officialWhatsApp.replace(/\D/g, '');
    let msg = `Hello SPP Nestora, I am interested in this property.`;
    if (propertyCode) {
      msg += `\n\nProperty ID: ${propertyCode}\nProperty: ${propertyTitle || ''}\nLocation: ${location || 'Tamil Nadu'}\n\nPlease provide more details and help arrange a site visit.`;
    } else {
      msg += `\n\nI would like to inquire about properties across Tamil Nadu.`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const getCallUrl = () => {
    const cleanPhone = settings.officialPhone.replace(/\s+/g, '');
    return `tel:${cleanPhone}`;
  };

  return (
    <AppContext.Provider value={{
      language,
      setLanguage,
      t,
      termsAccepted,
      acceptTerms,
      currentUser,
      login,
      register,
      logout,
      updateUser,
      properties,
      publicProperties,
      getPropertyById,
      addProperty,
      updateProperty,
      changePropertyStatus,
      deleteProperty,
      approveProperty,
      rejectProperty,
      favorites,
      toggleFavorite,
      isFavorite,
      recentlyViewed,
      trackView,
      enquiries,
      addEnquiry,
      updateEnquiryStatus,
      siteVisits,
      scheduleSiteVisit,
      updateSiteVisitStatus,
      payments,
      dealers,
      updateDealerStatus,
      settings,
      updateSettings,
      notifications,
      markNotificationAsRead,
      toasts,
      showToast,
      removeToast,
      getWhatsAppUrl,
      getCallUrl
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
