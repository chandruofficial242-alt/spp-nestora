import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { 
  Building2, 
  PlusCircle, 
  Heart, 
  User as UserIcon, 
  Menu, 
  X, 
  Shield, 
  Compass, 
  PhoneCall, 
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Layers
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { language, t, currentUser, logout, favorites, settings } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isCurrent = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { label: t.nav.home, path: '/' },
    { label: t.nav.landSale, path: '/properties/land-sale' },
    { label: t.nav.houseSale, path: '/properties/house-sale' },
    { label: t.nav.houseRent, path: '/properties/house-rent' },
    { label: t.nav.about, path: '/about' },
    { label: t.nav.contact, path: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      
      {/* Top micro announcement bar */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-emerald-900 text-white text-[11px] sm:text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate">
            <span className="bg-white/20 text-emerald-200 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase">
              Tamil Nadu Desk
            </span>
            <span className="truncate opacity-90 hidden sm:inline">
              {language === 'ta' 
                ? 'அனைத்து விசாரணைகளும் SPP நெஸ்டோரா அதிகாரப்பூர்வ குழுவால் ஒருங்கிணைக்கப்படுகின்றன' 
                : 'All enquiries & site visits are directly coordinated by SPP Nestora Admin team'}
            </span>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0 text-xs font-medium">
            <a 
              href={`tel:${settings.officialPhone}`} 
              className="flex items-center space-x-1 text-emerald-200 hover:text-white transition"
            >
              <PhoneCall className="w-3 h-3 text-emerald-400" />
              <span>{settings.officialPhoneDisplay}</span>
            </a>
            <div className="h-3 w-px bg-white/20 hidden md:block" />
            <Link to="/about" className="text-white/80 hover:text-white hidden md:inline">
              {language === 'ta' ? 'விதிமுறைகள்' : 'Direct Assistance'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Brand Logo & Tagline */}
          <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-950 flex items-center justify-center text-white shadow-md shadow-brand-900/15 group-hover:scale-105 transition-all">
              <Building2 className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 group-hover:text-brand-800 transition">
                  SPP Nestora
                </span>
                <span className="text-[10px] bg-emerald-100 text-brand-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                  TN
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide truncate max-w-[170px] sm:max-w-none">
                Find Your Place. Build Your Future.
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isCurrent(link.path)
                    ? 'text-brand-800 bg-brand-50/80 font-bold'
                    : 'text-slate-600 hover:text-brand-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Saved Properties */}
            <Link
              to="/saved-properties"
              className="relative p-2 rounded-xl text-slate-600 hover:text-brand-700 hover:bg-slate-100/80 transition"
              title={t.nav.saved}
            >
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Post Property CTA */}
            <Link
              to="/dealer/add-property"
              className="hidden sm:inline-flex items-center space-x-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-brand-700/20 hover:shadow transition group"
            >
              <PlusCircle className="w-4 h-4 text-emerald-300 group-hover:rotate-90 transition-transform duration-300" />
              <span>{t.nav.addProperty}</span>
            </Link>

            {/* User Account / Auth Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <img
                    src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.name}`}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover bg-slate-200"
                  />
                  <div className="hidden md:block text-left text-xs pr-1">
                    <span className="font-bold text-slate-800 block truncate max-w-[100px]">{currentUser.name}</span>
                    <span className="text-[10px] text-slate-400 capitalize font-medium">{currentUser.role}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-fadeIn"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-800 border border-brand-200">
                        {currentUser.role}
                      </span>
                    </div>

                    {currentUser.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <Shield className="w-4 h-4 text-brand-700" />
                        <span>{t.nav.adminDashboard}</span>
                      </Link>
                    )}

                    {currentUser.role === 'dealer' && (
                      <>
                        <Link
                          to="/dealer/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          <LayoutDashboard className="w-4 h-4 text-brand-700" />
                          <span>{t.nav.dealerDashboard}</span>
                        </Link>
                        <Link
                          to="/dealer/add-property"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                        >
                          <PlusCircle className="w-4 h-4 text-brand-700" />
                          <span>{t.nav.addProperty}</span>
                        </Link>
                      </>
                    )}

                    {currentUser.role === 'customer' && (
                      <Link
                        to="/customer/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 font-semibold"
                      >
                        <UserIcon className="w-4 h-4 text-brand-700" />
                        <span>{t.nav.customerDashboard}</span>
                      </Link>
                    )}

                    <div className="border-t border-slate-100 my-1" />

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                        navigate('/');
                      }}
                      className="w-full text-left flex items-center space-x-2.5 px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-semibold transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.nav.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <Link
                  to="/login"
                  className="px-3 py-2 text-slate-700 hover:text-brand-800 text-xs sm:text-sm font-bold transition rounded-xl hover:bg-slate-50"
                >
                  {t.nav.login}
                </Link>
                <Link
                  to="/register"
                  className="hidden md:inline-flex px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-sm"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-between ${
                  isCurrent(link.path)
                    ? 'text-brand-800 bg-brand-50 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2">
            <Link
              to="/dealer/add-property"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-brand-700 text-white rounded-xl font-bold text-sm shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-emerald-300" />
              <span>{t.nav.addProperty}</span>
            </Link>

            {!currentUser && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-xs"
                >
                  {t.nav.login}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 text-center bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs"
                >
                  {t.nav.register}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};
