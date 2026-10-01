import React from 'react';
import { SearchX, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Props {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetText?: string;
}

export const EmptyState: React.FC<Props> = ({ title, description, onReset, resetText }) => {
  const { t } = useApp();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 md:p-12 text-center max-w-lg mx-auto shadow-subtle my-6">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-100 text-brand-700 flex items-center justify-center mx-auto mb-4">
        <SearchX className="w-8 h-8" />
      </div>
      <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2">
        {title || t.property.noPropertiesFound}
      </h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {description || t.property.noPropertiesDesc}
      </p>
      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{resetText || t.filters.clearAll}</span>
        </button>
      )}
    </div>
  );
};
