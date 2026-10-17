import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PropertyCard } from '../components/common/PropertyCard';
import { TN_DISTRICTS } from '../data/seedData';
import { Property } from '../types';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  FileCheck2,
  Users,
  Award,
  Phone,
  MessageSquare
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t, publicProperties, settings, getWhatsAppUrl, getCallUrl } = useApp();
  const navigate = useNavigate();

  // Hero Search State
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  const [searchQuery] = useState<string>('');

  // Active filter tab on homepage
  const [activeTab, setActiveTab] = useState<'all' | 'land_sale' | 'house_sale' | 'house_rent'>('all');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedType !== 'all') params.set('type', selectedType);
    if (selectedDistrict !== 'all') params.set('district', selectedDistrict);
    if (selectedPrice !== 'all') params.set('maxPrice', selectedPrice);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    navigate(`/properties?${params.toString()}`);
  };

  const filteredProperties = publicProperties.filter((p: Property) => {
    if (activeTab === 'all') return true;
    return p.type === activeTab;
  });

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center bg-gradient-to-br from-[#021f16] via-[#043323] to-[#01140e] text-white overflow-hidden py-16 lg:py-24">
        
        {/* Background Image with Ambient Emerald & Champagne Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80"
            alt="Tamil Nadu Real Estate"
            className="w-full h-full object-cover opacity-20 scale-105 animate-pulse-subtle"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#021f16] via-[#021f16]/90 to-[#043323]/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#021f16] via-brand-950/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl space-y-6">
            
            {/* Trust Badge */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-900/90 border border-champagne-400/40 text-champagne-200 text-xs font-semibold backdrop-blur-md shadow-xs animate-fadeIn">
              <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
              <span>{t.hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-white">
              {t.hero.title}
            </h1>

            {/* Subheading */}
            <p className="text-sm sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl">
              {t.hero.subtitle}
            </p>

            {/* Hero Quick Search Box */}
            <form
              onSubmit={handleHeroSearch}
              className="bg-white/98 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-premium border border-champagne-300/40 text-slate-900 mt-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                
                {/* Type */}
                <div className="bg-ivory-50 rounded-xl p-2 sm:p-2.5 border border-champagne-200/70 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                    {t.hero.propertyType}
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="all">{t.hero.allTypes}</option>
                    <option value="land_sale">🏞️ Land for Sale</option>
                    <option value="house_sale">🏠 House for Sale</option>
                    <option value="house_rent">🏘️ House for Rent</option>
                  </select>
                </div>

                {/* District */}
                <div className="bg-ivory-50 rounded-xl p-2 sm:p-2.5 border border-champagne-200/70 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                    {t.hero.selectDistrict}
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="all">{t.hero.allDistricts}</option>
                    {TN_DISTRICTS.map((d: string) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Budget */}
                <div className="bg-ivory-50 rounded-xl p-2 sm:p-2.5 border border-champagne-200/70 focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-brand-600">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                    {t.hero.priceRange}
                  </label>
                  <select
                    value={selectedPrice}
                    onChange={(e) => setSelectedPrice(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 outline-hidden cursor-pointer"
                  >
                    <option value="all">{t.hero.anyPrice}</option>
                    <option value="25000">Under ₹25,000 / mo (Rent)</option>
                    <option value="5000000">Under ₹50 Lakhs</option>
                    <option value="10000000">Under ₹1 Crore</option>
                    <option value="30000000">Under ₹3 Crores</option>
                  </select>
                </div>

                {/* Search Button */}
                <div className="flex items-center">
                  <button
                    type="submit"
                    className="w-full h-full min-h-[48px] bg-gradient-to-r from-brand-800 to-brand-950 hover:from-brand-700 hover:to-brand-900 active:scale-98 text-white rounded-xl font-bold text-sm shadow-gold transition flex items-center justify-center space-x-2 border border-champagne-400/30"
                  >
                    <Search className="w-4 h-4 text-champagne-300" />
                    <span>{t.hero.searchBtn}</span>
                  </button>
                </div>

              </div>
            </form>

            {/* Micro Trust Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 text-xs font-semibold text-champagne-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t.hero.verifiedListingsCount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t.hero.districtsCovered}</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{t.hero.assistedDeals}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. THREE PRIMARY CATEGORY CARDS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-extrabold text-brand-900 uppercase tracking-widest bg-champagne-100/80 px-3 py-1 rounded-full border border-champagne-300/60 shadow-2xs">
            Core Real Estate Verticals
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">
            {t.categories.title}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {t.categories.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Card 1: Land for Sale */}
          <Link
            to="/properties/land-sale"
            className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition-all duration-300 flex flex-col justify-between overflow-hidden card-hover-effect"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-champagne-100/50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-champagne-100 text-champagne-900 border border-champagne-200/70 flex items-center justify-center text-3xl shadow-sm">
                🏞️
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-brand-900 transition">
                  {t.categories.landSaleTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  "{t.categories.landSaleDesc}"
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-4 border-t border-champagne-100 flex items-center justify-between text-xs font-bold text-brand-900">
              <span>{t.categories.exploreCategory}</span>
              <div className="w-8 h-8 rounded-full bg-ivory-100 border border-champagne-200 group-hover:bg-brand-900 group-hover:text-white group-hover:border-brand-900 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Card 2: House for Sale */}
          <Link
            to="/properties/house-sale"
            className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition-all duration-300 flex flex-col justify-between overflow-hidden card-hover-effect"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-200/70 flex items-center justify-center text-3xl shadow-sm">
                🏠
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-brand-900 transition">
                  {t.categories.houseSaleTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  "{t.categories.houseSaleDesc}"
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-4 border-t border-champagne-100 flex items-center justify-between text-xs font-bold text-brand-900">
              <span>{t.categories.exploreCategory}</span>
              <div className="w-8 h-8 rounded-full bg-ivory-100 border border-champagne-200 group-hover:bg-brand-900 group-hover:text-white group-hover:border-brand-900 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Card 3: House for Rent */}
          <Link
            to="/properties/house-rent"
            className="group relative bg-white rounded-3xl p-6 sm:p-8 border border-champagne-200/70 shadow-subtle hover:border-champagne-400 hover:shadow-gold transition-all duration-300 flex flex-col justify-between overflow-hidden card-hover-effect"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100/50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />
            
            <div className="relative z-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-900 border border-teal-200/70 flex items-center justify-center text-3xl shadow-sm">
                🏘️
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-brand-900 transition">
                  {t.categories.houseRentTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  "{t.categories.houseRentDesc}"
                </p>
              </div>
            </div>

            <div className="relative z-10 pt-6 mt-4 border-t border-champagne-100 flex items-center justify-between text-xs font-bold text-brand-900">
              <span>{t.categories.exploreCategory}</span>
              <div className="w-8 h-8 rounded-full bg-ivory-100 border border-champagne-200 group-hover:bg-brand-900 group-hover:text-white group-hover:border-brand-900 flex items-center justify-center transition">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

        </div>
      </section>

      {/* 3. "PROPERTIES NEAR YOU" / FEATURED SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center space-x-2 text-brand-800 text-xs font-extrabold uppercase tracking-wider mb-1">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Tamil Nadu Real-Time Discovery</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              {t.location.nearYou}
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 p-1.5 bg-ivory-200/70 rounded-2xl border border-champagne-200/60 overflow-x-auto shadow-2xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'all' ? 'bg-brand-900 text-white shadow-gold' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              All Listed
            </button>
            <button
              onClick={() => setActiveTab('land_sale')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'land_sale' ? 'bg-brand-900 text-white shadow-gold' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              🏞️ Lands
            </button>
            <button
              onClick={() => setActiveTab('house_sale')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'house_sale' ? 'bg-brand-900 text-white shadow-gold' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              🏠 House Sale
            </button>
            <button
              onClick={() => setActiveTab('house_rent')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'house_rent' ? 'bg-brand-900 text-white shadow-gold' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              🏘️ House Rent
            </button>
          </div>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.slice(0, 8).map((prop: Property) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center pt-10">
          <Link
            to="/properties"
            className="inline-flex items-center space-x-2 px-6 py-3.5 bg-gradient-to-r from-brand-800 to-brand-950 hover:from-brand-700 hover:to-brand-900 text-white border border-champagne-400/30 rounded-2xl text-xs sm:text-sm font-bold shadow-gold transition hover:scale-102"
          >
            <span>{t.categories.viewAllListings}</span>
            <ArrowRight className="w-4 h-4 text-champagne-300" />
          </Link>
        </div>
      </section>

      {/* 4. EXPLORE BY TAMIL NADU DISTRICTS */}
      <section className="bg-ivory-100/60 border-y border-champagne-200/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-brand-900 uppercase tracking-wider bg-champagne-100 px-3 py-1 rounded-full border border-champagne-300/50">
              Statewide Coverage
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {t.location.exploreByDistrict}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Verified property listings available across top commercial & residential zones.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
            {[
              { name: 'Chennai', count: '520+ Listings', tag: 'Metropolitan' },
              { name: 'Coimbatore', count: '380+ Listings', tag: 'Textile & Tech' },
              { name: 'Madurai', count: '190+ Listings', tag: 'Heritage Hub' },
              { name: 'Tiruchirappalli (Trichy)', count: '140+ Listings', tag: 'Central TN' },
              { name: 'Salem', count: '120+ Listings', tag: 'Steel & Agro' },
              { name: 'Krishnagiri (Hosur)', count: '160+ Listings', tag: 'Industrial Corridor' },
              { name: 'Tirunelveli', count: '90+ Listings', tag: 'South TN' },
              { name: 'Erode', count: '85+ Listings', tag: 'Powerloom City' },
              { name: 'Vellore', count: '75+ Listings', tag: 'Educational' },
              { name: 'Thanjavur', count: '60+ Listings', tag: 'Delta Region' }
            ].map((dist) => (
              <Link
                key={dist.name}
                to={`/properties?district=${encodeURIComponent(dist.name)}`}
                className="bg-white p-4 rounded-2xl border border-champagne-200/70 hover:border-champagne-400 hover:shadow-gold transition text-left group"
              >
                <span className="text-[10px] font-bold text-champagne-900 bg-champagne-100 px-1.5 py-0.5 rounded border border-champagne-200/60 uppercase">
                  {dist.tag}
                </span>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-brand-900 transition mt-2 truncate">
                  {dist.name}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{dist.count}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. WHY SPP NESTORA — PLATFORM VALUE PILLARS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#021f16] via-[#043323] to-[#01140e] text-white rounded-3xl p-8 sm:p-12 md:p-16 border border-champagne-400/25 shadow-2xl relative overflow-hidden">
          
          <div className="max-w-3xl space-y-4 relative z-10 mb-10">
            <span className="text-xs font-bold text-champagne-300 tracking-widest uppercase">
              The SPP Nestora Difference
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Direct Platform Coordination. Zero Random Broker Calls.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Unlike traditional classifieds where customer phone numbers are broadcasted to hundreds of brokers, SPP Nestora routes all enquiries through our dedicated official admin desk.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            
            <div className="bg-white/5 border border-champagne-300/20 rounded-2xl p-5 backdrop-blur-md space-y-2 hover:border-champagne-400/40 hover:bg-white/10 transition">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Direct Admin Assistance</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Platform executives schedule and accompany you for site inspections.
              </p>
            </div>

            <div className="bg-white/5 border border-champagne-300/20 rounded-2xl p-5 backdrop-blur-md space-y-2 hover:border-champagne-400/40 hover:bg-white/10 transition">
              <FileCheck2 className="w-8 h-8 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Verified Approvals</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Prioritization for DTCP, CMDA, RERA, and clear Patta properties.
              </p>
            </div>

            <div className="bg-white/5 border border-champagne-300/20 rounded-2xl p-5 backdrop-blur-md space-y-2 hover:border-champagne-400/40 hover:bg-white/10 transition">
              <Award className="w-8 h-8 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">₹10 Transparent Listing</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dealers pay only a flat ₹10 listing fee. Zero compulsory brokerage charged.
              </p>
            </div>

            <div className="bg-white/5 border border-champagne-300/20 rounded-2xl p-5 backdrop-blur-md space-y-2 hover:border-champagne-400/40 hover:bg-white/10 transition">
              <Users className="w-8 h-8 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Tamil Nadu Dedicated</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bilingual interface built specifically for local TN buyers and dealers.
              </p>
            </div>

          </div>

          {/* Quick Contact CTA Banner */}
          <div className="mt-10 pt-8 border-t border-champagne-400/20 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <div>
              <p className="text-xs text-slate-300">Need immediate property consultation?</p>
              <p className="text-sm sm:text-base font-bold text-white">
                Call our official desk: {settings.officialPhoneDisplay}
              </p>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <a
                href={getCallUrl()}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-brand-700 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition shadow-gold border border-champagne-400/30"
              >
                <Phone className="w-3.5 h-3.5 text-champagne-300" />
                <span>Call Desk</span>
              </a>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
