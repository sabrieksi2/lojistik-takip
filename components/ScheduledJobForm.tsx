
import React, { useState } from 'react';
import { Calendar, User, MapPin, Clock, CreditCard, Building2 } from 'lucide-react';

interface ScheduledJobFormProps {
  onAdd: (job: { company: string; passengerName: string; from: string; to: string; fee: number; date: string; time: string }) => void;
}

const ScheduledJobForm: React.FC<ScheduledJobFormProps> = ({ onAdd }) => {
  const [company, setCompany] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !passengerName || !from || !to || !fee || !date || !time) return;
    onAdd({ company, passengerName, from, to, fee: Number(fee), date, time });
    setCompany('');
    setPassengerName('');
    setFrom('');
    setTo('');
    setFee('');
    setDate('');
    setTime('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mb-4 flex items-center gap-2">
        <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
        İleri Tarihli İş Kaydı
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Firma Adı</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
            <input 
              type="text" 
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Firma Adı"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-900 dark:text-slate-100 font-medium"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Yolcu Adı</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
            <input 
              type="text" 
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              placeholder="Ad Soyad"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-slate-900 dark:text-slate-100 font-medium"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Nereden</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={14} />
              <input 
                type="text" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Nereye</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={14} />
              <input 
                type="text" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Anlaşılan Ücret (TL)</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
            <input 
              type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="0.00"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-bold text-indigo-600 dark:text-indigo-400"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium" />
        </div>

        <button 
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          Randevuyu Kaydet
        </button>
      </form>
    </div>
  );
};

export default ScheduledJobForm;
