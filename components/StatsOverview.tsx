
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, Activity, PieChart as PieIcon, CalendarSearch, CalendarDays, Database, Save, HelpCircle } from 'lucide-react';

interface StatsOverviewProps {
  jobs: Job[];
  scheduledJobs: ScheduledJob[];
  expenses: Expense[];
  dbConfig: { url: string; key: string };
  onDbConfigChange: (config: { url: string; key: string }) => void;
  onSyncRequest: () => void;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ jobs, expenses, dbConfig, onDbConfigChange, onSyncRequest }) => {
  const [queryDate, setQueryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(dbConfig.url);
  const [tempKey, setTempKey] = useState(dbConfig.key);

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

    const breakdown: Record<ExpenseType, number> = { 'Köprü': 0, 'Gemi': 0, 'Yakıt': 0, 'Diğer': 0 };
    periodExpenses.forEach(e => {
      breakdown[e.type] += e.amount;
    });

    return { revenue, expenseTotal, profit: revenue - expenseTotal, breakdown };
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

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const d = new Date(now);
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff)).setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const qd = new Date(queryDate);
    const startOfQuery = new Date(qd.getFullYear(), qd.getMonth(), qd.getDate()).getTime();
    const endOfQuery = startOfQuery + (24 * 60 * 60 * 1000) - 1;

    return {
      daily: getPeriodStats(startOfToday),
      weekly: getPeriodStats(startOfWeek),
      monthly: getPeriodStats(startOfMonth),
      total: getPeriodStats(0),
      historical: getPeriodStats(startOfQuery, endOfQuery)
    };
  }, [jobs, expenses, queryDate]);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6 pb-8">
      {/* Historical Query Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><CalendarSearch size={24} /></div>
            <div>
              <h3 className="font-bold text-slate-800">Geçmiş Tarihli Sorgu</h3>
              <p className="text-xs text-slate-500 font-medium">Belirli bir günün verilerini sorgulayın.</p>
            </div>
          </div>
          <input 
            type="date" value={queryDate} onChange={(e) => setQueryDate(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-bold text-slate-700"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
            <div className="text-xs font-bold text-emerald-600 mb-1">Gelir</div>
            <div className="text-2xl font-black text-emerald-700">{stats.historical.revenue.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <div className="text-xs font-bold text-red-600 mb-1">Gider</div>
            <div className="text-2xl font-black text-red-700">{stats.historical.expenseTotal.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="text-xs font-bold text-indigo-600 mb-1">Net Kar</div>
            <div className="text-2xl font-black text-indigo-700">{stats.historical.profit.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>
      </div>

      {/* Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Günlük Kar', data: stats.daily },
          { label: 'Haftalık Kar', data: stats.weekly },
          { label: 'Aylık Kar', data: stats.monthly },
          { label: 'Toplam Kar', data: stats.total },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-slate-500 font-bold text-sm">{item.label}</span>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><DollarSign size={20} /></div>
            </div>
            <div className="text-2xl font-black text-slate-900 mb-2">{item.data.profit.toLocaleString('tr-TR')} ₺</div>
            <div className="text-[10px] space-y-1 font-bold">
               <div className="flex justify-between text-emerald-600"><span>GELİR:</span><span>{item.data.revenue.toLocaleString('tr-TR')} ₺</span></div>
               <div className="flex justify-between text-red-500"><span>GİDER:</span><span>{item.data.expenseTotal.toLocaleString('tr-TR')} ₺</span></div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-600" />
            <h3 className="font-bold text-slate-800">Günlük İş Dağılımı</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                <tr><th className="px-4 py-2">Tarih</th><th className="px-4 py-2">Adet</th><th className="px-4 py-2 text-right">Gelir</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {dailyBreakdown.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{row.date}</td>
                    <td className="px-4 py-3"><span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{row.count} İş</span></td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">{row.revenue.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[350px]">
             <h3 className="font-bold text-slate-800 mb-6">Gelir/Gider Karşılaştırması</h3>
             <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Günlük', gelir: stats.daily.revenue, gider: stats.daily.expenseTotal },
                    { name: 'Haftalık', gelir: stats.weekly.revenue, gider: stats.weekly.expenseTotal },
                    { name: 'Aylık', gelir: stats.monthly.revenue, gider: stats.monthly.expenseTotal },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0'}} />
                    <Legend />
                    <Bar dataKey="gelir" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gider" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      {/* Database Settings Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowDbSettings(!showDbSettings)}
          className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex justify-between items-center transition-colors"
        >
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Database size={18} className="text-indigo-600" />
            Bulut Veritabanı Ayarları (Kalıcı Saklama)
          </div>
          <span className="text-xs text-indigo-600 font-bold">{showDbSettings ? 'Kapat' : 'Yapılandır'}</span>
        </button>
        {showDbSettings && (
          <div className="p-6 space-y-4 animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <HelpCircle className="text-amber-500 shrink-0" size={20} />
              <p className="text-xs text-amber-800 font-medium">
                Verilerinizin cihaz değiştirdiğinizde veya tarayıcıyı temizlediğinizde silinmemesi için ücretsiz bir <strong>Supabase</strong> projesi bağlayın. 
                Supabase'de <strong>logistics_db</strong> adında, <strong>id</strong> ve <strong>data (jsonb)</strong> sütunları olan bir tablo oluşturmanız yeterlidir.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Supabase Proje URL</label>
                <input 
                  type="text" value={tempUrl} onChange={e => setTempUrl(e.target.value)}
                  placeholder="https://xyz.supabase.co"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Anon Public Key</label>
                <input 
                  type="password" value={tempKey} onChange={e => setTempKey(e.target.value)}
                  placeholder="Supabase API Anahtarınız"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-xs"
                />
              </div>
            </div>
            <div className="flex gap-3">
               <button 
                onClick={() => {
                  onDbConfigChange({ url: tempUrl, key: tempKey });
                  alert("Ayarlar kaydedildi! Sayfa yenilendiğinde bulut senkronizasyonu başlayacak.");
                }}
                className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <Save size={16} /> Ayarları Kaydet
              </button>
              <button 
                onClick={onSyncRequest}
                disabled={!dbConfig.url}
                className="flex-1 border border-slate-200 font-bold py-2 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Buluttan Verileri Çek
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsOverview;
