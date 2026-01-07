
import React, { useState } from 'react';
import { Fuel, Ship, Settings } from 'lucide-react';
import { ExpenseType } from '../types';

interface ExpenseFormProps {
  onAdd: (expenses: { type: ExpenseType; amount: number }[]) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAdd }) => {
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
    'Köprü': <Settings size={16} />,
    'Gemi': <Ship size={16} />,
    'Yakıt': <Fuel size={16} />,
    'Diğer': <Settings size={16} />
  };

  return (
    <div className="bg-red-900/20 p-6 rounded-2xl shadow-sm border border-red-500/30">
      <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
        <Fuel size={20} className="text-red-500" />
        Günlük Giderler
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(values) as ExpenseType[]).map(type => (
            <div key={type}>
              <label className="block text-xs font-bold text-red-500/70 mb-1 uppercase tracking-wider flex items-center gap-1">
                {icons[type]} {type}
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={values[type]}
                  onChange={(e) => handleChange(type, e.target.value)}
                  placeholder="0"
                  className="w-full pl-3 pr-4 py-2 bg-slate-900 border border-red-500/30 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-all font-bold text-red-400"
                  required
                />
              </div>
            </div>
          ))}
        </div>
        <button 
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-red-900/20"
        >
          Giderleri Kaydet
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
