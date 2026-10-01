export const formatPrice = (price: number, type?: string, language: 'en' | 'ta' = 'en'): string => {
  if (!price && price !== 0) return 'Price on Request';
  
  const isRent = type === 'house_rent';

  if (isRent) {
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
    return `${formatted} ${language === 'ta' ? '/ மாதம்' : '/ month'}`;
  }

  if (price >= 10000000) {
    const cr = price / 10000000;
    const rounded = Number(cr.toFixed(2)).toString();
    return `₹${rounded} ${language === 'ta' ? 'கோடி' : 'Cr'}`;
  }
  
  if (price >= 100000) {
    const lk = price / 100000;
    const rounded = Number(lk.toFixed(2)).toString();
    return `₹${rounded} ${language === 'ta' ? 'லட்சம்' : 'Lakhs'}`;
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

export const formatSqft = (sqft: number, language: 'en' | 'ta' = 'en'): string => {
  if (!sqft) return '-';
  const formatted = new Intl.NumberFormat('en-IN').format(sqft);
  return `${formatted} ${language === 'ta' ? 'சதுர அடி' : 'Sq.Ft'}`;
};

export const formatRelativeTime = (isoString: string, language: 'en' | 'ta' = 'en'): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

  if (diffDays <= 0) return language === 'ta' ? 'இன்று' : 'Today';
  if (diffDays === 1) return language === 'ta' ? 'நேற்று' : 'Yesterday';
  if (diffDays < 30) return language === 'ta' ? `${diffDays} நாட்களுக்கு முன்` : `${diffDays} days ago`;
  
  return date.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
