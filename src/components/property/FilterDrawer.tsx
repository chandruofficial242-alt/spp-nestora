import React from 'react';
import { PropertyFilter, PropertyType } from '../../types';
import { useApp } from '../../context/AppContext';
import { TN_DISTRICTS } from '../../data/seedData';
import { Filter, X, RotateCcw, Check, IndianRupee } from 'lucide-react';

interface Props {
  filters: PropertyFilter;
  onChange: (filters: PropertyFilter) => void;
  onReset: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isMobileDrawer?: boolean;
}

export const FilterDrawer: React.FC<Props> = ({
  filters,
  onChange,
  onReset,
  isOpen = true,
  onClose,
  isMobileDrawer = false
}) => {
  const { language, t } = useApp();

  const handleTypeChange = (type: PropertyType | 'all') => {
    onChange({ ...filters, type });
  };

  const handleDistrictChange = (district: string) => {
    onChange({ ...filters, district: district === 'all' ? undefined : district });
  };

  const handleSortChange = (sortBy: any) => {
    onChange({ ...filters, sortBy });
  };

  const content = (
    <div className="space-y-6">
      
      {/* Property Category Pill Switcher */}
      <div>
        <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
          {t.filters.propertyType}
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => handleTypeChange('all')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition ${
              !filters.type || filters.type === 'all'
                ? 'bg-white text-brand-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.hero.allTypes}
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('land_sale')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition ${
              filters.type === 'land_sale'
                ? 'bg-white text-brand-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏞️ {t.property.land}
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('house_sale')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition ${
              filters.type === 'house_sale'
                ? 'bg-white text-brand-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏠 {t.property.sale}
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('house_rent')}
            className={`py-2 px-2 text-xs font-bold rounded-lg transition ${
              filters.type === 'house_rent'
                ? 'bg-white text-brand-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏘️ {t.property.rent}
          </button>
        </div>
      </div>

      {/* District Dropdown */}
      <div>
        <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
          {t.filters.district}
        </label>
        <select
          value={filters.district || 'all'}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-600 focus:bg-white outline-hidden font-medium text-slate-800"
        >
          <option value="all">{t.hero.allDistricts}</option>
          {TN_DISTRICTS.map((dist) => (
            <option key={dist} value={dist}>{dist}</option>
          ))}
        </select>
      </div>

      {/* BHK Buttons (if not land) */}
      {filters.type !== 'land_sale' && (
        <div>
          <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            {t.filters.bedrooms}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['any', 1, 2, 3, 4, 5].map((bhk) => (
              <button
                key={bhk.toString()}
                type="button"
                onClick={() => onChange({ ...filters, bedrooms: bhk === 'any' ? undefined : (bhk as number) })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                  (filters.bedrooms === bhk || (!filters.bedrooms && bhk === 'any'))
                    ? 'bg-brand-800 text-white border-brand-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {bhk === 'any' ? 'Any' : `${bhk} BHK`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Budget Range Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {t.filters.budget}
          </label>
          {filters.maxPrice && (
            <span className="text-xs font-bold text-brand-700">
              Up to ₹{filters.maxPrice >= 10000000 ? `${filters.maxPrice / 10000000} Cr` : `${filters.maxPrice / 100000} L`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.minPrice || ''}
            onChange={(e) => onChange({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
            className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
          >
            <option value="">Min Budget</option>
            <option value="10000">₹10,000</option>
            <option value="25000">₹25,000</option>
            <option value="2000000">₹20 Lakhs</option>
            <option value="5000000">₹50 Lakhs</option>
            <option value="10000000">₹1 Crore</option>
          </select>

          <select
            value={filters.maxPrice || ''}
            onChange={(e) => onChange({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
            className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-hidden"
          >
            <option value="">Max Budget</option>
            <option value="30000">₹30,000</option>
            <option value="50000">₹50,000</option>
            <option value="5000000">₹50 Lakhs</option>
            <option value="10000000">₹1 Crore</option>
            <option value="30000000">₹3 Crores</option>
          </select>
        </div>
      </div>

      {/* Verified & Legal Checkboxes */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-medium text-slate-800">
          <input
            type="checkbox"
            checked={!!filters.verifiedOnly}
            onChange={(e) => onChange({ ...filters, verifiedOnly: e.target.checked })}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
          />
          <span>{t.filters.verifiedOnly}</span>
        </label>

        <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-medium text-slate-800">
          <input
            type="checkbox"
            checked={!!filters.dtcpReraOnly}
            onChange={(e) => onChange({ ...filters, dtcpReraOnly: e.target.checked })}
            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
          />
          <span>{t.filters.dtcpApproved}</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t.filters.clearAll}</span>
        </button>

        {isMobileDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition"
          >
            {t.filters.apply}
          </button>
        )}
      </div>

    </div>
  );

  if (isMobileDrawer) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
        <div className="w-full max-w-sm bg-white h-full overflow-y-auto p-5 flex flex-col justify-between shadow-2xl animate-slideLeft">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
                <Filter className="w-5 h-5 text-brand-700" />
                <span>{t.filters.filterTitle}</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-subtle sticky top-24">
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <Filter className="w-4 h-4 text-brand-700" />
          <span>{t.filters.filterTitle}</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] font-bold text-slate-400 hover:text-brand-700 transition"
        >
          {t.filters.clearAll}
        </button>
      </div>
      {content}
    </div>
  );
};
