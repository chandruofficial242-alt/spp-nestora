import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/api';
import { Building2, Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { language, t, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setErrorMessage('');

    try {
      await apiService.requestPasswordReset(email.trim());
      setSent(true);
      showToast(
        language === 'ta' 
          ? 'கடவுச்சொல் மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டது' 
          : 'Password reset instructions sent', 
        'info'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send password reset link. Please try again.');
      showToast(err.message || 'Request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-elevated text-center">
        
        <Link to="/" className="inline-flex items-center space-x-2 mx-auto">
          <div className="w-10 h-10 rounded-xl bg-brand-800 text-white flex items-center justify-center font-black">
            <Building2 className="w-6 h-6 text-emerald-300" />
          </div>
          <span className="text-2xl font-black text-slate-900">SPP Nestora</span>
        </Link>

        {sent ? (
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {language === 'ta' ? 'மின்னஞ்சலை சரிபார்க்கவும்' : 'Check Your Email'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              {language === 'ta' 
                ? <>கடவுச்சொல் மீட்டமைப்பு இணைப்பு <strong className="text-slate-900">{email}</strong> என்ற மின்னஞ்சலுக்கு அனுப்பப்பட்டுள்ளது.</>
                : <>If an account is associated with <strong className="text-slate-900">{email}</strong>, you will receive a secure password reset link shortly.</>
              }
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-500 space-y-1.5">
              <p className="font-semibold text-slate-700">
                {language === 'ta' ? 'முக்கிய குறிப்பு:' : 'Important Notice:'}
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>{language === 'ta' ? 'இணைப்பு 1 மணிநேரம் மட்டுமே செல்லுபடியாகும்.' : 'The reset link is valid for 1 hour and single-use.'}</li>
                <li>{language === 'ta' ? 'ஸ்பேம் (Spam) கோப்புறையையும் சரிபார்க்கவும்.' : 'Please check your Spam or Junk folder if not received in a few minutes.'}</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              <Link
                to="/login"
                className="inline-block py-2.5 px-4 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {language === 'ta' ? 'உள்நுழைவு பக்கத்திற்கு செல்' : 'Return to Sign In'}
              </Link>
              <button
                type="button"
                onClick={() => { setSent(false); setErrorMessage(''); }}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                {language === 'ta' ? 'வேறு மின்னஞ்சலை உள்ளிடவும்' : 'Try another email address'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t.auth.forgotPassword}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ta'
                  ? 'உங்கள் பதிவு செய்யப்பட்ட மின்னஞ்சல் முகவரியை உள்ளிடவும், கடவுச்சொல்லை மீட்டமைக்கும் இணைப்பை அனுப்புவோம்.'
                  : "Enter your registered or configured Admin email address to receive password reset instructions."
                }
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.auth.email}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sppnestora.com or your email"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden disabled:bg-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'ta' ? 'அனுப்பப்படுகிறது...' : 'Sending Link...'}</span>
                  </>
                ) : (
                  <span>{language === 'ta' ? 'மீட்டமைப்பு இணைப்பு அனுப்பு' : 'Send Reset Link'}</span>
                )}
              </button>
            </form>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-brand-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'ta' ? 'உள்நுழைவுக்கு திரும்பு' : 'Back to Login'}</span>
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
export default ForgotPasswordPage;
