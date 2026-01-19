
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CalendarClock, 
  Wallet, 
  TrendingUp, 
  Fuel, 
  MapPin, 
  ArrowRightLeft,
  Trash2,
  History,
  CalendarPlus,
  Cloud,
  CloudOff,
  RefreshCw,
  Moon,
  Sun,
  Timer,
  FileText,
  CheckCircle,
  Bell,
  Send,
  MessageCircle,
  Clock,
  X,
  AlertCircle,
  Edit2,
  Check,
  PlaneTakeoff
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Job, ScheduledJob, Expense, ExpenseType, TelegramConfig, TelegramLog } from './types';

// Components
import JobForm from './components/JobForm';
import ScheduledJobForm from './components/ScheduledJobForm';
import ExpenseForm from './components/ExpenseForm';
import StatsOverview from './components/StatsOverview';
import ConfirmationModal from './components/ConfirmationModal';
import ReportGenerator from './components/ReportGenerator';
import FlightTracker from './components/FlightTracker';

const isJobExpired = (date: string, time: string) => {
  const jobDateTime = new Date(`${date}T${time}`);
  return jobDateTime.getTime() < Date.now();
};

const getTimeRemaining = (date: string, time: string) => {
  const diff = new Date(`${date}T${time}`).getTime() - Date.now();
  if (diff <= 0) return "Vakti Geldi";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  if (days > 0) return `${days}g ${hours}s`;
  if (hours > 0) return `${hours}s ${minutes}dk`;
  return `${minutes}dk`;
};

