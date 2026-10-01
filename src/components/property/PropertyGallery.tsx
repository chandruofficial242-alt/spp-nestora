import React, { useState } from 'react';
import { PropertyImage } from '../../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Image as ImageIcon,
  ShieldCheck 
} from 'lucide-react';

interface Props {
  images: PropertyImage[];
  propertyTitle: string;
}

export const PropertyGallery: React.FC<Props> = ({ images, propertyTitle }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const activeImage = images[selectedIndex] || {
    id: 'placeholder',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    caption: propertyTitle
  };

  const nextImage = () => {
    setSelectedIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="space-y-3">
      {/* Main Image Viewport */}
      <div className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-slate-900 aspect-[16/10] md:aspect-[16/9] shadow-elevated group">
        <img
          src={activeImage.url}
          alt={activeImage.caption || propertyTitle}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
        />

        {/* Counter Badge */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/20 flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{selectedIndex + 1} / {images.length}</span>
        </div>

        {/* Fullscreen Trigger */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white p-2 rounded-xl border border-white/20 transition hover:scale-105"
          title="Fullscreen Gallery"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Arrow Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center backdrop-blur-md shadow-md transition hover:scale-110 opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center backdrop-blur-md shadow-md transition hover:scale-110 opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Caption */}
        {activeImage.caption && (
          <div className="absolute bottom-3 left-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg max-w-max truncate">
            {activeImage.caption}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex space-x-2.5 overflow-x-auto pb-2 scrollbar-thin">
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setSelectedIndex(idx)}
              className={`relative flex-shrink-0 w-20 h-16 md:w-24 md:h-18 rounded-xl overflow-hidden border-2 transition-all ${
                selectedIndex === idx 
                  ? 'border-brand-700 ring-2 ring-brand-600/30 scale-102' 
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 md:p-8 animate-fadeIn">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-sm font-bold truncate max-w-md">{propertyTitle}</p>
              <p className="text-xs text-slate-400">Image {selectedIndex + 1} of {images.length}</p>
            </div>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Main Image */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img
              src={activeImage.url}
              alt={activeImage.caption || propertyTitle}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scaleUp"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition"
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition"
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails */}
          <div className="flex justify-center space-x-2 overflow-x-auto py-2">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                onClick={() => setSelectedIndex(idx)}
                className={`w-14 h-12 rounded-lg overflow-hidden border-2 transition ${
                  selectedIndex === idx ? 'border-brand-500 scale-105' : 'border-transparent opacity-50'
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
