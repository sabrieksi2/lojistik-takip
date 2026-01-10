
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType, SmsConfig } from '../types';
import { 
  DollarSign, CalendarSearch, CalendarDays, Database, Save, Building2, TrendingDown, ArrowRight, MessageSquare, ShieldCheck, Terminal, Copy, Check, Send, Loader2, Info, Trash2, Edit3, X, MapPin, Clock, Fuel, ArrowRightLeft
} from 'lucide-react';

interface StatsOverviewProps {
  jobs: Job[];
  scheduledJobs: ScheduledJob[];
  expenses: Expense[];
  dbConfig: { url: string; key: string };
  smsConfig: SmsConfig;
  onDbConfigChange: (config: { url: string; key: string }) => void;
  onSmsConfigChange: (config: SmsConfig) => void;
  onSyncRequest: () => void;
  onDeleteJob: (job: Job) => void;
  onDeleteExpense: (expense: Expense) => void;
  onUpdateJob: (job: Job) => void;
  onUpdateExpense: (expense: Expense) => void;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ 
  jobs, expenses, scheduledJobs, dbConfig, smsConfig, 
  onDbConfigChange, onSmsConfigChange, onSyncRequest,
  onDeleteJob, onDeleteExpense, onUpdateJob, onUpdateExpense
}) => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [showSmsSettings, setShowSmsSettings] = useState(false);
  const [showAutomationGuide, setShowAutomationGuide] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const [selectedDayData, setSelectedDayData] = useState<{ date: string; displayDate: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ type: 'job' | 'expense'; data: any } | null>(null);

  const [tempUrl, setTempUrl] = useState(dbConfig.url);
  const [tempKey, setTempKey] = useState(dbConfig.key);
  const [tempSms, setTempSms] = useState<SmsConfig>(smsConfig);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleManualSmsTest = async () => {
    const username = tempSms.username.trim();
    const password = tempSms.password.trim();
    const targetNumber = tempSms.targetNumber.trim().replace(/\s/g, '').replace('+', '');
    const senderHeader = (tempSms.header || 'ILETI MRKZ').trim();

    if (!username || !password || !targetNumber) {
      alert("Kanka API bilgilerini eksiksiz girmelisin!");
      return;
    }

    setIsTestingSms(true);
    
    // Yardımcı: Proxy üzerinden çekim yapar
    const fetchWithProxy = async (proxyType: 'allorigins' | 'corsproxy') => {
      const msgText = "BK Lojistik Sistem Testi: Baglanti basarili kanka!";
      const baseUrl = 'https://api.iletimerkezi.com/v1/send-sms/get/';
      const queryParams = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&text=${encodeURIComponent(msgText)}&receipents=${encodeURIComponent(targetNumber)}&sender=${encodeURIComponent(senderHeader)}`;
      const fullSmsUrl = baseUrl + '?' + queryParams;

      let finalProxyUrl = '';
      if (proxyType === 'allorigins') {
        // allorigins /get endpointi JSON döner ve CORS engeline daha dayanıklıdır
        finalProxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(fullSmsUrl)}`;
      } else {
        finalProxyUrl = `https://corsproxy.io/?${encodeURIComponent(fullSmsUrl)}`;
      }

      const response = await fetch(finalProxyUrl);
      if (!response.ok) throw new Error(`${proxyType} Proxy Hatası: ${response.status}`);
      
      if (proxyType === 'allorigins') {
        const json = await response.json();
        return json.contents;
      }
      return await response.text();
    };

    try {
      let xmlResponse = '';
      
      // Önce AllOrigins deniyoruz
      try {
        console.log("SMS Denemesi 1: AllOrigins...");
        xmlResponse = await fetchWithProxy('allorigins');
      } catch (e1: any) {
        console.warn("AllOrigins başarısız, CorsProxy deneniyor...", e1.message);
        // O da olmazsa CorsProxy deniyoruz
        xmlResponse = await fetchWithProxy('corsproxy');
      }

      if (xmlResponse.includes('<code>200</code>')) {
        alert("Süper! Test SMS başarıyla gönderildi.");
      } else {
        const codeMatch = xmlResponse.match(/<code>(.*?)<\/code>/);
        const msgMatch = xmlResponse.match(/<message>(.*?)<\/message>/);
        alert(`SMS API Hatası:\nKod: ${codeMatch ? codeMatch[1] : 'Bilinmiyor'}\nMesaj: ${msgMatch ? msgMatch[1] : 'Yanıt ayrıştırılamadı'}\n\nİpucu: API Key veya Şifre hatalı olabilir kanka.`);
      }
    } catch (err: any) {
      console.error("SMS Gönderim Hatası:", err);
      alert(`Maalesef bağlantı kurulamadı kanka. Proxy servisleri şu an yoğun veya kapalı olabilir.\n\nDetay: ${err.message}`);
    } finally {
      setIsTestingSms(false);
    }
  };

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
    const groups: Record<string, { count: number; revenue: number; rawDate: string }> = {};
    jobs.forEach(job => {
      const isoDate = new Date(job.date).toISOString().split('T')[0];
      const displayDate = new Date(job.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (!groups[displayDate]) groups[displayDate] = { count: 0, revenue: 0, rawDate: isoDate };
      groups[displayDate].count += 1;
      groups[displayDate].revenue += job.amount;
    });
    return Object.entries(groups).map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
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

  const filteredDayData = useMemo(() => {
    if (!selectedDayData) return { jobs: [], expenses: [] };
    return {
      jobs: jobs.filter(j => new Date(j.date).toISOString().split('T')[0] === selectedDayData.date),
      expenses: expenses.filter(e => new Date(e.date).toISOString().split('T')[0] === selectedDayData.date)
    };
  }, [selectedDayData, jobs, expenses]);

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (editingItem.type === 'job') onUpdateJob(editingItem.data);
    else onUpdateExpense(editingItem.data);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Özet Kartları */}
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

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors overflow-hidden">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">
          <TrendingDown size={18} className="text-red-500" />
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">Günlük İş Dağılımı</h3>
            </div>
            <span className="text-[9px] font-bold text-slate-400 italic">Tarihe tıklayarak o günün detaylarını görebilirsin kanka.</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-4 py-2">Tarih</th>
                  <th className="px-4 py-2 text-center">İş Adeti</th>
                  <th className="px-4 py-2 text-right">Toplam Gelir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
                {dailyBreakdown.map((row, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedDayData({ date: row.rawDate, displayDate: row.date })}
                    className="hover:bg-brand-gold/5 dark:hover:bg-brand-gold/10 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-brand-gold flex items-center gap-2 underline decoration-indigo-200 dark:decoration-brand-gold/30 underline-offset-4">
                       {row.date}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{row.count}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{row.revenue.toLocaleString('tr-TR')} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><CalendarSearch size={24} /></div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Özel Tarih Aralığı</h3>
              <p className="text-xs text-slate-500 font-medium tracking-tight">İstediğin iki tarih arası toplam rapor.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 outline-none" />
            <ArrowRight size={16} className="text-slate-400" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1 uppercase">Gelir</div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.historical.revenue.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
            <div className="text-xs font-bold text-red-600 dark:text-red-400 mb-1 uppercase">Gider</div>
            <div className="text-2xl font-black text-red-700 dark:text-red-300">{stats.historical.expenseTotal.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 uppercase">Net Kar</div>
            <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{stats.historical.profit.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Building2 size={18} className="text-emerald-600" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest text-xs">Firma Bazlı Raporlama</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-[10px] font-black text-slate-400 uppercase">
              <tr>
                <th className="px-4 py-2">Firma</th>
                <th className="px-4 py-2 text-center">Adet</th>
                <th className="px-4 py-2 text-right">Toplam Ciro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
              {companyStats.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{row.name}</td>
                  <td className="px-4 py-3 text-center"><span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">{row.count}</span></td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{row.total.toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-gold/20 shadow-sm overflow-hidden h-fit">
          <div className="p-4 bg-brand-gold/5 dark:bg-brand-gold/10 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-brand-navy dark:text-brand-gold uppercase text-[10px] tracking-wider"><MessageSquare size={16} /> SMS Entegrasyonu</div>
            <button onClick={() => setShowSmsSettings(!showSmsSettings)} className="text-[10px] text-brand-gold font-black uppercase underline">{showSmsSettings ? 'Gizle' : 'Yapılandır'}</button>
          </div>
          {showSmsSettings && (
            <div className="p-5 space-y-4 animate-in slide-in-from-top duration-300">
               <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">İleti Merkezi API Key</label>
                    <input type="text" value={tempSms.username} onChange={e => setTempSms(prev => ({...prev, username: e.target.value}))} placeholder="API Key" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">İleti Merkezi API Hash (Şifre)</label>
                    <input type="password" value={tempSms.password} onChange={e => setTempSms(prev => ({...prev, password: e.target.value}))} placeholder="API Hash" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Bildirim Gidecek Numara</label>
                    <input type="text" value={tempSms.targetNumber} onChange={e => setTempSms(prev => ({...prev, targetNumber: e.target.value}))} placeholder="Örn: 532XXXXXXX" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Gönderen Başlığı (Header)</label>
                    <input type="text" value={tempSms.header} onChange={e => setTempSms(prev => ({...prev, header: e.target.value}))} placeholder="Başlık" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
                  </div>
               </div>
               <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                 <input type="checkbox" id="auto-sms" checked={tempSms.autoSend} onChange={e => setTempSms(prev => ({...prev, autoSend: e.target.checked}))} className="w-4 h-4 rounded text-brand-gold focus:ring-brand-gold" />
                 <label htmlFor="auto-sms" className="text-[10px] font-black uppercase text-slate-500 cursor-pointer">Otomatik SMS (Bulut Asistan) Aktif</label>
               </div>
               <div className="flex flex-col gap-2">
                 <button onClick={() => onSmsConfigChange(tempSms)} className="w-full bg-brand-gold text-brand-navy font-black py-3 rounded-xl text-xs tracking-widest uppercase shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">AYARLARI KAYDET</button>
                 <button disabled={isTestingSms} onClick={handleManualSmsTest} className="w-full bg-brand-navy dark:bg-brand-navy/50 text-white font-black py-3 rounded-xl text-[10px] tracking-widest uppercase disabled:opacity-50 flex items-center justify-center gap-2">
                   {isTestingSms ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                   {isTestingSms ? "GÖNDERİLİYOR..." : "MANUEL TEST SMS GÖNDER"}
                 </button>
               </div>
               <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">* Otomatik SMS modu aktifse, sistem her sabah 09:00'da bugünün işlerini, akşam 21:00'de yarının işlerini SMS olarak raporlar kanka.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider"><Database size={16} className="text-indigo-600" />Bulut Veritabanı</div>
            <button onClick={() => setShowDbSettings(!showDbSettings)} className="text-[10px] text-indigo-600 font-black uppercase underline">{showDbSettings ? 'Gizle' : 'Yapılandır'}</button>
          </div>
          {showDbSettings && (
            <div className="p-5 space-y-4 animate-in slide-in-from-top duration-300">
               <input type="text" value={tempUrl} onChange={e => setTempUrl(e.target.value)} placeholder="Supabase URL" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
               <input type="password" value={tempKey} onChange={e => setTempKey(e.target.value)} placeholder="Supabase Key" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
               <div className="flex gap-2">
                 <button onClick={() => onDbConfigChange({ url: tempUrl, key: tempKey })} className="flex-1 bg-indigo-600 text-white font-black py-2 rounded-xl text-[10px] tracking-widest uppercase">KAYDET</button>
                 <button onClick={onSyncRequest} className="flex-1 border border-slate-200 dark:border-slate-700 font-black py-2 rounded-xl text-[10px] tracking-widest uppercase">YENİLE</button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* DETAY MODALLARI */}
      {selectedDayData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-brand-gold/30">
            <div className="p-6 bg-brand-navy dark:bg-brand-gold flex justify-between items-center border-b border-white/10 dark:border-brand-navy/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl"><CalendarDays className="text-brand-gold dark:text-brand-navy" /></div>
                <div>
                   <h3 className="text-lg font-black text-white dark:text-brand-navy uppercase tracking-widest">{selectedDayData.displayDate} Detayları</h3>
                   <p className="text-[10px] text-brand-goldLight dark:text-brand-navy/60 font-bold">O güne ait tüm iş ve gider hareketleri.</p>
                </div>
              </div>
              <button onClick={() => setSelectedDayData(null)} className="p-2 hover:bg-white/10 dark:hover:bg-brand-navy/10 rounded-full transition-all text-white dark:text-brand-navy"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950/50">
               <section>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><ArrowRightLeft size={14} /> GÜNÜN İŞLERİ ({filteredDayData.jobs.length})</h4>
                  <div className="space-y-3">
                    {filteredDayData.jobs.map(job => (
                      <div key={job.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
                        <div className="flex gap-4 items-center">
                          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-brand-gold rounded-xl"><MapPin size={18} /></div>
                          <div>
                             <div className="font-black text-slate-800 dark:text-slate-100 text-sm">{job.from} → {job.to}</div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                               {job.company} • <Clock size={10} /> {new Date(job.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                             </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-lg font-black text-emerald-600 dark:text-brand-gold">{job.amount.toLocaleString('tr-TR')} ₺</div>
                           <div className="flex gap-2">
                              <button onClick={() => setEditingItem({ type: 'job', data: { ...job } })} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Edit3 size={16} /></button>
                              <button onClick={() => onDeleteJob(job)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16} /></button>
                           </div>
                        </div>
                      </div>
                    ))}
                    {filteredDayData.jobs.length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-4 italic uppercase tracking-widest opacity-40">O GÜN İŞ YAPILMAMIŞ</p>}
                  </div>
               </section>

               <section>
                  <h4 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><Fuel size={14} /> GÜNÜN GİDERLERİ ({filteredDayData.expenses.length})</h4>
                  <div className="space-y-3">
                    {filteredDayData.expenses.map(exp => (
                      <div key={exp.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center shadow-sm">
                        <div className="flex gap-4 items-center">
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl"><Fuel size={18} /></div>
                          <div>
                             <div className="font-black text-slate-800 dark:text-slate-100 text-sm">{exp.type} GİDERİ</div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase">
                               <Clock size={10} className="inline mr-1" /> {new Date(exp.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                             </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                           <div className="text-lg font-black text-red-600">-{exp.amount.toLocaleString('tr-TR')} ₺</div>
                           <div className="flex gap-2">
                              <button onClick={() => setEditingItem({ type: 'expense', data: { ...exp } })} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg"><Edit3 size={16} /></button>
                              <button onClick={() => onDeleteExpense(exp)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={16} /></button>
                           </div>
                        </div>
                      </div>
                    ))}
                    {filteredDayData.expenses.length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-4 italic uppercase tracking-widest opacity-40">O GÜN GİDER GİRİLMEMİŞ</p>}
                  </div>
               </section>
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
               <button onClick={() => setSelectedDayData(null)} className="w-full bg-slate-900 dark:bg-brand-gold text-white dark:text-brand-navy font-black py-4 rounded-2xl uppercase tracking-widest text-xs">PENCEREYİ KAPAT</button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-brand-gold/40">
              <h3 className="text-xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <Edit3 size={20} /> Kayıt Düzenle
              </h3>
              <form onSubmit={handleUpdateItem} className="space-y-4">
                 {editingItem.type === 'job' ? (
                   <>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Firma</label>
                        <input type="text" value={editingItem.data.company} onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, company: e.target.value }})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kalkış</label>
                          <input type="text" value={editingItem.data.from} onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, from: e.target.value }})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Varış</label>
                          <input type="text" value={editingItem.data.to} onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, to: e.target.value }})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold outline-none" />
                        </div>
                      </div>
                   </>
                 ) : (
                   <div>
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Gider Türü</label>
                     <select value={editingItem.data.type} onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, type: e.target.value }})} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl font-bold outline-none">
                        <option value="Köprü">Köprü</option>
                        <option value="Gemi">Gemi</option>
                        <option value="Yakıt">Yakıt</option>
                        <option value="Diğer">Diğer</option>
                     </select>
                   </div>
                 )}
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tutar (₺)</label>
                    <input type="number" value={editingItem.data.amount} onChange={e => setEditingItem({ ...editingItem, data: { ...editingItem.data, amount: Number(e.target.value) }})} className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-brand-gold rounded-xl font-black text-xl text-brand-navy dark:text-brand-gold outline-none" />
                 </div>
                 <div className="flex gap-3 pt-4">
                    <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black rounded-xl uppercase text-xs">VAZGEÇ</button>
                    <button type="submit" className="flex-1 py-3 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black rounded-xl uppercase text-xs shadow-lg">GÜNCELLE</button>
                 </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};

export default StatsOverview;
