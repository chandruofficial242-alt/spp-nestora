import React from 'react';
import { Payment } from '../../types';
import { Building2, Printer, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceModal: React.FC<Props> = ({ payment, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Actions Top Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-300">Official Payment Invoice</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800" id="printable-receipt">
          
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-brand-800 text-white flex items-center justify-center font-black">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-xl font-black text-slate-900">SPP Nestora</span>
              </div>
              <p className="text-[11px] text-slate-500">Tamil Nadu Real-Estate Platform</p>
              <p className="text-[11px] text-slate-500">GST Exempt — Listing Platform Service</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold uppercase mb-1">
                PAID
              </span>
              <p className="text-xs font-mono font-bold text-slate-900">{payment.receiptNumber}</p>
              <p className="text-[11px] text-slate-500">{new Date(payment.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Billed To (Dealer):</p>
              <p className="font-bold text-slate-900">{payment.dealerName}</p>
              <p className="text-slate-600">ID: {payment.dealerId}</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">Transaction Details:</p>
              <p className="text-slate-700">Method: <strong className="uppercase">{payment.method}</strong></p>
              <p className="text-slate-700 font-mono text-[11px] truncate">Ref: {payment.transactionRef}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{payment.purpose}</p>
                    <p className="text-slate-500 text-[11px] truncate max-w-xs">{payment.propertyTitle}</p>
                  </td>
                  <td className="p-3 text-right">1</td>
                  <td className="p-3 text-right font-bold text-slate-900">₹{payment.amount}.00</td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="p-3 font-bold text-slate-900 text-right">Total Paid:</td>
                  <td className="p-3 text-right font-black text-brand-900 text-sm">₹{payment.amount}.00</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notice */}
          <div className="p-3 bg-brand-50/60 rounded-xl border border-brand-100 text-[11px] text-brand-900 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-brand-700 flex-shrink-0 mt-0.5" />
            <span>
              This receipt confirms the official ₹10 listing fee payment. SPP Nestora does not collect any mandatory transaction commission from buyers or sellers.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
