
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType, TelegramConfig } from '../types';
import { 
  Database, ShieldCheck, Wallet, TrendingDown, Building2,
  ChevronDown, ChevronUp, RefreshCw, MessageCircle, CloudLightning, Info, Search, Calendar,
  ArrowRightLeft, Copy, Check, X, MapPin, CreditCard, ChevronRight, PieChart as PieChartIcon,
  Briefcase, Clock, Edit2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

interface StatsOverviewProps {
  jobs: Job[];
  scheduledJobs: ScheduledJob[];
  expenses: Expense[];
  dbConfig: { url: string; key: string };
  tgConfig: TelegramConfig;
  onDbConfigChange: (config: { url: string; key: string }) => void;
  onTgConfigChange: (config: TelegramConfig) => void;
  onSyncRequest: () => void;
  onDeleteJob: (job: Job) => void;
  onDeleteExpense: (expense: Expense) => void;
  onUpdateJob: (job: Job) => void;
  onUpdateExpense: (expense: Expense) => void;
  onUpdateCompanyName: (oldName: string, newName: string) => void;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ 
  jobs, expenses, dbConfig, tgConfig, 
  onDbConfigChange, onTgConfigChange, onSyncRequest,
  onUpdateCompanyName
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);
  
  const [selectedDateDetails, setSelectedDateDetails] = useState<string | null>(null);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<string | null>(null);
  
  // State for renaming company
  const [editingCompany, setEditingCompany] = useState<{ oldName: string, newName: string } | null>(null);

  const getStats = (days: number | 'month' | 'total') => {
    const now = new Date();
    let start: number;
    if (days === 'total') start = 0;
    else if (days === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    else {
      const d = new Date(); d.setHours(0,0,0,0);
      if (days > 0) d.setDate(d.getDate() - (days - 1));
      start = d.getTime();
    }
    const pJobs = jobs.filter(j => new Date(j.date).getTime() >= start);
    const pExps = expenses.filter(e => new Date(e.date).getTime() >= start);
    const rev = pJobs.reduce((s, j) => s + j.amount, 0);
    const exp = pExps.reduce((s, e) => s + e.amount, 0);
    
    const breakdown: Record<ExpenseType, number> = { 'Köprü': 0, 'Gemi': 0, 'Yakıt': 0, 'Diğer': 0 };
    pExps.forEach(e => { breakdown[e.type] += e.amount; });

    return { rev, exp, profit: rev - exp, breakdown };
  };

  const daily = getStats(1);
  const weekly = getStats(7);
  const monthly = getStats('month');
  const total = getStats('total');

  const customStats = useMemo(() => {
    const s = new Date(customStart + 'T00:00:00').getTime();
    const e = new Date(customEnd + 'T23:59:59').getTime();
    const rJobs = jobs.filter(j => { const t = new Date(j.date).getTime(); return t >= s && t <= e; });
    const rExps = expenses.filter(ex => { const t = new Date(ex.date).getTime(); return t >= s && t <= e; });
    const rev = rJobs.reduce((acc, j) => acc + j.amount, 0);
    const exp = rExps.reduce((acc, ex) => acc + ex.amount, 0);
    return { rev, exp, profit: rev - exp };
  }, [jobs, expenses, customStart, customEnd]);

  const dailyDistribution = useMemo(() => {
    const groups: Record<string, { count: number; rev: number; iso: string }> = {};
    jobs.forEach(j => {
      const d = new Date(j.date).toLocaleDateString('tr-TR');
      const iso = new Date(j.date).toISOString().split('T')[0];
      if (!groups[d]) groups[d] = { count: 0, rev: 0, iso };
      groups[d].count++;
      groups[d].rev += j.amount;
    });
    return Object.entries(groups).map(([date, data]) => ({ date, ...data }))
      .sort((a,b) => b.iso.localeCompare(a.iso));
  }, [jobs]);

  const companyStats = useMemo(() => {
    const data: Record<string, { count: number; rev: number }> = {};
    jobs.forEach(j => {
      if (!data[j.company]) data[j.company] = { count: 0, rev: 0 };
      data[j.company].count++;
      data[j.company].rev += j.amount;
    });
    return Object.entries(data).map(([name, d]) => ({ name, ...d })).sort((a,b) => b.rev - a.rev);
  }, [jobs]);

  // Selected Company Jobs Data
  const selectedCompanyData = useMemo(() => {
    if (!selectedCompanyDetails) return null;
    const companyJobs = jobs.filter(j => j.company === selectedCompanyDetails).sort((a, b) => b.timestamp - a.timestamp);
    const totalRev = companyJobs.reduce((acc, j) => acc + j.amount, 0);
    return {
      name: selectedCompanyDetails,
      jobs: companyJobs,
      totalRev,
      count: companyJobs.length
    };
  }, [selectedCompanyDetails, jobs]);

  // Chart Colors (Brand Theme + Accents)
  const CHART_COLORS = ['#0a192f', '#d4af37', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6', '#f97316', '#64748b'];

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const totalRev = companyStats.reduce((acc, curr) => acc + curr.rev, 0);
      const percent = totalRev > 0 ? ((data.rev / totalRev) * 100).toFixed(1) : 0;
      
      return (
        <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-50">
          <p className="text-xs font-black text-brand-navy dark:text-brand-gold uppercase tracking-wider mb-1">{data.name}</p>
          <div className="flex items-end gap-2">
             <span className="text-lg font-black text-slate-800 dark:text-slate-200">{data.rev.toLocaleString('tr-TR')} ₺</span>
             <span className="text-xs font-bold text-slate-400 mb-1">(%{percent})</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const dayDetails = useMemo(() => {
    if (!selectedDateDetails) return null;
    const dayJobs = jobs.filter(j => new Date(j.date).toISOString().split('T')[0] === selectedDateDetails);
    const dayExps = expenses.filter(e => new Date(e.date).toISOString().split('T')[0] === selectedDateDetails);
    
    const groupedExps: Record<string, number> = {};
    dayExps.forEach(e => {
      if (!groupedExps[e.type]) groupedExps[e.type] = 0;
      groupedExps[e.type] += e.amount;
    });

    return {
      dateStr: new Date(selectedDateDetails).toLocaleDateString('tr-TR'),
      jobs: dayJobs,
      expenses: Object.entries(groupedExps).map(([type, amount]) => ({ type: type as ExpenseType, amount })),
      totalRev: dayJobs.reduce((s, j) => s + j.amount, 0),
      totalExp: dayExps.reduce((s, e) => s + e.amount, 0)
    };
  }, [selectedDateDetails, jobs, expenses]);

  const cronSql = `-- SQL Editor'e yapıştır kanka (5 Saatte Bir Çalışır)
select cron.schedule(
  'periyodik-lojistik-botu',
  '0 */5 * * *',
  $$
  select net.http_post(
    url:='${dbConfig.url}/functions/v1/telegram-bot',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${dbConfig.key}"}'::jsonb
  );
  $$
);`;

  const copySql = () => {
    navigator.clipboard.writeText(cronSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SummaryCard = ({ title, stats }: any) => (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h4>
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl"><Wallet size={20}/></div>
      </div>
      <div className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-6">{stats.profit.toLocaleString('tr-TR')} ₺</div>
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-emerald-500 uppercase">GELİR:</span>
          <span className="text-slate-900 dark:text-slate-100">{stats.rev.toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-red-500 uppercase">GİDER:</span>
          <span className="text-slate-900 dark:text-slate-100">{stats.exp.toLocaleString('tr-TR')} ₺</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Date Details Modal */}
      {selectedDateDetails && dayDetails && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-2xl shadow-lg">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-tighter">{dayDetails.dateStr} DETAYLI RAPORU</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">O gün yapılan tüm işlemler ve toplanmış giderler.</p>
                </div>
              </div>
              <button onClick={() => setSelectedDateDetails(null)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors shadow-sm">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/20">
                    <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">GÜNLÜK GELİR</span>
                    <span className="text-2xl font-black text-emerald-600">{dayDetails.totalRev.toLocaleString('tr-TR')} ₺</span>
                 </div>
                 <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100 dark:border-red-900/20">
                    <span className="text-[10px] font-black text-red-600 uppercase block mb-1">GÜNLÜK GİDER</span>
                    <span className="text-2xl font-black text-red-600">{dayDetails.totalExp.toLocaleString('tr-TR')} ₺</span>
                 </div>
                 <div className="bg-brand-navy p-6 rounded-3xl border border-brand-navy shadow-xl shadow-brand-navy/20">
                    <span className="text-[10px] font-black text-brand-gold uppercase block mb-1">GÜNLÜK NET KAR</span>
                    <span className="text-2xl font-black text-white">{(dayDetails.totalRev - dayDetails.totalExp).toLocaleString('tr-TR')} ₺</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ChevronRight size={14} className="text-brand-gold"/> YAPILAN İŞLER ({dayDetails.jobs.length})
                    </h4>
                    <div className="space-y-3">
                       {dayDetails.jobs.map(j => (
                         <div key={j.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-slate-100 dark:border-slate-800 text-brand-gold">
                                  <MapPin size={20} />
                               </div>
                               <div>
                                  <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase leading-none mb-1">{j.from} → {j.to}</div>
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{j.company}</div>
                               </div>
                            </div>
                            <div className="text-lg font-black text-emerald-600">{j.amount.toLocaleString('tr-TR')} ₺</div>
                         </div>
                       ))}
                       {dayDetails.jobs.length === 0 && <div className="p-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-300 font-black uppercase italic">Kayıt Yok</div>}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <ChevronRight size={14} className="text-red-500"/> TOPLANMIŞ GİDERLER
                    </h4>
                    <div className="space-y-3">
                       {dayDetails.expenses.map(e => (
                         <div key={e.type} className="p-5 bg-red-50/30 dark:bg-red-900/5 rounded-3xl border border-red-50 dark:border-red-900/20 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center border border-red-50 dark:border-red-900/20 text-red-500">
                                  <CreditCard size={20} />
                               </div>
                               <div className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{e.type}</div>
                            </div>
                            <div className="text-lg font-black text-red-600">{e.amount.toLocaleString('tr-TR')} ₺</div>
                         </div>
                       ))}
                       {dayDetails.expenses.length === 0 && <div className="p-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-300 font-black uppercase italic">Gider Yok</div>}
                    </div>
                 </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
               <button onClick={() => setSelectedDateDetails(null)} className="w-full bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black py-5 rounded-[1.5rem] uppercase tracking-widest text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all">ANLATIMLI ÖZETİ KAPAT</button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Company Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-brand-gold/30">
              <h3 className="text-lg font-black text-brand-navy dark:text-brand-gold uppercase tracking-widest mb-4">Firma Adını Düzenle</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-4">
                 "{editingCompany.oldName}" adlı firmayı yeniden adlandırıyorsun. Bu işlem geçmişteki tüm kayıtları güncelleyecektir.
              </p>
              <input 
                type="text" 
                value={editingCompany.newName} 
                onChange={(e) => setEditingCompany({...editingCompany, newName: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-800 dark:text-slate-100 mb-6 focus:ring-2 focus:ring-brand-gold"
                autoFocus
              />
              <div className="flex gap-3">
                 <button onClick={() => setEditingCompany(null)} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-xl text-xs uppercase">Vazgeç</button>
                 <button 
                  onClick={() => {
                    onUpdateCompanyName(editingCompany.oldName, editingCompany.newName);
                    setEditingCompany(null);
                  }}
                  disabled={!editingCompany.newName || editingCompany.newName === editingCompany.oldName}
                  className="flex-1 px-4 py-3 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black rounded-xl text-xs uppercase shadow-xl disabled:opacity-50"
                 >
                   Kaydet
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Company Details Modal */}
      {selectedCompanyDetails && selectedCompanyData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-2xl shadow-lg">
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-tighter">{selectedCompanyData.name} İŞ GEÇMİŞİ</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bu firma ile yapılan tüm işlemlerin dökümü.</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedCompanyDetails(null)} className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors shadow-sm">
                    <X size={24} />
                  </button>
              </div>

              <div className="p-8 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase block mb-1">TOPLAM İŞ SAYISI</span>
                      <span className="text-3xl font-black text-indigo-600">{selectedCompanyData.count}</span>
                    </div>
                    <Briefcase size={32} className="text-indigo-200 dark:text-indigo-800/30" />
                 </div>
                 <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">TOPLAM CİRO</span>
                      <span className="text-3xl font-black text-emerald-600">{selectedCompanyData.totalRev.toLocaleString('tr-TR')} ₺</span>
                    </div>
                    <Wallet size={32} className="text-emerald-200 dark:text-emerald-800/30" />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                 <div className="space-y-4">
                    {selectedCompanyData.jobs.map(j => (
                      <div key={j.id} className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center group hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm hover:shadow-md">
                         <div className="flex items-center gap-5 flex-1 w-full">
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-400 font-black text-center min-w-[70px]">
                               <div className="text-xl text-slate-800 dark:text-slate-200">{new Date(j.date).getDate()}</div>
                               <div className="text-[9px] uppercase">{new Date(j.date).toLocaleDateString('tr-TR', { month: 'short' })}</div>
                            </div>
                            <div>
                               <div className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                 {j.from} <ArrowRightLeft size={16} className="text-slate-300"/> {j.to}
                               </div>
                               <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase flex items-center gap-2">
                                  <Clock size={12} /> {new Date(j.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                  {new Date(j.date).getFullYear()}
                               </div>
                            </div>
                         </div>
                         <div className="mt-4 md:mt-0 text-2xl font-black text-brand-navy dark:text-brand-gold">
                            {j.amount.toLocaleString('tr-TR')} ₺
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                 <button onClick={() => setSelectedCompanyDetails(null)} className="w-full bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black py-5 rounded-[1.5rem] uppercase tracking-widest text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all">PENCEREYİ KAPAT</button>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="GÜNLÜK KAR" stats={daily} />
        <SummaryCard title="HAFTALIK KAR" stats={weekly} />
        <SummaryCard title="AYLIK KAR" stats={monthly} />
        <SummaryCard title="TOPLAM KAR" stats={total} />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
          <TrendingDown size={20} className="text-red-500" />
          <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-[0.15em]">GİDER KALEMLERİ ANALİZİ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-black uppercase">
              <tr>
                <th className="px-8 py-5">KALEM</th>
                <th className="px-8 py-5 text-center">GÜNLÜK</th>
                <th className="px-8 py-5 text-center">HAFTALIK</th>
                <th className="px-8 py-5 text-center">AYLIK</th>
                <th className="px-8 py-5 text-right">TOPLAM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {(['Köprü', 'Gemi', 'Yakıt', 'Diğer'] as ExpenseType[]).map(type => (
                <tr key={type} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-8 py-6 font-black text-slate-800 dark:text-slate-300">{type}</td>
                  <td className="px-8 py-6 text-center text-red-500">{daily.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-8 py-6 text-center text-red-500">{weekly.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-8 py-6 text-center text-red-500">{monthly.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-8 py-6 text-right text-red-600 font-black">{total.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.15em] flex items-center gap-2"><Calendar size={18} className="text-indigo-500"/> GÜNLÜK İŞ DAĞILIMI</h3>
          <span className="text-[10px] text-slate-400 font-bold italic">Tarihe tıklayarak o günün detaylarını görebilirsin kanka.</span>
        </div>
        <div className="overflow-auto max-h-[400px] custom-scrollbar">
           <table className="w-full text-left text-xs font-bold">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase shadow-sm">
                <tr>
                  <th className="px-8 py-5">TARİH</th>
                  <th className="px-8 py-5 text-center">İŞ ADETİ</th>
                  <th className="px-8 py-5 text-right">TOPLAM GELİR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {dailyDistribution.map(d => (
                  <tr key={d.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 group cursor-pointer" onClick={() => setSelectedDateDetails(d.iso)}>
                    <td className="px-8 py-5">
                       <button className="text-indigo-600 dark:text-indigo-400 font-black group-hover:underline flex items-center gap-2">
                          {d.date}
                          <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                    </td>
                    <td className="px-8 py-5 text-center text-slate-600 dark:text-slate-400">{d.count}</td>
                    <td className="px-8 py-5 text-right font-black text-emerald-600">{d.rev.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
           <div className="flex items-center gap-4">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl"><Search size={24}/></div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-[0.2em]">Özel Tarih Aralığı</h3>
              </div>
           </div>
           <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-700">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold p-1 cursor-pointer" />
              <ArrowRightLeft size={16} className="text-slate-300" />
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-transparent border-none outline-none text-xs font-bold p-1 cursor-pointer" />
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-3xl border border-emerald-100 dark:border-emerald-900/20">
              <span className="text-[10px] font-black text-emerald-600 uppercase block mb-2 tracking-widest">GELİR</span>
              <span className="text-3xl font-black text-emerald-600">{customStats.rev.toLocaleString('tr-TR')} ₺</span>
           </div>
           <div className="bg-red-50 dark:bg-red-900/10 p-8 rounded-3xl border border-red-100 dark:border-red-900/20">
              <span className="text-[10px] font-black text-red-600 uppercase block mb-2 tracking-widest">GİDER</span>
              <span className="text-3xl font-black text-red-600">{customStats.exp.toLocaleString('tr-TR')} ₺</span>
           </div>
           <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/20">
              <span className="text-[10px] font-black text-indigo-600 uppercase block mb-2 tracking-widest">NET KAR</span>
              <span className="text-3xl font-black text-indigo-600">{customStats.profit.toLocaleString('tr-TR')} ₺</span>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Building2 size={20} className="text-emerald-500" />
             <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.15em]">FİRMA BAZLI RAPORLAMA</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-bold italic">Detaylar için firma ismine tıkla kanka.</span>
        </div>
        <div className="overflow-auto max-h-[400px] custom-scrollbar">
          <table className="w-full text-left text-xs font-bold">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-400 font-black uppercase shadow-sm">
              <tr>
                <th className="px-8 py-5">FİRMA</th>
                <th className="px-8 py-5 text-center">ADET</th>
                <th className="px-8 py-5 text-right">TOPLAM CİRO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {companyStats.map(c => (
                <tr key={c.name} onClick={() => setSelectedCompanyDetails(c.name)} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <td className="px-8 py-6 font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 group-hover:text-brand-navy dark:group-hover:text-brand-gold transition-colors">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCompany({ oldName: c.name, newName: c.name });
                      }}
                      className="p-1.5 text-slate-300 hover:text-brand-navy dark:hover:text-brand-gold bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                      title="Firma Adını Düzenle"
                    >
                       <Edit2 size={12} />
                    </button>
                    {c.name}
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="px-5 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[11px]">{c.count}</span>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-emerald-600">{c.rev.toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PIE CHART MODULE */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
            <PieChartIcon size={20} className="text-brand-gold" />
            <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.15em]">FİRMA GELİR DAĞILIMI (GEOMETRİK)</h3>
         </div>
         <div className="p-8 flex flex-col items-center">
            {companyStats.length > 0 ? (
              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={companyStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={5}
                      dataKey="rev"
                      nameKey="name"
                      stroke="none"
                    >
                      {companyStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      formatter={(value, _: any) => (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase ml-1 mr-4">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-20 text-center text-slate-300 font-black italic tracking-widest uppercase">
                 HENÜZ VERİ YOK
              </div>
            )}
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-brand-navy rounded-2xl text-white shadow-xl transform group-hover:scale-110 transition-transform"><ShieldCheck size={24}/></div>
            <div className="text-left">
              <h4 className="text-[14px] font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.2em]">SİSTEM AYARLARI</h4>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Telegram Bot ve Bulut Veritabanı</p>
            </div>
          </div>
          {showSettings ? <ChevronUp className="text-slate-300" /> : <ChevronDown className="text-slate-300" />}
        </button>

        {showSettings && (
          <div className="p-10 border-t border-slate-100 dark:border-slate-800 space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MessageCircle size={14}/> Telegram Rapor Ayarları</h5>
                   <input type="text" value={tgConfig.botToken} onChange={e => onTgConfigChange({...tgConfig, botToken: e.target.value})} placeholder="Bot Token (HTTP API)" className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none" />
                   <input type="text" value={tgConfig.chatId} onChange={e => onTgConfigChange({...tgConfig, chatId: e.target.value})} placeholder="Chat / Grup ID" className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none" />
                   <button onClick={() => onTgConfigChange(tgConfig)} className="w-full bg-brand-gold text-brand-navy font-black py-5 rounded-2xl text-sm uppercase shadow-2xl active:scale-95 transition-all">AYARLARI BULUTA KAYDET</button>
                </div>
                <div className="space-y-6">
                   <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Database size={14}/> Supabase Altyapısı</h5>
                   <input type="text" value={dbConfig.url} onChange={e => onDbConfigChange({...dbConfig, url: e.target.value})} placeholder="Supabase Project URL" className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none" />
                   <input type="password" value={dbConfig.key} onChange={e => onDbConfigChange({...dbConfig, key: e.target.value})} placeholder="Project Service Role Key" className="w-full px-6 py-4.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xs font-bold outline-none" />
                   <div className="flex gap-4">
                     <button onClick={() => onDbConfigChange(dbConfig)} className="flex-1 bg-brand-navy text-white font-black py-5 rounded-2xl text-sm uppercase shadow-2xl active:scale-95 transition-all">BAĞLANTIYI KUR</button>
                     <button onClick={onSyncRequest} className="p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-brand-gold border-2 border-slate-100 dark:border-slate-700 transition-colors"><RefreshCw size={24}/></button>
                   </div>
                </div>
             </div>

             <div className="p-8 bg-indigo-50 dark:bg-indigo-950/40 rounded-[2.5rem] border-4 border-dashed border-indigo-200 dark:border-indigo-900/50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl"><CloudLightning size={28}/></div>
                  <div>
                    <h5 className="text-indigo-600 dark:text-indigo-400 font-black text-lg uppercase tracking-[0.1em]">7/24 KESİNTİSİZ BOT OTOMASYONU</h5>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Telefon Kapalıyken Bile 5 Saatte Bir Rapor Gönderimi</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <div className="flex gap-4">
                        <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm">1</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">Supabase SQL Editor'e gidip aşağıdaki kodu yapıştır ve <b>Run</b> de.</p>
                      </div>
                      <div className="flex gap-4">
                        <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm">2</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed"><b>Önemli:</b> Eğer daha önce saatlik bot kurduysan, Supabase Database → Cron kısmından eski 'saatlik-lojistik-botu' görevini silmen temiz olur kanka.</p>
                      </div>
                      <button onClick={copySql} className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                        {copied ? <Check size={18}/> : <Copy size={18}/>}
                        {copied ? 'KOPYALANDI!' : 'YENİ SQL KOMUTUNU KOPYALA'}
                      </button>
                   </div>
                   <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex items-center gap-3 mb-4">
                        <Info size={20} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">5 Saatlik SQL Komutu</span>
                      </div>
                      <pre className="text-[9px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800">
                        {cronSql}
                      </pre>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsOverview;
