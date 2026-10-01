import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2
} from 'lucide-react';

export const ContactPage: React.FC = () => {
  const { language, settings, addEnquiry, getWhatsAppUrl, getCallUrl, showToast } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Property Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) return;

    // Send to Admin Enquiry CRM
    addEnquiry({
      propertyId: 'general-desk',
      propertyCode: 'SPP-GEN-DESK',
      propertyTitle: subject,
      propertyType: 'house_sale',
      propertyLocation: 'Tamil Nadu Desk',
      propertyPrice: 0,
      dealerId: 'admin-desk',
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      channel: 'form',
      message: `[Contact Form - ${subject}]: ${message}`,
      status: 'new'
    });

    setSubmitted(true);
    showToast(language === 'ta' ? 'செய்தி அனுப்பப்பட்டது' : 'Message sent to SPP Nestora Admin desk!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">

      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs font-bold text-brand-700 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
          Official Support & Coordination Desk
        </span>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Contact SPP Nestora
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Connect directly with our central Tamil Nadu real-estate desk for site visit arrangements, listing support, and document assistance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* Left: Contact Info Cards */}
        <div className="lg:col-span-1 space-y-4">

          {/* Official Phone Card */}
          <a
            href={getCallUrl()}
            className="block bg-white p-6 rounded-3xl border border-slate-200 hover:border-brand-500 shadow-subtle hover:shadow-elevated transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Direct Official Phone</h3>
            <p className="text-lg font-black text-brand-900 mt-0.5">{settings.officialPhoneDisplay}</p>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              Click to Call Now
            </span>
          </a>

          {/* Official WhatsApp Card */}
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-500 shadow-subtle hover:shadow-elevated transition group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Official WhatsApp Desk</h3>
            <p className="text-lg font-black text-slate-900 mt-0.5">{settings.officialWhatsAppDisplay}</p>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              Instant Chat with Property Executive
            </span>
          </a>

          {/* Email & Office Address */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-subtle space-y-4 text-xs text-slate-600">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-brand-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Support Email</span>
                <span className="text-slate-600">{settings.officialEmail}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-brand-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Working Hours</span>
                <span className="text-slate-600">{settings.supportHours}</span>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-brand-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">HQ Operations Address</span>
                <span className="text-slate-600 leading-relaxed">{settings.officeAddress}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Contact Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 sm:p-10 shadow-elevated">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Send an Official Message</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your inquiry will be logged into our central CRM and our team will get in touch.
            </p>
          </div>

          {submitted ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Message Received!</h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Thank you for contacting SPP Nestora. Our regional property executive will review your enquiry and get back to you shortly.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setMessage('');
                }}
                className="px-6 py-2.5 bg-brand-800 text-white rounded-xl text-xs font-bold"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mobile Phone (+91) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9715673055"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subject / Category
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl bg-white outline-hidden"
                  >
                    <option value="General Property Inquiry">General Property Inquiry</option>
                    <option value="Site Visit Assistance">Site Visit Assistance</option>
                    <option value="Dealer Registration Support">Dealer Registration Support</option>
                    <option value="Document Verification Question">Document Verification Question</option>
                    <option value="Feedback / Complaint">Feedback / Complaint</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Your Message / Requirement *
                </label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide your location preference, budget, or any property ID you would like to inspect..."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl outline-hidden focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit to SPP Nestora Desk</span>
              </button>

            </form>
          )}

        </div>

      </div>

    </div>
  );
};
