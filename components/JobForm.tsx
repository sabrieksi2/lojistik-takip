
import React, { useState } from 'react';
import { PlusCircle, MapPin, Wallet, Building2 } from 'lucide-react';

interface JobFormProps {
  onAdd: (job: { company: string; from: string; to: string; amount: number }) => void;
  title?: string;
}

const JobForm: React.FC<JobFormProps> = ({ onAdd, title = "Günlük İş Girişi" }) => {
  const [company, setCompany] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !from || !to || !amount) return;
    onAdd({ company, from, to, amount: Number(amount) });
    setCompany('');
    setFrom('');
    setTo('');
    setAmount('');
  };

  return (
    <div className="bg-emerald-50 p-6 rounded-2xl shadow-sm border border-emerald-100">
      <h3 className="text-lg font-bold text-emerald-700 mb-4 flex items-center gap-2">
        <PlusCircle size={20} className="text-emerald-600" />
        {title}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-emerald-600/70 mb-1 uppercase tracking-wider">Firma Adı</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
            <input 
              type="text" 
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Örn: Global Lojistik"
              className="w-full pl-10 pr-4 py-2 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-emerald-600/70 mb-1 uppercase tracking-wider">Nereden Alındı?</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
            <input 
              type="text" 
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Örn: Havalimanı"
              className="w-full pl-10 pr-4 py-2 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-emerald-600/70 mb-1 uppercase tracking-wider">Nereye Bırakıldı?</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
            <input 
              type="text" 
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Örn: Sultanahmet"
              className="w-full pl-10 pr-4 py-2 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-emerald-600/70 mb-1 uppercase tracking-wider">Ödeme Tutarı (TL)</label>
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-10 pr-4 py-2 bg-white border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-bold text-emerald-600 placeholder:text-slate-400"
              required
            />
          </div>
        </div>
        <button 
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md shadow-emerald-100 transition-all active:scale-[0.98]"
        >
          İşi Kaydet
        </button>
      </form>
    </div>
  );
};

export default JobForm;
