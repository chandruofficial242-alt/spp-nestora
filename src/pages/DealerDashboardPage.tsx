import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Property, Payment } from '../types';
import { InvoiceModal } from '../components/dealer/InvoiceModal';
import { formatPrice } from '../utils/formatters';
import { apiService } from '../services/api';
import { 
  Building2, 
  PlusCircle, 
  Eye, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  FileText,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';

export const DealerDashboardPage: React.FC = () => {
  const { 
    language, 
    t, 
    currentUser, 
    properties, 
    payments, 
    changePropertyStatus, 
    deleteProperty,
    updateProperty,
    showToast,
    settings
  } = useApp();

  const [activeTab, setActiveTab] = useState<'listings' | 'payments' | 'profile'>('listings');
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);

  // Manual UPI Resubmission Modal State
  const [resubmitModalProp, setResubmitModalProp] = useState<Property | null>(null);
  const [utrInput, setUtrInput] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Filter listings belonging to this dealer
  const dealerId = currentUser?.id || 'dealer-01';
  const myListings = properties.filter((p: Property) => p.dealerId === dealerId && p.status !== 'archived');
  const myPayments = payments.filter((p: Payment) => p.dealerId === dealerId);

  // KPI Calculations
  const activeCount = myListings.filter((p: Property) => p.status === 'available').length;
  const soldCount = myListings.filter((p: Property) => p.status === 'sold').length;
  const rentedCount = myListings.filter((p: Property) => p.status === 'rented').length;
  const pendingCount = myListings.filter((p: Property) => p.status === 'pending_approval').length;
  const underVerificationCount = myListings.filter((p: Property) => p.status === 'payment_submitted').length;
  const rejectedCount = myListings.filter((p: Property) => p.status === 'payment_rejected').length;
  const totalFeesPaid = myPayments.reduce((acc: number, p: Payment) => p.status === 'success' ? acc + p.amount : acc, 0);

  const handleCopyUpiId = () => {
    const upi = settings.officialUpiId || 'summada700-4@okaxis';
    navigator.clipboard.writeText(upi);
    setCopiedUpi(true);
    showToast('UPI ID copied to clipboard', 'info');
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleOpenPaymentModal = (prop: Property) => {
    setResubmitModalProp(prop);
    setUtrInput(prop.paymentUtr || '');
    setScreenshotPreview(prop.paymentScreenshotUrl || null);
    setConfirmChecked(false);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file (PNG, JPG, or WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Screenshot file size must be less than 5 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resubmitModalProp) return;

    const trimmedUtr = utrInput.trim();
    if (trimmedUtr.length < 6 || trimmedUtr.length > 30) {
      showToast('Please enter a valid UPI Transaction ID / UTR (6-30 alphanumeric characters).', 'error');
      return;
    }

    if (!confirmChecked) {
      showToast('You must confirm that the ₹10 payment was made.', 'error');
      return;
    }

    setIsSubmittingProof(true);
    try {
      const res = await apiService.submitManualPayment({
        propertyId: resubmitModalProp.id,
        amount: 10,
        utr: trimmedUtr,
        screenshotUrl: screenshotPreview || undefined,
        confirmed: true
      });

      if (res && res.success) {
        showToast('Payment details submitted successfully! Awaiting admin verification.', 'success');
        updateProperty(resubmitModalProp.id, {
          status: 'payment_submitted',
          paymentUtr: trimmedUtr,
          paymentScreenshotUrl: screenshotPreview || undefined,
          paymentSubmittedAt: new Date().toISOString(),
          paymentRejectionReason: undefined
        });
        setResubmitModalProp(null);
      } else {
        showToast(res?.message || 'Submission failed. Please check the UTR number.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to submit payment details.', 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Dealer Header */}
      <div className="bg-gradient-to-r from-brand-950 via-[#04281d] to-[#01140e] text-white rounded-3xl p-6 sm:p-8 shadow-premium border border-champagne-400/25 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-800/80 border border-champagne-400/40 text-champagne-300 flex items-center justify-center text-2xl font-black shadow-md">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">
                {currentUser?.businessName || currentUser?.name || 'Authorized Dealer'}
              </h1>
              {currentUser?.dealerStatus === 'verified' ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Dealer</span>
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Pending Admin Review</span>
                </span>
              )}
            </div>
            <p className="text-xs text-champagne-200/80 mt-0.5">
              {currentUser?.email} • {currentUser?.district || 'Tamil Nadu'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/dealer/add-property"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-brand-700 to-brand-800 hover:from-brand-600 hover:to-brand-700 text-white border border-champagne-400/30 rounded-xl text-xs sm:text-sm font-bold shadow-gold transition"
          >
            <PlusCircle className="w-4 h-4 text-champagne-300" />
            <span>{t.nav.addProperty}</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.totalProperties}</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{myListings.length}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.activeListings}</span>
          <span className="text-2xl font-black text-brand-900 mt-1 block">{activeCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.soldProperties}</span>
          <span className="text-2xl font-black text-slate-700 mt-1 block">{soldCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.rentedProperties}</span>
          <span className="text-2xl font-black text-slate-700 mt-1 block">{rentedCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.pendingApproval}</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{pendingCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition">
          <span className="text-[11px] text-slate-400 font-bold uppercase">Listing Fees Paid</span>
          <span className="text-2xl font-black text-brand-900 mt-1 block">₹{totalFeesPaid}</span>
        </div>

      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 border-b border-champagne-200/80 pb-2">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'listings' ? 'bg-brand-900 text-white shadow-gold' : 'bg-white text-slate-600 hover:bg-ivory-100 border border-champagne-200/60'
          }`}
        >
          {t.dashboard.myListings} ({myListings.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'payments' ? 'bg-brand-900 text-white shadow-gold' : 'bg-white text-slate-600 hover:bg-ivory-100 border border-champagne-200/60'
          }`}
        >
          {t.dashboard.payments} ({myPayments.length})
        </button>
      </div>

      {/* TAB 1: MY LISTINGS TABLE / CARDS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          
          {/* Rejection Alert Banner */}
          {rejectedCount > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-2xs">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div>
                  <strong className="block font-bold">Action Required: {rejectedCount} Payment Proof(s) Rejected by Admin</strong>
                  <p className="text-rose-700 text-[11px] mt-0.5">
                    Your listing fee submission was rejected (e.g. UTR not found in bank records). Please review the reason on the property card below and resubmit your payment details.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Under Verification Banner */}
          {underVerificationCount > 0 && (
            <div className="p-4 bg-brand-50/80 border border-brand-200 rounded-2xl flex items-center space-x-3 text-xs text-brand-950 shadow-2xs">
              <Clock className="w-5 h-5 text-brand-700 flex-shrink-0" />
              <div>
                <strong className="block font-bold">{underVerificationCount} Payment Proof(s) Under Bank Verification</strong>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Our team is cross-checking your ₹10 payment against our bank records. Your property will proceed to listing review once verified.
                </p>
              </div>
            </div>
          )}

          {myListings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800">No properties posted yet</h3>
              <p className="text-xs text-slate-500">Post your first property listing for a flat ₹10 fee.</p>
              <Link
                to="/dealer/add-property"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-800 text-white rounded-xl text-xs font-bold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add First Property</span>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-subtle overflow-hidden">
              <div className="divide-y divide-slate-100">
                {myListings.map((prop: Property) => {
                  const hasCover = Boolean(prop.images && prop.images.length > 0 && prop.images[0]?.url);
                  const cover = hasCover ? prop.images[0].url : '';
                  
                  return (
                    <div key={prop.id} className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-4 hover:bg-slate-50/50 transition">
                      
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 flex items-center justify-center text-center p-1">
                          {hasCover ? (
                            <img src={cover} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <ImageIcon className="w-5 h-5 text-slate-300 mb-0.5" />
                              <span className="text-[9px] font-medium leading-tight">No photo</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {prop.propertyCode}
                            </span>
                            
                            {prop.status === 'pending_payment' && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Listing Fee Pending (₹10)</span>
                              </span>
                            )}
                            {prop.status === 'payment_submitted' && (
                              <span className="text-[10px] font-bold bg-brand-100 text-brand-900 border border-brand-300 px-2 py-0.5 rounded flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-brand-700" />
                                <span>Under Admin Bank Verification</span>
                              </span>
                            )}
                            {prop.status === 'payment_rejected' && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded flex items-center space-x-1">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Payment Proof Rejected</span>
                              </span>
                            )}
                            {prop.status === 'available' && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                Active Live
                              </span>
                            )}
                            {prop.status === 'pending_approval' && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                Fee Verified • Under Listing Review
                              </span>
                            )}
                            {prop.status === 'sold' && (
                              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                Marked as Sold
                              </span>
                            )}
                            {prop.status === 'rented' && (
                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                                Marked as Rented
                              </span>
                            )}
                            {prop.status === 'hidden' && (
                              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                                Hidden
                              </span>
                            )}
                          </div>

                          <Link to={`/properties/${prop.id}`} className="block font-bold text-sm sm:text-base text-slate-900 hover:text-brand-800 transition">
                            {prop.title}
                          </Link>

                          <div className="flex items-center space-x-4 text-xs text-slate-500">
                            <span>{prop.area}, {prop.district}</span>
                            <span>•</span>
                            <span className="font-extrabold text-brand-900">
                              {formatPrice(prop.price, prop.type, language)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>{prop.viewsCount} views</span>
                            </span>
                          </div>

                          {/* Verification Underway Box */}
                          {prop.status === 'payment_submitted' && (
                            <div className="p-2.5 bg-brand-50/70 border border-brand-200/80 rounded-xl text-xs space-y-1 mt-1">
                              <div className="flex items-center space-x-2 text-brand-900 font-bold">
                                <Clock className="w-3.5 h-3.5 text-brand-700" />
                                <span>₹10 Payment Proof Submitted</span>
                                {prop.paymentUtr && (
                                  <span className="font-mono text-[11px] bg-white px-1.5 py-0.2 rounded border border-brand-200">
                                    UTR: {prop.paymentUtr}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600">
                                Our admin team is checking your ₹10 payment against bank statements. Once verified, your listing will undergo review and go live.
                              </p>
                            </div>
                          )}

                          {/* Rejection Alert Box */}
                          {prop.status === 'payment_rejected' && (
                            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5 mt-1">
                              <div className="flex items-center space-x-2 text-rose-900 font-bold">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                <span>Payment Submission Rejected by Admin</span>
                              </div>
                              <p className="text-[11px] text-rose-800">
                                <strong>Reason:</strong> {prop.paymentRejectionReason || prop.rejectionReason || 'UTR not found in bank statement or invalid amount.'}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                Please check your UPI app statement, copy the exact 12-digit UTR reference, and click <strong>"Resubmit Payment Proof"</strong> to resubmit.
                              </p>
                            </div>
                          )}

                        </div>
                      </div>

                      {/* Right: Actions Controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex-shrink-0">
                        
                        {(prop.status === 'payment_rejected' || prop.status === 'pending_payment') && (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(prop)}
                            className="px-3 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-300" />
                            <span>{prop.status === 'payment_rejected' ? 'Resubmit Payment Proof' : 'Pay Listing Fee (₹10)'}</span>
                          </button>
                        )}

                        <Link
                          to={`/properties/${prop.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition"
                        >
                          View Public Page
                        </Link>

                        {prop.status === 'available' && (
                          <>
                            {prop.type === 'house_rent' ? (
                              <button
                                onClick={() => changePropertyStatus(prop.id, 'rented')}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-bold transition"
                              >
                                {t.dashboard.markAsRented}
                              </button>
                            ) : (
                              <button
                                onClick={() => changePropertyStatus(prop.id, 'sold')}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition"
                              >
                                {t.dashboard.markAsSold}
                              </button>
                            )}

                            <button
                              onClick={() => changePropertyStatus(prop.id, 'hidden')}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                            >
                              {t.dashboard.hideListing}
                            </button>
                          </>
                        )}

                        {prop.status === 'hidden' && (
                          <button
                            onClick={() => changePropertyStatus(prop.id, 'available')}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition"
                          >
                            {t.dashboard.unhideListing}
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this property?')) {
                              deleteProperty(prop.id);
                            }
                          }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Delete / Archive Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENT INVOICES */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-subtle">
            <h3 className="text-base font-bold text-slate-900 mb-4">Official Listing Fee Payment Invoices</h3>
            <div className="divide-y divide-slate-100">
              {myPayments.map((p: Payment) => (
                <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900">{p.receiptNumber || p.transactionRef}</span>
                    <p className="text-xs text-slate-700 font-bold mt-0.5">{p.propertyTitle}</p>
                    <p className="text-[11px] text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()} • {p.method ? p.method.toUpperCase() : 'UPI'}
                      {p.utr && (
                        <span className="ml-2 font-mono text-brand-900 font-bold bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                          UTR: {p.utr}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-brand-900">₹{p.amount}.00</span>
                    
                    {p.status === 'success' && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    )}
                    {p.status === 'submitted' && (
                      <span className="bg-brand-100 text-brand-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-brand-600" />
                        <span>Under Verification</span>
                      </span>
                    )}
                    {(p.status === 'rejected' || p.status === 'failed') && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center space-x-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Rejected</span>
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedInvoice(p)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              ))}

              {myPayments.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No payment invoices generated yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual UPI Payment Proof Resubmission Modal */}
      {resubmitModalProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-elevated max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-900 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {resubmitModalProp.status === 'payment_rejected' ? 'Resubmit Payment Proof' : 'Submit UPI Listing Fee Proof'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {resubmitModalProp.propertyCode} • {resubmitModalProp.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResubmitModalProp(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Previous Rejection Alert if present */}
            {resubmitModalProp.status === 'payment_rejected' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Previous Rejection Reason</span>
                </div>
                <p className="text-rose-800 text-[11px]">
                  {resubmitModalProp.paymentRejectionReason || resubmitModalProp.rejectionReason || 'UTR reference was not found in bank statement.'}
                </p>
              </div>
            )}

            {/* Official QR Code & UPI ID Display */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-32 h-32 rounded-2xl bg-white p-2 border border-slate-200 shadow-xs flex-shrink-0 flex items-center justify-center">
                <img
                  src="/qr.jpg"
                  alt="Official SPP Nestora UPI QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-2 text-xs flex-1 text-center sm:text-left">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Fixed Listing Fee</span>
                  <span className="text-xl font-black text-brand-900">₹10.00</span>
                  <span className="text-[10px] text-slate-500 block">Per property listing (Server verified)</span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Official UPI ID</span>
                  <div className="inline-flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 font-mono text-xs font-bold text-brand-950">
                    <span>{settings.officialUpiId || 'summada700-4@okaxis'}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="text-brand-700 hover:text-brand-900 p-0.5 cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500">
                  Scan using GPay, PhonePe, Paytm, BHIM, or any UPI app.
                </p>
              </div>
            </div>

            {/* Submission Form */}
            <form onSubmit={handleSubmitProof} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  UPI Transaction ID / UTR Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 428719827364 (12 digits)"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Find the 12-digit UPI reference ID in your bank / UPI payment receipt.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Upload Payment Screenshot (Optional Evidence)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleScreenshotChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-900 hover:file:bg-brand-100 cursor-pointer"
                />

                {screenshotPreview && (
                  <div className="mt-2.5 relative w-28 h-20 rounded-xl overflow-hidden border border-slate-200">
                    <img src={screenshotPreview} alt="Screenshot preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setScreenshotPreview(null)}
                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full text-[10px]"
                      title="Remove image"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Mandatory Confirmation Checkbox */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={confirmChecked}
                    onChange={(e) => setConfirmChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-brand-900 border-slate-300 focus:ring-brand-500"
                  />
                  <span className="font-semibold text-slate-800">
                    I confirm that I have sent exactly ₹10 to the official UPI ID above, and the UTR entered matches my payment transaction.
                  </span>
                </label>
                <p className="text-[11px] text-amber-800">
                  Note: Submitting this proof does not auto-publish your listing. An admin will compare your UTR against actual bank records before approving.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingProof}
                  onClick={() => setResubmitModalProp(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingProof || !confirmChecked || !utrInput.trim()}
                  className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmittingProof ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Proof...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Submit Payment Proof</span>
                    </>
                  )}
                </button>
              </div>

            </form>

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
