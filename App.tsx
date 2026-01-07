
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  CheckCircle,
  Lock,
  Building2,
  CalendarPlus,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Job, ScheduledJob, Expense, ExpenseType } from './types';

// Components
import JobForm from './components/JobForm';
import ScheduledJobForm from './components/ScheduledJobForm';
import ExpenseForm from './components/ExpenseForm';
import StatsOverview from './components/StatsOverview';
import ConfirmationModal from './components/ConfirmationModal';

// Helper to check if a scheduled job's time has passed
const isJobExpired = (date: string, time: string) => {
  const jobDateTime = new Date(`${date}T${time}`);
  return jobDateTime.getTime() < Date.now();
};

const App: React.FC = () => {
  const [view, setView] = useState<'daily' | 'scheduled' | 'stats' | 'historical'>('daily');
  const [historicalDate, setHistoricalDate] = useState<string>(
    new Date(Date.now() - 86400000).toISOString().split('T')[0]
  );
  
  // Supabase Config
  const [dbConfig, setDbConfig] = useState<{ url: string; key: string }>(() => {
    const saved = localStorage.getItem('logistics_db_config');
    return saved ? JSON.parse(saved) : { url: '', key: '' };
  });
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);

  // Main Data States
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [finishedJobs, setFinishedJobs] = useState<ScheduledJob[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Refs for checking initial loads
  const isFirstRender = useRef(true);

  // Pull from Cloud Function
  const pullFromCloud = useCallback(async (config = dbConfig) => {
    if (!config.url || !config.key) return;
    setIsSyncing(true);
    try {
      const supabase = createClient(config.url, config.key);
      const { data, error } = await supabase
        .from('logistics_db')
        .select('data')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data?.data) {
        const cloudData = data.data;
        setJobs(cloudData.jobs || []);
        setScheduledJobs(cloudData.scheduledJobs || []);
        setFinishedJobs(cloudData.finishedJobs || []);
        setExpenses(cloudData.expenses || []);
        setLastSync(new Date().toLocaleTimeString('tr-TR'));
        setIsCloudActive(true);
      }
    } catch (e) {
      console.error("Bulut verisi çekilemedi:", e);
      setIsCloudActive(false);
    } finally {
      setIsSyncing(false);
    }
  }, [dbConfig]);

  // Push to Cloud Function
  const pushToCloud = useCallback(async (currentData: any) => {
    if (!dbConfig.url || !dbConfig.key) return;
    setIsSyncing(true);
    try {
      const supabase = createClient(dbConfig.url, dbConfig.key);
      const { error } = await supabase
        .from('logistics_db')
        .upsert({ id: 1, data: currentData });

      if (error) throw error;
      setLastSync(new Date().toLocaleTimeString('tr-TR'));
      setIsCloudActive(true);
    } catch (e) {
      console.error("Bulut senkronizasyonu hatası:", e);
      setIsCloudActive(false);
    } finally {
      setIsSyncing(false);
    }
  }, [dbConfig]);

  // Initial Data Load (LocalStorage -> Cloud)
  useEffect(() => {
    // 1. Önce yerel hafızayı yükle (hızlı açılış için)
    const sJobs = localStorage.getItem('logistics_jobs');
    const sScheduled = localStorage.getItem('logistics_scheduled');
    const sFinished = localStorage.getItem('logistics_finished');
    const sExpenses = localStorage.getItem('logistics_expenses');
    
    if (sJobs) setJobs(JSON.parse(sJobs));
    if (sScheduled) setScheduledJobs(JSON.parse(sScheduled));
    if (sFinished) setFinishedJobs(JSON.parse(sFinished));
    if (sExpenses) setExpenses(JSON.parse(sExpenses));

    // 2. Eğer bulut ayarı varsa veriyi çek (güncellik için)
    if (dbConfig.url && dbConfig.key) {
      pullFromCloud();
    }
  }, []); // Sadece açılışta bir kez

  // Sync to LocalStorage whenever state changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem('logistics_jobs', JSON.stringify(jobs));
    localStorage.setItem('logistics_scheduled', JSON.stringify(scheduledJobs));
    localStorage.setItem('logistics_finished', JSON.stringify(finishedJobs));
    localStorage.setItem('logistics_expenses', JSON.stringify(expenses));
  }, [jobs, scheduledJobs, finishedJobs, expenses]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    type: 'danger' | 'success' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false, title: '', message: '', confirmText: '', type: 'info', onConfirm: () => {}
  });

  // Handlers
  const triggerSync = (updatedJobs?: Job[], updatedScheduled?: ScheduledJob[], updatedFinished?: ScheduledJob[], updatedExpenses?: Expense[]) => {
    const data = {
      jobs: updatedJobs || jobs,
      scheduledJobs: updatedScheduled || scheduledJobs,
      finishedJobs: updatedFinished || finishedJobs,
      expenses: updatedExpenses || expenses
    };
    pushToCloud(data);
  };

  const addJob = (jobData: Omit<Job, 'id' | 'date' | 'timestamp'>, customDate?: string) => {
    const dateObj = customDate ? new Date(customDate + 'T12:00:00') : new Date();
    const newJob: Job = {
      ...jobData,
      id: Math.random().toString(36).substr(2, 9),
      date: dateObj.toISOString(),
      timestamp: dateObj.getTime()
    };
    setJobs(prev => {
      const next = [newJob, ...prev].sort((a, b) => b.timestamp - a.timestamp);
      triggerSync(next);
      return next;
    });
  };

  const addScheduledJob = (jobData: Omit<ScheduledJob, 'id'>) => {
    const newJob: ScheduledJob = { ...jobData, id: Math.random().toString(36).substr(2, 9) };
    setScheduledJobs(prev => {
      const next = [...prev, newJob].sort((a, b) => {
        return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
      });
      triggerSync(undefined, next);
      return next;
    });
  };

  const handleConfirmArrivalAction = (job: ScheduledJob) => {
    setModalConfig({
      isOpen: true,
      title: 'Varış Onayla',
      message: `${job.passengerName} isimli yolcunun yolculuğunun tamamlandığını onaylıyor musunuz?`,
      confirmText: 'Onayla',
      type: 'success',
      onConfirm: () => {
        const newDailyJob: Job = {
          id: job.id + '_confirmed',
          company: job.company,
          from: job.from,
          to: job.to,
          amount: job.fee,
          date: new Date().toISOString(),
          timestamp: Date.now(),
          isAutoGenerated: true
        };
        
        const nextJobs = [newDailyJob, ...jobs].sort((a, b) => b.timestamp - a.timestamp);
        const nextFinished = [job, ...finishedJobs];
        const nextScheduled = scheduledJobs.filter(sj => sj.id !== job.id);
        
        setJobs(nextJobs);
        setFinishedJobs(nextFinished);
        setScheduledJobs(nextScheduled);
        
        triggerSync(nextJobs, nextScheduled, nextFinished);
      }
    });
  };

  const handleDeleteScheduledJobAction = (job: ScheduledJob) => {
    setModalConfig({
      isOpen: true,
      title: 'İşi Sil',
      message: `${job.passengerName} işini silmek istediğinize emin misiniz?`,
      confirmText: 'Sil',
      type: 'danger',
      onConfirm: () => {
        const nextScheduled = scheduledJobs.filter(sj => sj.id !== job.id);
        setScheduledJobs(nextScheduled);
        triggerSync(undefined, nextScheduled);
      }
    });
  };

  const addExpenses = (newExpenses: { type: ExpenseType; amount: number }[], customDate?: string) => {
    const dateObj = customDate ? new Date(customDate + 'T12:00:00') : new Date();
    const mapped: Expense[] = newExpenses.filter(e => e.amount > 0).map(e => ({
      ...e,
      id: Math.random().toString(36).substr(2, 9),
      date: dateObj.toISOString()
    }));
    setExpenses(prev => {
      const next = [...mapped, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      triggerSync(undefined, undefined, undefined, next);
      return next;
    });
  };

  const deleteJob = (id: string) => {
    setJobs(prev => {
      const next = prev.filter(j => j.id !== id);
      triggerSync(next);
      return next;
    });
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      triggerSync(undefined, undefined, undefined, next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 text-slate-900">
      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
      />

      {/* Database Setup Header / Indicator */}
      <div className={`text-white px-4 py-1.5 flex justify-between items-center text-[10px] md:text-xs font-bold uppercase tracking-widest shadow-inner transition-colors ${isCloudActive ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
        <div className="flex items-center gap-2">
          {isCloudActive ? <Cloud size={14} /> : <CloudOff size={14} className="opacity-50" />}
          {isCloudActive ? "Bulut Senkronizasyonu Aktif" : "Sadece Cihazda Saklanıyor (Hafıza Riskli)"}
        </div>
        <div className="flex items-center gap-4">
          {lastSync && <span>Son Senk: {lastSync}</span>}
          {dbConfig.url && (
            <button onClick={() => pullFromCloud()} disabled={isSyncing} className="flex items-center gap-1 hover:text-indigo-200 transition-colors">
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              Şimdi Yenile
            </button>
          )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around p-3 md:top-6 md:bottom-auto md:justify-start md:px-8 md:gap-4 lg:gap-8 z-50 shadow-lg overflow-x-auto no-scrollbar">
        <button onClick={() => setView('daily')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'daily' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] md:text-sm font-semibold">Günlük</span>
        </button>
        <button onClick={() => setView('historical')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'historical' ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:text-slate-800'}`}>
          <CalendarPlus size={20} />
          <span className="text-[10px] md:text-sm font-semibold">Geçmiş</span>
        </button>
        <button onClick={() => setView('scheduled')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'scheduled' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
          <CalendarClock size={20} />
          <span className="text-[10px] md:text-sm font-semibold">İleri Tarih</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-xl transition-all flex-shrink-0 ${view === 'stats' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>
          <Wallet size={20} />
          <span className="text-[10px] md:text-sm font-semibold">Analiz</span>
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-4 md:pt-32 pb-8">
        {(view === 'daily' || view === 'historical') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              {view === 'historical' && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-amber-200">
                  <h3 className="text-lg font-bold text-amber-700 mb-4 flex items-center gap-2">
                    <History size={20} className="text-amber-600" />
                    Tarih Seç
                  </h3>
                  <input 
                    type="date" 
                    value={historicalDate}
                    onChange={(e) => setHistoricalDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              )}
              <JobForm 
                onAdd={(data) => addJob(data, view === 'historical' ? historicalDate : undefined)} 
                title={view === 'historical' ? "Geçmiş İş Girişi" : "Günlük İş Girişi"}
              />
              <ExpenseForm 
                onAdd={(data) => addExpenses(data, view === 'historical' ? historicalDate : undefined)} 
                title={view === 'historical' ? "Geçmiş Giderler" : "Günlük Giderler"}
              />
            </div>
            <div className="lg:col-span-8">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp size={18} className={view === 'historical' ? "text-amber-600" : "text-emerald-600"} />
                    {view === 'historical' ? `${historicalDate} Kayıtları` : "Bugünkü Hareketler"}
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {(() => {
                    const targetDate = view === 'historical' ? historicalDate : new Date().toISOString().split('T')[0];
                    const fJobs = jobs.filter(j => new Date(j.date).toISOString().split('T')[0] === targetDate);
                    const fExpenses = expenses.filter(e => new Date(e.date).toISOString().split('T')[0] === targetDate);

                    if (fJobs.length === 0 && fExpenses.length === 0) {
                      return <div className="p-12 text-center text-slate-400 font-medium">Bu tarih için kayıt bulunmuyor.</div>;
                    }

                    return (
                      <>
                        {fJobs.map(job => (
                          <div key={job.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="flex gap-4 items-center">
                              <div className={`p-2 rounded-lg ${job.isAutoGenerated ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                {job.isAutoGenerated ? <CheckCircle2 size={18} /> : <ArrowRightLeft size={18} />}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900">{job.from} → {job.to}</div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                  <span><Building2 size={10} className="inline mr-1"/>{job.company}</span>
                                  <span>• {new Date(job.date).toLocaleTimeString('tr-TR')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="font-black text-emerald-600">+{job.amount.toLocaleString('tr-TR')} ₺</div>
                              <button onClick={() => deleteJob(job.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {fExpenses.map(expense => (
                          <div key={expense.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <div className="flex gap-4 items-center">
                              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Fuel size={18} /></div>
                              <div>
                                <div className="font-bold text-slate-900">{expense.type} Gideri</div>
                                <div className="text-xs text-slate-500 font-medium">{new Date(expense.date).toLocaleTimeString('tr-TR')}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="font-black text-red-600">-{expense.amount.toLocaleString('tr-TR')} ₺</div>
                              <button onClick={() => deleteExpense(expense.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                              </button>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4">
              <ScheduledJobForm onAdd={addScheduledJob} />
            </div>
            <div className="lg:col-span-8">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Yaklaşan İşler</h2>
              {scheduledJobs.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300 text-slate-400 font-medium">Planlanmış iş yok.</div>
              ) : (
                <div className="space-y-4">
                  {scheduledJobs.map(job => (
                    <div key={job.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center bg-indigo-50 p-3 rounded-xl min-w-[70px] border border-indigo-100">
                          <span className="text-xs font-bold text-indigo-400 uppercase">{new Date(job.date).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                          <span className="text-2xl font-black text-indigo-700">{new Date(job.date).getDate()}</span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 mb-1">{job.passengerName} <span className="text-xs text-indigo-600 font-bold">({job.company})</span></div>
                          <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                            <MapPin size={14} className="text-indigo-500" />
                            <span>{job.from} → {job.to}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs font-bold text-slate-400">
                             <span className="flex items-center gap-1"><Clock size={12}/> {job.time}</span>
                             {isJobExpired(job.date, job.time) && <span className="text-red-500 bg-red-50 px-1.5 rounded">Zamanı Geldi</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:flex-col md:items-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                        <div className="text-2xl font-black text-emerald-600">{job.fee.toLocaleString('tr-TR')} ₺</div>
                        <div className="flex gap-2">
                          <button onClick={() => handleConfirmArrivalAction(job)} className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-emerald-700">Tamamlandı</button>
                          <button onClick={() => handleDeleteScheduledJobAction(job)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
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
          <StatsOverview 
            jobs={jobs} 
            expenses={expenses} 
            scheduledJobs={scheduledJobs} 
            onDbConfigChange={(config) => {
              setDbConfig(config);
              localStorage.setItem('logistics_db_config', JSON.stringify(config));
              // New config added, try to pull immediately
              pullFromCloud(config);
            }}
            dbConfig={dbConfig}
            onSyncRequest={() => pullFromCloud()}
          />
        )}
      </main>
    </div>
  );
};

export default App;
