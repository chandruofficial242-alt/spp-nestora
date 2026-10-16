import React from 'react';
import { Link } from 'react-router-dom';
import { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatPrice, formatSqft } from '../../utils/formatters';
import { 
  X, 
  CheckCircle2, 
  MapPin, 
  Maximize2, 
  Bed, 
  ShieldCheck, 
  ArrowRight,
  MessageSquare,
  Image as ImageIcon
} from 'lucide-react';

interface Props {
  properties: Property[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export const PropertyComparisonModal: React.FC<Props> = ({
  properties,
  isOpen,
  onClose,
  onRemove,
  onClear
}) => {
  const { language, getWhatsAppUrl } = useApp();

  if (!isOpen || properties.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-champagne-300 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-brand-950 text-white flex items-center justify-between border-b border-champagne-500/30">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-champagne-300 font-bold text-xs uppercase tracking-wider">
                Direct Side-by-Side Analysis
              </span>
              <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-emerald-200">
                {properties.length} Selected (Max 3)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-0.5">
              Compare Properties
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClear}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/20 transition"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition"
              aria-label="Close comparison"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Content Table / Grid */}
        <div className="flex-1 overflow-x-auto p-4 sm:p-6">
          <div className="min-w-[640px] grid grid-cols-4 gap-4 divide-x divide-slate-100">
            
            {/* Spec Labels Column */}
            <div className="space-y-6 pt-28 font-medium text-xs text-slate-500 pr-2">
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Vertical / Type</div>
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Selling Price / Rent</div>
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Location & District</div>
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Total / Built-up Area</div>
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Rate per Sq.Ft</div>
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Approvals & Title</div>
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Configuration</div>
              <div className="py-2 border-b border-slate-100 font-bold text-slate-800">Enquiry</div>
            </div>

            {/* Properties Columns (1 to 3) */}
            {properties.map((prop) => {
              const coverImg = prop.images && prop.images[0]?.url;
              const isRent = prop.type === 'house_rent';
              const isLand = prop.type === 'land_sale';

              return (
                <div key={prop.id} className="space-y-6 px-3 flex flex-col justify-between">
                  
                  {/* Property Card Header */}
                  <div className="relative">
                    <button
                      onClick={() => onRemove(prop.id)}
                      className="absolute -top-2 -right-2 z-10 w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-rose-600 transition shadow"
                      title="Remove from comparison"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 relative">
                      {coverImg ? (
                        <img src={coverImg} alt={prop.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                        {prop.propertyCode}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                      {prop.title}
                    </h4>
                  </div>

                  {/* Spec 1: Type */}
                  <div className="py-2 border-b border-slate-100 text-xs font-semibold text-slate-800 capitalize">
                    {prop.type.replace('_', ' ')}
                  </div>

                  {/* Spec 2: Price */}
                  <div className="py-2 border-b border-slate-100 text-xs sm:text-sm font-extrabold text-brand-900">
                    {formatPrice(prop.price, prop.type, language)}
                    {isRent && <span className="text-[10px] font-normal text-slate-500"> / mo</span>}
                  </div>

                  {/* Spec 3: Location */}
                  <div className="py-2 border-b border-slate-100 text-xs text-slate-700 truncate">
                    <MapPin className="w-3 h-3 text-emerald-600 inline mr-1" />
                    {prop.area}, {prop.district}
                  </div>

                  {/* Spec 4: Area */}
                  <div className="py-2 border-b border-slate-100 text-xs font-medium text-slate-800">
                    {isLand 
                      ? (prop.totalArea ? `${prop.totalArea} ${prop.areaUnit || 'Cent'}` : `${prop.areaSqft} Sq.Ft`)
                      : formatSqft(prop.builtUpAreaSqft || prop.areaSqft, language)
                    }
                  </div>

                  {/* Spec 5: Rate */}
                  <div className="py-2 border-b border-slate-100 text-xs font-bold text-emerald-800">
                    {prop.pricePerSqft ? `₹${prop.pricePerSqft.toLocaleString()} / sq.ft` : (prop.areaSqft > 0 ? `₹${Math.round(prop.price / prop.areaSqft).toLocaleString()} / sq.ft` : 'N/A')}
                  </div>

                  {/* Spec 6: Approvals */}
                  <div className="py-2 border-b border-slate-100 text-xs flex flex-wrap gap-1">
                    {prop.dtcpApproved && (
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold">DTCP</span>
                    )}
                    {prop.pattaAvailable && (
                      <span className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-bold">Patta</span>
                    )}
                    {prop.reraApproved && (
                      <span className="bg-blue-50 text-blue-800 text-[10px] px-1.5 py-0.5 rounded font-bold">RERA</span>
                    )}
                    {!prop.dtcpApproved && !prop.pattaAvailable && !prop.reraApproved && (
                      <span className="text-slate-400 text-[10px]">Verified Title</span>
                    )}
                  </div>

                  {/* Spec 7: Config */}
                  <div className="py-2 border-b border-slate-100 text-xs text-slate-800">
                    {isLand ? (prop.landType || 'Plot') : `${prop.bhk || 2} BHK • ${prop.furnishing || 'Semi'}`}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    <Link
                      to={`/properties/${prop.id}`}
                      onClick={onClose}
                      className="w-full py-2 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition"
                    >
                      <span>View Listing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <a
                      href={getWhatsAppUrl(prop.propertyCode, prop.title, `${prop.area}, ${prop.district}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Desk</span>
                    </a>
                  </div>

                </div>
              );
            })}

          </div>
        </div>

      </div>
    </div>
  );
};
