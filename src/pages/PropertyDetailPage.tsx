import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PropertyGallery } from '../components/property/PropertyGallery';
import { PropertyVideoPlayer } from '../components/property/PropertyVideoPlayer';
import { SiteVisitModal } from '../components/property/SiteVisitModal';
import { MobileStickyContact } from '../components/layout/MobileStickyContact';
import { PropertyCard } from '../components/common/PropertyCard';
import { formatPrice, formatSqft } from '../utils/formatters';
import { Property } from '../types';
import { 
  MapPin, 
  ShieldCheck, 
  Heart, 
  Share2, 
  Phone, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  ArrowLeft,
  FileText,
  Sparkles
} from 'lucide-react';

export const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { 
    language, 
    t, 
    getPropertyById, 
    publicProperties, 
    isFavorite, 
    toggleFavorite, 
    trackView, 
    settings, 
    getWhatsAppUrl, 
    getCallUrl,
    showToast 
  } = useApp();

  const [siteVisitModalOpen, setSiteVisitModalOpen] = useState(false);

  const property = id ? getPropertyById(id) : undefined;

  useEffect(() => {
    if (property) {
      trackView(property.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [id, property?.id]);

  if (!property) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h2>
        <p className="text-slate-500 mb-6">The requested listing may have been sold, rented, or archived.</p>
        <Link
          to="/properties"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-brand-800 text-white rounded-xl font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Browse All Properties</span>
        </Link>
      </div>
    );
  }

  const favorited = isFavorite(property.id);
  const title = (language === 'ta' && property.titleTa) ? property.titleTa : property.title;
  const description = (language === 'ta' && property.descriptionTa) ? property.descriptionTa : property.description;
  const isRent = property.type === 'house_rent';
  const isLand = property.type === 'land_sale';

  const similarProperties = publicProperties
    .filter((p: Property) => p.id !== property.id && (p.district === property.district || p.type === property.type))
    .slice(0, 3);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${property.title} | SPP Nestora`,
        text: `Check out this property on SPP Nestora (ID: ${property.propertyCode})`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(language === 'ta' ? 'இணைப்பு நகலெடுக்கப்பட்டது' : 'Property link copied to clipboard!', 'info');
    }
  };

  return (
    <div className="pb-24 md:pb-16 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-brand-700 transition">Home</Link>
            <span>/</span>
            <Link to={`/properties?district=${encodeURIComponent(property.district)}`} className="hover:text-brand-700 transition">
              {property.district}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold font-mono">{property.propertyCode}</span>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={handleShare}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t.property.shareListing}</span>
            </button>

            <button
              onClick={() => toggleFavorite(property.id)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition shadow-2xs ${
                favorited
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} />
              <span>{favorited ? 'Saved' : t.property.saveToFavorites}</span>
            </button>
          </div>
        </div>

        {/* Title & Key Badge Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-brand-900 text-white text-xs font-bold px-3 py-1 rounded-lg uppercase tracking-wider">
              {isRent ? t.property.rent : isLand ? 'Land for Sale' : t.property.sale}
            </span>

            {property.verified && (
              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-lg flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Verified by SPP Nestora</span>
              </span>
            )}

            {property.dtcpApproved && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg">
                DTCP Approved
              </span>
            )}

            {property.pattaAvailable && (
              <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg">
                Clear Patta
              </span>
            )}

            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg ml-auto">
              ID: {property.propertyCode}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
            {title}
          </h1>

          <div className="flex items-center text-slate-600 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 text-emerald-600 mr-1.5 flex-shrink-0" />
            <span>{property.address || property.area}, {property.city} - {property.pincode}, Tamil Nadu</span>
          </div>
        </div>

        {/* Media Section: Gallery & Video */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Main Content Column (Gallery, Specs, Description, Video) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Gallery */}
            <PropertyGallery
              images={property.images}
              propertyTitle={property.title}
            />

            {/* Key Specs Highlights Row */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-subtle grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-bold uppercase">{t.property.sqft}</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {formatSqft(property.areaSqft, language)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-bold uppercase">
                  {isLand ? 'Plot Layout' : t.property.bhk}
                </span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {isLand ? (property.plotDimensions || 'Standard') : `${property.bedrooms || 2} BHK`}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-bold uppercase">{t.property.facing}</span>
                <span className="text-lg font-black text-slate-900 mt-1 block">
                  {property.facing || 'East'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[11px] text-slate-400 block font-bold uppercase">Approval</span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">
                  {property.dtcpApproved ? 'DTCP' : property.pattaAvailable ? 'Patta' : 'Verified'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-3">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-brand-700" />
                <span>{t.property.description}</span>
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {description || 'Comprehensive property documentation verified by SPP Nestora Admin team. Schedule an escorted visit for complete physical inspection and legal verification.'}
              </p>
            </div>

            {/* Amenities & Features */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-subtle space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-brand-700" />
                  <span>{t.property.amenities}</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {property.amenities.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Tour Section with SPP Nestora Banner */}
            <PropertyVideoPlayer property={property} />

          </div>

          {/* Right Sticky Booking & Official Contact Box */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
            
            {/* Price & Official Contact Box */}
            <div className="bg-white rounded-3xl border-2 border-brand-800/20 p-6 shadow-elevated space-y-6">
              
              {/* Price Banner */}
              <div>
                <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider">
                  {isRent ? 'Expected Monthly Rent' : 'Expected Price'}
                </span>
                <div className="text-3xl font-black text-brand-900 mt-0.5">
                  {formatPrice(property.price, property.type, language)}
                </div>
                {property.priceNegotiable && (
                  <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Price Negotiable via Admin
                  </span>
                )}
              </div>

              {/* SPP Nestora Official Coordination Desk Notice */}
              <div className="p-3.5 bg-brand-50/70 border border-brand-200 rounded-2xl text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-brand-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-brand-700" />
                  <span>{t.property.officialContactOnly}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {t.property.contactOfficialDesc}
                </p>
              </div>

              {/* Direct Enquiry Actions */}
              <div className="space-y-2.5">
                
                {/* Official Call Button */}
                <a
                  href={getCallUrl()}
                  id="property-detail-call-btn"
                  className="w-full py-3.5 px-4 bg-brand-800 hover:bg-brand-900 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 active:scale-98"
                >
                  <Phone className="w-4 h-4 text-emerald-300" />
                  <span>{t.property.callNow}</span>
                </a>

                {/* Official WhatsApp Button */}
                <a
                  href={getWhatsAppUrl(property.propertyCode, title, `${property.area}, ${property.district}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="property-detail-whatsapp-btn"
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 active:scale-98"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t.property.whatsapp}</span>
                </a>

                {/* Schedule Site Visit Modal Trigger */}
                <button
                  onClick={() => setSiteVisitModalOpen(true)}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-sm transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>{t.property.scheduleVisit}</span>
                </button>

              </div>

              {/* Official Desk Details Display */}
              <div className="pt-4 border-t border-slate-100 text-center space-y-1">
                <p className="text-[11px] text-slate-400 font-medium">Platform Desk Direct Line:</p>
                <p className="text-sm font-black text-slate-800">{settings.officialPhoneDisplay}</p>
                <p className="text-[10px] text-slate-400">{settings.supportHours}</p>
              </div>

            </div>

            {/* Legal Disclaimer Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] text-slate-500 space-y-1.5">
              <span className="font-bold text-slate-700 block">Independent Verification Notice:</span>
              <p className="leading-relaxed">
                Customers are advised to independently verify property ownership, revenue documents, approvals, measurements, and legal encumbrances before executing transactions.
              </p>
            </div>

          </div>

        </div>

        {/* Similar Properties Section */}
        {similarProperties.length > 0 && (
          <div className="pt-12 border-t border-slate-200">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-6">
              {t.property.similarProperties}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarProperties.map((prop: Property) => (
                <PropertyCard key={prop.id} property={prop} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Site Visit Booking Modal */}
      <SiteVisitModal
        property={property}
        isOpen={siteVisitModalOpen}
        onClose={() => setSiteVisitModalOpen(false)}
      />

      {/* Mobile Sticky Contact Bar */}
      <MobileStickyContact
        property={property}
        onOpenSchedule={() => setSiteVisitModalOpen(true)}
      />

    </div>
  );
};
