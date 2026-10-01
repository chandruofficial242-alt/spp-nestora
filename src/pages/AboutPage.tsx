import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Lock } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const { getCallUrl } = useApp();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-bold">
          <span>Tamil Nadu Real Estate Innovation</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          About SPP Nestora
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
          “Find Your Place. Build Your Future.”
        </p>
      </div>

      {/* Main Philosophy & Operating Model */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-subtle space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
          Our Mission & Commercial Model
        </h2>
        
        <p>
          <strong>SPP Nestora</strong> is a dedicated Tamil Nadu real-estate platform designed to simplify property discovery for <strong>Land for Sale</strong>, <strong>Houses for Sale</strong>, and <strong>Houses for Rent</strong>.
        </p>

        <p>
          Unlike traditional classified platforms where buyers are bombarded by dozens of random middle-men and brokers, SPP Nestora operates with a <strong>centralized, direct platform coordination workflow</strong>:
        </p>

        {/* Workflow Diagram */}
        <div className="my-6 p-6 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs font-bold text-slate-800 items-center">
            <div className="p-3 bg-white rounded-xl border shadow-2xs">1. Dealer Lists Property (₹10)</div>
            <div className="text-brand-700 hidden md:block">➔</div>
            <div className="p-3 bg-brand-50 rounded-xl border border-brand-200 text-brand-900 shadow-2xs">2. Admin Verifies Listing</div>
            <div className="text-brand-700 hidden md:block">➔</div>
            <div className="p-3 bg-white rounded-xl border shadow-2xs">3. Customer Enquires Directly via SPP Desk</div>
          </div>
        </div>

        <p>
          All customer communications are handled through the official SPP Nestora desk. Dealer personal telephone numbers are kept private and secure, ensuring genuine, filtered, and coordinated property site visits.
        </p>
      </div>

      {/* Zero Commission & Independent Legal Verification Disclaimer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 sm:p-8 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
            ₹
          </div>
          <h3 className="text-lg font-bold text-emerald-950">Zero Mandatory Commission</h3>
          <p className="text-xs sm:text-sm text-emerald-900/80 leading-relaxed">
            SPP Nestora does NOT charge mandatory percentage-based deal commissions. Authorized dealers pay only a nominal flat ₹10 property listing fee.
          </p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 sm:p-8 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-amber-950">Independent Verification</h3>
          <p className="text-xs sm:text-sm text-amber-900/80 leading-relaxed">
            While our team screens properties for DTCP/Patta validity, all buyers and tenants are advised to carry out their own independent legal search and document verification before finalizing financial agreements.
          </p>
        </div>

      </div>

      {/* Contact CTA */}
      <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-navy-950 text-white rounded-3xl p-8 text-center space-y-4">
        <h3 className="text-xl sm:text-2xl font-black">Ready to explore verified Tamil Nadu properties?</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Contact our official property desk or browse hundreds of verified plots and houses.
        </p>
        <div className="flex items-center justify-center space-x-3 pt-2">
          <Link
            to="/properties"
            className="px-6 py-3 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            Explore Properties
          </Link>
          <a
            href={getCallUrl()}
            className="px-6 py-3 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            Call Support Desk
          </a>
        </div>
      </div>

    </div>
  );
};
