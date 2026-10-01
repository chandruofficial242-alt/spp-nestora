import React from 'react';
import { useApp } from '../../context/AppContext';
import { Globe } from 'lucide-react';

interface Props {
  className?: string;
  variant?: 'light' | 'dark' | 'transparent';
}

export const LanguageSwitcher: React.FC<Props> = ({ className = '', variant = 'light' }) => {
  const { language, setLanguage } = useApp();

  const isDark = variant === 'dark';

  return (
    <div className={`inline-flex items-center rounded-xl p-1 text-xs font-semibold select-none border transition-all ${
      isDark 
        ? 'bg-slate-900/80 border-slate-700/80 text-slate-300' 
        : 'bg-white/90 border-slate-200 shadow-sm text-slate-700'
    } ${className}`}>
      <Globe className={`w-3.5 h-3.5 ml-1.5 mr-1 ${isDark ? 'text-emerald-400' : 'text-brand-600'}`} />
      
      <button
        type="button"
        id="lang-btn-en"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          language === 'en'
            ? isDark
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-brand-800 text-white shadow-sm'
            : 'hover:text-brand-600 hover:bg-slate-100/50'
        }`}
        title="Switch to English"
      >
        English
      </button>
      
      <button
        type="button"
        id="lang-btn-ta"
        onClick={() => setLanguage('ta')}
        className={`px-2.5 py-1 rounded-lg transition-all font-tamil-smooth ${
          language === 'ta'
            ? isDark
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-brand-800 text-white shadow-sm'
            : 'hover:text-brand-600 hover:bg-slate-100/50'
        }`}
        title="தமிழுக்கு மாறவும்"
      >
        தமிழ்
      </button>
    </div>
  );
};
