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
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-elevated">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-brand-800 text-white flex items-center justify-center font-black">
              <Building2 className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="text-2xl font-black text-slate-900">SPP Nestora</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900 mt-3">{t.auth.welcomeBack}</h2>
          <p className="text-xs text-slate-500">{t.auth.loginSubtitle}</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedRole('customer')}
            className={`py-2 rounded-lg transition ${
              selectedRole === 'customer'
                ? 'bg-white text-brand-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('dealer')}
            className={`py-2 rounded-lg transition ${
              selectedRole === 'dealer'
                ? 'bg-white text-brand-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Dealer
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            className={`py-2 rounded-lg transition ${
              selectedRole === 'admin'
                ? 'bg-white text-brand-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
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
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {t.auth.password}
              </label>
              <Link to="/forgot-password" className="text-xs text-brand-700 hover:underline font-semibold">
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
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2"
          >
            <span>{t.auth.loginBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast-Login Helpers */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider text-center">
            Quick 1-Click Demo Logins:
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('customer')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 text-center"
            >
              Demo Customer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('dealer')}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-800 text-center"
            >
              Demo Dealer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="py-1.5 px-2 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg text-[11px] font-bold text-brand-900 text-center"
            >
              Demo Admin
            </button>
          </div>
        </div>

        {/* Bottom Link to Register */}
        <div className="text-center pt-2">
          <Link
            to="/register"
            className="text-xs font-semibold text-brand-800 hover:underline"
          >
            {t.auth.dontHaveAccount}
          </Link>
        </div>

      </div>
    </div>
  );
};
