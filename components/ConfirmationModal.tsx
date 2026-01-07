
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
      bg: 'bg-red-900/10',
      icon: 'text-red-500',
      btn: 'bg-red-600 hover:bg-red-700 shadow-red-900/40',
      border: 'border-red-500/20'
    },
    success: {
      bg: 'bg-emerald-900/10',
      icon: 'text-emerald-500',
      btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/40',
      border: 'border-emerald-500/20'
    },
    info: {
      bg: 'bg-indigo-900/10',
      icon: 'text-indigo-500',
      btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/40',
      border: 'border-indigo-500/20'
    }
  };

  const style = colors[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-800">
        <div className={`p-6 ${style.bg} border-b ${style.border} flex justify-between items-start`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-slate-900 rounded-lg shadow-sm ${style.icon} border ${style.border}`}>
              {type === 'danger' && <AlertTriangle size={24} />}
              {type === 'success' && <CheckCircle size={24} />}
              {type === 'info' && <AlertTriangle size={24} />}
            </div>
            <h3 className="font-bold text-slate-100 text-lg">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-400 leading-relaxed">{message}</p>
          <div className="mt-8 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all border border-slate-700"
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
