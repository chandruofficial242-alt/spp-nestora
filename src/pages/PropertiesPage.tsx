import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PropertyFilter, PropertyType, Property } from '../types';
import { PropertyCard } from '../components/common/PropertyCard';
import { FilterDrawer } from '../components/property/FilterDrawer';
import { EmptyState } from '../components/common/EmptyState';
import { 
  Grid, 
  List, 
  Search, 
  SlidersHorizontal,
  MapPin
} from 'lucide-react';

interface Props {
  presetType?: PropertyType;
}

export const PropertiesPage: React.FC<Props> = ({ presetType }) => {
  const { t, publicProperties } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // Layout View Mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Parse Initial Filters from URL
  const [filters, setFilters] = useState<PropertyFilter>(() => {
    return {
      type: presetType || (searchParams.get('type') as PropertyType) || 'all',
      district: searchParams.get('district') || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      searchQuery: searchParams.get('search') || '',
      sortBy: (searchParams.get('sort') as any) || 'newest',
      bedrooms: searchParams.get('bhk') ? (searchParams.get('bhk') === 'any' ? 'any' : Number(searchParams.get('bhk'))) : undefined,
      verifiedOnly: searchParams.get('verified') === 'true',
      dtcpReraOnly: searchParams.get('dtcp') === 'true'
    };
  });

  useEffect(() => {
    if (presetType) {
      setFilters((prev: PropertyFilter) => ({ ...prev, type: presetType }));
    }
  }, [presetType]);

  // Sync Search Query
  const handleSearchChange = (query: string) => {
    setFilters((prev: PropertyFilter) => ({ ...prev, searchQuery: query }));
  };

  const handleResetFilters = () => {
    setFilters({
      type: presetType || 'all',
      district: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      searchQuery: '',
      sortBy: 'newest',
      bedrooms: undefined,
      verifiedOnly: false,
      dtcpReraOnly: false
    });
    setSearchParams({});
  };

  // Filter & Sort Logic
  const filteredListings = useMemo(() => {
    let result = [...publicProperties];

    // Category Type
    if (filters.type && filters.type !== 'all') {
      result = result.filter(p => p.type === filters.type);
    }

    // District
    if (filters.district && filters.district !== 'all') {
      result = result.filter(p => p.district.toLowerCase() === filters.district?.toLowerCase());
    }

    // Min / Max Price
    if (filters.minPrice) {
      result = result.filter(p => p.price >= (filters.minPrice || 0));
    }
    if (filters.maxPrice) {
      result = result.filter(p => p.price <= (filters.maxPrice || Infinity));
    }

    // Bedrooms
    if (filters.bedrooms && filters.bedrooms !== 'any') {
      result = result.filter(p => p.bedrooms === filters.bedrooms);
    }

    // Verified Only
    if (filters.verifiedOnly) {
      result = result.filter(p => p.verified);
    }

    // DTCP Only
    if (filters.dtcpReraOnly) {
      result = result.filter(p => p.dtcpApproved || p.reraApproved);
    }

    // Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter((p: Property) => 
        p.title.toLowerCase().includes(q) ||
        (p.titleTa && p.titleTa.toLowerCase().includes(q)) ||
        p.area.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.propertyCode.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (filters.sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === 'sqft_desc') {
      result.sort((a, b) => b.areaSqft - a.areaSqft);
    } else {
      // newest
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [publicProperties, filters]);

  const pageTitle = presetType === 'land_sale'
    ? t.categories.landSaleTitle
    : presetType === 'house_sale'
    ? t.categories.houseSaleTitle
    : presetType === 'house_rent'
    ? t.categories.houseRentTitle
    : t.nav.allProperties;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-brand-700 uppercase tracking-widest mb-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tamil Nadu Real Estate Marketplace</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {filteredListings.length} {t.filters.resultsFound}
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search area, property ID, locality..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-hidden shadow-xs"
            />
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200 gap-3">
          
          {/* Mobile Filter Button */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-700" />
            <span>{t.filters.filterTitle}</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 ml-auto">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">{t.filters.sortBy}:</span>
            <select
              value={filters.sortBy || 'newest'}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-hidden shadow-xs cursor-pointer"
            >
              <option value="newest">{t.filters.sortNewest}</option>
              <option value="price_asc">{t.filters.sortPriceLowHigh}</option>
              <option value="price_desc">{t.filters.sortPriceHighLow}</option>
              <option value="sqft_desc">{t.filters.sortSqftHighLow}</option>
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-white text-brand-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title={t.filters.viewGrid}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-white text-brand-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title={t.filters.viewList}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Content Layout with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Desktop Sidebar Filter Panel */}
        <div className="hidden lg:block lg:col-span-1">
          <FilterDrawer
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
          />
        </div>

        {/* Mobile Slide-Over Filter Drawer */}
        <FilterDrawer
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          isMobileDrawer={true}
        />

        {/* Listings Grid / List Column */}
        <div className="lg:col-span-3">
          {filteredListings.length === 0 ? (
            <EmptyState
              onReset={handleResetFilters}
            />
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredListings.map((property: Property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  layout={viewMode}
                />
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
