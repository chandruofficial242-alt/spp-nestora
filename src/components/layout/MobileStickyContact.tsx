import React from 'react';
import { useApp } from '../../context/AppContext';
import { Phone, MessageSquare, Calendar } from 'lucide-react';
import { Property } from '../../types';

interface Props {
  property?: Property;
  onOpenSchedule?: () => void;
}

export const MobileStickyContact: React.FC<Props> = ({ property, onOpenSchedule }) => {
  const { language, settings, getWhatsAppUrl, getCallUrl } = useApp();

  const title = property ? ((language === 'ta' && property.titleTa) ? property.titleTa : property.title) : undefined;
  const location = property ? `${property.area}, ${property.district}` : undefined;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-2xl animate-slideUp">
      <div className="flex items-center space-x-2">
        
        {/* Call Button */}
        <a
          href={getCallUrl()}
          className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
          id="mobile-call-btn"
        >
          <Phone className="w-4 h-4 text-emerald-300" />
          <span>{language === 'ta' ? 'அழைக்க' : 'Call Desk'}</span>
        </a>

        {/* WhatsApp Button */}
        <a
          href={getWhatsAppUrl(property?.propertyCode, title, location)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center space-x-1.5 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
          id="mobile-whatsapp-btn"
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>

        {/* Schedule Button */}
        {onOpenSchedule && (
          <button
            onClick={onOpenSchedule}
            className="flex items-center justify-center py-3 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95"
            title="Book Visit"
          >
            <Calendar className="w-4 h-4" />
          </button>
        )}

      </div>
    </div>
  );
};
