import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Building2, Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { t, login, showToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roleParam = searchParams.get('role') || 'customer';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'dealer' | 'admin'>(
    roleParam === 'admin' ? 'admin' : roleParam === 'dealer' ? 'dealer' : 'customer'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    const success = await login(email, password || (selectedRole === 'admin' ? 'admin123' : selectedRole === 'dealer' ? 'dealer123' : 'customer123'), selectedRole);
    if (success) {
      if (selectedRole === 'admin') navigate('/admin');
      else if (selectedRole === 'dealer') navigate('/dealer/dashboard');
      else navigate('/customer/dashboard');
    }
  };

  const handleQuickDemoLogin = async (role: 'admin' | 'dealer' | 'customer') => {
    setSelectedRole(role);
    if (role === 'admin') {
      setEmail('admin@sppnestora.com');
      setPassword('admin123');
      const ok = await login('admin@sppnestora.com', 'admin123', 'admin');
      if (ok) navigate('/admin');
    } else if (role === 'dealer') {
      setEmail('dealer@sppnestora.com');
      setPassword('dealer123');
      const ok = await login('dealer@sppnestora.com', 'dealer123', 'dealer');
      if (ok) navigate('/dealer/dashboard');
    } else {
      setEmail('customer@sppnestora.com');
      setPassword('customer123');
      const ok = await login('customer@sppnestora.com', 'customer123', 'customer');
      if (ok) navigate('/customer/dashboard');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white/98 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-champagne-300/60 shadow-premium">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-950 border border-champagne-400/30 text-white flex items-center justify-center font-black shadow-md">
              <Building2 className="w-6 h-6 text-champagne-300" />
            </div>
            <span className="text-2xl font-black text-slate-900 tracking-tight">SPP Nestora</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900 mt-3">{t.auth.welcomeBack}</h2>
          <p className="text-xs text-slate-500">{t.auth.loginSubtitle}</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-ivory-200/80 rounded-2xl border border-champagne-200/70 text-xs font-bold shadow-2xs">
          <button
            type="button"
            onClick={() => setSelectedRole('customer')}
            className={`py-2 rounded-xl transition ${
              selectedRole === 'customer'
                ? 'bg-brand-900 text-white shadow-gold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('dealer')}
            className={`py-2 rounded-xl transition ${
              selectedRole === 'dealer'
                ? 'bg-brand-900 text-white shadow-gold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Dealer
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            className={`py-2 rounded-xl transition ${
              selectedRole === 'admin'
                ? 'bg-brand-900 text-white shadow-gold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            Admin
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-ivory-50/50 border border-champagne-200/80 rounded-xl focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-hidden shadow-2xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t.auth.password}
              </label>
              <Link to="/forgot-password" className="text-xs text-brand-800 hover:underline font-semibold">
                {t.auth.forgotPassword}
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-ivory-50/50 border border-champagne-200/80 rounded-xl focus:border-brand-600 focus:ring-1 focus:ring-brand-600 outline-hidden shadow-2xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-brand-800 to-brand-950 hover:from-brand-700 hover:to-brand-900 text-white border border-champagne-400/30 rounded-xl font-bold text-sm shadow-gold transition flex items-center justify-center space-x-2"
          >
            <span>{t.auth.loginBtn}</span>
            <ArrowRight className="w-4 h-4 text-champagne-300" />
          </button>
        </form>

        {/* Demo Fast-Login Helpers */}
        <div className="pt-4 border-t border-champagne-100 space-y-2">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider text-center">
            Quick 1-Click Demo Logins:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('customer')}
              className="py-1.5 px-2 bg-ivory-50 hover:bg-ivory-100 border border-champagne-200/70 rounded-xl text-[11px] font-bold text-slate-700 text-center transition"
            >
              Demo Customer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('dealer')}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-900 text-center transition"
            >
              Demo Dealer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="py-1.5 px-2 bg-champagne-100/70 hover:bg-champagne-100 border border-champagne-300/70 rounded-xl text-[11px] font-bold text-brand-950 text-center transition"
            >
              Demo Admin
            </button>
          </div>
        </div>

        {/* Bottom Link to Register */}
        <div className="text-center pt-2">
          <Link
            to="/register"
            className="text-xs font-semibold text-brand-900 hover:underline"
          >
            {t.auth.dontHaveAccount}
          </Link>
        </div>

      </div>
    </div>
  );
};
