import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, AlertCircle, CheckCircle2, FileText, BadgePercent, Shield } from 'lucide-react';

export const TermsModal: React.FC = () => {
  const { termsAccepted, acceptTerms, language, setLanguage } = useApp();
  const [agreed, setAgreed] = useState(false);

  if (termsAccepted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Brand Header */}
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
                id="notice-lang-en-btn"
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded font-medium transition-all cursor-pointer ${
                  language === 'en' ? 'bg-white text-brand-900 shadow-sm font-bold' : 'text-white/80 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                id="notice-lang-ta-btn"
                type="button"
                onClick={() => setLanguage('ta')}
                className={`px-3 py-1 rounded font-medium transition-all font-tamil-smooth cursor-pointer ${
                  language === 'ta' ? 'bg-white text-brand-900 shadow-sm font-bold' : 'text-white/80 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>

        {/* Notice Content: Strict Language Separation */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm leading-relaxed">
          {language === 'en' ? (
            /* =======================================================
               ENGLISH NOTICE MODE ONLY
               ======================================================= */
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-200 pb-3">
                <AlertCircle className="w-5 h-5 text-brand-700 flex-shrink-0" />
                <span>Important Notice</span>
              </div>

              <p className="text-slate-700 leading-relaxed text-sm">
                This platform connects property owners/dealers with customers. Property ownership, property documents, legal verification, and agreements must be independently verified and completed by the respective parties.
              </p>

              {/* Broker Commission for Land Transactions */}
              <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <BadgePercent className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>Broker Commission for Land Transactions</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">
                  <strong>Broker Commission for Land Transactions:</strong> For land purchase or sale transactions facilitated through a broker associated with SPP Nestora, applicable broker commission may be charged. The commission amount or percentage, payment responsibility, and applicable terms must be clearly communicated and agreed upon by the concerned parties before proceeding with the transaction.
                </p>
              </div>

              {/* Property Listing Fee */}
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                  <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>Property Listing Fee</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">
                  <strong>Property Listing Fee:</strong> Any applicable property listing fee will be displayed separately before listing submission.
                </p>
              </div>

              {/* Platform-Assisted Visits & Privacy Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 block mb-0.5">Platform-Assisted Visits:</strong>
                    Site visits are coordinated through the SPP Nestora Admin Desk.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 block mb-0.5">Privacy:</strong>
                    Customer and dealer contact details are protected and shared only as necessary for authorized coordination.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =======================================================
               TAMIL NOTICE MODE ONLY
               ======================================================= */
            <div className="space-y-4 font-tamil-smooth">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-base sm:text-lg border-b border-slate-200 pb-3">
                <AlertCircle className="w-5 h-5 text-brand-700 flex-shrink-0" />
                <span>முக்கிய அறிவிப்பு</span>
              </div>

              <p className="text-slate-800 leading-relaxed text-sm">
                இந்த தளத்தின் மூலம் சொத்து உரிமையாளர்கள் / டீலர்கள் மற்றும் வாடிக்கையாளர்களுக்கு இடையே தொடர்பு ஏற்படுத்தும் சேவை வழங்கப்படுகிறது. சொத்தின் உரிமை, சொத்து ஆவணங்கள், சட்டப்பூர்வ சரிபார்ப்பு மற்றும் ஒப்பந்தங்கள் ஆகியவற்றை சம்பந்தப்பட்ட தரப்பினர் தனித்தனியாகச் சரிபார்த்து உறுதிப்படுத்த வேண்டும்.
              </p>

              {/* Broker Commission for Land Transactions in Tamil */}
              <div className="border border-amber-200 bg-amber-50/70 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <BadgePercent className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>நிலம் வாங்குதல் / விற்பனைக்கான புரோக்கர் கமிஷன்</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">
                  <strong>நிலம் வாங்குதல் / விற்பனைக்கான புரோக்கர் கமிஷன்:</strong> SPP Nestora உடன் தொடர்புடைய புரோக்கர் மூலம் நிலம் வாங்குதல் அல்லது விற்பனை செய்தால், பொருந்தக்கூடிய புரோக்கர் கமிஷன் வசூலிக்கப்படலாம். கமிஷன் தொகை அல்லது சதவீதம், யார் செலுத்த வேண்டும் மற்றும் பொருந்தும் நிபந்தனைகள் ஆகியவை பரிவர்த்தனைக்கு முன்பே சம்பந்தப்பட்ட தரப்பினருக்கு தெளிவாகத் தெரிவிக்கப்பட்டு ஒப்புக்கொள்ளப்பட வேண்டும்.
                </p>
              </div>

              {/* Property Listing Fee in Tamil */}
              <div className="border border-emerald-200 bg-emerald-50/60 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                  <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>சொத்து பட்டியலிடும் கட்டணம்</span>
                </div>
                <p className="text-slate-800 leading-relaxed text-xs sm:text-sm">
                  <strong>சொத்து பட்டியலிடும் கட்டணம்:</strong> பொருந்தக்கூடிய சொத்து பட்டியலிடும் கட்டணம், பட்டியலைச் சமர்ப்பிப்பதற்கு முன்பே தனியாகக் காட்டப்படும்.
                </p>
              </div>

              {/* Platform-Assisted Visits & Privacy Grid in Tamil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 block mb-0.5">தளத்தின் மூலம் ஒருங்கிணைக்கப்படும் பார்வையிடுதல்:</strong>
                    சொத்தை நேரில் பார்வையிடுவதற்கான ஏற்பாடுகள் SPP Nestora நிர்வாக மையத்தின் மூலம் ஒருங்கிணைக்கப்படும்.
                  </div>
                </div>
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong className="text-slate-900 block mb-0.5">தனியுரிமை:</strong>
                    வாடிக்கையாளர் மற்றும் டீலரின் தொடர்பு விவரங்கள் பாதுகாக்கப்படும். அனுமதிக்கப்பட்ட ஒருங்கிணைப்புக்குத் தேவையான அளவில் மட்டுமே அவை பகிரப்படும்.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer & Consent Action */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              id="terms-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 rounded text-brand-600 focus:ring-brand-500 border-slate-300 transition cursor-pointer"
            />
            <span className={`text-xs sm:text-sm font-medium text-slate-800 ${language === 'ta' ? 'font-tamil-smooth' : ''}`}>
              {language === 'ta' 
                ? 'மேலே உள்ள விதிமுறைகளை படித்து முழுமையாக ஒப்புக்கொள்கிறேன்.' 
                : 'I have read and agree to the above terms & conditions.'}
            </span>
          </label>

          <button
            id="accept-terms-btn"
            type="button"
            disabled={!agreed}
            onClick={acceptTerms}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center space-x-2 cursor-pointer ${
              language === 'ta' ? 'font-tamil-smooth' : ''
            } ${
              agreed
                ? 'bg-brand-700 hover:bg-brand-800 text-white shadow-brand-700/25 hover:shadow-md'
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
