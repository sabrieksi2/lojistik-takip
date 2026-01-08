
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend
} from 'recharts';
import { DollarSign, CalendarSearch, CalendarDays, Database, Save, Building2, TrendingDown, ArrowRight, Wallet } from 'lucide-react';

interface StatsOverviewProps {
  jobs: Job[];
  scheduledJobs: ScheduledJob[];
  expenses: Expense[];
  dbConfig: { url: string; key: string };
  onDbConfigChange: (config: { url: string; key: string }) => void;
  onSyncRequest: () => void;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ jobs, expenses, dbConfig, onDbConfigChange, onSyncRequest }) => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(dbConfig.url);
  const [tempKey, setTempKey] = useState(dbConfig.key);

  const getExpenseByType = (expenseList: Expense[]) => {
    const breakdown: Record<ExpenseType, number> = { 'Köprü': 0, 'Gemi': 0, 'Yakıt': 0, 'Diğer': 0 };
    expenseList.forEach(e => { if(breakdown[e.type] !== undefined) breakdown[e.type] += e.amount; });
    return breakdown;
  };

  const getPeriodStats = (startTime: number, endTime?: number) => {
    const periodJobs = jobs.filter(j => {
      const ts = new Date(j.date).getTime();
      return ts >= startTime && (endTime ? ts <= endTime : true);
    });
    const periodExpenses = expenses.filter(e => {
      const ts = new Date(e.date).getTime();
      return ts >= startTime && (endTime ? ts <= endTime : true);
    });
    const revenue = periodJobs.reduce((sum, j) => sum + j.amount, 0);
    const expenseTotal = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseBreakdown = getExpenseByType(periodExpenses);
    return { revenue, expenseTotal, profit: revenue - expenseTotal, breakdown: expenseBreakdown };
  };

  const dailyBreakdown = useMemo(() => {
    const groups: Record<string, { count: number; revenue: number }> = {};
    jobs.forEach(job => {
      const dateKey = new Date(job.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!groups[dateKey]) groups[dateKey] = { count: 0, revenue: 0 };
      groups[dateKey].count += 1;
      groups[dateKey].revenue += job.amount;
    });
    return Object.entries(groups).map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(b.date.split('.').reverse().join('-')).getTime() - new Date(a.date.split('.').reverse().join('-')).getTime());
  }, [jobs]);

  const companyStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    jobs.forEach(job => {
      if (!stats[job.company]) stats[job.company] = { count: 0, total: 0 };
      stats[job.company].count += 1;
      stats[job.company].total += job.amount;
    });
    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [jobs]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const d = new Date(now);
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff)).setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Historical range
    const startOfRange = new Date(startDate + 'T00:00:00').getTime();
    const endOfRange = new Date(endDate + 'T23:59:59').getTime();

    return {
      daily: getPeriodStats(startOfToday),
      weekly: getPeriodStats(startOfWeek),
      monthly: getPeriodStats(startOfMonth),
      total: getPeriodStats(0),
      historical: getPeriodStats(startOfRange, endOfRange)
    };
  }, [jobs, expenses, startDate, endDate]);

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Üst Özet Kartları (GERİ GELDİ) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Günlük Kar', data: stats.daily },
          { label: 'Haftalık Kar', data: stats.weekly },
          { label: 'Aylık Kar', data: stats.monthly },
          { label: 'Toplam Kar', data: stats.total },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-sm">{item.label}</span>
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><DollarSign size={20} /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">{item.data.profit.toLocaleString('tr-TR')} ₺</div>
            <div className="text-[10px] space-y-1 font-bold">
               <div className="flex justify-between text-emerald-600 dark:text-emerald-400"><span>GELİR:</span><span>{item.data.revenue.toLocaleString('tr-TR')} ₺</span></div>
               <div className="flex justify-between text-red-500 dark:text-red-400"><span>GİDER:</span><span>{item.data.expenseTotal.toLocaleString('tr-TR')} ₺</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Tarih Aralığı Sorgu & Özet */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><CalendarSearch size={24} /></div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Tarih Aralığı Sorgula</h3>
              <p className="text-xs text-slate-500 font-medium">İki tarih arası tüm hareketleri listeleyin.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-bold text-xs text-slate-700 dark:text-slate-200"
            />
            <ArrowRight size={16} className="text-slate-400" />
            <input 
              type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-bold text-xs text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 uppercase">Aralık Geliri</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.historical.revenue.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
            <div className="text-xs font-bold text-red-600 dark:text-red-400 mb-1 uppercase">Aralık Gideri</div>
            <div className="text-2xl font-black text-red-700 dark:text-red-300">{stats.historical.expenseTotal.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 uppercase">Aralık Net Kar</div>
            <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{stats.historical.profit.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>
      </div>

      {/* 3. Gider Kalemleri Analizi */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          <TrendingDown size={20} className="text-red-500" />
          Gider Kalemleri Analizi
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2">Kalem</th>
                <th className="px-4 py-2 text-right">Günlük</th>
                <th className="px-4 py-2 text-right">Haftalık</th>
                <th className="px-4 py-2 text-right">Aylık</th>
                <th className="px-4 py-2 text-right">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs font-bold">
              {(['Köprü', 'Gemi', 'Yakıt', 'Diğer'] as ExpenseType[]).map(type => (
                <tr key={type} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{type}</td>
                  <td className="px-4 py-3 text-right text-red-600">{stats.daily.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-4 py-3 text-right text-red-600">{stats.weekly.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-4 py-3 text-right text-red-600">{stats.monthly.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-4 py-3 text-right text-red-700 dark:text-red-400 font-black">{stats.total.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Firma Performansı & Günlük Dağılım */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <Building2 size={18} className="text-emerald-600" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Firma Bazlı Raporlama</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-2">Firma</th>
                  <th className="px-4 py-2 text-center">İş Adeti</th>
                  <th className="px-4 py-2 text-right">Toplam Ciro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {companyStats.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{row.name}</td>
                    <td className="px-4 py-3 text-center"><span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">{row.count}</span></td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">{row.total.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Günlük İş Dağılımı</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-2">Tarih</th>
                  <th className="px-4 py-2 text-center">Adet</th>
                  <th className="px-4 py-2 text-right">Gelir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {dailyBreakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{row.date}</td>
                    <td className="px-4 py-3 text-center"><span className="font-bold text-slate-500">{row.count}</span></td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">{row.revenue.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DB Ayarları Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <button onClick={() => setShowDbSettings(!showDbSettings)} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider"><Database size={16} className="text-indigo-600" />Bulut Veritabanı Ayarları</div>
          <span className="text-xs text-indigo-600 font-bold">{showDbSettings ? 'Kapat' : 'Yapılandır'}</span>
        </button>
        {showDbSettings && (
          <div className="p-6 space-y-6 animate-in slide-in-from-top duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">URL</label>
                <input type="text" value={tempUrl} onChange={e => setTempUrl(e.target.value)} placeholder="https://xyz.supabase.co" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Key</label>
                <input type="password" value={tempKey} onChange={e => setTempKey(e.target.value)} placeholder="Supabase Anon Key" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200" />
              </div>
            </div>
            <div className="flex gap-3">
               <button onClick={() => { onDbConfigChange({ url: tempUrl, key: tempKey }); alert("Ayarlar kaydedildi!"); }} className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-md active:scale-95"><Save size={16} /> Ayarları Kaydet</button>
               <button onClick={onSyncRequest} className="flex-1 border border-slate-200 dark:border-slate-700 font-bold py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95">Verileri Şimdi Çek</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsOverview;
