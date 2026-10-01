import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Property, Payment } from '../types';
import { InvoiceModal } from '../components/dealer/InvoiceModal';
import { formatPrice } from '../utils/formatters';
import { 
  Building2, 
  PlusCircle, 
  Eye, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  FileText
} from 'lucide-react';

export const DealerDashboardPage: React.FC = () => {
  const { 
    language, 
    t, 
    currentUser, 
    properties, 
    payments, 
    changePropertyStatus, 
    deleteProperty 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'listings' | 'payments' | 'profile'>('listings');
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);

  // Filter listings belonging to this dealer
  const dealerId = currentUser?.id || 'dealer-01';
  const myListings = properties.filter((p: Property) => p.dealerId === dealerId && p.status !== 'archived');
  const myPayments = payments.filter((p: Payment) => p.dealerId === dealerId);

  // KPI Calculations
  const activeCount = myListings.filter((p: Property) => p.status === 'available').length;
  const soldCount = myListings.filter((p: Property) => p.status === 'sold').length;
  const rentedCount = myListings.filter((p: Property) => p.status === 'rented').length;
  const pendingCount = myListings.filter((p: Property) => p.status === 'pending_approval').length;
  const totalFeesPaid = myPayments.reduce((acc: number, p: Payment) => p.status === 'success' ? acc + p.amount : acc, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Dealer Header */}
      <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-navy-950 text-white rounded-3xl p-6 sm:p-8 shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-700/40 border border-brand-500/40 text-emerald-300 flex items-center justify-center text-2xl font-black">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">
                {currentUser?.businessName || currentUser?.name || 'Authorized Dealer'}
              </h1>
              {currentUser?.dealerStatus === 'verified' ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Dealer</span>
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>Pending Admin Review</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentUser?.email} • {currentUser?.district || 'Tamil Nadu'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/dealer/add-property"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <PlusCircle className="w-4 h-4 text-emerald-300" />
            <span>{t.nav.addProperty}</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.totalProperties}</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{myListings.length}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.activeListings}</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{activeCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.soldProperties}</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">{soldCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.rentedProperties}</span>
          <span className="text-2xl font-black text-indigo-700 mt-1 block">{rentedCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] text-slate-400 font-bold uppercase">{t.dashboard.pendingApproval}</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">{pendingCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
          <span className="text-[11px] text-slate-400 font-bold uppercase">Listing Fees Paid</span>
          <span className="text-2xl font-black text-brand-900 mt-1 block">₹{totalFeesPaid}</span>
        </div>

      </div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'listings' ? 'bg-brand-800 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t.dashboard.myListings} ({myListings.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'payments' ? 'bg-brand-800 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t.dashboard.payments} ({myPayments.length})
        </button>
      </div>

      {/* TAB 1: MY LISTINGS TABLE / CARDS */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
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
                  const cover = prop.images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=300&q=80';
                  
                  return (
                    <div key={prop.id} className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                      
                      {/* Left: Thumbnail & Details */}
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                          <img src={cover} alt="" className="w-full h-full object-cover" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {prop.propertyCode}
                            </span>
                            
                            {prop.status === 'available' && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                                Active Live
                              </span>
                            )}
                            {prop.status === 'pending_approval' && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                                Pending Review
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
                        </div>
                      </div>

                      {/* Right: Actions Controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        
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
                <div key={p.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-slate-900">{p.receiptNumber}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{p.propertyTitle}</p>
                    <p className="text-[11px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()} • {p.method.toUpperCase()}</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-brand-900">₹{p.amount}.00</span>
                    <button
                      onClick={() => setSelectedInvoice(p)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                </div>
              ))}
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
