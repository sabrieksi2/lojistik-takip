
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType, TelegramConfig } from '../types';
import { 
  Database, ShieldCheck, Wallet, TrendingUp, TrendingDown, Building2, CalendarDays,
  ChevronDown, ChevronUp, RefreshCw, MessageCircle, CloudLightning, Info, Search, Calendar,
  Activity, ArrowRightLeft, Copy, Check
} from 'lucide-react';

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
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ 
  jobs, expenses, dbConfig, tgConfig, 
  onDbConfigChange, onTgConfigChange, onSyncRequest
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  // --- HESAPLAMA FONKSİYONU ---
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

  const cronSql = `-- SQL Editor'e yapıştır kanka
select cron.schedule(
  'saatlik-lojistik-botu',
  '0 * * * *',
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
    <div className="space-y-8 pb-20">
      {/* 1. ÜST KARTLAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="GÜNLÜK KAR" stats={daily} />
        <SummaryCard title="HAFTALIK KAR" stats={weekly} />
        <SummaryCard title="AYLIK KAR" stats={monthly} />
        <SummaryCard title="TOPLAM KAR" stats={total} />
      </div>

      {/* 2. GİDER KALEMLERİ ANALİZİ */}
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

      {/* 3. GÜNLÜK İŞ DAĞILIMI */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.15em] flex items-center gap-2"><Calendar size={18} className="text-indigo-500"/> GÜNLÜK İŞ DAĞILIMI</h3>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left text-xs font-bold">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-black uppercase">
                <tr>
                  <th className="px-8 py-5">TARİH</th>
                  <th className="px-8 py-5 text-center">İŞ ADETİ</th>
                  <th className="px-8 py-5 text-right">TOPLAM GELİR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {dailyDistribution.map(d => (
                  <tr key={d.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-8 py-5">
                       <button className="text-indigo-600 dark:text-indigo-400 font-black hover:underline">{d.date}</button>
                    </td>
                    <td className="px-8 py-5 text-center text-slate-600 dark:text-slate-400">{d.count}</td>
                    <td className="px-8 py-5 text-right font-black text-emerald-600">{d.rev.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>

      {/* 4. ÖZEL TARİH ARALIĞI */}
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

      {/* 5. FİRMA BAZLI RAPORLAMA */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center gap-3">
          <Building2 size={20} className="text-emerald-500" />
          <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.15em]">FİRMA BAZLI RAPORLAMA</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-bold">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-black uppercase">
              <tr>
                <th className="px-8 py-5">FİRMA</th>
                <th className="px-8 py-5 text-center">ADET</th>
                <th className="px-8 py-5 text-right">TOPLAM CİRO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {companyStats.map(c => (
                <tr key={c.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-8 py-6 font-black text-slate-800 dark:text-slate-100">{c.name}</td>
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

      {/* 6. SİSTEM AYARLARI */}
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

             {/* 7/24 Rehber Güncelleme */}
             <div className="p-8 bg-indigo-50 dark:bg-indigo-950/40 rounded-[2.5rem] border-4 border-dashed border-indigo-200 dark:border-indigo-900/50">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl"><CloudLightning size={28}/></div>
                  <div>
                    <h5 className="text-indigo-600 dark:text-indigo-400 font-black text-lg uppercase tracking-[0.1em]">7/24 KESİNTİSİZ BOT OTOMASYONU</h5>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Telefon Kapalıyken Bile Saat Başı Rapor Gönderimi</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <div className="flex gap-4">
                        <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm">1</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">Supabase panelinde <b>Secrets</b> kısmına bir şey eklemene gerek yok, sistem onları zaten otomatik tanıyor kanka.</p>
                      </div>
                      <div className="flex gap-4">
                        <span className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm">2</span>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed"><b>SQL Editor</b>'e gidip aşağıdaki kodu yapıştır ve <b>Run</b> de. Bu işlem botu her saat başı uyandıracaktır.</p>
                      </div>
                      <button onClick={copySql} className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                        {copied ? <Check size={18}/> : <Copy size={18}/>}
                        {copied ? 'KOPYALANDI!' : 'SQL KOMUTUNU KOPYALA'}
                      </button>
                   </div>
                   <div className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex items-center gap-3 mb-4">
                        <Info size={20} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Teknik Not</span>
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
