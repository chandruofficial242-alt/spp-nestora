import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, AlertCircle, CheckCircle2, Lock } from 'lucide-react';

export const TermsModal: React.FC = () => {
  const { termsAccepted, acceptTerms, language, setLanguage } = useApp();
  const [agreed, setAgreed] = useState(false);

  if (termsAccepted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-emerald-900 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <ShieldCheck className="w-6 h-6 text-emerald-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">SPP Nestora</h2>
                <p className="text-xs text-emerald-200 font-medium">Find Your Place. Build Your Future.</p>
              </div>
            </div>

            {/* Language Switcher in Modal */}
            <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/10 text-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  language === 'en' ? 'bg-white text-brand-900 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1 rounded font-medium transition-all ${
                  language === 'ta' ? 'bg-white text-brand-900 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>

        {/* Notice Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-700 text-sm leading-relaxed">
          
          {/* Dual Bilingual Card */}
          <div className="border border-brand-100 bg-brand-50/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-brand-800 font-semibold text-base">
              <AlertCircle className="w-5 h-5 text-brand-700 flex-shrink-0" />
              <span>முக்கிய அறிவிப்பு (Tamil)</span>
            </div>
            <p className="text-slate-800 leading-relaxed font-tamil-smooth">
              இந்த தளத்தின் மூலம் Property Owner/Dealer மற்றும் Customer இடையே தொடர்பு ஏற்படுத்துவதற்கான சேவை வழங்கப்படுகிறது. Property verification, documents verification மற்றும் agreement போன்றவை சம்பந்தப்பட்ட தரப்பினரின் பொறுப்பாகும்.
            </p>
            <p className="text-slate-800 leading-relaxed font-tamil-smooth font-medium">
              இந்த தளத்தில் கட்டாய commission வசூலிக்கப்படாது. Dealer property listing செய்வதற்கு பொருந்தும் listing fee தனியாக காட்டப்படும்.
            </p>
          </div>

          <div className="border border-slate-200 bg-slate-50/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 font-semibold text-base">
              <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" />
              <span>Important Notice (English)</span>
            </div>
            <p className="text-slate-700 leading-relaxed">
              This platform provides a service to connect Property Owners/Dealers and Customers. Property verification, document verification and agreements must be independently verified and completed by the respective parties.
            </p>
            <p className="text-slate-700 leading-relaxed font-medium">
              No mandatory commission is charged through this platform. Any applicable property listing fee will be clearly displayed separately.
            </p>
          </div>

          {/* Key Platform Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-slate-600">
                <strong>Platform-Assisted Visits:</strong> Centralized coordination through SPP Nestora Admin desk.
              </span>
            </div>
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-slate-600">
                <strong>Zero Direct Broker Calls:</strong> Your privacy is maintained and verified before site visits.
              </span>
            </div>
          </div>
        </div>

        {/* Footer & Consent Action */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="terms-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition"
            />
            <span className="text-xs sm:text-sm font-medium text-slate-800">
              {language === 'ta' 
                ? 'மேலே உள்ள விதிமுறைகளை படித்து முழுமையாக ஒப்புக்கொள்கிறேன்.' 
                : 'I have read and agree to the above terms & conditions.'}
            </span>
          </label>

          <button
            id="accept-terms-btn"
            disabled={!agreed}
            onClick={acceptTerms}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center space-x-2 ${
              agreed
                ? 'bg-brand-700 hover:bg-brand-800 text-white shadow-brand-700/25 hover:shadow-md cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{language === 'ta' ? 'ஏற்றுக்கொண்டு தொடரவும்' : 'Accept & Continue'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
