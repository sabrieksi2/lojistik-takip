
import React, { useState } from 'react';
import { PlusCircle, Wallet, Building2, MapPin, Car, ChevronDown } from 'lucide-react';

interface JobFormProps {
  onAdd: (job: { company: string; from: string; to: string; amount: number }) => void;
  title?: string;
  companies?: string[];
}

const JobForm: React.FC<JobFormProps> = ({ onAdd, title = "Günlük İş Girişi", companies = [] }) => {
  const [company, setCompany] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !from || !to || !amount) return;
    onAdd({ 
      company, 
      from, 
      to, 
      amount: Number(amount)
    });
    setCompany('');
    setFrom('');
    setTo('');
    setAmount('');
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-brand-gold/20 group transition-all">
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-brand-gold/5 blur-[80px] -mr-16 -mt-16 group-hover:bg-brand-gold/10 transition-all duration-700"></div>
      
      <h3 className="text-2xl font-black text-brand-navy dark:text-brand-gold mb-8 flex items-center gap-4 uppercase tracking-[0.2em]">
        <div className="p-3 bg-brand-navy dark:bg-brand-gold rounded-2xl text-white dark:text-brand-navy shadow-xl shadow-brand-gold/20 transform group-hover:scale-110 transition-transform">
            <Car size={24} />
        </div>
        {title}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        {/* Firma Alanı */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ml-2">İLGİLİ FİRMA</label>
          <div className="relative">
            <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-gold/60" size={20} />
            <input 
              list="company-list"
              type="text" 
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Firma İsmi Seç veya Yaz"
              className="w-full pl-14 pr-12 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold focus:outline-none transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-300 font-bold text-lg shadow-inner"
              required
            />
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-gold/40 pointer-events-none" size={20} />
            <datalist id="company-list">
              {companies.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        {/* Kalkış ve Varış - DİKEY YERLEŞİM */}
        <div className="space-y-4">
          <div className="space-y-2">
             <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ml-2">KALKIŞ NOKTASI</label>
             <div className="relative">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Nereden alınıyor?"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold focus:outline-none transition-all text-slate-900 dark:text-slate-100 font-bold text-lg shadow-inner"
                  required
                />
             </div>
          </div>
          <div className="space-y-2">
             <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ml-2">VARIŞ NOKTASI</label>
             <div className="relative">
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Nereye bırakılıyor?"
                  className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold focus:outline-none transition-all text-slate-900 dark:text-slate-100 font-bold text-lg shadow-inner"
                  required
                />
             </div>
          </div>
        </div>

        {/* Tutar Alanı */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] ml-2">ANLAŞILAN TUTAR</label>
          <div className="relative">
            <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-gold" size={24} />
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-14 pr-12 py-6 bg-white dark:bg-slate-900 border-2 border-brand-gold/40 dark:border-brand-gold/30 rounded-[1.5rem] focus:ring-8 focus:ring-brand-gold/10 focus:border-brand-gold focus:outline-none transition-all font-black text-2xl text-brand-navy dark:text-brand-gold tracking-tight"
              required
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-brand-gold/50 text-2xl">₺</span>
          </div>
        </div>

        {/* Onay Butonu */}
        <button 
          type="submit"
          className="w-full relative group overflow-hidden bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black py-6 rounded-[1.5rem] shadow-2xl shadow-brand-navy/30 dark:shadow-brand-gold/20 transition-all active:scale-[0.96] mt-4 uppercase tracking-[0.3em] text-sm"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            İŞLEMİ ONAYLA
            <PlusCircle size={20} />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-brand-gold/20 via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </button>
      </form>
    </div>
  );
};

export default JobForm;
