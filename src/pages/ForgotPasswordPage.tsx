import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { language, t, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    showToast(language === 'ta' ? 'கடவுச்சொல் மீட்டமைப்பு இணைப்பு அனுப்பப்பட்டது' : 'Password reset link sent to your email', 'info');
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
            <h3 className="text-lg font-bold text-slate-900">Check Your Email</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
              We have sent a secure password reset link to <strong className="text-slate-900">{email}</strong>.
            </p>
            <Link
              to="/login"
              className="inline-block pt-2 text-xs font-bold text-brand-800 hover:underline"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t.auth.forgotPassword}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your registered email address and we'll send you instructions to reset your password.
              </p>
            </div>

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition"
              >
                Send Reset Link
              </button>
            </form>

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-brand-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
