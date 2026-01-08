
import React, { useState } from 'react';
import { Fuel, Ship, Settings, ArrowRightLeft, CreditCard } from 'lucide-react';
import { ExpenseType } from '../types';

interface ExpenseFormProps {
  onAdd: (expenses: { type: ExpenseType; amount: number }[]) => void;
  title?: string;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAdd, title = "Günlük Giderler" }) => {
  const [values, setValues] = useState<Record<ExpenseType, string>>({
    'Köprü': '0',
    'Gemi': '0',
    'Yakıt': '0',
    'Diğer': '0'
  });

  const handleChange = (type: ExpenseType, val: string) => {
    setValues(prev => ({ ...prev, [type]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = Object.entries(values).map(([type, amount]) => ({
      type: type as ExpenseType,
      amount: Number(amount)
    }));
    onAdd(result);
    setValues({ 'Köprü': '0', 'Gemi': '0', 'Yakıt': '0', 'Diğer': '0' });
  };

  const icons: Record<ExpenseType, React.ReactNode> = {
    'Köprü': <ArrowRightLeft size={16} />,
    'Gemi': <Ship size={16} />,
    'Yakıt': <Fuel size={16} />,
    'Diğer': <Settings size={16} />
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-7 rounded-[2rem] shadow-2xl border border-red-500/10 dark:border-red-500/5 transition-all">
      <h3 className="text-xl font-black text-red-700 dark:text-red-400 mb-6 flex items-center gap-3 uppercase tracking-[0.2em]">
        <div className="p-2 bg-red-600 dark:bg-red-500 rounded-xl text-white shadow-lg shadow-red-500/20">
            <CreditCard size={18} />
        </div>
        {title}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          {(Object.keys(values) as ExpenseType[]).map(type => (
            <div key={type} className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                <span className="text-red-500/60">{icons[type]}</span>
                {type}
              </label>
              <div className="relative group">
                <input 
                  type="number" 
                  value={values[type]}
                  onChange={(e) => handleChange(type, e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none transition-all font-black text-lg text-red-700 dark:text-red-400 shadow-inner group-hover:border-red-200 dark:group-hover:border-red-900/30"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-red-500/30">₺</span>
              </div>
            </div>
          ))}
        </div>

        <button 
          type="submit"
          className="w-full relative group overflow-hidden bg-slate-900 dark:bg-slate-800 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.97] mt-2 uppercase tracking-[0.25em] text-xs border border-white/5"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Giderleri Kaydet
            <ArrowRightLeft size={16} className="text-red-500" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
