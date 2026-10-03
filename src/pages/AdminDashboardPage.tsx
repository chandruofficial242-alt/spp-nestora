import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { 
    language, 
    properties, 
    approveProperty, 
    rejectProperty, 
    deleteProperty,
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
    markNotificationAsRead
  } = useApp();

  const [activeSection, setActiveSection] = useState<
    'overview' | 'properties' | 'pending' | 'customers' | 'dealers' | 'enquiries' | 'visits' | 'payments' | 'settings'
  >('overview');

  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // CRM notes editing state
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  // Rejection Modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingPropertyId, setRejectingPropertyId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<AdminSettings>(settings);

  // Filter customers from all users
  const customers = (allUsers || []).filter((u: User) => u.role === 'customer');

  // KPI Calculations
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
      <div className="bg-gradient-to-r from-navy-950 via-slate-900 to-brand-950 text-white rounded-3xl p-6 sm:p-8 shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">SPP Nestora Admin Command Center</h1>
              <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tamil Nadu Real Estate Operations • Centralized Enquiry Desk • Official: {settings.officialPhoneDisplay}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications Trigger */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition cursor-pointer"
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
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Contact Settings</span>
          </button>
        </div>
      </div>

      {/* Navigation Pills Bar */}
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-slate-200 scrollbar-thin">
        {[
          { id: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
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
                ? 'bg-brand-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold uppercase block">Total Revenue</span>
              <span className="text-2xl font-black text-brand-900 mt-1 block">₹{totalRevenue}</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">From ₹10 Listing Fees</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold uppercase block">Active Listings</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{activeProperties}</span>
              <span className="text-[11px] text-slate-400 block">{pendingProperties.length} pending review</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold uppercase block">Total Enquiries</span>
              <span className="text-2xl font-black text-blue-700 mt-1 block">{totalEnquiries}</span>
              <span className="text-[11px] text-slate-400 block">Direct via Call/WhatsApp/Form</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold uppercase block">Registered Users</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{(allUsers || []).length}</span>
              <span className="text-[11px] text-brand-600 font-semibold block">{customers.length} Customers • {dealers.length} Dealers</span>
            </div>
          </div>

          {/* Pending Action Alerts */}
          {pendingProperties.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {pendingProperties.length} Property Listing(s) Awaiting Your Review
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Dealers have already paid their ₹10 listing fees. Review and publish to live search.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('pending')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer"
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
              {pendingProperties.map((prop: Property) => (
                <div key={prop.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={prop.images[0]?.url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=300&q=80'}
                        alt=""
                        className="w-20 h-16 rounded-xl object-cover bg-slate-100"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs bg-brand-50 text-brand-900 px-2 py-0.5 rounded">
                            {prop.propertyCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 uppercase">{prop.type}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base mt-0.5">{prop.title}</h3>
                        <p className="text-xs text-slate-500">{prop.locality}, {prop.district} • {formatPrice(prop.price, prop.type, language)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => approveProperty(prop.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve Listing</span>
                      </button>
                      <button
                        onClick={() => handleOpenReject(prop.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700">
                    <p><strong>Description:</strong> {prop.description}</p>
                    <p className="mt-1 text-slate-500">
                      <strong>Dealer:</strong> {prop.dealerName} (ID: {prop.dealerId})
                    </p>
                  </div>
                </div>
              ))}
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
                    <img
                      src={prop.images[0]?.url}
                      alt=""
                      className="w-16 h-12 rounded-lg object-cover bg-slate-100"
                    />
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

      {/* SECTION 8: REVENUE & PAYMENTS */}
      {activeSection === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-subtle">
            <h3 className="text-base font-bold text-slate-900 mb-4">Successful Listing Fee Transactions</h3>
            <div className="divide-y divide-slate-100">
              {payments.map((p: Payment) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-900">{p.receiptNumber}</span>
                    <p className="text-slate-600 mt-0.5">{p.purpose} • {p.dealerName}</p>
                    <p className="text-slate-400 text-[11px] font-mono">Ref: {p.transactionRef}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-black text-brand-900 text-sm">₹{p.amount}.00</span>
                    <button
                      onClick={() => setSelectedInvoice(p)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold cursor-pointer"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              ))}
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
