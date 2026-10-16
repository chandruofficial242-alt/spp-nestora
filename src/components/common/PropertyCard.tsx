import React from 'react';
import { Link } from 'react-router-dom';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatPrice, formatSqft, formatRelativeTime } from '../../utils/formatters';
import { 
  ShieldCheck, 
  Heart, 
  MapPin, 
  Maximize2, 
  Bed, 
  Bath, 
  Compass, 
  ArrowRight,
  Sparkles,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  layout?: 'grid' | 'list';
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, layout = 'grid' }) => {
  const { language, isFavorite, toggleFavorite, t } = useApp();
  const favorited = isFavorite(property.id);

  const isRent = property.type === 'house_rent';
  const isLand = property.type === 'land_sale';

  const typeLabel = isLand
    ? t.property.land
    : isRent
    ? t.property.house
    : t.property.house;

  const statusPill = isRent
    ? { text: t.property.rent, bg: 'bg-emerald-600 text-white' }
    : isLand
    ? { text: language === 'ta' ? 'நில விற்பனை' : 'Land Sale', bg: 'bg-amber-600 text-white' }
    : { text: t.property.sale, bg: 'bg-brand-700 text-white' };

  const hasCoverImage = Boolean(property.images && property.images.length > 0 && property.images[0]?.url);
  const coverImage = hasCoverImage ? property.images[0].url : '';

  const title = (language === 'ta' && property.titleTa) ? property.titleTa : property.title;

  if (layout === 'list') {
    return (
      <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-elevated transition-all duration-300 overflow-hidden flex flex-col md:flex-row relative">
        {/* Image Container */}
        <div className="relative md:w-80 h-56 md:h-auto flex-shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center">
          {hasCoverImage ? (
            <>
              <img
                src={coverImage}
                alt={title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 md:hidden" />
            </>
          ) : (
            <div className="w-full h-full min-h-[14rem] flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
              <ImageIcon className="w-10 h-10 text-slate-300 mb-1.5" />
              <span className="text-xs font-semibold text-slate-500">
                {language === 'ta' ? 'புகைப்படம் பதிவேற்றப்படவில்லை' : 'No property photo uploaded'}
              </span>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 flex items-center space-x-1.5">
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider shadow-sm ${statusPill.bg}`}>
              {statusPill.text}
            </span>
            {property.verified && (
              <span className="bg-emerald-900/90 backdrop-blur-md text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center space-x-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'ta' ? 'சரிபார்க்கப்பட்டது' : 'Verified'}</span>
              </span>
            )}
          </div>

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(property.id);
            }}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md ${
              favorited 
                ? 'bg-rose-500 text-white' 
                : 'bg-white/80 hover:bg-white text-slate-700 hover:text-rose-500'
            }`}
            title={favorited ? 'Remove Favorite' : 'Save Property'}
          >
            <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
          </button>

          {/* Property Code Tag */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-mono px-2 py-0.5 rounded border border-white/20">
            {property.propertyCode}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-brand-700 uppercase tracking-wider">{typeLabel}</span>
              <span>{formatRelativeTime(property.createdAt, language)}</span>
            </div>

            <Link to={`/properties/${property.id}`} className="block group-hover:text-brand-700 transition">
              <h3 className="text-base md:text-lg font-bold text-slate-900 line-clamp-2 leading-snug">
                {title}
              </h3>
            </Link>

            <div className="flex items-center text-slate-500 text-xs md:text-sm mt-2">
              <MapPin className="w-4 h-4 text-emerald-600 mr-1.5 flex-shrink-0" />
              <span className="truncate">{property.area}, {property.city} ({property.district})</span>
            </div>

            {/* Key Specs */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 my-4 py-3 border-y border-slate-100 text-slate-700 text-xs md:text-sm">
              {isLand ? (
                <>
                  <div className="flex items-center space-x-1.5">
                    <Maximize2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold">
                      {property.totalArea ? `${property.totalArea} ${property.areaUnit || 'Cent'}` : formatSqft(property.areaSqft, language)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-600">
                    <span className="font-medium">{property.landType || 'Residential Plot'}</span>
                  </div>
                  {(property.pricePerSqft || (property.areaSqft > 0 && property.price > 0)) && (
                    <div className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                      ₹{(property.pricePerSqft || Math.round(property.price / property.areaSqft)).toLocaleString()} / sq.ft
                    </div>
                  )}
                  {property.dtcpApproved && (
                    <span className="bg-emerald-50 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                      DTCP
                    </span>
                  )}
                  {property.pattaAvailable && (
                    <span className="bg-slate-100 text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                      Patta
                    </span>
                  )}
                </>
              ) : isRent ? (
                <>
                  <div className="flex items-center space-x-1.5">
                    <Bed className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold">{property.bhk ? `${property.bhk} BHK` : `${property.bedrooms || 1} Rooms`}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Maximize2 className="w-4 h-4 text-slate-400" />
                    <span>{formatSqft(property.builtUpAreaSqft || property.areaSqft, language)}</span>
                  </div>
                  {property.depositAmount && (
                    <span className="bg-amber-50 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded border border-amber-200">
                      Deposit: ₹{property.depositAmount.toLocaleString('en-IN')}
                    </span>
                  )}
                  {property.furnishing && (
                    <span className="text-slate-500 capitalize">{property.furnishing}</span>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-1.5">
                    <Bed className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold">{property.bhk ? `${property.bhk} BHK` : `${property.bedrooms || 2} BHK`}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Maximize2 className="w-4 h-4 text-slate-400" />
                    <span>{formatSqft(property.builtUpAreaSqft || property.areaSqft, language)}</span>
                  </div>
                  {property.bathrooms && (
                    <div className="flex items-center space-x-1.5">
                      <Bath className="w-4 h-4 text-slate-400" />
                      <span>{property.bathrooms} {t.property.baths}</span>
                    </div>
                  )}
                  {property.furnishing && (
                    <span className="text-slate-500 capitalize">{property.furnishing}</span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Price & Action */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {isRent ? 'Monthly Rent' : t.property.sale}
              </span>
              <span className="text-xl md:text-2xl font-extrabold text-brand-900">
                {formatPrice(property.price, property.type, language)}
                {isRent && <span className="text-xs font-semibold text-slate-500"> / mo</span>}
              </span>
            </div>

            <Link
              to={`/properties/${property.id}`}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs md:text-sm font-semibold transition shadow-sm hover:shadow group/btn"
            >
              <span>{t.property.viewDetails}</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 shadow-subtle hover:shadow-elevated transition-all duration-300 overflow-hidden flex flex-col relative card-hover-effect">
      {/* Image Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 flex items-center justify-center">
        {hasCoverImage ? (
          <>
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4 text-center">
            <ImageIcon className="w-10 h-10 text-slate-300 mb-1.5" />
            <span className="text-xs font-semibold text-slate-500">
              {language === 'ta' ? 'புகைப்படம் பதிவேற்றப்படவில்லை' : 'No property photo uploaded'}
            </span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider shadow-sm ${statusPill.bg}`}>
            {statusPill.text}
          </span>
          {property.verified && (
            <span className="bg-emerald-950/80 backdrop-blur-md text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center space-x-1 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'ta' ? 'சரிபார்க்கப்பட்டது' : 'Verified'}</span>
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(property.id);
          }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-md z-10 ${
            favorited 
              ? 'bg-rose-500 text-white' 
              : 'bg-white/80 hover:bg-white text-slate-700 hover:text-rose-500'
          }`}
          title={favorited ? 'Remove Favorite' : 'Save Property'}
        >
          <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
        </button>

        {/* Property Code Tag */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-mono px-2 py-0.5 rounded border border-white/20">
          {property.propertyCode}
        </div>

        {property.featured && (
          <div className="absolute bottom-3 right-3 bg-amber-500/90 backdrop-blur-md text-slate-950 font-bold text-[10px] uppercase px-2 py-0.5 rounded flex items-center space-x-1 shadow">
            <Sparkles className="w-3 h-3" />
            <span>Featured</span>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Posted Date */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-brand-700 uppercase tracking-wide">{typeLabel}</span>
            <span>{formatRelativeTime(property.createdAt, language)}</span>
          </div>

          <Link to={`/properties/${property.id}`} className="block group-hover:text-brand-700 transition">
            <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
              {title}
            </h3>
          </Link>

          <div className="flex items-center text-slate-500 text-xs sm:text-sm mt-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1.5 flex-shrink-0" />
            <span className="truncate">{property.area}, {property.district}</span>
          </div>

          {/* Specs Row */}
          <div className="grid grid-cols-3 gap-2 my-3 py-2.5 border-y border-slate-100 text-center text-xs">
            {isLand ? (
              <>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Area</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {property.totalArea ? `${property.totalArea} ${property.areaUnit || 'Cent'}` : `${property.areaSqft} Sq.Ft`}
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Type</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {property.landType || 'Plot'}
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Approval</span>
                  <span className="font-bold text-emerald-700 truncate block uppercase">
                    {property.dtcpStatus || (property.dtcpApproved ? 'DTCP' : (property.pattaAvailable ? 'Patta' : 'Verified'))}
                  </span>
                </div>
              </>
            ) : isRent ? (
              <>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Area</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {property.builtUpAreaSqft || property.areaSqft} Sq.Ft
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Config</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {property.bhk ? `${property.bhk} BHK` : `${property.bedrooms || 1} Rooms`}
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Deposit</span>
                  <span className="font-bold text-amber-900 truncate block">
                    {property.depositAmount ? `₹${(property.depositAmount / 1000).toFixed(0)}k` : 'Contact'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Built-up</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {property.builtUpAreaSqft || property.areaSqft} Sq.Ft
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Config</span>
                  <span className="font-bold text-slate-800 truncate block">
                    {property.bhk ? `${property.bhk} BHK` : `${property.bedrooms || 2} BHK`}
                  </span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100/80">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Furnishing</span>
                  <span className="font-bold text-slate-800 truncate block capitalize">
                    {property.furnishing || 'Semi'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">
              {isRent ? 'Monthly Rent' : t.property.sale}
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-brand-900 tracking-tight">
              {formatPrice(property.price, property.type, language)}
              {isRent && <span className="text-xs font-semibold text-slate-500"> / mo</span>}
            </span>
          </div>

          <Link
            to={`/properties/${property.id}`}
            className="inline-flex items-center space-x-1 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-semibold transition shadow-sm hover:shadow"
          >
            <span>{t.property.viewDetails}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
