
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  LayoutDashboard, 
  CalendarClock, 
  Wallet, 
  TrendingUp, 
  Fuel, 
  MapPin, 
  User, 
  Clock,
  ArrowRightLeft,
  Trash2,
  CheckCircle2,
  History,
  Building2,
  CalendarPlus,
  Cloud,
  CloudOff,
  RefreshCw,
  Moon,
  Sun,
  Timer
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Job, ScheduledJob, Expense, ExpenseType } from './types';

// Components
import JobForm from './components/JobForm';
import ScheduledJobForm from './components/ScheduledJobForm';
import ExpenseForm from './components/ExpenseForm';
import StatsOverview from './components/StatsOverview';
import ConfirmationModal from './components/ConfirmationModal';

const isJobExpired = (date: string, time: string) => {
  const jobDateTime = new Date(`${date}T${time}`);
  return jobDateTime.getTime() < Date.now();
};

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

const App: React.FC = () => {
  const [view, setView] = useState<'daily' | 'scheduled' | 'stats' | 'historical'>('daily');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [historicalDate, setHistoricalDate] = useState<string>(new Date(Date.now() - 86400000).toISOString().split('T')[0]);
  
  const [dbConfig, setDbConfig] = useState<{ url: string; key: string }>(() => {
    const saved = localStorage.getItem('logistics_db_config');
    return saved ? JSON.parse(saved) : { url: '', key: '' };
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [syncFlash, setSyncFlash] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [finishedJobs, setFinishedJobs] = useState<ScheduledJob[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const isFirstRender = useRef(true);

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
  }, [jobs, scheduledJobs, finishedJobs, expenses]);

  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; confirmText: string; type: 'danger' | 'success' | 'info'; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', confirmText: '', type: 'info', onConfirm: () => {} });

  const triggerSync = (updatedJobs?: Job[], updatedScheduled?: ScheduledJob[], updatedFinished?: ScheduledJob[], updatedExpenses?: Expense[]) => {
    pushToCloud({
      jobs: updatedJobs || jobs,
      scheduledJobs: updatedScheduled || scheduledJobs,
      finishedJobs: updatedFinished || finishedJobs,
      expenses: updatedExpenses || expenses
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
        const newDailyJob: Job = { id: job.id + '_confirmed', company: job.company, from: job.from, to: job.to, amount: job.fee, date: new Date().toISOString(), timestamp: Date.now(), isAutoGenerated: true };
        const nextJobs = [newDailyJob, ...jobs].sort((a, b) => b.timestamp - a.timestamp);
        const nextFinished = [job, ...finishedJobs];
        const nextScheduled = scheduledJobs.filter(sj => sj.id !== job.id);
        setJobs(nextJobs); setFinishedJobs(nextFinished); setScheduledJobs(nextScheduled);
        triggerSync(nextJobs, nextScheduled, nextFinished);
      }
    });
  };

  const handleDeleteScheduledJobAction = (job: ScheduledJob) => {
    setModalConfig({
      isOpen: true, title: 'İşi Sil', message: `${job.passengerName} işini silmek istediğinize emin misiniz?`, confirmText: 'Sil', type: 'danger',
      onConfirm: () => {
        const nextScheduled = scheduledJobs.filter(sj => sj.id !== job.id);
        setScheduledJobs(nextScheduled);
        triggerSync(undefined, nextScheduled);
      }
    });
  };

  const addExpenses = (newExpenses: { type: ExpenseType; amount: number }[], customDate?: string) => {
    const dateObj = customDate ? new Date(customDate + 'T12:00:00') : new Date();
    const mapped: Expense[] = newExpenses.filter(e => e.amount > 0).map(e => ({ ...e, id: Math.random().toString(36).substr(2, 9), date: dateObj.toISOString() }));
    setExpenses(prev => {
      const next = [...mapped, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      triggerSync(undefined, undefined, undefined, next);
      return next;
    });
  };

  const deleteJob = (id: string) => {
    setJobs(prev => { const next = prev.filter(j => j.id !== id); triggerSync(next); return next; });
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => { const next = prev.filter(e => e.id !== id); triggerSync(undefined, undefined, undefined, next); return next; });
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      <ConfirmationModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} onConfirm={modalConfig.onConfirm} title={modalConfig.title} message={modalConfig.message} confirmText={modalConfig.confirmText} type={modalConfig.type} />

      {/* Header Bar - BK Branding */}
      <div className={`text-white px-4 py-2 flex justify-between items-center text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-lg transition-all duration-500 z-[100] ${isCloudActive ? (syncFlash ? 'bg-brand-gold scale-[1.01]' : 'bg-brand-navy') : 'bg-slate-800'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-brand-gold/30">
            <span className="text-brand-gold font-black text-sm">BK</span>
          </div>
          <div className="flex flex-col">
            <span className="text-brand-goldLight tracking-widest">BK LOJİSTİK</span>
            <div className="flex items-center gap-1 opacity-70">
              {isCloudActive ? <Cloud size={10} /> : <CloudOff size={10} />}
              <span className="text-[8px]">{isCloudActive ? "Canlı Bağlantı" : "Yerel Mod"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setDarkMode(!darkMode)} className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all border border-white/5">
            {darkMode ? <Sun size={14} className="text-brand-gold" /> : <Moon size={14} />}
            <span className="hidden sm:inline">{darkMode ? 'Aydınlık' : 'Karanlık'}</span>
          </button>
          {lastSync && <span className="hidden md:inline opacity-60">Son Senk: {lastSync}</span>}
          {dbConfig.url && (
            <button onClick={() => pullFromCloud()} disabled={isSyncing} className="flex items-center gap-1 hover:text-brand-gold transition-colors bg-white/5 px-3 py-1.5 rounded-full">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Yenile</span>
            </button>
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 md:top-[56px] md:bottom-auto md:justify-start md:px-8 md:gap-4 lg:gap-8 z-50 shadow-md overflow-x-auto no-scrollbar">
        <button onClick={() => setView('daily')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'daily' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <LayoutDashboard size={20} /> <span className="text-[10px] md:text-sm font-bold">GÜNLÜK İŞ</span>
        </button>
        <button onClick={() => setView('historical')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'historical' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <CalendarPlus size={20} /> <span className="text-[10px] md:text-sm font-bold">GEÇMİŞ</span>
        </button>
        <button onClick={() => setView('scheduled')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'scheduled' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <CalendarClock size={20} /> <span className="text-[10px] md:text-sm font-bold">İLERİ TARİH</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'stats' ? 'bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
          <Wallet size={20} /> <span className="text-[10px] md:text-sm font-bold">CİRO ANALİZ</span>
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-4 md:pt-40 pb-24 md:pb-8">
        {(view === 'daily' || view === 'historical') && (
          <div className="flex flex-col gap-10">
            {/* Üst Kısım: Formlar (Yatay ve Üst Üste) */}
            <div className="flex flex-col gap-6">
              {view === 'historical' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-brand-gold/30 max-w-md mx-auto w-full">
                  <h3 className="text-lg font-bold text-brand-navy dark:text-brand-gold mb-4 flex items-center gap-2"> <History size={20} /> Tarih Seç </h3>
                  <input type="date" value={historicalDate} onChange={(e) => setHistoricalDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-gold outline-none font-bold text-slate-700 dark:text-slate-200" />
                </div>
              )}
              
              <div className="w-full">
                <JobForm onAdd={(data) => addJob(data, view === 'historical' ? historicalDate : undefined)} title={view === 'historical' ? "Geçmiş İş Girişi" : "Günlük İş Girişi"} companies={uniqueCompanies} />
              </div>
              
              <div className="w-full">
                <ExpenseForm onAdd={(data) => addExpenses(data, view === 'historical' ? historicalDate : undefined)} title={view === 'historical' ? "Geçmiş Giderler" : "Günlük Giderler"} />
              </div>
            </div>

            {/* Alt Kısım: Hareketler Listesi (Yatay ve En Altta) */}
            <div className="w-full">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
                    if (fJobs.length === 0 && fExpenses.length === 0) return <div className="p-20 text-center text-slate-400 font-black italic tracking-widest opacity-30">KAYITLI İŞLEM BULUNAMADI</div>;
                    return (
                      <>
                        {fJobs.map(job => (
                          <div key={job.id} className="p-6 flex justify-between items-center hover:bg-brand-navy/[0.02] dark:hover:bg-brand-gold/[0.02] transition-all group">
                            <div className="flex gap-6 items-center">
                              <div className={`p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform ${job.isAutoGenerated ? 'bg-brand-gold/20 text-brand-gold' : 'bg-brand-navy/10 text-brand-navy dark:text-brand-gold'}`}><ArrowRightLeft size={24} /></div>
                              <div>
                                <div className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tight">{job.from} → {job.to}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs font-black text-brand-navy/60 dark:text-brand-gold/60 uppercase tracking-widest">{job.company}</span>
                                  <span className="text-[10px] font-bold text-slate-400">• {new Date(job.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-2xl font-black text-brand-navy dark:text-brand-gold">+{job.amount.toLocaleString('tr-TR')} ₺</div>
                              <button onClick={() => deleteJob(job.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"><Trash2 size={20} /></button>
                            </div>
                          </div>
                        ))}
                        {fExpenses.map(expense => (
                          <div key={expense.id} className="p-6 flex justify-between items-center hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all group">
                            <div className="flex gap-6 items-center">
                              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Fuel size={24} /></div>
                              <div>
                                <div className="font-black text-xl text-slate-900 dark:text-slate-100 tracking-tight">{expense.type} GİDERİ</div>
                                <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{new Date(expense.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-2xl font-black text-red-600 dark:text-red-400">-{expense.amount.toLocaleString('tr-TR')} ₺</div>
                              <button onClick={() => deleteExpense(expense.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"><Trash2 size={20} /></button>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'scheduled' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4"><ScheduledJobForm onAdd={addScheduledJob} /></div>
            <div className="lg:col-span-8">
              <h2 className="text-xl font-bold text-brand-navy dark:text-brand-gold mb-6 uppercase tracking-[0.2em]">PLANLI TRANSFERLER</h2>
              {scheduledJobs.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-20 text-center border border-dashed border-brand-navy/20 dark:border-brand-gold/20 text-slate-400 font-black italic tracking-widest">BEKLEYEN RANDEVU YOK</div>
              ) : (
                <div className="space-y-4">
                  {scheduledJobs.map(job => (
                    <div key={job.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:shadow-xl transition-all">
                      <div className="flex items-start gap-6">
                        <div className="flex flex-col items-center justify-center bg-brand-navy dark:bg-brand-navy text-white p-4 rounded-[1.5rem] min-w-[85px] border border-brand-gold/30 shadow-lg">
                          <span className="text-[10px] font-black text-brand-gold uppercase tracking-tighter">{new Date(job.date).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                          <span className="text-3xl font-black text-white">{new Date(job.date).getDate()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-black text-slate-900 dark:text-slate-100 text-xl tracking-tight">{job.passengerName}</div>
                            <span className="text-[10px] bg-brand-navy/5 dark:bg-brand-gold/10 text-brand-navy dark:text-brand-gold px-3 py-1 rounded-full font-black tracking-widest uppercase">{job.company}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-bold"><MapPin size={16} className="text-brand-gold" /><span>{job.from} → {job.to}</span></div>
                          <div className="flex flex-wrap items-center gap-4 mt-4">
                             <span className="flex items-center gap-2 text-[12px] font-black text-slate-500 uppercase tracking-wider"><Clock size={14} className="text-brand-navy dark:text-brand-gold"/> {job.time}</span>
                             <span className={`flex items-center gap-2 text-[10px] font-black px-3 py-1 rounded-full ${isJobExpired(job.date, job.time) ? 'bg-red-50 dark:bg-red-900/30 text-red-600' : 'bg-brand-gold/10 text-brand-navy dark:text-brand-gold'}`}>
                                <Timer size={12} /> {getTimeRemaining(job.date, job.time)}
                             </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:flex-col md:items-end gap-4 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="text-3xl font-black text-brand-navy dark:text-brand-gold">{job.fee.toLocaleString('tr-TR')} ₺</div>
                        <div className="flex gap-3 w-full md:w-auto">
                          <button onClick={() => handleConfirmArrivalAction(job)} className="flex-1 md:flex-none bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy text-xs font-black px-8 py-3.5 rounded-2xl shadow-lg hover:brightness-110 transition-all active:scale-95 uppercase tracking-widest">ONAYLA</button>
                          <button onClick={() => handleDeleteScheduledJobAction(job)} className="p-3 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-800 rounded-2xl"><Trash2 size={22} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'stats' && (
          <StatsOverview jobs={jobs} expenses={expenses} scheduledJobs={scheduledJobs} onDbConfigChange={(config) => { setDbConfig(config); localStorage.setItem('logistics_db_config', JSON.stringify(config)); pullFromCloud(); }} dbConfig={dbConfig} onSyncRequest={() => pullFromCloud()} />
        )}
      </main>
    </div>
  );
};

export default App;
