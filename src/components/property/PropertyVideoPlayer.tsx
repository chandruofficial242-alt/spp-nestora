import React from 'react';
import { useApp } from '../../context/AppContext';
import { Property } from '../../types';
import { Video, Phone, MessageSquare, ShieldCheck, Play } from 'lucide-react';

interface Props {
  property: Property;
}

export const PropertyVideoPlayer: React.FC<Props> = ({ property }) => {
  const { language, t, settings, getWhatsAppUrl, getCallUrl } = useApp();

  const title = (language === 'ta' && property.titleTa) ? property.titleTa : property.title;
  const location = `${property.area}, ${property.district}`;

  return (
    <div className="bg-slate-900 rounded-2xl md:rounded-3xl overflow-hidden border border-slate-800 shadow-elevated">
      {/* Video Header / Tag */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-white">
          <div className="w-7 h-7 rounded-lg bg-brand-600/30 text-emerald-400 flex items-center justify-center border border-brand-500/30">
            <Video className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs md:text-sm">{t.property.videoTour}</span>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
          {property.propertyCode}
        </span>
      </div>

      {/* Video Frame */}
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {property.videoUrl ? (
          <video
            src={property.videoUrl}
            controls
            poster={property.images[0]?.url}
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3 text-white">
              <Play className="w-8 h-8 ml-1" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Property Walkthrough Video</p>
            <p className="text-xs text-slate-500 mt-1">Uploaded and verified by SPP Nestora Admin</p>
          </div>
        )}
      </div>

      {/* SPP NESTORA MANDATORY OFFICIAL ENQUIRY BANNER */}
      <div className="p-4 md:p-5 bg-gradient-to-r from-brand-950 via-slate-900 to-navy-950 border-t border-brand-900/50 text-white">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 flex-shrink-0 hidden sm:flex">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                {language === 'ta' ? 'விசாரணை & நேரடி பார்வைக்கு' : 'For Enquiry / Site Visit'}
              </p>
              <p className="text-sm md:text-base font-extrabold text-white flex items-center justify-center sm:justify-start space-x-1.5">
                <span>📞 Contact SPP Nestora Official Desk</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <a
              href={getCallUrl()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t.property.callNow}</span>
            </a>

            <a
              href={getWhatsAppUrl(property.propertyCode, title, location)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t.property.whatsapp}</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};
