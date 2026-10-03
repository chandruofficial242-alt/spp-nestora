import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Property, PropertyImage, Payment } from '../../types';
import { DISTRICT_LOCALITIES } from '../../data/seedData';
import { apiService } from '../../services/api';
import { 
  Building2, 
  MapPin, 
  Image as ImageIcon, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Trash2, 
  Video, 
  CreditCard, 
  ShieldCheck, 
  QrCode,
  Loader2,
  FileCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AddPropertyWizard: React.FC = () => {
  const { t, currentUser, addProperty, settings, showToast } = useApp();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [createdProperty, setCreatedProperty] = useState<Property | null>(null);

  // Guard: Ensure dealer is authenticated
  React.useEffect(() => {
    const token = localStorage.getItem('spp_nestora_token');
    if (!token) {
      showToast('Please log in with an Authorized Dealer account to create listings.', 'warning');
      navigate('/login?role=dealer');
    }
  }, [navigate]);

  // Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    type: 'house_sale',
    title: '',
    titleTa: '',
    description: '',
    price: 4500000,
    priceNegotiable: true,
    rentalPeriod: 'monthly',
    depositAmount: 100000,
    areaSqft: 1800,
    plotDimensions: '30 x 60 ft',
    zoningType: 'residential',
    dtcpApproved: true,
    reraApproved: false,
    pattaAvailable: true,
    bedrooms: 3,
    bathrooms: 3,
    balconies: 2,
    floors: 2,
    facing: 'East',
    furnishing: 'semi-furnished',
    parking: 'both',
    district: 'Chennai',
    city: 'Chennai',
    taluk: '',
    area: 'OMR - Sholinganallur',
    locality: '',
    address: '',
    pincode: '600119',
    amenities: ['40ft Wide Road', '24x7 Security', 'Borewell Water', 'Covered Car Parking'],
    images: [
      { id: '1', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80', isCover: true, caption: 'Front Elevation' },
      { id: '2', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80', caption: 'Spacious Hall' }
    ],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-interior-tour-43401-large.mp4'
  });

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');


  // Helpers
  const handleInputChange = (field: keyof Property, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDistrictSelect = (district: string) => {
    const areas = DISTRICT_LOCALITIES[district] || ['Main City Area'];
    setFormData(prev => ({
      ...prev,
      district,
      city: district,
      area: areas[0] || 'Main Area'
    }));
  };

  const addImageUrl = (url: string) => {
    if (!url) return;
    const newImg: PropertyImage = {
      id: Date.now().toString(),
      url,
      caption: `Property photo ${(formData.images?.length || 0) + 1}`,
      isCover: (formData.images?.length || 0) === 0
    };
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), newImg]
    }));
  };

  // Handle Multi-Image File Upload to /api/upload/multiple
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    try {
      const fileArray = Array.from(files);
      const res = await apiService.uploadMultipleImages(fileArray);
      
      if (res && res.files) {
        const newImages: PropertyImage[] = res.files.map((f, i) => ({
          id: `img-${Date.now()}-${i}`,
          url: f.url,
          caption: `Uploaded photo ${(formData.images?.length || 0) + i + 1}`,
          isCover: (formData.images?.length || 0) === 0 && i === 0
        }));

        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...newImages]
        }));
        showToast(`Successfully uploaded ${res.files.length} property images!`, 'success');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      showToast(err.message || 'Image upload failed. Please try again.', 'error');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  // Handle Video File Upload to /api/upload/video
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingMedia(true);
    try {
      const file = files[0];
      const res = await apiService.uploadVideo(file);
      if (res && res.url) {
        setFormData(prev => ({ ...prev, videoUrl: res.url }));
        showToast('Property video tour uploaded successfully!', 'success');
      }
    } catch (err: any) {
      console.error('Video upload error:', err);
      showToast(err.message || 'Video upload failed. Max size: 50MB.', 'error');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const removeImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter(img => img.id !== id)
    }));
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => {
      const existing = prev.amenities || [];
      const updated = existing.includes(amenity)
        ? existing.filter(a => a !== amenity)
        : [...existing, amenity];
      return { ...prev, amenities: updated };
    });
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      return !!formData.type;
    }
    if (currentStep === 2) {
      if (!formData.title || !formData.price || !formData.areaSqft) {
        showToast('Please enter Property Title, Price, and Area', 'error');
        return false;
      }
    }
    if (currentStep === 3) {
      if (!formData.district || !formData.area) {
        showToast('Please select District and Locality', 'error');
        return false;
      }
    }
    if (currentStep === 4) {
      if (!formData.images || formData.images.length === 0) {
        showToast('Please upload at least 1 property photo', 'error');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Load Razorpay Script Dynamically
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Submit & Pay Listing Fee (Real Razorpay / Sandbox Hybrid)
  const handlePaymentAndSubmit = async () => {
    const token = localStorage.getItem('spp_nestora_token');
    if (!token || !currentUser) {
      showToast('Please log in with your Dealer account to continue.', 'error');
      navigate('/login?role=dealer');
      return;
    }

    setLoading(true);
    try {
      const tempPropId = `prop-${Date.now()}`;
      
      // 1. Create order on backend (Authoritative server-side ₹10 fee)
      const order = await apiService.createPaymentOrder(
        tempPropId,
        formData.title || 'Property Listing',
        paymentMethod
      );

      // 2. Check if real Razorpay key is present
      const isRealRazorpay = order.keyId && order.keyId.startsWith('rzp_') && !order.keyId.includes('placeholder');

      if (isRealRazorpay) {
        const scriptLoaded = await loadRazorpayScript();
        if (scriptLoaded && (window as any).Razorpay) {
          const options = {
            key: order.keyId,
            amount: Math.round(order.amount * 100),
            currency: order.currency || 'INR',
            name: 'SPP Nestora',
            description: `₹${order.amount} Property Listing Fee`,
            order_id: order.orderId,
            modal: {
              ondismiss: () => {
                setLoading(false);
                showToast('Payment was cancelled. Property was not submitted.', 'warning');
              }
            },
            handler: async (response: any) => {
              try {
                setLoading(true);
                // Verify HMAC SHA-256 signature on backend
                const verifyRes = await apiService.verifyPayment({
                  orderId: order.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  propertyId: tempPropId,
                  propertyTitle: formData.title || 'Property Listing',
                  method: paymentMethod
                });

                if (!verifyRes.success) {
                  throw new Error('Payment signature verification failed.');
                }

                // Add property to application state
                const result = await addProperty(formData, {
                  method: paymentMethod,
                  amount: order.amount
                });

                setReceipt(verifyRes.paymentRecord || result.receipt);
                setCreatedProperty(result.property);
                setCurrentStep(7);
                confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
                showToast('Payment successful! Property submitted for Admin review.', 'success');
              } catch (verifyErr: any) {
                console.error('Payment verification failed:', verifyErr);
                showToast(verifyErr.message || 'Payment verification failed', 'error');
              } finally {
                setLoading(false);
              }
            },
            prefill: {
              name: currentUser?.businessName || currentUser?.name || 'Authorized Dealer',
              email: currentUser?.email || 'dealer@sppnestora.com',
              contact: currentUser?.phone || '9444012345'
            },
            theme: { color: '#0f3a22' }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
          return;
        }
      }

      // 3. Sandbox / Dev Flow (Backend Simulated Verification)
      const verifyRes = await apiService.verifyPayment({
        orderId: order.orderId,
        paymentId: `sim_pay_${Date.now()}`,
        propertyId: tempPropId,
        propertyTitle: formData.title || 'Property Listing',
        method: paymentMethod
      });

      if (!verifyRes.success) {
        throw new Error('Payment verification failed on server');
      }

      const result = await addProperty(formData, {
        method: paymentMethod,
        amount: order.amount
      });

      if (result.success) {
        setReceipt(verifyRes.paymentRecord || result.receipt);
        setCreatedProperty(result.property);
        setCurrentStep(7); // Success Step
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        showToast('Listing fee recorded! Property submitted for Admin review.', 'success');
      }
    } catch (err: any) {
      console.error('Payment failure:', err);
      showToast(err.message || 'Payment processing failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };


  const stepsList = [
    { num: 1, label: t.addProperty.step1 },
    { num: 2, label: t.addProperty.step2 },
    { num: 3, label: t.addProperty.step3 },
    { num: 4, label: t.addProperty.step4 },
    { num: 5, label: t.addProperty.step5 },
    { num: 6, label: t.addProperty.step6 },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t.addProperty.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified Listings Facilitated Exclusively by SPP Nestora
            </p>
          </div>
          <span className="text-xs font-bold text-brand-800 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200">
            Step {Math.min(currentStep, 6)} of 6
          </span>
        </div>

        {/* Stepper Dots / Bar */}
        <div className="grid grid-cols-6 gap-2 mt-4">
          {stepsList.map(s => (
            <div
              key={s.num}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentStep >= s.num ? 'bg-brand-700' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: PROPERTY VERTICAL */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t.addProperty.selectType}</h2>
            <p className="text-xs text-slate-500 mt-1">Select the vertical for your property listing in Tamil Nadu</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleInputChange('type', 'land_sale')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                formData.type === 'land_sale'
                  ? 'border-brand-700 bg-brand-50/50 shadow-md ring-2 ring-brand-700/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl mb-3">
                🏞️
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t.categories.landSaleTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">DTCP / RERA approved plots, layout lands & agricultural farm lands</p>
            </button>

            <button
              type="button"
              onClick={() => handleInputChange('type', 'house_sale')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                formData.type === 'house_sale'
                  ? 'border-brand-700 bg-brand-50/50 shadow-md ring-2 ring-brand-700/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center text-xl mb-3">
                🏠
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t.categories.houseSaleTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">Individual villas, independent houses, builder floors & apartments</p>
            </button>

            <button
              type="button"
              onClick={() => handleInputChange('type', 'house_rent')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${
                formData.type === 'house_rent'
                  ? 'border-brand-700 bg-brand-50/50 shadow-md ring-2 ring-brand-700/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl mb-3">
                🏘️
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">{t.categories.houseRentTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">Rental houses, family portions, bachelor flats & lease properties</p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: BASIC SPECS & PRICING */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <h2 className="text-lg font-bold text-slate-900">{t.addProperty.step2}</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.addProperty.propertyTitle} (English) *
              </label>
              <input
                type="text"
                required
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g. 3 BHK Luxury Independent Villa in Sholinganallur"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Property Title (தமிழ் விருப்பத்தேர்வு)
              </label>
              <input
                type="text"
                value={formData.titleTa || ''}
                onChange={(e) => handleInputChange('titleTa', e.target.value)}
                placeholder="எ.கா. சோழிங்கநல்லூரில் 3 BHK சொகுசு தனித்த வீடு"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.addProperty.price} (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.price || ''}
                  onChange={(e) => handleInputChange('price', Number(e.target.value))}
                  placeholder="4500000"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  {t.addProperty.areaSqft} *
                </label>
                <input
                  type="number"
                  required
                  value={formData.areaSqft || ''}
                  onChange={(e) => handleInputChange('areaSqft', Number(e.target.value))}
                  placeholder="1800"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.addProperty.description}
              </label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Key highlights, road width, neighborhood landmarks, proximity to bus stop/IT park..."
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LOCATION DETAILS */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <h2 className="text-lg font-bold text-slate-900">{t.addProperty.step3}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.addProperty.district} *
              </label>
              <select
                value={formData.district || 'Chennai'}
                onChange={(e) => handleDistrictSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-bold"
              >
                {Object.keys(DISTRICT_LOCALITIES).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.addProperty.area} *
              </label>
              <select
                value={formData.area || ''}
                onChange={(e) => handleInputChange('area', e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
              >
                {(DISTRICT_LOCALITIES[formData.district || 'Chennai'] || []).map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t.addProperty.address}
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Plot/Door No, Street Name, Landmark"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: PHOTOS & VIDEO (WITH REAL UPLOAD SUPPORT) */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{t.addProperty.step4}</h2>
            {uploadingMedia && (
              <span className="flex items-center text-xs font-bold text-brand-700">
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Uploading Media to Storage...
              </span>
            )}
          </div>

          {/* File Upload Zone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-brand-600 rounded-2xl p-6 text-center bg-slate-50 transition">
            <input
              type="file"
              id="property-images-file-input"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="property-images-file-input"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <span className="text-sm font-bold text-brand-800 hover:underline">
                  Click to Browse & Upload Photos
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select multiple JPG, PNG, or WEBP photos (Max 10MB each)
                </p>
              </div>
            </label>
          </div>

          {/* Quick Image URL Input */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Or Add Photo by Web URL
            </label>
            <div className="flex space-x-2">
              <input
                type="url"
                id="photo-url-input"
                placeholder="https://images.unsplash.com/..."
                className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-xl outline-hidden"
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('photo-url-input') as HTMLInputElement;
                  if (input && input.value) {
                    addImageUrl(input.value);
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                + Add Link
              </button>
            </div>

            {/* Uploaded Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              {formData.images?.map((img, idx) => (
                <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                      Cover Photo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Video Tour Upload & Link */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Property Video Walkthrough (MP4/WebM)
            </label>

            <div className="flex items-center space-x-3">
              <input
                type="file"
                id="property-video-file-input"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <label
                htmlFor="property-video-file-input"
                className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition"
              >
                <Video className="w-4 h-4" />
                <span>Upload Video File (Max 50MB)</span>
              </label>

              <div className="flex-1 relative">
                <input
                  type="url"
                  value={formData.videoUrl || ''}
                  onChange={(e) => handleInputChange('videoUrl', e.target.value)}
                  placeholder="Or enter direct MP4 Video Tour URL"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl outline-hidden"
                />
              </div>
            </div>

            {formData.videoUrl && (
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center">
                <FileCheck className="w-3.5 h-3.5 mr-1" />
                Video tour attached. SPP Nestora enquiry banner will be automatically overlaid.
              </p>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW PREVIEW */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">{t.addProperty.reviewTitle}</h2>
            <span className="text-xs font-bold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-lg">
              Draft Listing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200">
              <img
                src={formData.images?.[0]?.url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-lg font-bold text-slate-900">{formData.title}</h3>
              <p className="text-xs text-slate-500 flex items-center">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                {formData.area}, {formData.district} (Tamil Nadu)
              </p>

              <div className="text-xl font-extrabold text-brand-900">
                ₹{formData.price?.toLocaleString('en-IN')}
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 text-xs border-y border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Area</span>
                  <span className="font-bold">{formData.areaSqft} Sq.Ft</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Type</span>
                  <span className="font-bold capitalize">{formData.type?.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Facing</span>
                  <span className="font-bold">{formData.facing}</span>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{formData.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: ₹10 LISTING FEE PAYMENT */}
      {currentStep === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-elevated space-y-6">
          
          <div className="text-center max-w-md mx-auto space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center mx-auto text-2xl font-black">
              ₹{settings.listingFeeAmount || 10}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {t.addProperty.listingFeeTitle}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.addProperty.listingFeeDesc}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Listing Service Fee:</span>
              <span className="font-bold text-slate-900">₹{settings.listingFeeAmount || 10}.00</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Platform Admin Review & Facilitation:</span>
              <span className="font-bold text-emerald-600">Included</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
              <span>Total Payable Amount:</span>
              <span className="text-brand-800">₹{settings.listingFeeAmount || 10}.00</span>
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="max-w-md mx-auto space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Preferred Payment Method (Powered by Razorpay)
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-brand-700 bg-brand-50 text-brand-900 shadow-xs ring-1 ring-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5 text-brand-700" />
                <span>UPI / QR Apps</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-brand-700 bg-brand-50 text-brand-900 shadow-xs ring-1 ring-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5 text-brand-700" />
                <span>Debit / Credit</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center space-y-1 transition cursor-pointer ${
                  paymentMethod === 'netbanking'
                    ? 'border-brand-700 bg-brand-50 text-brand-900 shadow-xs ring-1 ring-brand-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-5 h-5 text-brand-700" />
                <span>NetBanking</span>
              </button>
            </div>

            {/* Official Transparent Policy Notice */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Official SPP Nestora Listing Policy</span>
              </div>
              <p className="leading-relaxed">
                ₹10 Property Listing Fee is applicable for each property listing. No mandatory transaction commission is charged by SPP Nestora.
              </p>
            </div>
          </div>

          <div className="max-w-md mx-auto pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handlePaymentAndSubmit}
              className="w-full py-3.5 bg-brand-800 hover:bg-brand-900 text-white rounded-2xl font-black text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Connecting to Secure Razorpay Gateway...
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  <span>Proceed to Pay ₹{settings.listingFeeAmount || 10} via Razorpay</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              {t.addProperty.paymentNote}
            </p>
          </div>

        </div>
      )}


      {/* STEP 7: SUCCESS RECEIPT */}
      {currentStep === 7 && receipt && createdProperty && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-elevated max-w-lg mx-auto text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900">Property Submitted Successfully!</h2>
            <p className="text-xs text-slate-500 mt-1">
              Official Receipt #{receipt.receiptNumber} generated.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Property ID:</span>
              <span className="font-mono font-bold text-slate-900">{createdProperty.propertyCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Title:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">{createdProperty.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Listing Fee Paid:</span>
              <span className="font-bold text-emerald-700">₹{receipt.amount}.00 ({receipt.method.toUpperCase()})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                Pending Admin Approval
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => navigate('/dealer/dashboard')}
              className="flex-1 py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Go to Dealer Dashboard
            </button>
            <button
              onClick={() => navigate(`/properties/${createdProperty.id}`)}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Preview Listing
            </button>
          </div>
        </div>
      )}

      {/* Navigation Footer for Steps 1-5 */}
      {currentStep <= 5 && (
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
              currentStep === 1
                ? 'opacity-30 cursor-not-allowed text-slate-400'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.addProperty.prevStep}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center space-x-1.5 px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <span>{t.addProperty.nextStep}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
