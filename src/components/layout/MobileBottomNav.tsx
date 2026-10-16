import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Home, 
  Compass, 
  PlusCircle, 
  Heart, 
  User as UserIcon,
  Shield,
  LayoutDashboard
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { language, currentUser, favorites } = useApp();
  const location = useLocation();

  // Hide bottom nav on property details page because MobileStickyContact is displayed there
  const isPropertyDetail = /^\/properties\/[^/]+$/.test(location.pathname) && 
    !['land-sale', 'house-sale', 'house-rent'].includes(location.pathname.replace('/properties/', ''));

  if (isPropertyDetail) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getAccountLink = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'admin') return '/admin';
    if (currentUser.role === 'dealer') return '/dealer/dashboard';
    return '/customer/dashboard';
  };

  const getAccountLabel = () => {
    if (!currentUser) return language === 'ta' ? 'உள்நுழை' : 'Login';
    if (currentUser.role === 'admin') return 'Admin';
    if (currentUser.role === 'dealer') return language === 'ta' ? 'முகவர்' : 'Dealer';
    return language === 'ta' ? 'கணக்கு' : 'Account';
  };

  const getAccountIcon = () => {
    if (currentUser?.role === 'admin') return <Shield className="w-5 h-5" />;
    if (currentUser?.role === 'dealer') return <LayoutDashboard className="w-5 h-5" />;
    return <UserIcon className="w-5 h-5" />;
  };

  return (
    <nav 
      aria-label="Mobile Navigation" 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-champagne-200/50 shadow-premium py-1.5 px-2"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 items-center max-w-md mx-auto">
        
        {/* 1. Home */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            isActive('/') && location.pathname === '/'
              ? 'text-brand-900 font-black'
              : 'text-slate-500 hover:text-brand-800'
          }`}
        >
          <Home className={`w-5 h-5 ${isActive('/') && location.pathname === '/' ? 'text-brand-800 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-1 font-medium">
            {language === 'ta' ? 'முகப்பு' : 'Home'}
          </span>
        </Link>

        {/* 2. Explore / Search */}
        <Link
          to="/properties"
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            location.pathname === '/properties'
              ? 'text-brand-900 font-black'
              : 'text-slate-500 hover:text-brand-800'
          }`}
        >
          <Compass className={`w-5 h-5 ${location.pathname === '/properties' ? 'text-brand-800 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-1 font-medium">
            {language === 'ta' ? 'தேடுக' : 'Explore'}
          </span>
        </Link>

        {/* 3. Post Property (Prominent Center Button) */}
        <Link
          to="/dealer/add-property"
          className="flex flex-col items-center justify-center -mt-4 group"
          title="Post Property Listing"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-900 via-brand-800 to-emerald-700 text-white flex items-center justify-center shadow-gold border-2 border-white group-active:scale-95 transition-transform">
            <PlusCircle className="w-6 h-6 text-champagne-300" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold text-brand-900">
            {language === 'ta' ? 'பதிவிடுக' : 'Post'}
          </span>
        </Link>

        {/* 4. Saved */}
        <Link
          to="/saved-properties"
          className={`flex flex-col items-center justify-center py-1 rounded-xl relative transition ${
            isActive('/saved-properties')
              ? 'text-brand-900 font-black'
              : 'text-slate-500 hover:text-brand-800'
          }`}
        >
          <div className="relative">
            <Heart className={`w-5 h-5 ${isActive('/saved-properties') ? 'text-rose-600 fill-rose-600' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border border-white">
                {favorites.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 font-medium">
            {language === 'ta' ? 'விருப்பங்கள்' : 'Saved'}
          </span>
        </Link>

        {/* 5. Account / Dashboard */}
        <Link
          to={getAccountLink()}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
            isActive(getAccountLink())
              ? 'text-brand-900 font-black'
              : 'text-slate-500 hover:text-brand-800'
          }`}
        >
          {getAccountIcon()}
          <span className="text-[10px] mt-1 font-medium truncate max-w-[64px]">
            {getAccountLabel()}
          </span>
        </Link>

      </div>
    </nav>
  );
};
