import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PropertyCard } from '../components/common/PropertyCard';
import { Property, Enquiry, SiteVisit } from '../types';
import { 
  User as UserIcon, 
  Heart, 
  MessageSquare, 
  Calendar, 
  ShieldCheck, 
  Layers
} from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { 
    currentUser, 
    updateUser, 
    favorites, 
    properties, 
    enquiries, 
    siteVisits, 
    recentlyViewed 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'enquiries' | 'visits' | 'profile'>('overview');

  // Profile Form state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone || '');
  const [profileDistrict, setProfileDistrict] = useState(currentUser?.district || 'Chennai');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: profileName,
      phone: profilePhone,
      district: profileDistrict
    });
  };

  const savedPropertyList = properties.filter((p: Property) => favorites.includes(p.id));
  const myEnquiries = enquiries.filter((e: Enquiry) => e.customerId === currentUser?.id || e.customerEmail === currentUser?.email);
  const mySiteVisits = siteVisits.filter((sv: SiteVisit) => sv.customerId === currentUser?.id || sv.customerPhone === currentUser?.phone);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-elevated mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <img
            src={currentUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.name || 'Customer'}`}
            alt=""
            className="w-16 h-16 rounded-2xl border-2 border-white/30 object-cover bg-slate-800"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black">{currentUser?.name || 'Customer Profile'}</h1>
              <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                Verified Buyer
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-0.5">{currentUser?.email} • {currentUser?.phone}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/properties"
            className="px-4 py-2 bg-white text-brand-950 hover:bg-slate-100 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Browse Properties
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 border-b border-slate-200 mb-8 scrollbar-thin">
        {[
          { id: 'overview', label: 'Overview', icon: <Layers className="w-4 h-4" /> },
          { id: 'saved', label: `Saved (${savedPropertyList.length})`, icon: <Heart className="w-4 h-4" /> },
          { id: 'enquiries', label: `My Enquiries (${myEnquiries.length})`, icon: <MessageSquare className="w-4 h-4" /> },
          { id: 'visits', label: `Site Visits (${mySiteVisits.length})`, icon: <Calendar className="w-4 h-4" /> },
          { id: 'profile', label: 'My Profile', icon: <UserIcon className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-brand-800 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold block">Saved Properties</span>
              <span className="text-2xl font-black text-brand-900 mt-1 block">{savedPropertyList.length}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold block">Platform Enquiries</span>
              <span className="text-2xl font-black text-brand-900 mt-1 block">{myEnquiries.length}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold block">Site Visits Booked</span>
              <span className="text-2xl font-black text-brand-900 mt-1 block">{mySiteVisits.length}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
              <span className="text-xs text-slate-400 font-bold block">Coordination Desk</span>
              <span className="text-xs font-bold text-emerald-700 mt-2 block flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active</span>
              </span>
            </div>
          </div>

          {/* Active Site Visits Card */}
          {mySiteVisits.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-brand-700" />
                  <span>Upcoming Escorted Site Visit</span>
                </h3>
                <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg">
                  Confirmed by Admin
                </span>
              </div>

              {mySiteVisits.slice(0, 1).map((sv: SiteVisit) => (
                <div key={sv.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900 text-sm">{sv.propertyTitle}</span>
                    <span className="font-mono text-emerald-800 font-bold">{sv.propertyCode}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-slate-600">
                    <span>📅 Date: <strong>{sv.date}</strong></span>
                    <span>⏰ Slot: <strong>{sv.time}</strong></span>
                  </div>
                  {sv.notes && (
                    <p className="text-slate-500 bg-white p-2 rounded-lg border border-slate-200">
                      <strong>Admin Escort Note:</strong> {sv.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Saved Properties Carousel */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Your Saved Properties</h3>
              <button
                onClick={() => setActiveTab('saved')}
                className="text-xs font-bold text-brand-700 hover:underline"
              >
                View All ({savedPropertyList.length})
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPropertyList.slice(0, 3).map((prop: Property) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SAVED PROPERTIES */}
      {activeTab === 'saved' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Saved & Favorite Properties</h2>
          {savedPropertyList.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
              <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-800">No saved properties yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Click the heart icon on any property to save it here.</p>
              <Link to="/properties" className="px-5 py-2.5 bg-brand-800 text-white rounded-xl text-xs font-bold inline-block">
                Browse Properties
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPropertyList.map((prop: Property) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ENQUIRIES */}
      {activeTab === 'enquiries' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">My Platform Enquiries</h2>
          <p className="text-xs text-slate-500">
            All your requests are handled directly by the SPP Nestora Admin team for safety and verification.
          </p>

          <div className="space-y-3">
            {myEnquiries.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
                No active enquiries submitted yet.
              </div>
            ) : (
              myEnquiries.map((enq: Enquiry) => (
                <div key={enq.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-mono text-brand-800 font-bold bg-brand-50 px-2 py-0.5 rounded">
                        {enq.propertyCode}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{enq.propertyTitle}</h4>
                      <p className="text-xs text-slate-500">{enq.propertyLocation}</p>
                    </div>

                    <span className="self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
                      {enq.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700">
                    <p><strong>Your Message:</strong> {enq.message}</p>
                    {enq.adminNotes && (
                      <p className="mt-1 text-emerald-800 font-medium">
                        <strong>SPP Nestora Update:</strong> {enq.adminNotes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SITE VISITS */}
      {activeTab === 'visits' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Scheduled Site Visits</h2>
          <div className="space-y-3">
            {mySiteVisits.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
                No site visits currently scheduled.
              </div>
            ) : (
              mySiteVisits.map((sv: SiteVisit) => (
                <div key={sv.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-brand-800">{sv.propertyCode}</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{sv.propertyTitle}</h4>
                      <p className="text-xs text-slate-500">{sv.propertyAddress}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold capitalize bg-emerald-100 text-emerald-900">
                      {sv.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl text-xs flex items-center space-x-6 text-slate-700">
                    <span>📅 <strong>Date:</strong> {sv.date}</span>
                    <span>⏰ <strong>Time:</strong> {sv.time}</span>
                  </div>

                  {sv.notes && (
                    <p className="text-xs text-slate-600 bg-brand-50/50 p-2.5 rounded-lg border border-brand-100">
                      <strong>Escort Coordinator:</strong> {sv.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PROFILE SETTINGS */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-xl shadow-subtle">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Profile</h2>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Phone (+91)
              </label>
              <input
                type="tel"
                required
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Primary District
              </label>
              <input
                type="text"
                value={profileDistrict}
                onChange={(e) => setProfileDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="py-3 px-6 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
