import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TN_DISTRICTS } from '../data/seedData';
import { Building2, User, Mail, Phone, Lock, Briefcase, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { t, register, showToast } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [role, setRole] = useState<'customer' | 'dealer'>(
    searchParams.get('role') === 'dealer' ? 'dealer' : 'customer'
  );

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Dealer specific fields
  const [businessName, setBusinessName] = useState('');
  const [district, setDistrict] = useState('Chennai');
  const [city, setCity] = useState('Chennai');
  const [address, setAddress] = useState('');
  const [dealerType, setDealerType] = useState<'individual' | 'agency' | 'builder' | 'promoter'>('agency');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone || !password) {
      showToast('Please fill all mandatory fields', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    const res = await register({
      name,
      email,
      phone,
      role,
      businessName: role === 'dealer' ? businessName : undefined,
      district: role === 'dealer' ? district : undefined,
      city: role === 'dealer' ? city : undefined,
      address: role === 'dealer' ? address : undefined,
      dealerType: role === 'dealer' ? dealerType : undefined
    }, password);

    if (res.success) {
      showToast(
        role === 'dealer' 
          ? 'Dealer account created! Under review by SPP Nestora Admin.' 
          : 'Account created successfully!', 
        'success'
      );
      if (role === 'dealer') {
        navigate('/dealer/dashboard');
      } else {
        navigate('/customer/dashboard');
      }
    } else {
      showToast(res.message || 'Registration failed', 'error');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-elevated">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-brand-800 text-white flex items-center justify-center font-black">
              <Building2 className="w-6 h-6 text-emerald-300" />
            </div>
            <span className="text-2xl font-black text-slate-900">SPP Nestora</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900 mt-3">{t.auth.createAccount}</h2>
          <p className="text-xs text-slate-500">{t.auth.registerSubtitle}</p>
        </div>

        {/* I am a: Customer / Dealer Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider text-center">
            {t.auth.iAmA}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`p-4 rounded-2xl border-2 text-center transition flex flex-col items-center space-y-1.5 ${
                role === 'customer'
                  ? 'border-brand-700 bg-brand-50/70 text-brand-900 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <User className="w-5 h-5 text-brand-700" />
              <span className="text-xs">{t.auth.customer}</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('dealer')}
              className={`p-4 rounded-2xl border-2 text-center transition flex flex-col items-center space-y-1.5 ${
                role === 'dealer'
                  ? 'border-brand-700 bg-brand-50/70 text-brand-900 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Briefcase className="w-5 h-5 text-brand-700" />
              <span className="text-xs">{t.auth.dealer}</span>
            </button>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.auth.fullName} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Karthik Ramachandran"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.auth.email} *
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.auth.phone} *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98400 12345"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>
            </div>

            {/* Dealer Specific Fields */}
            {role === 'dealer' && (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.businessName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Kovai Premier Realties & Promoters"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.district}
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setCity(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-medium"
                  >
                    {TN_DISTRICTS.map((d: string) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.dealerType}
                  </label>
                  <select
                    value={dealerType}
                    onChange={(e) => setDealerType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="agency">Real Estate Agency</option>
                    <option value="individual">Individual Property Owner</option>
                    <option value="builder">Builder / Developer</option>
                    <option value="promoter">Layout Promoter</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.auth.address}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Office / Physical address in Tamil Nadu"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.auth.password} *
              </label>
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

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.auth.confirmPassword} *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>
            </div>

          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer mt-4"
          >
            <span>{t.auth.registerBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Bottom Link to Login */}
        <div className="text-center pt-2">
          <Link
            to="/login"
            className="text-xs font-semibold text-brand-800 hover:underline"
          >
            {t.auth.alreadyHaveAccount}
          </Link>
        </div>

      </div>
    </div>
  );
};
