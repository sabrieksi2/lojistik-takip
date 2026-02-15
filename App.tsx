
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
  Settings,
  Car,
  Plus,
  Settings2,
  Square,
  CheckSquare,
  PlaneTakeoff,
  PlaneLanding,
  Crosshair
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Job, ScheduledJob, Expense, ExpenseType, TelegramConfig, TelegramLog, WorkModel } from './types';

// Components
import JobForm from './components/JobForm';
import ScheduledJobForm from './components/ScheduledJobForm';
import ExpenseForm from './components/ExpenseForm';
import StatsOverview from './components/StatsOverview';
import ConfirmationModal from './components/ConfirmationModal';
import ReportGenerator from './components/ReportGenerator';
import FocusView from './components/FocusView';

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

interface ExtraItem {
  id: string;
  name: string;
  fee: number;
}

interface ManualConfig {
  service: boolean;
  ferry: boolean;
  yss: boolean;
  marmara: boolean;
  osmangazi: boolean;
  parking: boolean;
  extras: ExtraItem[];
}

const App: React.FC = () => {
  const [view, setView] = useState<'daily' | 'scheduled' | 'stats' | 'historical' | 'reports' | 'odak'>('daily');
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

  const [fixedFees, setFixedFees] = useState(() => {
    const saved = localStorage.getItem('bk_report_fees');
    return saved ? JSON.parse(saved) : { service: 0, sawService: 0, ferry: 0, yss: 0, marmara: 0, osmangazi: 0, parking: 0 };
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [syncFlash, setSyncFlash] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [finishedJobs, setFinishedJobs] = useState<ScheduledJob[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Selection states for confirmation
  const [pendingJob, setPendingJob] = useState<ScheduledJob | null>(null);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showCustomUI, setShowCustomUI] = useState(false);
  const [manualConfig, setManualConfig] = useState<ManualConfig>({
    service: true, ferry: false, yss: false, marmara: false, osmangazi: false, parking: false, extras: []
  });

  // Editing states
  const [editingFinishedId, setEditingFinishedId] = useState<string | null>(null);
  const [finishedEditBuffer, setFinishedEditBuffer] = useState<ScheduledJob | null>(null);

  const [editingDailyJobId, setEditingDailyJobId] = useState<string | null>(null);
  const [dailyJobEditBuffer, setDailyJobEditBuffer] = useState<Job | null>(null);

  const isFirstRender = useRef(true);

  // --- TELEGRAM BOT AGRESİF 5 SAATLİK OTOMASYONU ---
  useEffect(() => {
    if (!tgConfig.autoSend || !tgConfig.botToken || !tgConfig.chatId) return;

    const checkAndSendTelegram = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();
      // 5 saatte bir gönderim kontrolü (0, 5, 10, 15, 20. saatler civarı)
      const slotIndex = Math.floor(hour / 5);
      const slotKey = `slot5_${slotIndex}`;
      
      if (tgLogs.some(log => log.date === todayStr && log.slot === slotKey)) return;

      const todayJobs = scheduledJobs.filter(j => j.date === todayStr);
      let message = `🚀 *BK LOJİSTİK - 5 SAATLİK ÖZET*\n⏰ Rapor Saati: ${hour}:00\n📅 Tarih: ${todayStr}\n\n`;
      
      if (todayJobs.length === 0) {
        message += `_Kanka şu an planlı bir transferin görünmüyor. İyi dinlenmeler!_ 🍀`;
      } else {
        message += `*📅 GÜNCEL PLANIN:*\n`;
        todayJobs.forEach((j, i) => {
          message += `${i+1}. ${j.passengerName} (${j.time})\n📍 ${j.from} ➡️ ${j.to}\n⏳ Kalan: ${getTimeRemaining(j.date, j.time)}\n\n`;
        });
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
    const interval = setInterval(checkAndSendTelegram, 60000); 
    return () => clearInterval(interval);
  }, [tgConfig, scheduledJobs, tgLogs]);

  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    jobs.forEach(j => companies.add(j.company));
    scheduledJobs.forEach(sj => companies.add(sj.company));
    return Array.from(companies).sort();
  }, [jobs, scheduledJobs]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
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
    localStorage.setItem('bk_report_fees', JSON.stringify(fixedFees));
  }, [jobs, scheduledJobs, finishedJobs, expenses, tgConfig, tgLogs, fixedFees]);

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
    setPendingJob(job);
    setShowModelModal(true);
    setShowCustomUI(false);
    setManualConfig({ service: true, ferry: false, yss: false, marmara: false, osmangazi: false, parking: false, extras: [] });
  };

  const completeJobWithModel = (model: WorkModel | 'none') => {
    if (!pendingJob) return;
    
    const job = pendingJob;
    const originalDateTime = new Date(`${job.date}T${job.time}:00`);
    const dateStr = originalDateTime.toISOString();
    const confirmedJobId = job.id + '_confirmed';

    // 1. Önceki aynı işe ait giderleri temizle (Düzenleme durumları için)
    let nextExpenses = expenses.filter(e => e.jobId !== confirmedJobId);

    // 2. Gelir Girişi (Varsa güncelle, yoksa ekle)
    const existingJob = jobs.find(j => j.id === confirmedJobId);
    let nextJobs = [...jobs];
    if (existingJob) {
      nextJobs = nextJobs.map(j => j.id === confirmedJobId ? { ...j, workModel: model } : j);
    } else {
      const newDailyJob: Job = { 
        id: confirmedJobId, 
        company: job.company, 
        from: job.from, 
        to: job.to, 
        amount: job.fee, 
        date: dateStr, 
        timestamp: originalDateTime.getTime(), 
        isAutoGenerated: true,
        workModel: model
      };
      nextJobs = [newDailyJob, ...nextJobs].sort((a, b) => b.timestamp - a.timestamp);
    }

    // 3. Otomatik Gider Hesaplama
    const generatedExpenses: Expense[] = [];
    const addExp = (type: ExpenseType, amount: number) => {
      if (amount <= 0) return;
      generatedExpenses.push({
        id: Math.random().toString(36).substr(2, 9),
        type,
        amount,
        date: dateStr,
        jobId: confirmedJobId
      });
    };

    if (model === 'manual') {
      const fees = fixedFees;
      if (manualConfig.service) addExp('Diğer', Number(fees.service));
      if (manualConfig.ferry) addExp('Gemi', Number(fees.ferry));
      if (manualConfig.yss) addExp('Köprü', Number(fees.yss));
      if (manualConfig.marmara) addExp('Köprü', Number(fees.marmara));
      if (manualConfig.osmangazi) addExp('Köprü', Number(fees.osmangazi));
      if (manualConfig.parking) addExp('Diğer', Number(fees.parking));
      
      manualConfig.extras.forEach(extra => {
        addExp('Diğer', Number(extra.fee));
      });
    } else if (model !== 'none') {
      const fees = fixedFees;
      // Gemi
      addExp('Gemi', Number(fees.ferry));
      
      // Köprü (YSS + Marmara + Osmangazi)
      let bridgeTotal = Number(fees.osmangazi);
      if (model === 'ist-pickup' || model === 'ist-dropoff') {
        bridgeTotal += Number(fees.yss) + Number(fees.marmara);
      }
      addExp('Köprü', bridgeTotal);

      // Otopark (Diğer)
      if (model === 'ist-pickup') {
        addExp('Diğer', Number(fees.parking));
      }
    }

    nextExpenses = [...generatedExpenses, ...nextExpenses];

    const nextFinished = finishedJobs.some(fj => fj.id === job.id) ? finishedJobs : [job, ...finishedJobs];
    const nextScheduled = scheduledJobs.filter(sj => sj.id !== job.id);

    setJobs(nextJobs);
    setFinishedJobs(nextFinished);
    setScheduledJobs(nextScheduled);
    setExpenses(nextExpenses);
    
    triggerSync(nextJobs, nextScheduled, nextFinished, nextExpenses);
    
    setShowModelModal(false);
    setPendingJob(null);
  };

  const toggleManualParam = (param: keyof Omit<ManualConfig, 'extras'>) => {
    setManualConfig(prev => ({ ...prev, [param]: !prev[param] }));
  };

  const addExtraItem = () => {
    setManualConfig(prev => ({
      ...prev,
      extras: [...prev.extras, { id: Math.random().toString(36).substr(2, 9), name: '', fee: 0 }]
    }));
  };

  const updateExtraItem = (id: string, updates: Partial<ExtraItem>) => {
    setManualConfig(prev => ({
      ...prev,
      extras: prev.extras.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const removeExtraItem = (id: string) => {
    setManualConfig(prev => ({
      ...prev,
      extras: prev.extras.filter(item => item.id !== id)
    }));
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
        // İlgili otomatik işi ve giderleri de sil
        const nextJobs = jobs.filter(j => j.id !== job.id + '_confirmed');
        const nextExpenses = expenses.filter(e => e.jobId !== job.id + '_confirmed');
        setJobs(nextJobs);
        setExpenses(nextExpenses);
        triggerSync(nextJobs, undefined, next, nextExpenses);
      }
    });
  };

  const handleDeleteExpenseAction = (expense: Expense) => {
    setModalConfig({ 
      isOpen: true, title: 'Gider Kaydını Sil', message: `${expense.type} - ${expense.amount}₺ tutarındaki gider kaydını silmek istediğine emin misin?`, confirmText: 'Sil', type: 'danger',
      onConfirm: () => { const next = expenses.filter(e => e.id !== expense.id); setExpenses(next); triggerSync(undefined, undefined, undefined, next); }
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

  const handleUpdateCompanyName = (oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return;

    // 1. Günlük İşlerdeki İsimleri Güncelle
    const nextJobs = jobs.map(j => j.company === oldName ? { ...j, company: newName } : j);
    setJobs(nextJobs);

    // 2. Planlı İşlerdeki İsimleri Güncelle
    const nextScheduled = scheduledJobs.map(j => j.company === oldName ? { ...j, company: newName } : j);
    setScheduledJobs(nextScheduled);

    // 3. Tamamlanan İşlerdeki İsimleri Güncelle
    const nextFinished = finishedJobs.map(j => j.company === oldName ? { ...j, company: newName } : j);
    setFinishedJobs(nextFinished);

    // Sync
    triggerSync(nextJobs, nextScheduled, nextFinished);
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <ConfirmationModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={modalConfig.onConfirm} title={modalConfig.title} message={modalConfig.message} confirmText={modalConfig.confirmText} type={modalConfig.type} />

      {/* Model Selection Modal */}
      {showModelModal && pendingJob && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-brand-navy/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-brand-gold/30 flex flex-col gap-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand-navy rounded-2xl text-brand-gold"><Car size={32} /></div>
                  <div>
                    <h3 className="text-xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-widest">MODEL SEÇ VE ONAYLA</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pendingJob.passengerName} - {pendingJob.fee} ₺</p>
                  </div>
                </div>
                <button onClick={() => { setShowModelModal(false); setPendingJob(null); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
             </div>
             
             {!showCustomUI ? (
               <>
                 <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Bu iş için kullanılacak çalışma modelini seçin kanka.</p>
                 <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => completeJobWithModel('ist-pickup')} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-brand-navy hover:text-white dark:hover:bg-brand-gold dark:hover:text-brand-navy rounded-2xl border border-slate-100 dark:border-slate-700 transition-all group">
                       <span className="text-xs font-black uppercase tracking-widest">İST Havalimanı Alış</span>
                       <PlaneTakeoff size={18} className="opacity-40 group-hover:opacity-100" />
                    </button>
                    <button onClick={() => completeJobWithModel('ist-dropoff')} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-brand-navy hover:text-white dark:hover:bg-brand-gold dark:hover:text-brand-navy rounded-2xl border border-slate-100 dark:border-slate-700 transition-all group">
                       <span className="text-xs font-black uppercase tracking-widest">İST Havalimanı Bırakış</span>
                       <PlaneLanding size={18} className="opacity-40 group-hover:opacity-100" />
                    </button>
                    <button onClick={() => completeJobWithModel('saw')} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-brand-navy hover:text-white dark:hover:bg-brand-gold dark:hover:text-brand-navy rounded-2xl border border-slate-100 dark:border-slate-700 transition-all group">
                       <span className="text-xs font-black uppercase tracking-widest">Sabiha Gökçen / Diğer</span>
                       <MapPin size={18} className="opacity-40 group-hover:opacity-100" />
                    </button>
                    <button onClick={() => setShowCustomUI(true)} className="flex items-center justify-between p-5 bg-brand-gold/10 dark:bg-brand-gold/10 hover:bg-brand-gold hover:text-brand-navy rounded-2xl border border-brand-gold/30 transition-all group">
                       <span className="text-xs font-black uppercase tracking-widest text-brand-gold group-hover:text-brand-navy">ÖZEL SEÇİM (MANUEL)</span>
                       <Settings2 size={18} className="text-brand-gold group-hover:text-brand-navy" />
                    </button>
                    <button onClick={() => completeJobWithModel('none')} className="flex items-center justify-between p-5 bg-slate-100/50 dark:bg-slate-800/20 hover:bg-red-500 hover:text-white rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 transition-all group">
                       <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-white">GİDER GİRME (SADECE CİRO)</span>
                       <X size={18} className="opacity-20 group-hover:opacity-100" />
                    </button>
                 </div>
               </>
             ) : (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'service', label: 'Hizmet' },
                      { key: 'ferry', label: 'Gemi' },
                      { key: 'yss', label: 'YSS' },
                      { key: 'marmara', label: 'Marmara' },
                      { key: 'osmangazi', label: 'Osmangazi' },
                      { key: 'parking', label: 'Otopark' }
                    ].map((item) => (
                      <button 
                        key={item.key}
                        onClick={() => toggleManualParam(item.key as keyof Omit<ManualConfig, 'extras'>)}
                        className={`flex items-center gap-2 p-4 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tighter ${manualConfig[item.key as keyof Omit<ManualConfig, 'extras'>] ? 'bg-brand-navy text-white border-brand-navy dark:bg-brand-gold dark:text-brand-navy dark:border-brand-gold' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-brand-gold/50'}`}
                      >
                        {manualConfig[item.key as keyof Omit<ManualConfig, 'extras'>] ? <CheckSquare size={16} /> : <Square size={16} />}
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ekstra Kalemler</span>
                       <button onClick={addExtraItem} className="p-2 bg-brand-gold/20 text-brand-gold rounded-lg hover:bg-brand-gold/30 transition-all"><Plus size={16}/></button>
                    </div>
                    {manualConfig.extras.map(extra => (
                      <div key={extra.id} className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                         <input type="text" value={extra.name} onChange={e => updateExtraItem(extra.id, {name: e.target.value})} placeholder="Kalem" className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold" />
                         <input type="number" value={extra.fee || ''} onChange={e => updateExtraItem(extra.id, {fee: Number(e.target.value)})} placeholder="0 ₺" className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-black text-brand-gold" />
                         <button onClick={() => removeExtraItem(extra.id)} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                     <button onClick={() => setShowCustomUI(false)} className="flex-1 px-4 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-2xl text-[10px] uppercase">Geri Dön</button>
                     <button onClick={() => completeJobWithModel('manual')} className="flex-2 px-8 py-4 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black rounded-2xl text-[10px] uppercase shadow-xl">Manuel Seçimi Onayla</button>
                  </div>
               </div>
             )}
          </div>
        </div>
      )}

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
        <button onClick={() => setView('odak')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'odak' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Crosshair size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Odak</span>
        </button>
        <button onClick={() => setView('historical')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'historical' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <CalendarPlus size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Geçmiş</span>
        </button>
        <button onClick={() => setView('scheduled')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'scheduled' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <CalendarClock size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Tersan</span>
        </button>
        <button onClick={() => setView('reports')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'reports' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <FileText size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Rapor</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'stats' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Wallet size={20} /> <span className="text-[10px] md:text-sm font-bold uppercase">Analiz</span>
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-4 md:pt-40 pb-24 md:pb-8">
        {view === 'odak' && <FocusView jobs={jobs} />}
        
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
                                    <button onClick={() => handleConfirmArrivalAction(job)} className="p-2 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold transition-colors" title="Model Düzenle"><Settings2 size={16} /></button>
                                    <button onClick={() => { setEditingFinishedId(job.id); setFinishedEditBuffer({...job}); }} className="p-2 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold transition-colors" title="Verileri Düzenle"><Edit2 size={16} /></button>
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

        {view === 'reports' && (
          <ReportGenerator scheduledJobs={scheduledJobs} finishedJobs={finishedJobs} fixedFees={fixedFees} setFixedFees={setFixedFees} />
        )}

        {view === 'stats' && (
          <StatsOverview 
            jobs={jobs} 
            expenses={expenses} 
            scheduledJobs={scheduledJobs} 
            dbConfig={dbConfig} 
            tgConfig={tgConfig}
            onDbConfigChange={(c) => { setDbConfig(c); pullFromCloud(); }} 
            onTgConfigChange={(c) => { setTgConfig(c); triggerSync(undefined, undefined, undefined, undefined, c); }}
            onSyncRequest={pullFromCloud}
            onDeleteJob={handleDeleteJobAction}
            onDeleteExpense={handleDeleteExpenseAction} 
            onUpdateJob={handleUpdateJobAction} 
            onUpdateExpense={handleUpdateExpenseAction}
            onUpdateCompanyName={handleUpdateCompanyName}
          />
        )}
      </main>
    </div>
  );
};

export default App;