const App: React.FC = () => {
  const [view, setView] = useState<'daily' | 'scheduled' | 'stats' | 'historical' | 'reports' | 'flights'>('daily');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [historicalDate, setHistoricalDate] = useState<string>(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
  
  const [dbConfig, setDbConfig] = useState<{ url: string; key: string }>(() => {
    const saved = localStorage.getItem('logistics_db_config');
    return saved ? JSON.parse(saved) : { url: '', key: '' };
  });

  const [tgConfig, setTgConfig] = useState<TelegramConfig>(() => {
    const saved = localStorage.getItem('logistics_tg_config');
    return saved ? JSON.parse(saved) : { botToken: '', chatId: '', autoSend: false };
  });

  const [tgLogs, setTgLogs] = useState<TelegramLog[]>(() => {
    const saved = localStorage.getItem('logistics_tg_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [syncFlash, setSyncFlash] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [finishedJobs, setFinishedJobs] = useState<ScheduledJob[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Editing states
  const [editingFinishedId, setEditingFinishedId] = useState<string | null>(null);
  const [finishedEditBuffer, setFinishedEditBuffer] = useState<ScheduledJob | null>(null);

  const [editingDailyJobId, setEditingDailyJobId] = useState<string | null>(null);
  const [dailyJobEditBuffer, setDailyJobEditBuffer] = useState<Job | null>(null);

  const isFirstRender = useRef(true);

  // --- TELEGRAM BOT AGRESİF SAATLİK OTOMASYONU ---
  useEffect(() => {
    if (!tgConfig.autoSend || !tgConfig.botToken || !tgConfig.chatId) return;

    const checkAndSendTelegram = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const now = new Date();
      const hour = now.getHours();
      
      const slotKey = `hour_${hour}`;
      const alreadySent = tgLogs.some(log => log.date === todayStr && log.slot === slotKey);
      
      if (alreadySent) return;

      const todayJobs = scheduledJobs.filter(j => j.date === todayStr);
      const tomorrowJobs = scheduledJobs.filter(j => j.date === tomorrowStr);
      
      let message = `🚀 *BK LOJİSTİK - SAATLİK DURUM*\n⏰ Rapor Saati: ${hour}:00\n📅 Tarih: ${todayStr}\n\n`;
      
      if (todayJobs.length === 0 && tomorrowJobs.length === 0) {
        message += `_Kanka bugün ve yarın için planlı bir transferin görünmüyor. Her şey yolunda!_ 🍀`;
      } else {
        if (todayJobs.length > 0) {
          message += `*📅 BUGÜNKÜ PLANIN:*\n`;
          todayJobs.forEach((j, i) => {
            message += `${i+1}. ${j.passengerName} (${j.time})\n📍 ${j.from} ➡️ ${j.to}\n⏳ Kalan: ${getTimeRemaining(j.date, j.time)}\n\n`;
          });
        }
        
        if (tomorrowJobs.length > 0) {
          message += `*📅 YARINKİ PLANIN:*\n`;
          tomorrowJobs.forEach((j, i) => {
            message += `${i+1}. ${j.passengerName} (${j.time})\n📍 ${j.from} ➡️ ${j.to}\n`;
          });
        }
      }

      try {
        const response = await fetch(`https://api.telegram.org/bot${tgConfig.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tgConfig.chatId, text: message, parse_mode: 'Markdown' })
        });
        
        if (response.ok) {
          const newLog: TelegramLog = { date: todayStr, slot: slotKey };
          setTgLogs(prev => {
            const next = [...prev, newLog].slice(-50);
            triggerSync(undefined, undefined, undefined, undefined, undefined, next);
            return next;
          });
        }
      } catch (err) { console.error("Telegram error:", err); }
    };

    const interval = setInterval(checkAndSendTelegram, 30000); 
    return () => clearInterval(interval);
  }, [tgConfig, scheduledJobs, tgLogs]);

  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    jobs.forEach(j => companies.add(j.company));
    scheduledJobs.forEach(sj => companies.add(sj.company));
    return Array.from(companies).sort();
  }, [jobs, scheduledJobs]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const supabase = useMemo(() => {
    if (dbConfig.url && dbConfig.key) return createClient(dbConfig.url, dbConfig.key);
    return null;
  }, [dbConfig.url, dbConfig.key]);

  const pullFromCloud = useCallback(async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.from('logistics_db').select('data').eq('id', 1);
      if (error) throw error;
      if (data && data.length > 0 && data[0].data) {
        const cloudData = data[0].data;
        setJobs(cloudData.jobs || []);
        setScheduledJobs(cloudData.scheduledJobs || []);
        setFinishedJobs(cloudData.finishedJobs || []);
        setExpenses(cloudData.expenses || []);
        if (cloudData.tgConfig) setTgConfig(cloudData.tgConfig);
        if (cloudData.tgLogs) setTgLogs(cloudData.tgLogs || []);
        setLastSync(new Date().toLocaleTimeString('tr-TR'));
        setIsCloudActive(true);
        setSyncFlash(true);
        setTimeout(() => setSyncFlash(false), 2000);
      }
    } catch (e) { setIsCloudActive(false); } finally { setIsSyncing(false); }
  }, [supabase]);

  const pushToCloud = useCallback(async (currentData: any) => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('logistics_db').upsert({ id: 1, data: currentData }, { onConflict: 'id' });
      if (error) throw error;
      setLastSync(new Date().toLocaleTimeString('tr-TR'));
      setIsCloudActive(true);
    } catch (e) { setIsCloudActive(false); } finally { setIsSyncing(false); }
  }, [supabase]);

  useEffect(() => {
    const sJobs = localStorage.getItem('logistics_jobs');
    const sScheduled = localStorage.getItem('logistics_scheduled');
    const sFinished = localStorage.getItem('logistics_finished');
    const sExpenses = localStorage.getItem('logistics_expenses');
    if (sJobs) setJobs(JSON.parse(sJobs));
    if (sScheduled) setScheduledJobs(JSON.parse(sScheduled));
    if (sFinished) setFinishedJobs(JSON.parse(sFinished));
    if (sExpenses) setExpenses(JSON.parse(sExpenses));
    if (supabase) pullFromCloud();
  }, [supabase, pullFromCloud]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    localStorage.setItem('logistics_jobs', JSON.stringify(jobs));
    localStorage.setItem('logistics_scheduled', JSON.stringify(scheduledJobs));
    localStorage.setItem('logistics_finished', JSON.stringify(finishedJobs));
    localStorage.setItem('logistics_expenses', JSON.stringify(expenses));
    localStorage.setItem('logistics_tg_config', JSON.stringify(tgConfig));
    localStorage.setItem('logistics_tg_logs', JSON.stringify(tgLogs));
  }, [jobs, scheduledJobs, finishedJobs, expenses, tgConfig, tgLogs]);

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; confirmText: string; type: 'danger' | 'success' | 'info'; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', confirmText: '', type: 'info', onConfirm: () => {} });

  const triggerSync = (
    updatedJobs?: Job[], updatedScheduled?: ScheduledJob[], updatedFinished?: ScheduledJob[], 
    updatedExpenses?: Expense[], updatedTgConfig?: TelegramConfig, updatedTgLogs?: TelegramLog[]
  ) => {
    pushToCloud({
      jobs: updatedJobs || jobs,
      scheduledJobs: updatedScheduled || scheduledJobs,
      finishedJobs: updatedFinished || finishedJobs,
      expenses: updatedExpenses || expenses,
      tgConfig: updatedTgConfig || tgConfig,
      tgLogs: updatedTgLogs || tgLogs
    });
  };

  const addJob = (jobData: Omit<Job, 'id' | 'date' | 'timestamp'>, customDate?: string) => {
    const dateObj = customDate ? new Date(customDate + 'T12:00:00') : new Date();
    const newJob: Job = { ...jobData, id: Math.random().toString(36).substr(2, 9), date: dateObj.toISOString(), timestamp: dateObj.getTime() };
    setJobs(prev => {
      const next = [newJob, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      triggerSync(next);
      return next;
    });
  };

  const addScheduledJob = (jobData: Omit<ScheduledJob, 'id'>) => {
    const newJob: ScheduledJob = { ...jobData, id: Math.random().toString(36).substr(2, 9) };
    setScheduledJobs(prev => {
      const next = [...prev, newJob].sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      triggerSync(undefined, next);
      return next;
    });
  };

  const handleConfirmArrivalAction = (job: ScheduledJob) => {
    setModalConfig({
      isOpen: true, title: 'Varış Onayla', message: `${job.passengerName} isimli yolcunun yolculuğunun tamamlandığını onaylıyor musunuz?`, confirmText: 'Onayla', type: 'success',
      onConfirm: () => {
        const originalDateTime = new Date(`${job.date}T${job.time}:00`);
        const newDailyJob: Job = { 
          id: job.id + '_confirmed', 
          company: job.company, 
          from: job.from, 
          to: job.to, 
          amount: job.fee, 
          date: originalDateTime.toISOString(), 
          timestamp: originalDateTime.getTime(), 
          isAutoGenerated: true 
        };
        setJobs(prev => {
          const next = [newDailyJob, ...prev].sort((a, b) => b.timestamp - a.timestamp);
          triggerSync(next);
          return next;
        });
        setFinishedJobs(prev => {
          const next = [job, ...prev];
          triggerSync(undefined, undefined, next);
          return next;
        });
        setScheduledJobs(prev => {
          const next = prev.filter(sj => sj.id !== job.id);
          triggerSync(undefined, next);
          return next;
        });
      }
    });
  };

  const handleDeleteJobAction = (job: Job) => {
    setModalConfig({ isOpen: true, title: 'İş Kaydını Sil', message: `${job.company} kaydını silmek istediğine emin misin?`, confirmText: 'Sil', type: 'danger',
      onConfirm: () => { const next = jobs.filter(j => j.id !== job.id); setJobs(next); triggerSync(next); }
    });
  };

  const handleDeleteScheduledJobAction = (job: ScheduledJob) => {
    setModalConfig({ isOpen: true, title: 'Planlı İşi Sil', message: `${job.passengerName} yolcusunun ${job.date} tarihli planlı işini silmek istediğine emin misin?`, confirmText: 'Sil', type: 'danger',
      onConfirm: () => { 
        const next = scheduledJobs.filter(sj => sj.id !== job.id); 
        setScheduledJobs(next); 
        triggerSync(undefined, next); 
      }
    });
  };

  const handleDeleteFinishedJobAction = (job: ScheduledJob) => {
    setModalConfig({ isOpen: true, title: 'Tamamlanan İşi Sil', message: `${job.passengerName} yolcusunun tamamlanmış kaydını silmek istediğine emin misin?`, confirmText: 'Sil', type: 'danger',
      onConfirm: () => {
        const next = finishedJobs.filter(fj => fj.id !== job.id);
        setFinishedJobs(next);
        triggerSync(undefined, undefined, next);
      }
    });
  };

  const handleDeleteExpenseAction = (expense: Expense) => {
    setModalConfig({ 
      isOpen: true, 
      title: 'Gider Kaydını Sil', 
      message: `${expense.type} - ${expense.amount}₺ tutarındaki gider kaydını silmek istediğine emin misin?`, 
      confirmText: 'Sil', 
      type: 'danger',
      onConfirm: () => { 
        const next = expenses.filter(e => e.id !== expense.id); 
        setExpenses(next); 
        triggerSync(undefined, undefined, undefined, next); 
      }
    });
  };

  const handleUpdateJobAction = (updatedJob: Job) => {
    const next = jobs.map(j => j.id === updatedJob.id ? updatedJob : j);
    setJobs(next);
    triggerSync(next);
    setEditingDailyJobId(null);
    setDailyJobEditBuffer(null);
  };

  const handleUpdateFinishedJobAction = (updatedJob: ScheduledJob) => {
    const next = finishedJobs.map(fj => fj.id === updatedJob.id ? updatedJob : fj);
    setFinishedJobs(next);
    triggerSync(undefined, undefined, next);
    setEditingFinishedId(null);
    setFinishedEditBuffer(null);
  };

  const handleUpdateExpenseAction = (updatedExpense: Expense) => {
    const next = expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
    setExpenses(next);
    triggerSync(undefined, undefined, undefined, next);
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <ConfirmationModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={modalConfig.onConfirm} title={modalConfig.title} message={modalConfig.message} confirmText={modalConfig.confirmText} type={modalConfig.type} />

      {/* Header */}
      <div className={`text-white px-4 py-2 flex justify-between items-center text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-lg transition-all duration-500 z-[100] ${isCloudActive ? (syncFlash ? 'bg-brand-gold scale-[1.01]' : 'bg-brand-navy') : 'bg-slate-800'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-brand-gold/30">
            <span className="text-brand-gold font-black text-sm">BK</span>
          </div>
          <span className="text-brand-goldLight tracking-widest">BK LOJİSTİK</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-brand-gold/20 px-3 py-1.5 rounded-full border border-brand-gold/30">
             <Bell size={14} className={tgConfig.autoSend ? 'text-brand-gold animate-bounce' : 'text-slate-500'} />
             <span className="text-[8px] text-brand-goldLight">{tgConfig.autoSend ? 'BOT AKTİF' : 'BOT KAPALI'}</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all border border-white/5">
            {darkMode ? <Sun size={14} className="text-brand-gold" /> : <Moon size={14} />}
          </button>
          {dbConfig.url && (
            <button onClick={() => pullFromCloud()} disabled={isSyncing} className="flex items-center gap-1 hover:text-brand-gold transition-colors bg-white/5 px-3 py-1.5 rounded-full">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 md:top-[56px] md:bottom-auto md:justify-start md:px-8 md:gap-4 z-50 shadow-md overflow-x-auto no-scrollbar">
        <button onClick={() => setView('daily')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'daily' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <LayoutDashboard size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Günlük İş</span>
        </button>
        <button onClick={() => setView('historical')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'historical' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <CalendarPlus size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Geçmiş</span>
        </button>
        <button onClick={() => setView('scheduled')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'scheduled' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <CalendarClock size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Tersan</span>
        </button>
        <button onClick={() => setView('flights')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'flights' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <PlaneTakeoff size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Uçuş Takip</span>
        </button>
        <button onClick={() => setView('reports')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'reports' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <FileText size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Rapor</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'stats' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Wallet size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Analiz</span>
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-4 md:pt-40 pb-24 md:pb-8">
        {(view === 'daily' || view === 'historical') && (
          <div className="flex flex-col gap-10">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-6">
                {view === 'historical' && (
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-brand-gold/30 w-full">
                    <h3 className="text-lg font-bold text-brand-navy dark:text-brand-gold mb-4 flex items-center gap-2"> <History size={20} /> Tarih Seç </h3>
                    <input type="date" value={historicalDate} onChange={(e) => setHistoricalDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-700 dark:text-slate-200" />
                  </div>
                )}
                <JobForm onAdd={(data) => addJob(data, view === 'historical' ? historicalDate : undefined)} title={view === 'historical' ? "Geçmiş İş" : "Günlük İş"} companies={uniqueCompanies} />
              </div>
              <div className="lg:w-96">
                <ExpenseForm onAdd={(data) => {
                  const targetDate = view === 'historical' ? historicalDate : new Date().toISOString().split('T')[0];
                  const newExpenses = data.map(d => ({
                    id: Math.random().toString(36).substr(2, 9),
                    type: d.type,
                    amount: d.amount,
                    date: new Date(targetDate + 'T12:00:00').toISOString()
                  }));
                  const next = [...newExpenses, ...expenses];
                  setExpenses(next);
                  triggerSync(undefined, undefined, undefined, next);
                }} title={view === 'historical' ? "Geçmiş Gider" : "Günlük Gider"} />
              </div>
            </div>
            
            <div className="w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h2 className="font-black text-brand-navy dark:text-brand-gold flex items-center gap-3 uppercase tracking-[0.2em]">
                    <TrendingUp size={22} className="text-brand-gold" />
                    {view === 'historical' ? `${historicalDate} KAYITLARI` : "BUGÜNKÜ HAREKETLER"}
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[800px] overflow-y-auto">
                  {(() => {
                    const targetDate = view === 'historical' ? historicalDate : new Date().toISOString().split('T')[0];
                    const fJobs = jobs.filter(j => new Date(j.date).toISOString().split('T')[0] === targetDate);
                    const fExpenses = expenses.filter(e => new Date(e.date).toISOString().split('T')[0] === targetDate);
                    if (fJobs.length === 0 && fExpenses.length === 0) return <div className="p-20 text-center text-slate-400 font-black italic tracking-widest opacity-30 uppercase">İŞLEM KAYDI BULUNAMADI</div>;
                    return (
                      <>
                        {fJobs.map(job => (
                          <div key={job.id} className="p-6 flex flex-col md:flex-row justify-between items-center hover:bg-brand-navy/[0.02] dark:hover:bg-brand-gold/[0.02] transition-all group gap-4">
                            {editingDailyJobId === job.id && dailyJobEditBuffer ? (
                              <div className="flex flex-col md:flex-row gap-3 w-full animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">
                                  <input type="text" value={dailyJobEditBuffer.company} onChange={e => setDailyJobEditBuffer({...dailyJobEditBuffer, company: e.target.value})} className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold" placeholder="Firma" />
                                  <input type="text" value={dailyJobEditBuffer.from} onChange={e => setDailyJobEditBuffer({...dailyJobEditBuffer, from: e.target.value})} className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="Nereden" />
                                  <input type="text" value={dailyJobEditBuffer.to} onChange={e => setDailyJobEditBuffer({...dailyJobEditBuffer, to: e.target.value})} className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="Nereye" />
                                </div>
                                <div className="flex items-center gap-3">
                                  <input type="number" value={dailyJobEditBuffer.amount} onChange={e => setDailyJobEditBuffer({...dailyJobEditBuffer, amount: Number(e.target.value)})} className="w-24 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-black text-brand-navy dark:text-brand-gold" placeholder="Tutar" />
                                  <div className="flex gap-1">
                                    <button onClick={() => handleUpdateJobAction(dailyJobEditBuffer)} className="p-2 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-xl hover:scale-105 active:scale-95 transition-all"><Check size={18} /></button>
                                    <button onClick={() => { setEditingDailyJobId(null); setDailyJobEditBuffer(null); }} className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-xl"><X size={18} /></button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex gap-6 items-center w-full">
                                  <div className={`p-4 rounded-2xl shadow-sm ${job.isAutoGenerated ? 'bg-brand-gold/20 text-brand-gold' : 'bg-brand-navy/10 text-brand-navy dark:text-brand-gold'}`}><ArrowRightLeft size={24} /></div>
                                  <div>
                                    <div className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tight">{job.from} → {job.to}</div>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-xs font-black text-brand-navy/60 dark:text-brand-gold/60 uppercase tracking-widest">{job.company}</span>
                                      <span className="text-[10px] font-bold text-slate-400">• {new Date(job.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                  <div className="text-2xl font-black text-brand-navy dark:text-brand-gold whitespace-nowrap">+{job.amount.toLocaleString('tr-TR')} ₺</div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => { setEditingDailyJobId(job.id); setDailyJobEditBuffer({...job}); }} className="p-3 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold rounded-xl transition-all" title="Düzenle"><Edit2 size={20} /></button>
                                    <button onClick={() => handleDeleteJobAction(job)} className="p-3 text-slate-300 hover:text-red-500 rounded-xl transition-all" title="Sil"><Trash2 size={20} /></button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
            </div>
          </div>
        )}

        {view === 'scheduled' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4"><ScheduledJobForm onAdd={addScheduledJob} /></div>
            <div className="lg:col-span-8">
              <div className="mb-8">
                <h2 className="text-xl font-bold text-brand-navy dark:text-brand-gold mb-6 uppercase tracking-widest flex items-center gap-3"><CalendarClock size={24} /> PLANLI TRANSFERLER</h2>
                {scheduledJobs.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-10 text-center border border-dashed border-brand-navy/20 text-slate-400 font-black uppercase">BEKLEYEN RANDEVU YOK</div>
                ) : (
                  <div className="space-y-4">
                    {scheduledJobs.map(job => {
                      const remaining = getTimeRemaining(job.date, job.time);
                      const isDue = remaining === "Vakti Geldi";
                      return (
                        <div key={job.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 group hover:border-brand-gold transition-all">
                          <div className="flex items-center gap-6 flex-1">
                            <div className="bg-brand-navy p-4 rounded-[1.5rem] text-white flex flex-col items-center min-w-[70px]">
                               <span className="text-3xl font-black">{new Date(job.date).getDate()}</span>
                               <span className="text-[10px] uppercase font-bold text-brand-gold">{new Date(job.date).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                            </div>
                            <div>
                              <div className="font-black text-xl text-slate-800 dark:text-slate-100">{job.passengerName}</div>
                              <div className="text-sm text-slate-500 font-bold">{job.from} → {job.to} | {job.time}</div>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] text-brand-gold font-black uppercase">{job.company}</span>
                                <div className={`flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase ${isDue ? 'bg-red-500 text-white animate-pulse' : 'bg-brand-gold/10 text-brand-gold'}`}>
                                  <Timer size={10} />
                                  KALAN: {remaining}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-2xl font-black text-brand-navy dark:text-brand-gold mr-2">{job.fee.toLocaleString('tr-TR')} ₺</div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleDeleteScheduledJobAction(job)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all" title="İşi Sil">
                                <Trash2 size={20} />
                              </button>
                              <button onClick={() => handleConfirmArrivalAction(job)} className="bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy px-8 py-3 rounded-2xl text-xs font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-navy/20">ONAYLA</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {finishedJobs.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-lg font-black text-slate-400 mb-6 uppercase tracking-widest flex items-center gap-3">
                    <CheckCircle size={20} className="text-emerald-500" /> TAMAMLANAN TRANSFERLER ({finishedJobs.length})
                  </h2>
                  <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-4">
                    <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                      {finishedJobs.map(job => (
                         <div key={job.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center opacity-70 group hover:opacity-100 transition-all">
                           {editingFinishedId === job.id && finishedEditBuffer ? (
                             <div className="flex flex-col md:flex-row gap-4 w-full animate-in fade-in duration-300">
                               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <input type="text" value={finishedEditBuffer.passengerName} onChange={e => setFinishedEditBuffer({...finishedEditBuffer, passengerName: e.target.value})} className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-bold" placeholder="Yolcu Adı" />
                                  <div className="flex gap-2">
                                     <input type="text" value={finishedEditBuffer.from} onChange={e => setFinishedEditBuffer({...finishedEditBuffer, from: e.target.value})} className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" placeholder="Nereden" />
                                     <input type="text" value={finishedEditBuffer.to} onChange={e => setFinishedEditBuffer({...finishedEditBuffer, to: e.target.value})} className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none" placeholder="Nereye" />
                                  </div>
                               </div>
                               <div className="flex items-center gap-3">
                                  <input type="number" value={finishedEditBuffer.fee} onChange={e => setFinishedEditBuffer({...finishedEditBuffer, fee: Number(e.target.value)})} className="w-24 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none font-black text-emerald-600" placeholder="Ücret" />
                                  <div className="flex gap-1">
                                    <button onClick={() => handleUpdateFinishedJobAction(finishedEditBuffer)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"><Check size={14} /></button>
                                    <button onClick={() => { setEditingFinishedId(null); setFinishedEditBuffer(null); }} className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"><X size={14} /></button>
                                  </div>
                               </div>
                             </div>
                           ) : (
                             <>
                               <div className="flex items-center gap-4">
                                  <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-md shadow-emerald-500/20"><CheckCircle size={16} /></div>
                                  <div>
                                     <div className="text-sm font-black text-slate-700 dark:text-slate-200">{job.passengerName}</div>
                                     <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(job.date).toLocaleDateString('tr-TR')} | {job.from} → {job.to}</div>
                                  </div>
                               </div>
                               <div className="flex items-center gap-4 mt-4 md:mt-0">
                                 <div className="text-sm font-black text-emerald-600">{job.fee.toLocaleString('tr-TR')} ₺</div>
                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingFinishedId(job.id); setFinishedEditBuffer({...job}); }} className="p-2 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold transition-colors" title="Düzenle"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteFinishedJobAction(job)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Kaydı Sil"><Trash2 size={16} /></button>
                                 </div>
                                 <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md uppercase">BİTTİ</span>
                               </div>
                             </>
                           )}
                         </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'flights' && <FlightTracker />}

        {view === 'reports' && (
          <ReportGenerator scheduledJobs={scheduledJobs} finishedJobs={finishedJobs} />
        )}

        {view === 'stats' && (
          <StatsOverview 
            jobs={jobs} 
            expenses={expenses} 
            scheduledJobs={scheduledJobs} 
            dbConfig={dbConfig} 
            tgConfig={tgConfig}
            onDbConfigChange={(c) => { setDbConfig(c); localStorage.setItem('logistics_db_config', JSON.stringify(c)); pullFromCloud(); }} 
            onTgConfigChange={(c) => { setTgConfig(c); triggerSync(undefined, undefined, undefined, undefined, c); }}
            onSyncRequest={pullFromCloud}
            onDeleteJob={handleDeleteJobAction}
            onDeleteExpense={handleDeleteExpenseAction} 
            onUpdateJob={handleUpdateJobAction} 
            onUpdateExpense={handleUpdateExpenseAction}
          />
        )}
      </main>
    </div>
  );
};

export default App;
