import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PropertyCard } from '../components/common/PropertyCard';
import { Property } from '../types';
import { Heart, ArrowLeft } from 'lucide-react';

export const SavedPropertiesPage: React.FC = () => {
  const { favorites, properties } = useApp();

  const savedList = properties.filter((p: Property) => favorites.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold text-brand-700 uppercase tracking-wider mb-1">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>My Saved Properties</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Saved Properties ({savedList.length})
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Your bookmarked real-estate listings across Tamil Nadu.
        </p>
      </div>

      {savedList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto space-y-4">
          <Heart className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-900">No properties saved yet</h3>
          <p className="text-xs text-slate-500">
            Browse our listings and click the heart icon to save properties you are interested in.
          </p>
          <Link
            to="/properties"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-800 text-white rounded-xl text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Explore Properties</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedList.map((prop: Property) => (
            <PropertyCard key={prop.id} property={prop} />
          ))}
        </div>
      )}
    </div>
  );
};
