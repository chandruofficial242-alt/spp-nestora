import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  ShieldCheck, 
  ArrowUpRight,
  Clock,
  Heart
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { t, language, settings, getWhatsAppUrl, getCallUrl } = useApp();

  return (
    <footer className="bg-navy-900 text-slate-300 pt-16 pb-24 md:pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Disclaimer & Trust Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-12 backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">
                  {t.footer.disclaimerTitle}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                  {t.footer.disclaimerBody}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto flex-shrink-0">
              <a
                href={getCallUrl()}
                className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{language === 'ta' ? 'அழைக்கவும்' : 'Call Desk'}</span>
              </a>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-navy-950 rounded-xl text-xs font-bold transition shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-black shadow-md">
                <Building2 className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <span className="text-xl font-black text-white tracking-tight">SPP Nestora</span>
                <p className="text-[10px] text-emerald-400 font-medium">
                  {language === 'ta' ? 'நிலம் | வீடுகள் | வாடகை | சொத்துக்கள்' : 'Land | Houses | Rentals | Properties'}
                </p>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {t.footer.aboutText}
            </p>

            <div className="pt-2 flex items-center space-x-3">
              <LanguageSwitcher variant="dark" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {t.footer.quickLinks}
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li>
                <Link to="/" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.home}</span>
                </Link>
              </li>
              <li>
                <Link to="/properties/land-sale" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.landSale}</span>
                </Link>
              </li>
              <li>
                <Link to="/properties/house-sale" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.houseSale}</span>
                </Link>
              </li>
              <li>
                <Link to="/properties/house-rent" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.houseRent}</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.about}</span>
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.contact}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* For Dealers */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {t.footer.forDealers}
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li>
                <Link to="/register?role=dealer" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.becomeDealer}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                </Link>
              </li>
              <li>
                <Link to="/login?role=dealer" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.dealerLogin}</span>
                </Link>
              </li>
              <li>
                <Link to="/dealer/add-property" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>{t.nav.addProperty} (₹10 Listing)</span>
                </Link>
              </li>
              <li>
                <Link to="/login?role=admin" className="hover:text-emerald-400 transition flex items-center justify-between">
                  <span>Admin Control Center</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Official SPP Nestora Contact Info */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {language === 'ta' ? 'அதிகாரப்பூர்வ தொடர்பு' : 'Official Contact Desk'}
            </h4>
            <div className="space-y-3 text-xs text-slate-400">
              <a href={getCallUrl()} className="flex items-start space-x-2.5 hover:text-white transition">
                <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-200">{settings.officialPhoneDisplay}</span>
                  <span className="text-[10px] text-slate-500">Direct Official Line</span>
                </div>
              </a>

              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="flex items-start space-x-2.5 hover:text-white transition">
                <MessageSquare className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block font-bold text-slate-200">{settings.officialWhatsAppDisplay}</span>
                  <span className="text-[10px] text-slate-500">Official WhatsApp</span>
                </div>
              </a>

              <div className="flex items-start space-x-2.5">
                <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">{settings.officialEmail}</span>
              </div>

              <div className="flex items-start space-x-2.5">
                <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-400">{settings.supportHours}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} SPP Nestora. {t.footer.rights}</p>
          <div className="flex items-center space-x-6">
            <Link to="/about" className="hover:text-slate-400 transition">Privacy Policy</Link>
            <Link to="/about" className="hover:text-slate-400 transition">Terms of Service</Link>
            <Link to="/contact" className="hover:text-slate-400 transition">Verification Guidelines</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
