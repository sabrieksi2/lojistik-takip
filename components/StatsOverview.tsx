
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType, TelegramConfig } from '../types';
import { 
  CalendarSearch, Database, ShieldCheck, Send, Loader2, Info, RefreshCw, MessageCircle, 
  ChevronDown, ChevronUp, Wallet, TrendingUp, TrendingDown, Receipt, Activity, Building2, CalendarDays,
  ArrowRight, X, ArrowRightLeft, Trash2, Edit2, Check, Save
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

const getTimeRemaining = (date: string, time: string) => {
  const diff = new Date(`${date}T${time}`).getTime() - Date.now();
  if (diff <= 0) return "Zamanı Geldi";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${minutes}dk`;
  return `${minutes}dk`;
};

const StatsOverview: React.FC<StatsOverviewProps> = ({ 
  jobs, expenses, scheduledJobs, dbConfig, tgConfig, 
  onDbConfigChange, onTgConfigChange, onSyncRequest,
  onDeleteJob, onDeleteExpense, onUpdateJob, onUpdateExpense
}) => {
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Edit states for Modal
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>(null);

  // Form states for settings
  const [tempUrl, setTempUrl] = useState(dbConfig.url);
  const [tempKey, setTempKey] = useState(dbConfig.key);
  const [tempTg, setTempTg] = useState<TelegramConfig>(tgConfig);

  // Helper function for period calculations
  const calculateStatsForPeriod = (days: number | 'month' | 'total') => {
    const now = new Date();
    let start: number;

    if (days === 'total') start = 0;
    else if (days === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    else {
      const d = new Date();
      d.setHours(0,0,0,0);
      if (days > 0) d.setDate(d.getDate() - (days - 1));
      start = d.getTime();
    }

    const periodJobs = jobs.filter(j => new Date(j.date).getTime() >= start);
    const periodExpenses = expenses.filter(e => new Date(e.date).getTime() >= start);

    const revenue = periodJobs.reduce((sum, j) => sum + j.amount, 0);
    const expense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const breakdown: Record<ExpenseType, number> = { 'Köprü': 0, 'Gemi': 0, 'Yakıt': 0, 'Diğer': 0 };
    periodExpenses.forEach(e => { breakdown[e.type] += e.amount; });

    return { revenue, expense, profit: revenue - expense, breakdown };
  };

  const daily = calculateStatsForPeriod(1);
  const weekly = calculateStatsForPeriod(7);
  const monthly = calculateStatsForPeriod('month');
  const total = calculateStatsForPeriod('total');

  const customRangeStats = useMemo(() => {
    const start = new Date(customStartDate + 'T00:00:00').getTime();
    const end = new Date(customEndDate + 'T23:59:59').getTime();
    const rJobs = jobs.filter(j => { const t = new Date(j.date).getTime(); return t >= start && t <= end; });
    const rExps = expenses.filter(e => { const t = new Date(e.date).getTime(); return t >= start && t <= end; });
    const rev = rJobs.reduce((s, j) => s + j.amount, 0);
    const exp = rExps.reduce((s, e) => s + e.amount, 0);
    return { rev, exp, profit: rev - exp };
  }, [jobs, expenses, customStartDate, customEndDate]);

  const dailyBreakdown = useMemo(() => {
    const groups: Record<string, { count: number; revenue: number; rawDate: string }> = {};
    jobs.forEach(job => {
      const displayDate = new Date(job.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const isoDate = new Date(job.date).toISOString().split('T')[0];
      if (!groups[displayDate]) groups[displayDate] = { count: 0, revenue: 0, rawDate: isoDate };
      groups[displayDate].count += 1;
      groups[displayDate].revenue += job.amount;
    });
    return Object.entries(groups).map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
  }, [jobs]);

  const dayDetailData = useMemo(() => {
    if (!selectedDay) return null;
    const dayJobs = jobs.filter(j => new Date(j.date).toISOString().split('T')[0] === selectedDay);
    const dayExpenses = expenses.filter(e => new Date(e.date).toISOString().split('T')[0] === selectedDay);
    const rev = dayJobs.reduce((s, j) => s + j.amount, 0);
    const exp = dayExpenses.reduce((s, e) => s + e.amount, 0);
    return { jobs: dayJobs, expenses: dayExpenses, revenue: rev, expense: exp, profit: rev - exp };
  }, [selectedDay, jobs, expenses]);

  const companyStats = useMemo(() => {
    const data: Record<string, { count: number; total: number }> = {};
    jobs.forEach(job => {
      if (!data[job.company]) data[job.company] = { count: 0, total: 0 };
      data[job.company].count += 1;
      data[job.company].total += job.amount;
    });
    return Object.entries(data).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total);
  }, [jobs]);

  const handleManualTest = async () => {
    if (!tempTg.botToken || !tempTg.chatId) return alert("Kanka bilgiler eksik!");
    setIsTestingBot(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${tempTg.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tempTg.chatId, text: "🚀 *BK Lojistik:* Telegram bağlantısı başarılı kanka!", parse_mode: 'Markdown' })
      });
      if (res.ok) alert("Mesaj gitti kanka!");
      else alert("Hata oluştu, bot token ve chat id'yi kontrol et.");
    } catch (e) { alert("Bağlantı hatası!"); }
    finally { setIsTestingBot(false); }
  };

  const handleSendInstantReport = async () => {
    if (!tempTg.botToken || !tempTg.chatId) return alert("Kanka bilgiler eksik!");
    
    // Yaklaşan işleri filtrele (bugün ve sonrası)
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = scheduledJobs
      .filter(j => j.date >= todayStr)
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
      .slice(0, 10); // En yakın 10 işi al

    if (upcoming.length === 0) return alert("Kanka yakında planlı iş yok!");

    setIsTestingBot(true);
    
    let message = `🚀 *BK LOJİSTİK - ANLIK İŞ RAPORU*\n⏰ İstek: ${new Date().toLocaleTimeString('tr-TR')}\n\n`;
    upcoming.forEach((j, i) => {
      const remaining = getTimeRemaining(j.date, j.time);
      message += `*${i+1}. ${j.passengerName}*\n📅 ${new Date(j.date).toLocaleDateString('tr-TR')} - ${j.time}\n📍 ${j.from} ➡️ ${j.to}\n⏳ Kalan: ${remaining}\n\n`;
    });

    try {
      const res = await fetch(`https://api.telegram.org/bot${tempTg.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tempTg.chatId, text: message, parse_mode: 'Markdown' })
      });
      if (res.ok) alert("Anlık rapor gruba gönderildi kanka!");
      else alert("Hata oluştu kanka.");
    } catch (e) { alert("Bağlantı hatası!"); }
    finally { setIsTestingBot(false); }
  };

  const startJobEdit = (job: Job) => {
    setEditingJobId(job.id);
    setEditBuffer({ ...job });
  };

  const saveJobEdit = () => {
    if (editBuffer) {
      onUpdateJob(editBuffer);
      setEditingJobId(null);
      setEditBuffer(null);
    }
  };

  const startExpenseEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditBuffer({ ...expense });
  };

  const saveExpenseEdit = () => {
    if (editBuffer) {
      onUpdateExpense(editBuffer);
      setEditingExpenseId(null);
      setEditBuffer(null);
    }
  };

  const Card = ({ title, stats }: { title: string, stats: any }) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-tight">{title}</h3>
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
          <Wallet size={18} />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-4">{stats.profit.toLocaleString('tr-TR')} ₺</div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-emerald-500 uppercase">GELİR:</span>
          <span className="text-slate-600 dark:text-slate-400">{stats.revenue.toLocaleString('tr-TR')} ₺</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-red-500 uppercase">GİDER:</span>
          <span className="text-slate-600 dark:text-slate-400">{stats.expense.toLocaleString('tr-TR')} ₺</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Günlük Detay Modalı */}
      {selectedDay && dayDetailData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <CalendarDays className="text-brand-gold" size={24} />
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-lg uppercase tracking-widest">{selectedDay} Günlük Detay</h3>
              </div>
              <button onClick={() => { setSelectedDay(null); setEditingJobId(null); setEditingExpenseId(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-all">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Özet Satırı */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/20">
                  <span className="text-[10px] font-black text-emerald-600 uppercase block">TOPLAM GELİR</span>
                  <span className="text-xl font-black text-emerald-600">{dayDetailData.revenue.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/20">
                  <span className="text-[10px] font-black text-red-600 uppercase block">TOPLAM GİDER</span>
                  <span className="text-xl font-black text-red-600">{dayDetailData.expense.toLocaleString('tr-TR')} ₺</span>
                </div>
                <div className="bg-brand-gold/10 p-4 rounded-2xl border border-brand-gold/20">
                  <span className="text-[10px] font-black text-brand-gold uppercase block">NET KAR</span>
                  <span className="text-xl font-black text-brand-gold">{dayDetailData.profit.toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>

              {/* İşler Listesi */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ArrowRightLeft size={16} /> GELİR HAREKETLERİ ({dayDetailData.jobs.length})
                </h4>
                <div className="space-y-3">
                  {dayDetailData.jobs.map(job => (
                    <div key={job.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 group">
                      {editingJobId === job.id ? (
                        <div className="flex flex-col md:flex-row gap-3 w-full">
                          <input type="text" value={editBuffer.from} onChange={e => setEditBuffer({...editBuffer, from: e.target.value})} className="flex-1 px-3 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" placeholder="Nereden" />
                          <input type="text" value={editBuffer.to} onChange={e => setEditBuffer({...editBuffer, to: e.target.value})} className="flex-1 px-3 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" placeholder="Nereye" />
                          <input type="number" value={editBuffer.amount} onChange={e => setEditBuffer({...editBuffer, amount: Number(e.target.value)})} className="w-24 px-3 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold" placeholder="Tutar" />
                          <div className="flex gap-1">
                            <button onClick={saveJobEdit} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check size={16} /></button>
                            <button onClick={() => setEditingJobId(null)} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg"><X size={16} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{job.from} → {job.to}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{job.company} • {new Date(job.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 md:mt-0">
                            <div className="font-black text-emerald-600">+{job.amount.toLocaleString('tr-TR')} ₺</div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startJobEdit(job)} className="p-2 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => onDeleteJob(job)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {dayDetailData.jobs.length === 0 && <p className="text-center py-4 text-xs text-slate-400 italic">İş kaydı bulunmuyor.</p>}
                </div>
              </div>

              {/* Giderler Listesi */}
              <div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <TrendingDown size={16} /> GİDER HAREKETLERİ ({dayDetailData.expenses.length})
                </h4>
                <div className="space-y-3">
                  {dayDetailData.expenses.map(exp => (
                    <div key={exp.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 group">
                      {editingExpenseId === exp.id ? (
                        <div className="flex flex-col md:flex-row gap-3 w-full">
                          <select value={editBuffer.type} onChange={e => setEditBuffer({...editBuffer, type: e.target.value as ExpenseType})} className="flex-1 px-3 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none">
                            <option value="Köprü">Köprü</option>
                            <option value="Gemi">Gemi</option>
                            <option value="Yakıt">Yakıt</option>
                            <option value="Diğer">Diğer</option>
                          </select>
                          <input type="number" value={editBuffer.amount} onChange={e => setEditBuffer({...editBuffer, amount: Number(e.target.value)})} className="w-24 px-3 py-1 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold" placeholder="Tutar" />
                          <div className="flex gap-1">
                            <button onClick={saveExpenseEdit} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check size={16} /></button>
                            <button onClick={() => setEditingExpenseId(null)} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg"><X size={16} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{exp.type}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(exp.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 md:mt-0">
                            <div className="font-black text-red-600">-{exp.amount.toLocaleString('tr-TR')} ₺</div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startExpenseEdit(exp)} className="p-2 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => onDeleteExpense(exp)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {dayDetailData.expenses.length === 0 && <p className="text-center py-4 text-xs text-slate-400 italic">Gider kaydı bulunmuyor.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Üst Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Günlük Kar" stats={daily} />
        <Card title="Haftalık Kar" stats={weekly} />
        <Card title="Aylık Kar" stats={monthly} />
        <Card title="Toplam Kar" stats={total} />
      </div>

      {/* Gider Kalemleri Analizi */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
          <TrendingDown size={18} className="text-red-500" />
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">GİDER KALEMLERİ ANALİZİ</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-bold uppercase">
              <tr>
                <th className="px-6 py-4">KALEM</th>
                <th className="px-6 py-4 text-center">GÜNLÜK</th>
                <th className="px-6 py-4 text-center">HAFTALIK</th>
                <th className="px-6 py-4 text-center">AYLIK</th>
                <th className="px-6 py-4 text-right">TOPLAM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {(['Köprü', 'Gemi', 'Yakıt', 'Diğer'] as ExpenseType[]).map(type => (
                <tr key={type} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{type}</td>
                  <td className="px-6 py-4 text-center text-red-500 font-bold">{daily.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-6 py-4 text-center text-red-500 font-bold">{weekly.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-6 py-4 text-center text-red-500 font-bold">{monthly.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                  <td className="px-6 py-4 text-right text-red-600 font-black">{total.breakdown[type].toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Günlük İş Dağılımı */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-600" />
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">GÜNLÜK İŞ DAĞILIMI</h3>
          </div>
          <span className="text-[10px] text-slate-400 italic">Tarihe tıklayarak o günün detaylarını görebilirsin kanka.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-bold uppercase">
              <tr>
                <th className="px-6 py-4">TARİH</th>
                <th className="px-6 py-4 text-center">İŞ ADETİ</th>
                <th className="px-6 py-4 text-right">TOPLAM GELİR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {dailyBreakdown.map(row => (
                <tr key={row.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group" onClick={() => setSelectedDay(row.rawDate)}>
                  <td className="px-6 py-4 font-bold text-indigo-600 underline decoration-indigo-200 group-hover:text-brand-gold">{row.date}</td>
                  <td className="px-6 py-4 text-center font-bold text-slate-600 dark:text-slate-400">{row.count}</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600">{row.revenue.toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Özel Tarih Aralığı */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
              <CalendarSearch size={22} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Özel Tarih Aralığı</h3>
              <p className="text-[10px] text-slate-400">İstediğin iki tarih arası toplam rapor.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-bold border-none outline-none" />
            <ArrowRight size={14} className="text-slate-300" />
            <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-xs font-bold border-none outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <span className="text-[10px] font-black text-emerald-600 uppercase block mb-1">GELİR</span>
            <span className="text-2xl font-black text-emerald-600">{customRangeStats.rev.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
            <span className="text-[10px] font-black text-red-600 uppercase block mb-1">GİDER</span>
            <span className="text-2xl font-black text-red-600">{customRangeStats.exp.toLocaleString('tr-TR')} ₺</span>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <span className="text-[10px] font-black text-indigo-600 uppercase block mb-1">NET KAR</span>
            <span className="text-2xl font-black text-indigo-600">{customRangeStats.profit.toLocaleString('tr-TR')} ₺</span>
          </div>
        </div>
      </div>

      {/* Firma Bazlı Raporlama */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex items-center gap-2">
          <Building2 size={18} className="text-emerald-600" />
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">FİRMA BAZLI RAPORLAMA</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 font-bold uppercase">
              <tr>
                <th className="px-6 py-4">FİRMA</th>
                <th className="px-6 py-4 text-center">ADET</th>
                <th className="px-6 py-4 text-right">TOPLAM CİRO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {companyStats.map(c => (
                <tr key={c.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{c.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-3 py-1 rounded-full font-black">{c.count}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600">{c.total.toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SİSTEM AYARLARI (Telegram & Bulut) */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-2">
        <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between p-6 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-xl shadow-lg">
              <ShieldCheck size={20} />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-black text-brand-navy dark:text-brand-gold uppercase tracking-widest">SİSTEM AYARLARI</h4>
              <p className="text-[10px] text-slate-400 font-bold">Telegram Bot ve Bulut Veritabanı</p>
            </div>
          </div>
          {showSettings ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
        </button>

        {showSettings && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Telegram Bot */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle size={16} className="text-brand-gold" />
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TELEGRAM BOT</h5>
              </div>
              <input type="text" value={tempTg.botToken} onChange={e => setTempTg({...tempTg, botToken: e.target.value})} placeholder="Bot API Token" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
              <input type="text" value={tempTg.chatId} onChange={e => setTempTg({...tempTg, chatId: e.target.value})} placeholder="Chat ID" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
              <label className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 cursor-pointer">
                <input type="checkbox" checked={tempTg.autoSend} onChange={e => setTempTg({...tempTg, autoSend: e.target.checked})} className="w-5 h-5 text-brand-gold" />
                <span className="text-[10px] font-black text-slate-500 uppercase">OTOMATİK RAPORLAMA AKTİF (09:00, 13:00, 21:00)</span>
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onTgConfigChange(tempTg)} className="col-span-2 bg-brand-gold text-brand-navy font-black py-4 rounded-xl text-xs uppercase shadow-lg">AYARLARI KAYDET</button>
                <button disabled={isTestingBot} onClick={handleManualTest} className="bg-slate-700 text-white font-black py-4 rounded-xl text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg">
                  {isTestingBot ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} TEST
                </button>
                <button disabled={isTestingBot} onClick={handleSendInstantReport} className="bg-brand-navy text-white font-black py-4 rounded-xl text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg border border-brand-gold/30">
                  {isTestingBot ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} ŞİMDİ GÖNDER
                </button>
              </div>
            </div>

            {/* Bulut Bağlantısı */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Database size={16} className="text-indigo-600" />
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">BULUT VERİTABANI</h5>
              </div>
              <input type="text" value={tempUrl} onChange={e => setTempUrl(e.target.value)} placeholder="Supabase URL" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
              <input type="password" value={tempKey} onChange={e => setTempKey(e.target.value)} placeholder="Supabase Key" className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
              <div className="flex gap-2">
                <button onClick={() => onDbConfigChange({ url: tempUrl, key: tempKey })} className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-xl text-xs uppercase shadow-lg">BAĞLAN</button>
                <button onClick={onSyncRequest} className="flex-1 bg-white dark:bg-slate-900 text-slate-500 font-black py-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsOverview;
