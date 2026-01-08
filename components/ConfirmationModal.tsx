
import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  type: 'danger' | 'success' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText,
  type 
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      btn: 'bg-red-600 hover:bg-red-700 shadow-red-100 dark:shadow-none',
      border: 'border-red-100 dark:border-red-900/50'
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 dark:shadow-none',
      border: 'border-emerald-100 dark:border-emerald-900/50'
    },
    info: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      icon: 'text-indigo-600 dark:text-indigo-400',
      btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 dark:shadow-none',
      border: 'border-indigo-100 dark:border-indigo-900/50'
    }
  };

  const style = colors[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        <div className={`p-6 ${style.bg} border-b ${style.border} flex justify-between items-start`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm ${style.icon} border ${style.border}`}>
              {type === 'danger' && <AlertTriangle size={24} />}
              {type === 'success' && <CheckCircle size={24} />}
              {type === 'info' && <AlertTriangle size={24} />}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{message}</p>
          <div className="mt-8 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700"
            >
              Vazgeç
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-all shadow-lg ${style.btn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
