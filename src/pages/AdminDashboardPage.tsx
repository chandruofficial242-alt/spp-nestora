import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Property, 
  User, 
  Enquiry, 
  Payment, 
  AdminSettings, 
  EnquiryStatus, 
  AppNotification 
} from '../types';
import { apiService } from '../services/api';
import { InvoiceModal } from '../components/dealer/InvoiceModal';
import { formatPrice } from '../utils/formatters';
import { 
  Shield, 
  Layers, 
  Users, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  IndianRupee, 
  MessageSquare, 
  Calendar, 
  Settings, 
  Phone, 
  AlertTriangle,
  Trash2,
  Save,
  Bell,
  UserCheck,
  RefreshCw,
  FileText,
  Filter,
  MapPin,
  Eye,
  QrCode,
  Copy,
  Check,
  Image as ImageIcon
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { 
    language, 
    properties, 
    approveProperty, 
    rejectProperty, 
    deleteProperty,
    updateProperty,
    allUsers,
    dealers, 
    updateDealerStatus, 
    enquiries, 
    updateEnquiryStatus, 
    siteVisits, 
    payments, 
    settings, 
    updateSettings,
    notifications,
    markNotificationAsRead,
    showToast
  } = useApp();

  const [activeSection, setActiveSection] = useState<
    'overview' | 'manual_payments' | 'pending' | 'properties' | 'customers' | 'dealers' | 'enquiries' | 'visits' | 'payments' | 'settings'
  >('overview');

  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Manual UPI Payments State
  const [manualPayments, setManualPayments] = useState<Payment[]>([]);
  const [loadingManualPayments, setLoadingManualPayments] = useState(false);
  const [manualPaymentTab, setManualPaymentTab] = useState<'pending' | 'history'>('pending');
  const [verifyModalPayment, setVerifyModalPayment] = useState<Payment | null>(null);
  const [rejectPaymentModal, setRejectPaymentModal] = useState<Payment | null>(null);
  const [rejectPaymentReason, setRejectPaymentReason] = useState('');
  const [screenshotModalUrl, setScreenshotModalUrl] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Payments Dashboard State
  const [livePayments, setLivePayments] = useState<Payment[]>(payments);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');
  const [viewingAuditPayment, setViewingAuditPayment] = useState<Payment | null>(null);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchManualPayments = async () => {
    setLoadingManualPayments(true);
    try {
      const data = await apiService.getManualPayments();
      if (Array.isArray(data)) {
        setManualPayments(data);
      }
    } catch (err) {
      console.warn('Failed to fetch manual payments:', err);
    } finally {
      setLoadingManualPayments(false);
    }
  };

  const fetchLivePayments = async () => {
    setLoadingPayments(true);
    try {
      const data = await apiService.getPayments();
      if (Array.isArray(data)) {
        setLivePayments(data);
      }
    } catch {
      // Fallback to context payments
      setLivePayments(payments);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchManualPayments();
    fetchLivePayments();
  }, [activeSection]);

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    showToast('UTR reference copied to clipboard', 'info');
    setTimeout(() => setCopiedUtr(null), 2500);
  };

  const handleConfirmVerifyPayment = async () => {
    if (!verifyModalPayment) return;
    setIsVerifying(true);
    try {
      const res = await apiService.verifyManualPayment(verifyModalPayment.id);
      if (res && res.success) {
        showToast('Payment verified successfully! Property moved to Pending Approvals.', 'success');
        if (res.property) {
          updateProperty(res.property.id, res.property);
        }
        await fetchManualPayments();
        await fetchLivePayments();
        setVerifyModalPayment(null);
      } else {
        showToast(res?.message || 'Verification failed', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Verification failed. Bank record check required.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmRejectPayment = async () => {
    if (!rejectPaymentModal) return;
    if (!rejectPaymentReason.trim()) {
      showToast('A rejection reason is required so the dealer can correct their payment submission.', 'error');
      return;
    }
    setIsRejecting(true);
    try {
      const res = await apiService.rejectManualPayment(rejectPaymentModal.id, rejectPaymentReason.trim());
      if (res && res.success) {
        showToast('Payment submission rejected. Dealer notified to resubmit.', 'warning');
        if (res.property) {
          updateProperty(res.property.id, res.property);
        }
        await fetchManualPayments();
        await fetchLivePayments();
        setRejectPaymentModal(null);
        setRejectPaymentReason('');
      } else {
        showToast(res?.message || 'Rejection failed', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Rejection failed', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // CRM notes editing state
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // Rejection Modal state (Property content rejection)
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingPropertyId, setRejectingPropertyId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<AdminSettings>(settings);

  // Filter customers from all users
  const customers = (allUsers || []).filter((u: User) => u.role === 'customer');

  // KPI Calculations
  const pendingManualPayments = manualPayments.filter(
    (p: Payment) => p.status === 'submitted' || p.status === 'pending'
  );
  const totalProperties = properties.filter((p: Property) => p.status !== 'archived').length;
  const pendingProperties = properties.filter((p: Property) => p.status === 'pending_approval');
  const activeProperties = properties.filter((p: Property) => p.status === 'available').length;
  const totalEnquiries = enquiries.length;
  const pendingDealers = dealers.filter((d: User) => d.dealerStatus === 'pending');
  const totalRevenue = payments.reduce((acc: number, p: Payment) => p.status === 'success' ? acc + p.amount : acc, 0);
  const unreadNotificationsCount = (notifications || []).filter((n: AppNotification) => !n.isRead).length;

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsForm);
  };

  const handleOpenReject = (propId: string) => {
    setRejectingPropertyId(propId);
    setRejectionReason('Incomplete document proofs or improper property title description.');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (rejectingPropertyId) {
      rejectProperty(rejectingPropertyId, rejectionReason);
      setRejectModalOpen(false);
      setRejectingPropertyId(null);
    }
  };

  const handleSaveNotes = (enquiryId: string, currentStatus: EnquiryStatus) => {
    const notes = editingNotes[enquiryId];
    if (notes !== undefined) {
      updateEnquiryStatus(enquiryId, currentStatus, notes);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Admin Top Header */}
      <div className="bg-gradient-to-r from-brand-950 via-[#04281d] to-[#01140e] text-white rounded-3xl p-6 sm:p-8 shadow-premium border border-champagne-400/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-800/80 border border-champagne-400/40 text-champagne-300 flex items-center justify-center shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">SPP Nestora Admin Command Center</h1>
              <span className="bg-champagne-400/20 text-champagne-300 border border-champagne-400/30 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-champagne-200/80 mt-0.5">
              Tamil Nadu Real Estate Operations • Centralized Enquiry Desk • Official: {settings.officialPhoneDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications Trigger */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2.5 bg-white/10 hover:bg-white/20 border border-champagne-400/30 rounded-xl text-white transition cursor-pointer"
            title="Admin Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-900">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-champagne-400/30 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer text-white"
          >
            <Settings className="w-4 h-4 text-champagne-300" />
            <span>Contact Settings</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-champagne-200/80 scrollbar-thin">
        {[
          { id: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
          { id: 'manual_payments', label: `Manual UPI (${pendingManualPayments.length})`, icon: <QrCode className="w-4 h-4" />, badge: pendingManualPayments.length > 0 },
          { id: 'pending', label: `Pending Approvals (${pendingProperties.length})`, icon: <Clock className="w-4 h-4" />, badge: pendingProperties.length > 0 },
          { id: 'properties', label: `All Properties (${totalProperties})`, icon: <Building2 className="w-4 h-4" /> },
          { id: 'customers', label: `Customers (${customers.length})`, icon: <UserCheck className="w-4 h-4" /> },
          { id: 'dealers', label: `Dealers (${dealers.length})`, icon: <Users className="w-4 h-4" />, badge: pendingDealers.length > 0 },
          { id: 'enquiries', label: `Enquiries CRM (${totalEnquiries})`, icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'visits', label: `Site Visits (${siteVisits.length})`, icon: <Calendar className="w-4 h-4" /> },
          { id: 'payments', label: `Revenue (₹${totalRevenue})`, icon: <IndianRupee className="w-4 h-4" /> },
          { id: 'settings', label: 'Platform Config', icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeSection === tab.id
                ? 'bg-brand-900 text-white shadow-gold border border-champagne-400/30'
                : 'bg-white text-slate-600 hover:bg-ivory-100 border border-champagne-200/70'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        ))}
      </div>

      {/* SECTION 1: OVERVIEW & ANALYTICS */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
              <span className="text-xs text-slate-400 font-bold uppercase block">Total Revenue</span>
              <span className="text-2xl font-black text-brand-900 mt-1 block">₹{totalRevenue}</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">From ₹10 Listing Fees</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
              <span className="text-xs text-slate-400 font-bold uppercase block">Active Listings</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{activeProperties}</span>
              <span className="text-[11px] text-slate-400 block">{pendingProperties.length} pending review</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
              <span className="text-xs text-slate-400 font-bold uppercase block">Total Enquiries</span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{totalEnquiries}</span>
              <span className="text-[11px] text-slate-400 block">Direct via Call/WhatsApp/Form</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
              <span className="text-xs text-slate-400 font-bold uppercase block">Registered Users</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{(allUsers || []).length}</span>
              <span className="text-[11px] text-brand-700 font-semibold block">{customers.length} Customers • {dealers.length} Dealers</span>
            </div>
          </div>

          {/* Pending Action Alerts */}
          {pendingManualPayments.length > 0 && (
            <div className="bg-brand-50 border border-brand-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <QrCode className="w-7 h-7 text-brand-900 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {pendingManualPayments.length} Manual UPI Payment(s) Awaiting Bank Verification
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Dealers have submitted ₹10 UPI payment proofs with UTR references. Verify against your bank statement before approving.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('manual_payments')}
                className="px-4 py-2 bg-brand-900 hover:bg-brand-950 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center justify-center space-x-1.5 self-start sm:self-auto"
              >
                <span>Verify Payments Now</span>
              </button>
            </div>
          )}

          {pendingProperties.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {pendingProperties.length} Property Listing(s) Awaiting Final Content Review
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Listing fee is already verified. Review property details, photos, and legal disclosures before publishing live.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('pending')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer self-start sm:self-auto"
              >
                Review Listings Now
              </button>
            </div>
          )}

          {/* Quick Enquiries Preview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Recent Customer Enquiries (CRM)</h3>
              <button
                onClick={() => setActiveSection('enquiries')}
                className="text-xs font-bold text-brand-700 hover:underline cursor-pointer"
              >
                View CRM Desk ({enquiries.length})
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {enquiries.slice(0, 3).map((enq: Enquiry) => (
                <div key={enq.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-brand-800">{enq.propertyCode || enq.id}</span>
                      <span className="font-bold text-slate-900">{enq.customerName} ({enq.customerPhone})</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">{enq.message}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded font-bold uppercase text-[10px]">
                      {enq.status.replace('_', ' ')}
                    </span>
                    <a
                      href={`tel:${enq.customerPhone}`}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg"
                      title="Call Customer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* SECTION: MANUAL UPI PAYMENTS VERIFICATION */}
      {activeSection === 'manual_payments' && (
        <div className="space-y-6">
          
          {/* Header & Bank Verification Mandatory Warning */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-900 flex items-center justify-center">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-900">Manual UPI Payments Desk</h2>
                    <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border border-emerald-300">
                      ₹10 Fixed Fee
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official QR Account: <span className="font-mono font-bold text-brand-900">{settings.officialUpiId || 'summada700-4@okaxis'}</span> • Reconcile dealer UTRs against bank records
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchManualPayments}
                  disabled={loadingManualPayments}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingManualPayments ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Strict Admin Advisory Notice */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300/80 flex items-start space-x-3 text-xs text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="block font-bold">Important Security & Compliance Rule:</strong>
                <p>
                  You must check your UPI merchant app / bank transaction history to confirm that <strong>₹10.00</strong> was received from the specified UTR reference. Dealer-submitted details and screenshots are unverified evidence — <strong>a screenshot alone is insufficient</strong>.
                </p>
                <p className="text-amber-800 text-[11px]">
                  Verifying a payment automatically moves the property to <strong>Pending Approvals</strong>. A separate listing approval action is required before the property becomes publicly visible.
                </p>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setManualPaymentTab('pending')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  manualPaymentTab === 'pending'
                    ? 'bg-brand-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Pending Submissions</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  manualPaymentTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {pendingManualPayments.length}
                </span>
              </button>

              <button
                onClick={() => setManualPaymentTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                  manualPaymentTab === 'history'
                    ? 'bg-brand-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>Verification & Rejection History</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  manualPaymentTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {manualPayments.filter(p => p.status === 'success' || p.status === 'failed' || p.status === 'rejected').length}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: PENDING MANUAL PAYMENTS */}
          {manualPaymentTab === 'pending' && (
            <div className="space-y-4">
              {pendingManualPayments.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500 text-sm space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-slate-800 text-base">No Pending UPI Submissions</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    All dealer ₹10 UPI payment submissions have been reviewed and reconciled.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {pendingManualPayments.map((p: Payment) => {
                    const prop = properties.find(pr => pr.id === p.propertyId);
                    const utr = p.utr || p.transactionRef || '';

                    return (
                      <div key={p.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-subtle space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                          
                          {/* Left: Property & Dealer Context */}
                          <div className="space-y-2.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-xs bg-brand-50 text-brand-900 border border-brand-200 px-2 py-0.5 rounded">
                                {prop?.propertyCode || p.propertyId}
                              </span>
                              <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] uppercase px-2 py-0.5 rounded flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Awaiting Bank Verification</span>
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Submitted: {p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN') : 'Recent'}
                              </span>
                            </div>

                            <h3 className="font-bold text-slate-900 text-base">
                              {p.propertyTitle || prop?.title || 'Property Listing Submission'}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Dealer Account</span>
                                <span className="font-bold text-slate-900">{p.dealerName}</span>
                                <span className="text-slate-500 font-mono text-[11px] block">ID: {p.dealerId}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Expected Listing Fee</span>
                                <span className="text-base font-black text-emerald-800">₹{p.amount}.00</span>
                                <span className="text-slate-400 text-[10px] block">Server-enforced flat fee</span>
                              </div>
                            </div>

                            {/* UTR Reference Box with Copy */}
                            <div className="p-3 bg-brand-50/60 border border-brand-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] uppercase font-extrabold text-brand-900 block">
                                  Submitted UPI Reference / UTR Number:
                                </span>
                                <span className="font-mono text-base font-black text-brand-950 tracking-wider">
                                  {utr || 'NOT_PROVIDED'}
                                </span>
                              </div>

                              {utr && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyUtr(utr)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-brand-900 border border-brand-300 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
                                >
                                  {copiedUtr === utr ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="text-emerald-700">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy UTR</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Right: Payment Screenshot Thumbnail & Action Buttons */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 flex-shrink-0">
                            
                            {/* Screenshot Thumbnail Preview */}
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                                Payment Screenshot
                              </span>
                              {p.screenshotUrl ? (
                                <div
                                  onClick={() => setScreenshotModalUrl(p.screenshotUrl || null)}
                                  className="group relative w-32 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-brand-500 cursor-pointer bg-slate-100 shadow-xs transition"
                                  title="Click to view full screenshot"
                                >
                                  <img
                                    src={p.screenshotUrl}
                                    alt="Payment Screenshot"
                                    className="w-full h-full object-cover group-hover:scale-105 transition"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold space-x-1">
                                    <Eye className="w-4 h-4" />
                                    <span>Zoom</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-32 h-24 rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-2 text-center text-slate-400 text-[10px]">
                                  <span>No image attached</span>
                                  <span className="text-[9px] text-slate-400">(Check UTR directly)</span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons: Verify & Reject */}
                            <div className="space-y-2 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => setVerifyModalPayment(p)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Verify Payment</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectPaymentModal(p);
                                  setRejectPaymentReason('');
                                }}
                                className="w-full sm:w-auto px-5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject Submission</span>
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VERIFICATION & AUDIT HISTORY */}
          {manualPaymentTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">UPI Payment Verification & Audit History</h3>
                  <p className="text-xs text-slate-500">Record of verified receipts and rejected submissions</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                    <tr>
                      <th className="p-4">Property Reference</th>
                      <th className="p-4">Dealer</th>
                      <th className="p-4">UTR Number</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Verified By Admin</th>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Reason / Notes</th>
                      <th className="p-4 text-right">Audit Trail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manualPayments
                      .filter(p => p.status === 'success' || p.status === 'failed' || p.status === 'rejected')
                      .map((p: Payment) => {
                        const prop = properties.find(pr => pr.id === p.propertyId);
                        const isSuccess = p.status === 'success';

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/60 transition">
                            <td className="p-4">
                              <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                                {p.propertyTitle || prop?.title || 'Property Listing'}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 block">
                                {prop?.propertyCode || p.propertyId}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-slate-900 block">{p.dealerName}</span>
                              <span className="text-[10px] text-slate-400 block">ID: {p.dealerId}</span>
                            </td>
                            <td className="p-4 font-mono font-bold text-brand-900">
                              {p.utr || p.transactionRef || '—'}
                            </td>
                            <td className="p-4 font-black text-slate-900">
                              ₹{p.amount}.00
                            </td>
                            <td className="p-4">
                              {isSuccess ? (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center space-x-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Verified</span>
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center space-x-1">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Rejected</span>
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-700">
                              {p.verifiedByAdminName ? (
                                <div>
                                  <span className="font-bold block">{p.verifiedByAdminName}</span>
                                  <span className="text-[10px] font-mono text-slate-400">ID: {p.verifiedByAdminId}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-4 text-slate-500 text-[11px]">
                              {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString('en-IN') : p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN') : '—'}
                            </td>
                            <td className="p-4 text-slate-600 text-[11px] max-w-xs">
                              {p.rejectionReason ? (
                                <span className="text-rose-700 font-medium">{p.rejectionReason}</span>
                              ) : (
                                <span className="text-slate-400">₹10 verified & matched bank record</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => setViewingAuditPayment(p)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer"
                              >
                                Audit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                {manualPayments.filter(p => p.status === 'success' || p.status === 'failed' || p.status === 'rejected').length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No verified or rejected manual payment history recorded yet.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* SECTION 2: PENDING APPROVALS */}
      {activeSection === 'pending' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Pending Property Listings Review</h2>
          {pendingProperties.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              All property submissions have been reviewed and approved.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingProperties.map((prop: Property) => {
                const isLand = prop.type === 'land_sale';
                const isRent = prop.type === 'house_rent';

                return (
                  <div key={prop.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-subtle space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      
                      {/* Media & Key Info */}
                      <div className="flex items-start space-x-4">
                        <div className="relative w-28 h-24 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 flex items-center justify-center text-center">
                          {prop.images && prop.images.length > 0 && prop.images[0]?.url ? (
                            <>
                              <img
                                src={prop.images[0].url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                                📷 {prop.images.length}
                              </span>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 p-1">
                              <ImageIcon className="w-6 h-6 text-slate-300 mb-0.5" />
                              <span className="text-[10px] font-medium leading-tight">No photo uploaded</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-brand-50 text-brand-900 border border-brand-200 px-2 py-0.5 rounded">
                              {prop.propertyCode}
                            </span>
                            
                            <span className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                              isLand
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : isRent
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-brand-100 text-brand-900 border border-brand-300'
                            }`}>
                              {isLand ? '🏞️ Land for Sale' : isRent ? '🏘️ House for Rent' : '🏠 House for Sale'}
                            </span>

                            <span className="text-[11px] text-slate-500 font-medium">
                              {prop.district}, Tamil Nadu
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-base leading-snug">{prop.title}</h3>
                          
                          <p className="text-xs text-slate-600 flex items-center">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1 flex-shrink-0" />
                            <span>{prop.address || prop.area}, {prop.city} - {prop.pincode}</span>
                          </p>
                        </div>
                      </div>

                      {/* Pricing & Approve / Reject Action Buttons */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 flex-shrink-0">
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            {isRent ? 'Monthly Rent' : 'Selling Price'}
                          </span>
                          <span className="text-xl font-black text-brand-900">
                            {formatPrice(prop.price, prop.type, language)}
                            {isRent && <span className="text-xs font-semibold text-slate-500"> / mo</span>}
                          </span>
                          {isRent && prop.depositAmount && (
                            <span className="text-xs text-amber-900 font-bold block">
                              Deposit: ₹{prop.depositAmount.toLocaleString('en-IN')}
                            </span>
                          )}
                          {!isRent && prop.pricePerSqft && (
                            <span className="text-xs text-emerald-700 font-bold block">
                              ₹{prop.pricePerSqft.toLocaleString()} / Sq.Ft
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 pt-1">
                          <Link
                            to={`/properties/${prop.id}`}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                            title="Preview Public Listing"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" />
                            <span>View</span>
                          </Link>
                          
                          <button
                            onClick={() => approveProperty(prop.id)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Approve</span>
                          </button>
                          
                          <button
                            onClick={() => handleOpenReject(prop.id)}
                            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Vertical-Specific Technical Specs Row */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      {isLand ? (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Land Area</span>
                            <span className="font-bold text-slate-900">{prop.totalArea ? `${prop.totalArea} ${prop.areaUnit || 'Cent'}` : `${prop.areaSqft} Sq.Ft`}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Land Type</span>
                            <span className="font-bold text-slate-900">{prop.landType || 'Residential Plot'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Road Access</span>
                            <span className="font-bold text-slate-900 capitalize">{prop.roadAccess || 'Available'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">DTCP Status</span>
                            <span className="font-bold text-emerald-700 uppercase">{prop.dtcpStatus || (prop.dtcpApproved ? 'Approved' : 'Unknown')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Patta</span>
                            <span className="font-bold text-slate-900 uppercase">{prop.pattaStatus || (prop.pattaAvailable ? 'Yes' : 'Unknown')}</span>
                          </div>
                        </div>
                      ) : isRent ? (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Config / Rooms</span>
                            <span className="font-bold text-slate-900">{prop.bhk ? `${prop.bhk} BHK` : `${prop.bedrooms || 1} Rooms`}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Built-up</span>
                            <span className="font-bold text-slate-900">{prop.builtUpAreaSqft || prop.areaSqft} Sq.Ft</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Furnishing</span>
                            <span className="font-bold text-slate-900 capitalize">{prop.furnishing || 'Semi-Furnished'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Suitable For</span>
                            <span className="font-bold text-slate-900 truncate block">{Array.isArray(prop.suitableFor) ? prop.suitableFor.join(', ') : (prop.suitableFor || 'Family')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Available From</span>
                            <span className="font-bold text-slate-900">{prop.availableFrom || 'Immediately'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Configuration</span>
                            <span className="font-bold text-slate-900">{prop.bhk ? `${prop.bhk} BHK` : `${prop.bedrooms || 2} BHK`} ({prop.bathrooms || 2} Bath)</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Built-up Area</span>
                            <span className="font-bold text-slate-900">{prop.builtUpAreaSqft || prop.areaSqft} Sq.Ft</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">House Type</span>
                            <span className="font-bold text-slate-900">{prop.houseType || 'Independent House'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Furnishing</span>
                            <span className="font-bold text-slate-900 capitalize">{prop.furnishing || 'Semi-Furnished'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold uppercase">Age / Parking</span>
                            <span className="font-bold text-slate-900">{prop.propertyAge || '1-3 Yrs'} • {prop.parking || 'Both'}</span>
                          </div>
                        </div>
                      )}

                      {/* Description & Dealer Footer */}
                      <div className="pt-2.5 mt-2.5 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600">
                        <div className="truncate max-w-xl">
                          <strong className="text-slate-800">Description:</strong> {prop.description || 'No description provided.'}
                        </div>
                        <div className="text-slate-500 flex-shrink-0">
                          <strong className="text-slate-700">Submitted by:</strong> {prop.dealerName} (ID: <span className="font-mono">{prop.dealerId}</span>)
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: ALL PROPERTIES */}
      {activeSection === 'properties' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All Database Properties ({properties.length})</h2>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-subtle">
            <div className="divide-y divide-slate-100">
              {properties.map((prop: Property) => (
                <div key={prop.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-center flex-shrink-0">
                      {prop.images && prop.images.length > 0 && prop.images[0]?.url ? (
                        <img
                          src={prop.images[0].url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[9px] text-slate-400 font-medium leading-tight">No photo</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-800">{prop.propertyCode}</span>
                        <span className="capitalize font-bold text-slate-500">({prop.status.replace('_', ' ')})</span>
                      </div>
                      <h4 className="font-bold text-slate-900">{prop.title}</h4>
                      <p className="text-slate-500">{prop.district} • {formatPrice(prop.price, prop.type, language)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/properties/${prop.id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => deleteProperty(prop.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Archive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: CUSTOMER REGISTRATIONS */}
      {activeSection === 'customers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Registered Customers ({customers.length})</h2>
          </div>
          
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-subtle">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">User ID</th>
                    <th className="px-5 py-3.5">Full Name</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Mobile</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Registration Date</th>
                    <th className="px-5 py-3.5">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((cust: User) => (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{cust.id}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center space-x-2">
                        <img
                          src={cust.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${cust.name}`}
                          alt=""
                          className="w-7 h-7 rounded-full bg-slate-200"
                        />
                        <span>{cust.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{cust.email}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-700">{cust.phone || '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-bold uppercase text-[10px]">
                          {cust.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {cust.createdAt ? new Date(cust.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] uppercase">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                        No customer registrations recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: DEALERS MANAGEMENT */}
      {activeSection === 'dealers' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Registered Property Dealers ({dealers.length})</h2>
          
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-subtle divide-y divide-slate-100">
            {dealers.map((dealer: User) => {
              const dealerPropsCount = properties.filter((p: Property) => p.dealerId === dealer.id).length;
              return (
                <div key={dealer.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <img
                      src={dealer.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${dealer.name}`}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover bg-slate-200"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-brand-900 bg-brand-50 px-2 py-0.5 rounded">{dealer.id}</span>
                        <h4 className="font-bold text-sm text-slate-900">{dealer.businessName || dealer.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Contact Person: {dealer.name} • {dealer.email}</p>
                      <p className="text-xs text-slate-500 font-mono">Mobile: {dealer.phone} • District: {dealer.district || 'Tamil Nadu'} • Properties: {dealerPropsCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                      dealer.dealerStatus === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {dealer.dealerStatus || 'pending'}
                    </span>

                    {dealer.dealerStatus !== 'verified' && (
                      <button
                        onClick={() => updateDealerStatus(dealer.id, 'verified')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Approve Dealer
                      </button>
                    )}

                    {dealer.dealerStatus === 'verified' && (
                      <button
                        onClick={() => updateDealerStatus(dealer.id, 'suspended', 'Suspended by admin')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 6: ENQUIRIES CRM */}
      {activeSection === 'enquiries' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Enquiries CRM & Lead Coordination Desk ({enquiries.length})</h2>
          <div className="space-y-4">
            {enquiries.map((enq: Enquiry) => (
              <div key={enq.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs bg-brand-50 text-brand-900 px-2 py-0.5 rounded">
                        Enquiry ID: {enq.id}
                      </span>
                      {enq.propertyCode && (
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          Prop: {enq.propertyCode}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-700">{enq.propertyTitle || 'General Enquiry'}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Customer: <strong className="text-slate-900">{enq.customerName}</strong> • Phone: <strong className="text-brand-900">{enq.customerPhone}</strong> • Email: {enq.customerEmail || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Submitted: {enq.createdAt ? new Date(enq.createdAt).toLocaleString('en-IN') : 'Recent'} • Source: {enq.channel || 'website'}
                    </p>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={enq.status}
                      onChange={(e) => updateEnquiryStatus(enq.id, e.target.value as EnquiryStatus)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 outline-hidden cursor-pointer"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="site_visit_scheduled">Site Visit Scheduled</option>
                      <option value="completed">Completed / Deal Closed</option>
                      <option value="closed">Closed</option>
                    </select>

                    <a
                      href={`tel:${enq.customerPhone}`}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg"
                      title="Call Customer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <p><strong>Customer Requirement / Message:</strong> {enq.message}</p>
                  {enq.preferredTime && <p><strong>Preferred Slot:</strong> {enq.preferredTime}</p>}
                </div>

                {/* Internal Admin Notes */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add internal CRM notes (e.g. Called customer, interested in 3BHK visit)..."
                    value={editingNotes[enq.id] !== undefined ? editingNotes[enq.id] : (enq.adminNotes || '')}
                    onChange={(e) => setEditingNotes({ ...editingNotes, [enq.id]: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-hidden bg-white"
                  />
                  <button
                    onClick={() => handleSaveNotes(enq.id, enq.status)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </div>
            ))}
            {enquiries.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                No customer enquiries recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 7: PLATFORM & CONTACT SETTINGS */}
      {activeSection === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-2xl shadow-subtle">
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">SPP Nestora Official Settings</h2>
              <p className="text-xs text-slate-500">These contact numbers dynamically power all Call & WhatsApp buttons.</p>
            </div>
          </div>

          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Phone Number (Display Format) *
              </label>
              <input
                type="text"
                required
                value={settingsForm.officialPhoneDisplay}
                onChange={(e) => setSettingsForm({ ...settingsForm, officialPhoneDisplay: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official WhatsApp Number (With Country Code, e.g. 919715673055) *
              </label>
              <input
                type="text"
                required
                value={settingsForm.officialWhatsApp}
                onChange={(e) => setSettingsForm({ ...settingsForm, officialWhatsApp: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Admin Notification Email *
              </label>
              <input
                type="email"
                required
                value={settingsForm.officialEmail}
                onChange={(e) => setSettingsForm({ ...settingsForm, officialEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dealer Property Listing Fee Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={settingsForm.listingFeeAmount}
                onChange={(e) => setSettingsForm({ ...settingsForm, listingFeeAmount: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden font-bold text-brand-900"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="py-3 px-6 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Platform Settings</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* SECTION 8: REVENUE & PAYMENTS DASHBOARD */}
      {activeSection === 'payments' && (
        <div className="space-y-6">
          {/* Header & KPI Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Admin Payments Dashboard</h2>
                  <p className="text-xs text-slate-500">Official ₹10 listing fees, UPI bank reconciliations & payment audit logs</p>
                </div>
              </div>

              <button
                onClick={fetchLivePayments}
                disabled={loadingPayments}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments ? 'animate-spin' : ''}`} />
                <span>Refresh Payments</span>
              </button>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/60">
                <span className="text-[10px] font-bold uppercase text-emerald-800">Total Captured</span>
                <span className="text-xl font-black text-emerald-950 block mt-1">
                  ₹{livePayments.filter(p => p.status === 'success').reduce((acc, p) => acc + p.amount, 0)}.00
                </span>
                <span className="text-[10px] text-emerald-700">
                  {livePayments.filter(p => p.status === 'success').length} transactions
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/60">
                <span className="text-[10px] font-bold uppercase text-amber-800">Pending Verification</span>
                <span className="text-xl font-black text-amber-950 block mt-1">
                  {livePayments.filter(p => p.status === 'pending').length}
                </span>
                <span className="text-[10px] text-amber-700">Awaiting capture/webhook</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/60">
                <span className="text-[10px] font-bold uppercase text-rose-800">Failed / Dropped</span>
                <span className="text-xl font-black text-rose-950 block mt-1">
                  {livePayments.filter(p => p.status === 'failed').length}
                </span>
                <span className="text-[10px] text-rose-700">Can be retried by dealer</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-[10px] font-bold uppercase text-slate-600">Fixed Listing Fee</span>
                <span className="text-xl font-black text-brand-900 block mt-1">₹10.00</span>
                <span className="text-[10px] text-slate-500">Authoritative server fee</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500 flex items-center mr-2">
                <Filter className="w-3.5 h-3.5 mr-1" />
                Filter:
              </span>
              {(['all', 'success', 'pending', 'failed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPaymentFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                    paymentFilter === f
                      ? 'bg-brand-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {f === 'all' ? `All (${livePayments.length})` : `${f} (${livePayments.filter(p => p.status === f).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions List Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Listing Reference</th>
                    <th className="p-4">Dealer Account</th>
                    <th className="p-4">Expected Fee</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Payment / UTR Reference</th>
                    <th className="p-4">Verification Method</th>
                    <th className="p-4">Payment Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {livePayments
                    .filter(p => paymentFilter === 'all' ? true : p.status === paymentFilter)
                    .map(p => {
                      const prop = properties.find(pr => pr.id === p.propertyId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                              {p.propertyTitle || prop?.title || 'Property Listing'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 block">
                              {prop?.propertyCode || p.propertyId}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block">{p.dealerName}</span>
                            <span className="text-[10px] text-slate-500 block">ID: {p.dealerId}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-black text-brand-900 text-sm">
                              ₹{p.amount}.00
                            </span>
                            <span className="text-[10px] text-slate-400 block">{p.currency || 'INR'}</span>
                          </td>
                          <td className="p-4">
                            {p.status === 'success' && (
                              <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Captured</span>
                              </span>
                            )}
                            {p.status === 'pending' && (
                              <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pending</span>
                              </span>
                            )}
                            {p.status === 'failed' && (
                              <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-full text-[10px] inline-flex items-center space-x-1">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Failed</span>
                              </span>
                            )}
                            {p.status === 'refunded' && (
                              <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full text-[10px]">
                                Refunded
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-[11px]">
                            {p.paymentId ? (
                              <span className="text-brand-900 font-bold block">{p.paymentId}</span>
                            ) : p.transactionRef ? (
                              <span className="text-slate-700 block">{p.transactionRef}</span>
                            ) : (
                              <span className="text-slate-400 block">—</span>
                            )}
                            {p.orderId && (
                              <span className="text-[10px] text-slate-400 block">Order: {p.orderId}</span>
                            )}
                          </td>
                          <td className="p-4 text-[10px]">
                            {p.verificationMethod === 'manual_upi_verification' && (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded block text-center">
                                Manual UPI Verified
                              </span>
                            )}
                            {p.verificationMethod === 'razorpay_signature' && (
                              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded block text-center">
                                Checkout (HMAC)
                              </span>
                            )}
                            {p.verificationMethod === 'razorpay_webhook' && (
                              <span className="bg-blue-50 text-blue-800 border border-blue-200 font-bold px-2 py-0.5 rounded block text-center">
                                Webhook Captured
                              </span>
                            )}
                            {p.verificationMethod === 'sandbox_simulation' && (
                              <span className="bg-purple-50 text-purple-800 border border-purple-200 font-bold px-2 py-0.5 rounded block text-center">
                                Sandbox Sim
                              </span>
                            )}
                            {!p.verificationMethod && (
                              <span className="text-slate-400">Standard</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-500 text-[11px]">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            <span className="block text-[10px] text-slate-400">
                              {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setViewingAuditPayment(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] cursor-pointer"
                              title="View Audit Trail"
                            >
                              Audit Trail
                            </button>
                            <button
                              onClick={() => setSelectedInvoice(p)}
                              className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-900 rounded-lg font-bold text-[11px] cursor-pointer"
                            >
                              Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {livePayments.filter(p => paymentFilter === 'all' ? true : p.status === paymentFilter).length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No payment records found matching "{paymentFilter}" filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {viewingAuditPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-elevated">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-brand-900" />
                <h3 className="font-bold text-base text-slate-900">Payment Audit Trail</h3>
              </div>
              <button
                onClick={() => setViewingAuditPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt / Ref:</span>
                <span className="font-mono font-bold text-slate-900">{viewingAuditPayment.receiptNumber || viewingAuditPayment.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dealer:</span>
                <span className="font-bold text-slate-900">{viewingAuditPayment.dealerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Property:</span>
                <span className="font-bold text-slate-900 truncate max-w-[200px]">{viewingAuditPayment.propertyTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold capitalize text-brand-900">{viewingAuditPayment.status}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chronological Events</h4>
              {(viewingAuditPayment.auditLog && viewingAuditPayment.auditLog.length > 0) ? (
                <div className="space-y-2">
                  {viewingAuditPayment.auditLog.map((log, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-600 font-mono">{log.details}</p>
                      )}
                      {log.source && (
                        <span className="inline-block text-[9px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Source: {log.source}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                  Initial verification record created on {new Date(viewingAuditPayment.createdAt).toLocaleString()}.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingAuditPayment(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-brand-900" />
                <h3 className="font-bold text-base text-slate-900">Admin Live Notifications</h3>
              </div>
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 space-y-2 pr-1">
              {(notifications || []).map((notif: AppNotification) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3 rounded-xl transition cursor-pointer ${
                    notif.isRead ? 'bg-slate-50 text-slate-600' : 'bg-emerald-50/70 border border-emerald-200/60 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs">{notif.title}</h4>
                    <span className="text-[10px] text-slate-400">
                      {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                </div>
              ))}
              {(notifications || []).length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">No notifications received yet.</p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowNotificationsModal(false)}
                className="px-4 py-2 bg-brand-900 hover:bg-brand-950 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Specify Rejection Reason</h3>
            <p className="text-xs text-slate-500">
              This message will be shown to the dealer so they can modify their listing data and resubmit.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-xs outline-hidden"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screenshot Preview Modal */}
      {screenshotModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-elevated flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-brand-900" />
                <h3 className="font-bold text-base text-slate-900">Dealer Payment Screenshot Proof</h3>
              </div>
              <button
                onClick={() => setScreenshotModalUrl(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
              ⚠️ <strong>Notice:</strong> Screenshots can be digitally altered. Always cross-verify the UTR against your bank or UPI app transaction history.
            </div>

            <div className="flex-1 overflow-auto rounded-2xl bg-slate-100 p-2 flex items-center justify-center">
              <img
                src={screenshotModalUrl}
                alt="Payment proof screenshot"
                className="max-h-[60vh] w-auto object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setScreenshotModalUrl(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Verification Confirmation Modal */}
      {verifyModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-elevated">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Confirm Bank Verification</h3>
                <p className="text-xs text-slate-500">Property: {verifyModalPayment.propertyTitle}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Dealer:</span>
                <span className="font-bold text-slate-900">{verifyModalPayment.dealerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fixed Fee:</span>
                <span className="font-black text-emerald-800 text-sm">₹{verifyModalPayment.amount}.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Dealer Submitted UTR:</span>
                <span className="font-mono font-black text-brand-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-200">
                  {verifyModalPayment.utr || verifyModalPayment.transactionRef}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <strong>Checklist:</strong>
              <p>1. Have you checked your bank or UPI merchant app statement?</p>
              <p>2. Does the ₹10 credit match this UTR number?</p>
              <p className="text-[11px] text-amber-800 pt-1">
                Upon confirmation, this listing fee is marked verified and the property moves to <strong>Pending Approvals</strong>. The property will NOT be publicly published until you complete the final listing content review.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => setVerifyModalPayment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleConfirmVerifyPayment}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Yes, I Verified Bank UTR</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Rejection Modal */}
      {rejectPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-elevated">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Reject Payment Submission</h3>
                <p className="text-xs text-slate-500">UTR: {rejectPaymentModal.utr || rejectPaymentModal.transactionRef}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              A rejection reason is <strong>mandatory</strong>. The dealer will see this message on their dashboard and can correct their UTR reference or screenshot and resubmit.
            </p>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Quick Reason Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'UTR number not found in bank or UPI statement.',
                  'Payment amount is less than ₹10.',
                  'UTR reference is invalid or unreadable.',
                  'Duplicate transaction reference already used.'
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectPaymentReason(preset)}
                    className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-left cursor-pointer transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                required
                value={rejectPaymentReason}
                onChange={(e) => setRejectPaymentReason(e.target.value)}
                placeholder="State clearly why this payment proof was rejected..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => {
                  setRejectPaymentModal(null);
                  setRejectPaymentReason('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting || !rejectPaymentReason.trim()}
                onClick={handleConfirmRejectPayment}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
              >
                {isRejecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {selectedInvoice && (
        <InvoiceModal
          payment={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

    </div>
  );
};
