import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Property, PropertyImage, Payment, PropertyType } from '../../types';
import { TN_DISTRICTS, DISTRICT_LOCALITIES } from '../../data/seedData';
import { apiService } from '../../services/api';
import { 
  Building2, 
  MapPin, 
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
  FileCheck, 
  AlertTriangle,
  Eye,
  Sparkles,
  Compass,
  FileText,
  IndianRupee,
  Home,
  Layers,
  Trees,
  KeyRound,
  Calendar,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Tamil Nadu Real Estate Unit Conversion Factors (Square Feet)
const CONVERSION_FACTORS: Record<string, number> = {
  sqft: 1,
  cent: 435.6,
  ground: 2400,
  acre: 43560,
  hectare: 107639
};

const calculateLandSqft = (totalArea?: number, unit?: string): number => {
  if (!totalArea || totalArea <= 0) return 0;
  const factor = CONVERSION_FACTORS[(unit || 'sqft').toLowerCase()] || 1;
  return Math.round(totalArea * factor);
};

const calculatePricePerSqft = (price?: number, sqft?: number): number => {
  if (!price || price <= 0 || !sqft || sqft <= 0) return 0;
  return Math.round(price / sqft);
};

export const AddPropertyWizard: React.FC = () => {
  const { t, currentUser, settings, showToast } = useApp();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [createdProperty, setCreatedProperty] = useState<Property | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const pollingRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Guard: Ensure dealer is authenticated
  useEffect(() => {
    const token = localStorage.getItem('spp_nestora_token');
    if (!token) {
      showToast('Please log in with an Authorized Dealer account to create listings.', 'warning');
      navigate('/login?role=dealer');
    }
  }, [navigate]);

  // Form State
  const [formData, setFormData] = useState<Partial<Property>>({
    type: 'land_sale',
    title: '',
    titleTa: '',
    description: '',
    price: 2500000,
    priceNegotiable: true,

    // Land specific
    landType: 'Residential Plot',
    totalArea: 5.5,
    areaUnit: 'cent',
    roadAccess: 'available',
    dtcpStatus: 'approved',
    pattaStatus: 'yes',
    dtcpApproved: true,
    pattaAvailable: true,

    // House for Sale specific
    houseType: 'Independent House',
    bhk: '2',
    bedrooms: 2,
    bathrooms: 2,
    builtUpAreaSqft: 1400,
    plotAreaSqft: 1800,
    furnishing: 'semi-furnished',
    propertyAge: '1-3 Years',
    parking: 'both',
    floorNo: 0,
    totalFloors: 2,
    waterSupply: 'Borewell & Corporation',
    electricitySupply: 'EB 3-Phase',
    facing: 'East',

    // House for Rent specific
    rentalPropertyType: 'Independent House',
    suitableFor: ['Family'],
    monthlyRent: 15000,
    depositAmount: 100000,
    maintenanceFee: 0,
    rentalPeriod: 'monthly',
    availableFrom: 'Immediately',
    preferredRentalDuration: '11 Months',
    rentalRules: 'Vegetarians preferred. Family only. No smoking on premises.',

    // Location (Tamil Nadu)
    state: 'Tamil Nadu',
    district: 'Chennai',
    city: 'Chennai',
    area: 'OMR - Sholinganallur',
    locality: 'OMR - Sholinganallur',
    address: 'Plot No. 14, 2nd Cross Street',
    landmark: 'Near Sholinganallur Junction',
    pincode: '600119',

    // Media
    amenities: ['40ft Wide Road', '24x7 Security', 'Borewell Water', 'Clear Title Documents'],
    images: [
      { id: '1', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80', isCover: true, caption: 'Front Elevation' }
    ],
    videoUrl: ''
  });

  // Dynamically calculated values
  const currentLandSqft = calculateLandSqft(formData.totalArea, formData.areaUnit);
  const currentPricePerSqft = formData.type === 'land_sale'
    ? calculatePricePerSqft(formData.price, currentLandSqft)
    : calculatePricePerSqft(formData.price, formData.builtUpAreaSqft);

  // Sync calculated areaSqft and pricePerSqft into formData
  useEffect(() => {
    if (formData.type === 'land_sale') {
      if (currentLandSqft > 0 && formData.areaSqft !== currentLandSqft) {
        setFormData(prev => ({ ...prev, areaSqft: currentLandSqft, pricePerSqft: currentPricePerSqft }));
      }
    } else if (formData.type === 'house_sale' || formData.type === 'house_rent') {
      const builtUp = Number(formData.builtUpAreaSqft) || 1200;
      if (formData.areaSqft !== builtUp) {
        setFormData(prev => ({ ...prev, areaSqft: builtUp, pricePerSqft: currentPricePerSqft }));
      }
    }
  }, [formData.totalArea, formData.areaUnit, formData.price, formData.builtUpAreaSqft, formData.type]);

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [gatewayMethods, setGatewayMethods] = useState<{ upi: boolean; upiQr: boolean; card: boolean; netbanking: boolean; wallet: boolean } | null>(null);

  useEffect(() => {
    if (currentStep === 6) {
      apiService.getPaymentMethods().then(res => {
        if (res && res.methods) {
          setGatewayMethods(res.methods);
        }
      }).catch(() => {});
    }
  }, [currentStep]);

  // Helpers
  const handleInputChange = (field: keyof Property, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (type: PropertyType) => {
    setFormData(prev => {
      let defaultPrice = prev.price || 2500000;
      if (type === 'house_rent') {
        defaultPrice = prev.monthlyRent || 15000;
      } else if (type === 'land_sale' && (!prev.price || prev.price < 50000)) {
        defaultPrice = 2500000;
      } else if (type === 'house_sale' && (!prev.price || prev.price < 50000)) {
        defaultPrice = 4500000;
      }

      return {
        ...prev,
        type,
        price: defaultPrice,
        images: prev.images && prev.images.length > 0 ? prev.images : [
          {
            id: '1',
            url: type === 'land_sale'
              ? 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80'
              : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
            isCover: true,
            caption: 'Main View'
          }
        ]
      };
    });
  };

  const handleDistrictSelect = (district: string) => {
    const areas = DISTRICT_LOCALITIES[district] || ['Main Town Area'];
    setFormData(prev => ({
      ...prev,
      district,
      city: prev.city && prev.city !== prev.district ? prev.city : district,
      area: areas[0] || 'Main Area',
      locality: areas[0] || 'Main Area'
    }));
  };

  const handleSuitableForToggle = (item: string) => {
    setFormData(prev => {
      const existing = prev.suitableFor || [];
      const updated = existing.includes(item)
        ? existing.filter(x => x !== item)
        : [...existing, item];
      return { ...prev, suitableFor: updated.length > 0 ? updated : ['Anyone'] };
    });
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

  // Handle Multi-Image File Upload
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

  // Handle Video File Upload
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

  const setCoverImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.map(img => ({
        ...img,
        isCover: img.id === id
      }))
    }));
    showToast('Cover photo updated', 'info');
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!formData.type) {
        showToast('Please select a property vertical to continue.', 'error');
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      if (!formData.title || !formData.title.trim()) {
        showToast('Please enter the Property Title (English)', 'error');
        return false;
      }

      if (formData.type === 'land_sale') {
        if (!formData.totalArea || Number(formData.totalArea) <= 0) {
          showToast('Please enter a valid Total Land Area', 'error');
          return false;
        }
        if (!formData.price || Number(formData.price) <= 0) {
          showToast('Please enter a valid Total Selling Price in ₹', 'error');
          return false;
        }
      } else if (formData.type === 'house_sale') {
        if (!formData.builtUpAreaSqft || Number(formData.builtUpAreaSqft) <= 0) {
          showToast('Please enter the Built-up Area in sq.ft', 'error');
          return false;
        }
        if (!formData.price || Number(formData.price) <= 0) {
          showToast('Please enter a valid Total Selling Price in ₹', 'error');
          return false;
        }
        if (!formData.bhk) {
          showToast('Please select BHK configuration', 'error');
          return false;
        }
      } else if (formData.type === 'house_rent') {
        if (!formData.builtUpAreaSqft || Number(formData.builtUpAreaSqft) <= 0) {
          showToast('Please enter the Built-up Area in sq.ft', 'error');
          return false;
        }
        if (!formData.price || Number(formData.price) <= 0) {
          showToast('Please enter a valid Monthly Rent in ₹', 'error');
          return false;
        }
        if (formData.depositAmount === undefined || Number(formData.depositAmount) < 0) {
          showToast('Please enter the Refundable Security Deposit / Advance in ₹', 'error');
          return false;
        }
        if (!formData.bhk) {
          showToast('Please select BHK / Room configuration', 'error');
          return false;
        }
      }
      return true;
    }

    if (currentStep === 3) {
      if (!formData.district) {
        showToast('Please select a Tamil Nadu District', 'error');
        return false;
      }
      if (!formData.city || !formData.city.trim()) {
        showToast('Please enter City / Town / Village', 'error');
        return false;
      }
      if (!formData.area || !formData.area.trim()) {
        showToast('Please enter Locality / Area', 'error');
        return false;
      }
      if (!formData.address || !formData.address.trim()) {
        showToast('Please enter Full Property Address / Street', 'error');
        return false;
      }
      if (!formData.pincode || !/^\d{6}$/.test(formData.pincode.trim())) {
        showToast('Please enter a valid 6-digit PIN code', 'error');
        return false;
      }
      return true;
    }

    if (currentStep === 4) {
      if (!formData.images || formData.images.length === 0) {
        showToast('Please upload at least 1 property photo', 'error');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Submit & Pay Listing Fee (Real Razorpay / Sandbox Hybrid with Status Polling & Retry)
  const handlePaymentAndSubmit = async () => {
    const token = localStorage.getItem('spp_nestora_token');
    if (!token || !currentUser) {
      showToast('Please log in with your Dealer account to continue.', 'error');
      navigate('/login?role=dealer');
      return;
    }

    setLoading(true);
    setPaymentError(null);
    setPaymentStatus('pending');

    try {
      // 1. Ensure property is saved in backend with pending_payment status (or reused on retry)
      let targetProperty = createdProperty;
      if (!targetProperty) {
        const payloadToSubmit: Partial<Property> = {
          ...formData,
          areaSqft: formData.type === 'land_sale' ? currentLandSqft : (formData.builtUpAreaSqft || formData.areaSqft || 1000),
          pricePerSqft: currentPricePerSqft,
          monthlyRent: formData.type === 'house_rent' ? formData.price : undefined
        };
        const propRes = await apiService.createProperty(payloadToSubmit);
        targetProperty = propRes.property;
        setCreatedProperty(targetProperty);
      }

      // 2. Create authoritative order on backend (Exact ₹10 fee)
      const order = await apiService.createPaymentOrder(
        targetProperty.id,
        targetProperty.title || formData.title || 'Property Listing',
        paymentMethod
      );

      const isRealRazorpay = order.keyId && order.keyId.startsWith('rzp_') && !order.keyId.includes('placeholder');

      if (order.methods) {
        setGatewayMethods(order.methods);
      }

      // Start background status polling in case of UPI external redirect / delayed webhook
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          if (!targetProperty) return;
          const statusRes = await apiService.checkPaymentStatus(targetProperty.id);
          if (statusRes.paymentStatus === 'success') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setReceipt(statusRes.payment || null);
            setPaymentStatus('success');
            setLoading(false);
            setCurrentStep(7);
            confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
            showToast('Payment verified successfully via Razorpay!', 'success');
          }
        } catch {}
      }, 4000);

      if (isRealRazorpay) {
        const scriptLoaded = await loadRazorpayScript();
        if (scriptLoaded && (window as any).Razorpay) {
          const displayConfig = {
            blocks: {
              upi: {
                name: 'Pay using UPI / QR Code',
                instruments: [
                  {
                    method: 'upi',
                    flows: ['qr', 'intent', 'collect']
                  }
                ]
              },
              other: {
                name: 'Cards, Netbanking & Wallets',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' }
                ]
              }
            },
            sequence: paymentMethod === 'upi'
              ? ['block.upi', 'block.other']
              : ['block.other', 'block.upi'],
            preferences: {
              show_default_blocks: true
            }
          };

          const options: any = {
            key: order.keyId,
            amount: Math.round(order.amount * 100),
            currency: order.currency || 'INR',
            name: 'SPP Nestora',
            description: `₹${order.amount} Property Listing Fee`,
            order_id: order.orderId,
            notes: {
              propertyId: targetProperty.id,
              dealerId: currentUser.id,
              propertyTitle: targetProperty.title
            },
            prefill: {
              name: currentUser.name || '',
              email: currentUser.email || '',
              contact: currentUser.phone || ''
            },
            theme: {
              color: '#0f172a'
            },
            config: {
              display: displayConfig
            },
            modal: {
              ondismiss: () => {
                setLoading(false);
                setPaymentStatus('failed');
                setPaymentError('Payment window was dismissed before completion. You can retry safely.');
                showToast('Payment cancelled. Click "Retry Payment" when ready.', 'warning');
              }
            },
            handler: async (response: any) => {
              try {
                setLoading(true);
                const verifyRes = await apiService.verifyPayment({
                  orderId: response.razorpay_order_id || order.orderId,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  propertyId: targetProperty.id,
                  propertyTitle: targetProperty.title,
                  method: paymentMethod
                });

                if (!verifyRes.success) {
                  throw new Error(verifyRes.error || 'Cryptographic signature verification failed.');
                }

                if (pollingRef.current) clearInterval(pollingRef.current);
                setReceipt(verifyRes.paymentRecord);
                setPaymentStatus('success');
                setCurrentStep(7);
                confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
                showToast('Payment verified successfully! Property submitted for Admin review.', 'success');
              } catch (verifyErr: any) {
                console.error('Signature verification error:', verifyErr);
                setPaymentStatus('failed');
                setPaymentError(verifyErr.message || 'Payment signature verification failed.');
                showToast(verifyErr.message || 'Payment verification failed', 'error');
              } finally {
                setLoading(false);
              }
            }
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
        propertyId: targetProperty.id,
        propertyTitle: targetProperty.title,
        method: paymentMethod
      });

      if (!verifyRes.success) {
        throw new Error('Payment verification failed on server');
      }

      if (pollingRef.current) clearInterval(pollingRef.current);
      setReceipt(verifyRes.paymentRecord);
      setPaymentStatus('success');
      setCurrentStep(7);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      showToast('Listing fee recorded! Property submitted for Admin review.', 'success');
    } catch (err: any) {
      console.error('Payment failure:', err);
      setPaymentStatus('failed');
      setPaymentError(err.message || 'Payment processing failed. Please retry.');
      showToast(err.message || 'Payment processing failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stepsList = [
    { num: 1, label: 'Property Type' },
    { num: 2, label: formData.type === 'land_sale' ? 'Land Details' : formData.type === 'house_rent' ? 'Rental Details' : 'House Details' },
    { num: 3, label: 'Location' },
    { num: 4, label: 'Photos & Video' },
    { num: 5, label: 'Review & Preview' },
    { num: 6, label: '₹10 Listing Fee' },
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Create New Property Listing
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified Listings Facilitated Exclusively by SPP Nestora Admin Desk
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

      {/* ======================================================== */}
      {/* STEP 1: PROPERTY VERTICAL SELECTION */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Select Property Type</h2>
            <p className="text-xs text-slate-500 mt-1">
              Choose the exact property category. Each option opens a specialized form customized for your listing type.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            
            {/* 1. Land for Sale */}
            <button
              type="button"
              onClick={() => handleTypeSelect('land_sale')}
              className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                formData.type === 'land_sale'
                  ? 'border-emerald-700 bg-emerald-50/50 shadow-md ring-2 ring-emerald-700/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl mb-3">
                🏞️
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Land for Sale</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                DTCP / RERA approved plots, layout lands, agricultural & farm lands.
              </p>
              {formData.type === 'land_sale' && (
                <span className="absolute top-4 right-4 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5 fill-current text-emerald-600 bg-white rounded-full" />
                </span>
              )}
            </button>

            {/* 2. House for Sale */}
            <button
              type="button"
              onClick={() => handleTypeSelect('house_sale')}
              className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                formData.type === 'house_sale'
                  ? 'border-brand-700 bg-brand-50/50 shadow-md ring-2 ring-brand-700/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-800 flex items-center justify-center text-2xl mb-3">
                🏠
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">House for Sale</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Independent houses, villas, apartments, flats & residential properties for sale.
              </p>
              {formData.type === 'house_sale' && (
                <span className="absolute top-4 right-4 text-brand-700">
                  <CheckCircle2 className="w-5 h-5 fill-current text-brand-700 bg-white rounded-full" />
                </span>
              )}
            </button>

            {/* 3. House for Rent */}
            <button
              type="button"
              onClick={() => handleTypeSelect('house_rent')}
              className={`p-6 rounded-2xl border-2 text-left transition-all cursor-pointer relative ${
                formData.type === 'house_rent'
                  ? 'border-amber-700 bg-amber-50/50 shadow-md ring-2 ring-amber-700/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl mb-3">
                🏘️
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">House for Rent</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Rental houses, family portions, bachelor flats, apartments & lease properties.
              </p>
              {formData.type === 'house_rent' && (
                <span className="absolute top-4 right-4 text-amber-700">
                  <CheckCircle2 className="w-5 h-5 fill-current text-amber-700 bg-white rounded-full" />
                </span>
              )}
            </button>

          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center space-x-2">
            <span className="font-bold text-slate-800">Selected Vertical:</span>
            <span className="font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-white border border-slate-300 text-brand-900">
              {formData.type === 'land_sale' ? 'Land for Sale' : formData.type === 'house_rent' ? 'House for Rent' : 'House for Sale'}
            </span>
            <span className="text-slate-400">• Click "Next Step" to enter specifications specific to this property type.</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: VERTICAL-SPECIFIC FORM FIELDS */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          
          {/* Header Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {formData.type === 'land_sale' && 'Land for Sale Details'}
                {formData.type === 'house_sale' && 'House for Sale Details'}
                {formData.type === 'house_rent' && 'House for Rent Details'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Please enter the required technical specifications and pricing details.
              </p>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              {formData.type === 'land_sale' ? '🏞️ Land' : formData.type === 'house_rent' ? '🏘️ Rental' : '🏠 House Sale'}
            </span>
          </div>

          {/* ---------------------------------------------------- */}
          {/* SUB-FORM A: LAND FOR SALE */}
          {/* ---------------------------------------------------- */}
          {formData.type === 'land_sale' && (
            <div className="space-y-5">
              
              {/* Land Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Land Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g. 5.5 Cents DTCP Approved Commercial Plot on OMR"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Land Title (தமிழ் விருப்பத்தேர்வு)
                </label>
                <input
                  type="text"
                  value={formData.titleTa || ''}
                  onChange={(e) => handleInputChange('titleTa', e.target.value)}
                  placeholder="எ.கா. சோழிங்கநல்லூரில் 5.5 சென்ட் DTCP அங்கீகரிக்கப்பட்ட வீட்டு மனை"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

              {/* Land Type & Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Land Type *
                  </label>
                  <select
                    value={formData.landType || 'Residential Plot'}
                    onChange={(e) => handleInputChange('landType', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value="Residential Plot">Residential Plot</option>
                    <option value="DTCP Approved Plot">DTCP Approved Plot</option>
                    <option value="Agricultural Land">Agricultural Land</option>
                    <option value="Farm Land">Farm Land</option>
                    <option value="Commercial Land">Commercial Land</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Land Area *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.1"
                    value={formData.totalArea || ''}
                    onChange={(e) => handleInputChange('totalArea', Number(e.target.value))}
                    placeholder="e.g. 5.5"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Area Unit *
                  </label>
                  <select
                    value={formData.areaUnit || 'cent'}
                    onChange={(e) => handleInputChange('areaUnit', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value="cent">Cent (1 Cent = 435.6 sq.ft)</option>
                    <option value="sqft">Square Feet (Sq.Ft)</option>
                    <option value="ground">Ground (1 Ground = 2400 sq.ft)</option>
                    <option value="acre">Acre (1 Acre = 43560 sq.ft)</option>
                    <option value="hectare">Hectare (1 Hectare = 107639 sq.ft)</option>
                  </select>
                </div>
              </div>

              {/* Total Selling Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', Number(e.target.value))}
                    placeholder="e.g. 2500000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-bold text-emerald-900"
                  />
                </div>

                {/* Auto Calculated Sqft & Price/Sqft Highlight */}
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    Calculated Area & Rate
                  </span>
                  <div className="flex items-center justify-between text-xs text-slate-700 mt-1">
                    <span>Equivalent Sq.Ft:</span>
                    <span className="font-bold text-slate-900">{currentLandSqft.toLocaleString()} Sq.Ft</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-700 mt-0.5">
                    <span>Price per Sq.Ft:</span>
                    <span className="font-extrabold text-emerald-800">
                      {currentPricePerSqft > 0 ? `₹${currentPricePerSqft.toLocaleString()} / Sq.Ft` : 'Enter Area & Price'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal & Approvals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Road Access *
                  </label>
                  <select
                    value={formData.roadAccess || 'available'}
                    onChange={(e) => handleInputChange('roadAccess', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="available">Available (Tar / Concrete Road)</option>
                    <option value="not_available">Not Available / Mud Track</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    DTCP Approval *
                  </label>
                  <select
                    value={formData.dtcpStatus || 'approved'}
                    onChange={(e) => {
                      handleInputChange('dtcpStatus', e.target.value);
                      handleInputChange('dtcpApproved', e.target.value === 'approved');
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="approved">Approved</option>
                    <option value="not_approved">Not Approved</option>
                    <option value="not_applicable">Not Applicable</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Patta Availability *
                  </label>
                  <select
                    value={formData.pattaStatus || 'yes'}
                    onChange={(e) => {
                      handleInputChange('pattaStatus', e.target.value);
                      handleInputChange('pattaAvailable', e.target.value === 'yes');
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="yes">Yes (Individual / Clean Patta)</option>
                    <option value="no">No</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Land Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Key highlights, road width, boundary fencing, soil quality, distance from highway/bus stand..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* SUB-FORM B: HOUSE FOR SALE */}
          {/* ---------------------------------------------------- */}
          {formData.type === 'house_sale' && (
            <div className="space-y-5">
              
              {/* House Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Property Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g. 3 BHK Luxury Independent Villa in Sholinganallur"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-medium"
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
                  placeholder="எ.கா. சோழிங்கநல்லூரில் 3 BHK தனித்த சொகுசு வில்லா"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

              {/* House Type & BHK & Bathrooms */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    House Type *
                  </label>
                  <select
                    value={formData.houseType || 'Independent House'}
                    onChange={(e) => handleInputChange('houseType', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value="Independent House">Independent House</option>
                    <option value="Villa">Villa</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Flat">Flat</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    BHK *
                  </label>
                  <select
                    value={formData.bhk || '2'}
                    onChange={(e) => {
                      handleInputChange('bhk', e.target.value);
                      handleInputChange('bedrooms', Number(e.target.value) || 2);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="5+">5+ BHK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Number of Bathrooms *
                  </label>
                  <select
                    value={formData.bathrooms || 2}
                    onChange={(e) => handleInputChange('bathrooms', Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value={1}>1 Bathroom</option>
                    <option value={2}>2 Bathrooms</option>
                    <option value={3}>3 Bathrooms</option>
                    <option value={4}>4 Bathrooms</option>
                    <option value={5}>5+ Bathrooms</option>
                  </select>
                </div>
              </div>

              {/* Area & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Built-up Area (Sq.Ft) *
                  </label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={formData.builtUpAreaSqft || ''}
                    onChange={(e) => handleInputChange('builtUpAreaSqft', Number(e.target.value))}
                    placeholder="e.g. 1500"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Plot Area (Sq.Ft, if applicable)
                  </label>
                  <input
                    type="number"
                    value={formData.plotAreaSqft || ''}
                    onChange={(e) => handleInputChange('plotAreaSqft', Number(e.target.value))}
                    placeholder="e.g. 1800"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', Number(e.target.value))}
                    placeholder="e.g. 5500000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-bold text-brand-900"
                  />
                </div>
              </div>

              {/* Price per Sq.ft rate highlight */}
              {currentPricePerSqft > 0 && (
                <div className="p-3 bg-brand-50/70 border border-brand-200 rounded-2xl flex items-center justify-between text-xs">
                  <span className="font-semibold text-brand-800">Calculated Price per Sq.Ft:</span>
                  <span className="font-extrabold text-brand-900 text-sm">₹{currentPricePerSqft.toLocaleString()} / Sq.Ft</span>
                </div>
              )}

              {/* Specs: Furnishing, Age, Parking */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Furnishing Status *
                  </label>
                  <select
                    value={formData.furnishing || 'semi-furnished'}
                    onChange={(e) => handleInputChange('furnishing', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi-furnished">Semi-Furnished</option>
                    <option value="fully-furnished">Fully Furnished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Property Age *
                  </label>
                  <select
                    value={formData.propertyAge || '1-3 Years'}
                    onChange={(e) => handleInputChange('propertyAge', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="New Construction">New Construction / Ready to Move</option>
                    <option value="Under 1 Year">Under 1 Year</option>
                    <option value="1-3 Years">1-3 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5-10 Years">5-10 Years</option>
                    <option value="10+ Years">10+ Years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Parking Availability *
                  </label>
                  <select
                    value={formData.parking || 'both'}
                    onChange={(e) => handleInputChange('parking', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="both">Both (Car & Bike)</option>
                    <option value="four-wheeler">Covered Car Parking</option>
                    <option value="two-wheeler">Two-Wheeler Only</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              {/* Floors, Water & Electricity */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    value={formData.floorNo ?? 0}
                    onChange={(e) => handleInputChange('floorNo', Number(e.target.value))}
                    placeholder="0 for Ground"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Floors
                  </label>
                  <input
                    type="number"
                    value={formData.totalFloors ?? 2}
                    onChange={(e) => handleInputChange('totalFloors', Number(e.target.value))}
                    placeholder="e.g. 2"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Water Supply
                  </label>
                  <input
                    type="text"
                    value={formData.waterSupply || 'Borewell & Corporation'}
                    onChange={(e) => handleInputChange('waterSupply', e.target.value)}
                    placeholder="Borewell & Corporation"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Electricity
                  </label>
                  <input
                    type="text"
                    value={formData.electricitySupply || 'EB 3-Phase'}
                    onChange={(e) => handleInputChange('electricitySupply', e.target.value)}
                    placeholder="EB 3-Phase"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Property Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Key highlights, modular kitchen, balcony view, proximity to schools/IT corridor..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

            </div>
          )}

          {/* ---------------------------------------------------- */}
          {/* SUB-FORM C: HOUSE FOR RENT */}
          {/* ---------------------------------------------------- */}
          {formData.type === 'house_rent' && (
            <div className="space-y-5">
              
              {/* Rental Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rental Property Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g. Spacious 2 BHK Independent Portion for Rent in Velachery"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rental Property Title (தமிழ் விருப்பத்தேர்வு)
                </label>
                <input
                  type="text"
                  value={formData.titleTa || ''}
                  onChange={(e) => handleInputChange('titleTa', e.target.value)}
                  placeholder="எ.கா. வேளச்சேரியில் 2 BHK வாடகை தனித்த வீடு"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

              {/* Rental Property Type & Suitable For */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rental Property Type *
                  </label>
                  <select
                    value={formData.rentalPropertyType || 'Independent House'}
                    onChange={(e) => handleInputChange('rentalPropertyType', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value="Independent House">Independent House</option>
                    <option value="Family Portion">Family Portion</option>
                    <option value="Bachelor Room">Bachelor Room</option>
                    <option value="Apartment">Apartment</option>
                    <option value="Flat">Flat</option>
                    <option value="Villa">Villa</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Suitable For *
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['Family', 'Bachelors', 'Working Professionals', 'Students', 'Anyone'].map(target => {
                      const isSelected = (formData.suitableFor || []).includes(target);
                      return (
                        <button
                          type="button"
                          key={target}
                          onClick={() => handleSuitableForToggle(target)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {target}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* BHK, Bathrooms, Built-up Area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    BHK / Number of Rooms *
                  </label>
                  <select
                    value={formData.bhk || '2'}
                    onChange={(e) => {
                      handleInputChange('bhk', e.target.value);
                      handleInputChange('bedrooms', Number(e.target.value) || 2);
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value="1 RK">1 RK (Room Kitchen)</option>
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4+">4+ BHK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Number of Bathrooms *
                  </label>
                  <select
                    value={formData.bathrooms || 1}
                    onChange={(e) => handleInputChange('bathrooms', Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-semibold"
                  >
                    <option value={1}>1 Bathroom</option>
                    <option value={2}>2 Bathrooms</option>
                    <option value={3}>3 Bathrooms</option>
                    <option value={4}>4+ Bathrooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Built-up Area (Sq.Ft) *
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={formData.builtUpAreaSqft || ''}
                    onChange={(e) => handleInputChange('builtUpAreaSqft', Number(e.target.value))}
                    placeholder="e.g. 1000"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-bold"
                  />
                </div>
              </div>

              {/* RENT & ADVANCE/DEPOSIT (CRITICAL: CLEARLY DISTINGUISHED) */}
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
                  <IndianRupee className="w-4 h-4 text-amber-700" />
                  <span>Rental Financial Terms (Separated from Sale Price)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Monthly Rent (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.price || ''}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        handleInputChange('price', val);
                        handleInputChange('monthlyRent', val);
                      }}
                      placeholder="e.g. 15000"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-extrabold text-amber-900 outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500">Per Month</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Security Deposit / Advance (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.depositAmount ?? ''}
                      onChange={(e) => handleInputChange('depositAmount', Number(e.target.value))}
                      placeholder="e.g. 100000"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white font-bold text-slate-800 outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500">Refundable deposit</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Maintenance Charge (₹, if any)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maintenanceFee ?? ''}
                      onChange={(e) => handleInputChange('maintenanceFee', Number(e.target.value))}
                      placeholder="0 if included"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500">Monthly maintenance</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  ⚠️ Note: Monthly rent is clearly distinguished from the refundable security deposit. Rental listings do not display any sale price.
                </p>
              </div>

              {/* Furnishing, Available From, Duration, Parking */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Furnishing *
                  </label>
                  <select
                    value={formData.furnishing || 'semi-furnished'}
                    onChange={(e) => handleInputChange('furnishing', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi-furnished">Semi-Furnished</option>
                    <option value="fully-furnished">Fully Furnished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Available From
                  </label>
                  <input
                    type="text"
                    value={formData.availableFrom || 'Immediately'}
                    onChange={(e) => handleInputChange('availableFrom', e.target.value)}
                    placeholder="Immediately or Date"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred Duration
                  </label>
                  <select
                    value={formData.preferredRentalDuration || '11 Months'}
                    onChange={(e) => handleInputChange('preferredRentalDuration', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="11 Months">11 Months (Standard)</option>
                    <option value="6 Months">6 Months</option>
                    <option value="Short-Term">Short-Term</option>
                    <option value="Long-Term">Long-Term (2+ Years)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Parking
                  </label>
                  <select
                    value={formData.parking || 'two-wheeler'}
                    onChange={(e) => handleInputChange('parking', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="two-wheeler">Two-Wheeler Only</option>
                    <option value="both">Both (Car & Bike)</option>
                    <option value="four-wheeler">Covered Car Parking</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              {/* Floor No, Water & Electricity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    value={formData.floorNo ?? 1}
                    onChange={(e) => handleInputChange('floorNo', Number(e.target.value))}
                    placeholder="e.g. 1"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Water Supply
                  </label>
                  <input
                    type="text"
                    value={formData.waterSupply || 'Corporation & Borewell'}
                    onChange={(e) => handleInputChange('waterSupply', e.target.value)}
                    placeholder="Corporation & Borewell"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Electricity
                  </label>
                  <input
                    type="text"
                    value={formData.electricitySupply || 'EB Separate Meter'}
                    onChange={(e) => handleInputChange('electricitySupply', e.target.value)}
                    placeholder="EB Separate Meter"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              {/* Rental Rules & Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rental Rules & Preferences
                </label>
                <textarea
                  rows={2}
                  value={formData.rentalRules || ''}
                  onChange={(e) => handleInputChange('rentalRules', e.target.value)}
                  placeholder="e.g. Vegetarians preferred. No loud noise after 10 PM. Advance notice for vacation..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Additional Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Proximity to bus terminus, railway station, market, ventilation highlights..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: TAMIL NADU LOCATION FIELDS */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Tamil Nadu Location Details</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Accurate address and district information for customer discovery and verification.
              </p>
            </div>
            <span className="text-xs font-bold bg-brand-50 text-brand-900 border border-brand-200 px-3 py-1 rounded-lg flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>State: Tamil Nadu</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* District Dropdown (All 38 TN Districts) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tamil Nadu District *
              </label>
              <select
                value={formData.district || 'Chennai'}
                onChange={(e) => handleDistrictSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden font-bold"
              >
                {TN_DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* City / Town / Village */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                City / Town / Village *
              </label>
              <input
                type="text"
                required
                value={formData.city || ''}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="e.g. Sholinganallur, Pollachi, Hosur"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-medium"
              />
            </div>

            {/* Locality / Area */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Locality / Area / Neighborhood *
              </label>
              <input
                type="text"
                required
                value={formData.area || ''}
                onChange={(e) => {
                  handleInputChange('area', e.target.value);
                  handleInputChange('locality', e.target.value);
                }}
                placeholder="e.g. OMR IT Corridor / Anna Nagar West"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
              {DISTRICT_LOCALITIES[formData.district || ''] && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[10px] text-slate-400">Suggestions:</span>
                  {DISTRICT_LOCALITIES[formData.district || ''].slice(0, 4).map(loc => (
                    <button
                      type="button"
                      key={loc}
                      onClick={() => {
                        handleInputChange('area', loc);
                        handleInputChange('locality', loc);
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PIN Code */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                PIN Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.pincode || ''}
                onChange={(e) => handleInputChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 600119"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden font-mono font-bold"
              />
            </div>

            {/* Full Street Address */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Property Address, Door / Plot No & Street *
              </label>
              <input
                type="text"
                required
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="e.g. Door No. 14, 2nd Cross Street, Rajalakshmi Nagar"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
              />
            </div>

            {/* Landmark */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Landmark (Nearby Key Location)
              </label>
              <input
                type="text"
                value={formData.landmark || ''}
                onChange={(e) => handleInputChange('landmark', e.target.value)}
                placeholder="e.g. Opposite to Wipro SEZ, Behind Bus Terminus"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden"
              />
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: PHOTOS & VIDEO UPLOADS */}
      {/* ======================================================== */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {formData.type === 'land_sale' && 'Land Photos & Video'}
                {formData.type === 'house_sale' && 'House Exterior & Interior Media'}
                {formData.type === 'house_rent' && 'Property Photos & Walkthrough'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {formData.type === 'land_sale' 
                  ? 'Upload clear boundary, road view, and layout photos (JPEG, PNG, WEBP).'
                  : 'Upload front elevation, hall, bedrooms, kitchen, and bathroom photos.'}
              </p>
            </div>
            {uploadingMedia && (
              <span className="flex items-center text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1 rounded-full animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Uploading Media...
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
              Or Add Photo by Direct Image URL
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                + Add Photo
              </button>
            </div>

            {/* Uploaded Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              {formData.images?.map((img) => (
                <div key={img.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100 shadow-2xs">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  
                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition shadow cursor-pointer z-10"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Set Cover Button */}
                  <button
                    type="button"
                    onClick={() => setCoverImage(img.id)}
                    className="absolute top-1.5 left-1.5 p-1 bg-black/60 hover:bg-black text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition shadow cursor-pointer z-10"
                  >
                    {img.isCover ? 'Cover' : 'Set Cover'}
                  </button>

                  {img.isCover && (
                    <span className="absolute bottom-1.5 left-1.5 bg-emerald-800 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-xs">
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
              Optional Property Video Walkthrough (MP4/WebM)
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="file"
                id="property-video-file-input"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <label
                htmlFor="property-video-file-input"
                className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 cursor-pointer transition"
              >
                <Video className="w-4 h-4" />
                <span>Upload MP4 Video (Max 50MB)</span>
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
                Video tour attached. SPP Nestora enquiry desk banner will be automatically overlaid.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 5: REVIEW & PREVIEW LISTING */}
      {/* ======================================================== */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Review & Preview Listing</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify all submitted specifications before proceeding to the ₹10 listing fee.
              </p>
            </div>
            
            {/* "Preview Listing" Button */}
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Preview Customer View</span>
            </button>
          </div>

          {/* Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 border border-slate-200">
              <img
                src={formData.images?.[0]?.url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-900 border border-brand-200">
                  {formData.type === 'land_sale' ? 'Land for Sale' : formData.type === 'house_rent' ? 'House for Rent' : 'House for Sale'}
                </span>
                <span className="text-xs font-bold text-slate-500">Tamil Nadu</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 leading-snug">{formData.title}</h3>
              
              <p className="text-xs text-slate-600 flex items-center">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1 flex-shrink-0" />
                <span>{formData.address || formData.area}, {formData.city} - {formData.pincode} ({formData.district})</span>
              </p>

              {/* Price / Rent Breakdown */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                {formData.type === 'house_rent' ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Monthly Rent:</span>
                      <span className="text-xl font-black text-amber-900">₹{formData.price?.toLocaleString('en-IN')} / month</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Refundable Security Deposit:</span>
                      <span className="font-bold">₹{formData.depositAmount?.toLocaleString('en-IN')}</span>
                    </div>
                    {formData.maintenanceFee ? (
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Maintenance Fee:</span>
                        <span className="font-bold">₹{formData.maintenanceFee?.toLocaleString('en-IN')} / mo</span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
                      <span className="text-2xl font-black text-brand-900">₹{formData.price?.toLocaleString('en-IN')}</span>
                    </div>
                    {currentPricePerSqft > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Calculated Rate</span>
                        <span className="text-sm font-bold text-emerald-700">₹{currentPricePerSqft.toLocaleString()} / Sq.Ft</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-3 gap-2 py-2 text-xs border-y border-slate-100">
                {formData.type === 'land_sale' ? (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Area</span>
                      <span className="font-bold text-slate-900">{formData.totalArea} {formData.areaUnit}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Equivalent</span>
                      <span className="font-bold text-slate-900">{currentLandSqft.toLocaleString()} Sq.Ft</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Approval</span>
                      <span className="font-bold text-emerald-700 uppercase">{formData.dtcpStatus || 'Approved'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Configuration</span>
                      <span className="font-bold text-slate-900">{formData.bhk} BHK ({formData.bathrooms} Bath)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Built-up</span>
                      <span className="font-bold text-slate-900">{formData.builtUpAreaSqft || formData.areaSqft} Sq.Ft</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Furnishing</span>
                      <span className="font-bold text-slate-900 capitalize">{formData.furnishing}</span>
                    </div>
                  </>
                )}
              </div>

              {formData.description && (
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{formData.description}</p>
              )}
            </div>
          </div>

          {/* Continue Action Banner */}
          <div className="p-4 bg-brand-50 border border-brand-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-brand-900">Ready to Publish Listing?</h4>
              <p className="text-xs text-slate-600">A fixed listing fee of ₹10 applies for verification and admin processing.</p>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap flex items-center justify-center space-x-1.5"
            >
              <span>Continue to ₹10 Listing Fee</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 6: ₹10 LISTING FEE PAYMENT */}
      {/* ======================================================== */}
      {currentStep === 6 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-elevated space-y-6">
          
          <div className="text-center max-w-md mx-auto space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-800 flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
              ₹{settings.listingFeeAmount || 10}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Pay ₹{settings.listingFeeAmount || 10} Property Listing Fee
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every property listing requires a fixed fee of ₹10 to initiate admin verification. Pay securely using UPI (GPay, PhonePe, Paytm, QR) or Cards.
            </p>
          </div>

          {/* Pricing Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Listing Category:</span>
              <span className="font-bold text-slate-900 uppercase">
                {formData.type === 'land_sale' ? 'Land for Sale' : formData.type === 'house_rent' ? 'House for Rent' : 'House for Sale'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Property Reference:</span>
              <span className="font-mono font-bold text-brand-900">{createdProperty?.propertyCode || 'Pending Assignment'}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Listing Fee:</span>
              <span className="font-bold text-slate-900">₹{settings.listingFeeAmount || 10}.00</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-slate-900">
              <span>Total Payable Amount:</span>
              <span className="text-brand-800">₹{settings.listingFeeAmount || 10}.00</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="max-w-md mx-auto space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Preferred Payment Method
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-brand-800 bg-brand-50 text-brand-900 ring-2 ring-brand-800/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-lg mb-1">📱</div>
                <span className="text-xs font-bold block">UPI / QR</span>
                <span className="text-[10px] text-slate-400 block">PhonePe, GPay</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-brand-800 bg-brand-50 text-brand-900 ring-2 ring-brand-800/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-lg mb-1">💳</div>
                <span className="text-xs font-bold block">Cards</span>
                <span className="text-[10px] text-slate-400 block">Debit / Credit</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  paymentMethod === 'netbanking'
                    ? 'border-brand-800 bg-brand-50 text-brand-900 ring-2 ring-brand-800/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-lg mb-1">🏦</div>
                <span className="text-xs font-bold block">NetBanking</span>
                <span className="text-[10px] text-slate-400 block">All Indian Banks</span>
              </button>
            </div>
          </div>

          {/* Payment Failure Alert & Safe Retry */}
          {paymentStatus === 'failed' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl max-w-md mx-auto space-y-2">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Payment Incomplete or Cancelled</span>
              </div>
              <p className="text-xs text-rose-700">
                {paymentError || 'The transaction could not be verified. You can retry immediately without creating duplicate charges.'}
              </p>
              <button
                type="button"
                onClick={handlePaymentAndSubmit}
                disabled={loading}
                className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Retry Payment (₹{settings.listingFeeAmount || 10})
              </button>
            </div>
          )}

          {/* Primary Pay Button */}
          {paymentStatus !== 'failed' && (
            <div className="max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={handlePaymentAndSubmit}
                disabled={loading}
                className="w-full py-3.5 bg-brand-800 hover:bg-brand-900 text-white rounded-2xl font-extrabold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment via Razorpay...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Pay ₹{settings.listingFeeAmount || 10} via Razorpay Checkout</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                🔒 256-Bit SSL Encrypted Razorpay Checkout. Never refresh your browser while transaction is pending.
              </p>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 7: SUCCESS RECEIPT & ADMIN APPROVAL STATUS */}
      {/* ======================================================== */}
      {currentStep === 7 && receipt && createdProperty && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-elevated text-center max-w-lg mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-3xl shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Payment Successful & Verified!
            </h2>
            <p className="text-xs text-slate-600">
              Your ₹{Number(receipt.amount).toFixed(2)} listing fee has been confirmed. The property has moved to the Admin Approval Queue.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
              <span className="text-slate-500 font-medium">Property Code:</span>
              <span className="font-mono font-bold text-slate-900">{createdProperty.propertyCode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Property Title:</span>
              <span className="font-semibold text-slate-900 truncate max-w-[200px]">{createdProperty.title}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Listing Category:</span>
              <span className="font-bold text-slate-900 uppercase">
                {createdProperty.type === 'land_sale' ? 'Land for Sale' : createdProperty.type === 'house_rent' ? 'House for Rent' : 'House for Sale'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Listing Fee Paid:</span>
              <span className="font-bold text-slate-900">₹{Number(receipt.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment ID:</span>
              <span className="font-mono text-[11px] font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded">
                {receipt.transactionRef || receipt.id}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Payment Status:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Verified (Success)
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
              <span className="text-slate-500">Property Visibility:</span>
              <span className="font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Pending Admin Review
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-900 space-y-1">
            <span className="font-bold block">Next Steps in Admin Workflow:</span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              SPP Nestora administrators will review your property documentation and location details. Once verified, the listing will become publicly searchable on the website.
            </p>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => navigate('/dealer/dashboard')}
              className="flex-1 py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
            >
              Go to Dealer Dashboard
            </button>
            <button
              onClick={() => navigate(`/properties/${createdProperty.id}`)}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              View Property Preview
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
            <span>{currentStep === 5 ? 'Continue to ₹10 Listing Fee' : t.addProperty.nextStep}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* INTERACTIVE PREVIEW MODAL */}
      {/* ======================================================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2.5 py-1 rounded">
                Live Customer Listing Preview
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">{formData.title || 'Untitled Property'}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{formData.area}, {formData.city} ({formData.district})</p>
            </div>

            {/* Main Cover Image */}
            <div className="aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={formData.images?.[0]?.url || 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            {/* Price / Rent Details */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">
                  {formData.type === 'house_rent' ? 'Expected Monthly Rent' : 'Expected Selling Price'}
                </span>
                <span className="text-2xl font-black text-brand-900">
                  ₹{formData.price?.toLocaleString('en-IN')}{formData.type === 'house_rent' ? ' / month' : ''}
                </span>
              </div>
              {formData.type === 'house_rent' && formData.depositAmount && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Refundable Deposit</span>
                  <span className="text-sm font-bold text-slate-800">₹{formData.depositAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {formData.type !== 'house_rent' && currentPricePerSqft > 0 && (
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Rate</span>
                  <span className="text-sm font-bold text-emerald-700">₹{currentPricePerSqft.toLocaleString()} / Sq.Ft</span>
                </div>
              )}
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              {formData.type === 'land_sale' ? (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Land Area</span>
                    <span className="font-bold text-slate-800">{formData.totalArea} {formData.areaUnit}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Total Sq.Ft</span>
                    <span className="font-bold text-slate-800">{currentLandSqft.toLocaleString()} Sq.Ft</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">DTCP Approval</span>
                    <span className="font-bold text-emerald-700 uppercase">{formData.dtcpStatus || 'Yes'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Road Access</span>
                    <span className="font-bold text-slate-800 capitalize">{formData.roadAccess}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Configuration</span>
                    <span className="font-bold text-slate-800">{formData.bhk} BHK</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Built-up Area</span>
                    <span className="font-bold text-slate-800">{formData.builtUpAreaSqft} Sq.Ft</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Bathrooms</span>
                    <span className="font-bold text-slate-800">{formData.bathrooms}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Furnishing</span>
                    <span className="font-bold text-slate-800 capitalize">{formData.furnishing}</span>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            <div className="text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-900 block">Description:</span>
              <p className="leading-relaxed whitespace-pre-line">{formData.description || 'No description provided.'}</p>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
