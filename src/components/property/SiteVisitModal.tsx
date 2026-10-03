import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Property } from '../../types';
import { apiService } from '../../services/api';
import { Calendar, Clock, User, Phone, MessageSquare, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export const SiteVisitModal: React.FC<Props> = ({ property, isOpen, onClose }) => {
  const { language, t, currentUser, addEnquiry, scheduleSiteVisit } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('10:30 AM');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    // 1. Submit to server API (PostgreSQL + Email Notification)
    apiService.scheduleSiteVisit({
      propertyId: property.id,
      propertyCode: property.propertyCode,
      propertyTitle: property.title,
      propertyAddress: property.address,
      dealerId: property.dealerId,
      customerId: currentUser?.id || 'guest-customer',
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      date,
      time,
      notes: message
    }).catch(err => {
      console.warn('Backend site visit scheduling warning:', err);
    });

    // 2. Add Enquiry to Admin CRM
    addEnquiry({
      propertyId: property.id,
      propertyCode: property.propertyCode,
      propertyTitle: property.title,
      propertyType: property.type,
      propertyLocation: `${property.area}, ${property.district}`,
      propertyPrice: property.price,
      dealerId: property.dealerId,
      customerId: currentUser?.id,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      channel: 'form',
      message: message || `Requested site visit for ${date} at ${time}.`,
      preferredTime: `${date} @ ${time}`,
      status: 'new'
    });

    // 3. Schedule Site Visit record in local context
    scheduleSiteVisit({
      propertyId: property.id,
      propertyCode: property.propertyCode,
      propertyTitle: property.title,
      propertyAddress: property.address,
      dealerId: property.dealerId,
      customerId: currentUser?.id || 'guest-customer',
      customerName: name,
      customerPhone: phone,
      date,
      time,
      status: 'requested',
      notes: message
    });

    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="bg-brand-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">{t.enquiryModal.title}</h3>
              <p className="text-[11px] text-emerald-200 font-mono">Property #{property.propertyCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">{t.enquiryModal.enquirySuccess}</h4>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              {t.enquiryModal.enquirySuccessDesc}
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm transition"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            <div className="bg-brand-50 border border-brand-200/60 rounded-xl p-3 text-xs text-brand-900 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-brand-700 flex-shrink-0 mt-0.5" />
              <span>
                {language === 'ta'
                  ? 'உங்கள் விவரங்கள் SPP நெஸ்டோரா அதிகாரப்பூர்வ குழுவிற்கு மட்டுமே அனுப்பப்படும். தனிப்பட்ட தரகர்களுக்கு வழங்கப்படாது.'
                  : 'Your request goes directly to the SPP Nestora Admin desk for official visit coordination.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.enquiryModal.yourName} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.enquiryModal.yourPhone} *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98400 12345"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.enquiryModal.preferredDate} *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t.enquiryModal.preferredTime}
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden bg-white"
                >
                  <option value="09:30 AM">09:30 AM</option>
                  <option value="10:30 AM">10:30 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:30 PM">04:30 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t.enquiryModal.message}
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Any special questions or timing notes..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 outline-hidden resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-brand-800 hover:bg-brand-900 text-white rounded-xl font-bold text-sm shadow-md transition"
              >
                {t.enquiryModal.submitEnquiry}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
