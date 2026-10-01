import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgColor = 'bg-white border-slate-200 text-slate-800';
        let icon = <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />;

        if (toast.type === 'success') {
          bgColor = 'bg-emerald-900 text-white border-emerald-800';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />;
        } else if (toast.type === 'error') {
          bgColor = 'bg-rose-900 text-white border-rose-800';
          icon = <AlertCircle className="w-5 h-5 text-rose-300 flex-shrink-0" />;
        } else if (toast.type === 'warning') {
          bgColor = 'bg-amber-900 text-white border-amber-800';
          icon = <AlertTriangle className="w-5 h-5 text-amber-300 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-lg border backdrop-blur-md transition-all animate-slideUp ${bgColor}`}
          >
            <div className="flex items-center space-x-3 pr-2">
              {icon}
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
