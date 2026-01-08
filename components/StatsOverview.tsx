
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType, SmsConfig } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend
} from 'recharts';
import { DollarSign, CalendarSearch, CalendarDays, Database, Save, Building2, TrendingDown, ArrowRight, Wallet, MessageSquare, ShieldCheck, Terminal, CloudLightning, Copy, Check, ExternalLink, PartyPopper, Send, Loader2, Info } from 'lucide-react';

interface StatsOverviewProps {
  jobs: Job[];
  scheduledJobs: ScheduledJob[];
  expenses: Expense[];
  dbConfig: { url: string; key: string };
  smsConfig: SmsConfig;
  onDbConfigChange: (config: { url: string; key: string }) => void;
  onSmsConfigChange: (config: SmsConfig) => void;
  onSyncRequest: () => void;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ jobs, expenses, scheduledJobs, dbConfig, smsConfig, onDbConfigChange, onSmsConfigChange, onSyncRequest }) => {
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [showSmsSettings, setShowSmsSettings] = useState(false);
  const [showAutomationGuide, setShowAutomationGuide] = useState(false);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  const [tempUrl, setTempUrl] = useState(dbConfig.url);
  const [tempKey, setTempKey] = useState(dbConfig.key);
  const [tempSms, setTempSms] = useState<SmsConfig>(smsConfig);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleManualSmsTest = async () => {
    // Bilgileri temizle (sağda solda boşluk kalmasın)
    const username = tempSms.username.trim();
    const password = tempSms.password.trim();
    const targetNumber = tempSms.targetNumber.trim().replace(/\s/g, '').replace('+', '');
    const senderHeader = (tempSms.header || 'ILETI MRKZ').trim();

    if (!username || !password || !targetNumber) {
      alert("Kanka API bilgilerini (Key, Hash ve Numara) eksiksiz girmelisin!");
      return;
    }

    setIsTestingSms(true);
    try {
      const now = new Date();
      // Test için 24 saat içindeki işleri veya yoksa sabit bir test mesajını kullan
      const toNotify = scheduledJobs.filter((j) => {
        const jobDate = new Date(`${j.date}T${j.time}`);
        const diff = jobDate.getTime() - now.getTime();
        return diff > 0 && diff <= 86400000;
      });

      let msgText = "";
      if (toNotify.length === 0) {
        msgText = "BK Test Mesaji: Sistem baglantisi basarili kanka!";
      } else {
        msgText = "BK Hatirlatma:\n" + toNotify.map((j) => `${j.time}: ${j.passengerName}`).join('\n');
      }
      
      // İleti Merkezi GET API Parametreleri
      const baseUrl = 'https://api.iletimerkezi.com/v1/send-sms/get/';
      // Not: Bazı hesaplarda 'receipents', bazılarında 'recipients' çalışabiliyor. 
      // İleti Merkezi dökümanında typo (receipents) mevcut.
      const query = `?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&text=${encodeURIComponent(msgText)}&receipents=${encodeURIComponent(targetNumber)}&sender=${encodeURIComponent(senderHeader)}`;
      
      const fullTargetUrl = baseUrl + query;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(fullTargetUrl)}`;

      const response = await fetch(proxyUrl, { method: 'GET' });
      
      if (!response.ok) throw new Error(`Proxy sunucusu yanıt vermedi (Kod: ${response.status})`);

      const xmlText = await response.text();
      console.log("İleti Merkezi Ham Yanıt:", xmlText);

      if (xmlText.includes('<code>200</code>')) {
        alert("Süper! Test SMS'i başarıyla gönderildi kanka.");
      } else if (xmlText.includes('<code>401</code>') || xmlText.includes('Üyelik bilgileri hatalı')) {
        alert("HATA: Üyelik Bilgileri Geçersiz!\n\nKanka lütfen şuna bak:\nİleti Merkezi panelinde 'Ayarlar -> API' sekmesindeki API KEY ve API HASH bilgilerini kullandığından emin ol. Panelin kendi giriş şifresi burada geçmez.");
      } else if (xmlText.includes('<code>402</code>') || xmlText.includes('Başlık hatalı')) {
        alert(`HATA: Mesaj Başlığı Geçersiz!\n\n'${senderHeader}' başlığı hesabında tanımlı olmayabilir. İleti Merkezi panelinden kontrol et kanka.`);
      } else {
        const match = xmlText.match(/<message>(.*?)<\/message>/);
        const errMsg = match ? match[1] : "Bilinmeyen bir hata oluştu.";
        alert(`İleti Merkezi Yanıtı: ${errMsg}`);
      }
    } catch (err: any) {
      console.error("SMS Gönderim Hatası:", err);
      alert(`Bağlantı sorunu: ${err.message}\n\nİpucu: İnternetini kontrol et veya Proxy servisi geçici olarak yoğun olabilir.`);
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

  const checkCronSql = `select * from cron.job;`;

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Üst Özet Kartları */}
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

      {/* 3. SMS Ayarları Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-gold/20 shadow-sm overflow-hidden">
        <button onClick={() => setShowSmsSettings(!showSmsSettings)} className="w-full p-4 bg-brand-gold/5 dark:bg-brand-gold/10 hover:bg-brand-gold/10 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-2 font-bold text-brand-navy dark:text-brand-gold uppercase text-xs tracking-wider"><MessageSquare size={16} /> İleti Merkezi SMS Entegrasyonu</div>
          <span className="text-xs text-brand-gold font-black">{showSmsSettings ? 'Kapat' : 'Yapılandır'}</span>
        </button>
        {showSmsSettings && (
          <div className="p-6 space-y-6 animate-in slide-in-from-top duration-300">
            <div className="bg-blue-50 dark:bg-indigo-950/30 p-4 rounded-2xl border border-blue-100 dark:border-indigo-900 flex items-start gap-4">
               <Info className="text-blue-500 shrink-0" size={24} />
               <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                 <p className="font-black text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wider text-[12px]">Kritik Bilgilendirme</p>
                 <p>Kanka "Üyelik bilgileri hatalı" uyarısı alıyorsan, İleti Merkezi'nde <b>Ayarlar &rarr; API</b> sekmesine git. Oradaki <b>API KEY</b> ve <b>API HASH</b> bilgilerini kullanmalısın. Panelin kendi giriş şifresini buraya yazma!</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">API Kullanıcı (Key)</label>
                <input type="text" value={tempSms.username} onChange={e => setTempSms(prev => ({...prev, username: e.target.value}))} placeholder="API KEY" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">API Şifre (Hash)</label>
                <input type="password" value={tempSms.password} onChange={e => setTempSms(prev => ({...prev, password: e.target.value}))} placeholder="API HASH" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">SMS Başlığı (Header)</label>
                <input type="text" value={tempSms.header} onChange={e => setTempSms(prev => ({...prev, header: e.target.value}))} placeholder="BK TURIZM" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Hedef Numara</label>
                <input type="text" value={tempSms.targetNumber} onChange={e => setTempSms(prev => ({...prev, targetNumber: e.target.value}))} placeholder="534XXXXXXX" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none text-slate-800 dark:text-slate-200" />
              </div>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
               <ShieldCheck className="text-emerald-500" />
               <div className="flex-1">
                 <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">BULUT HATIRLATMA MODU</h4>
                 <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-none">İşaretliyse, Supabase her gün yaklaşan işleri otomatik olarak SMS atar.</p>
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase">Aktif</span>
                 <input 
                    type="checkbox" 
                    checked={tempSms.autoSend} 
                    onChange={e => setTempSms(prev => ({...prev, autoSend: e.target.checked}))}
                    className="w-5 h-5 accent-brand-gold cursor-pointer"
                 />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button 
                onClick={() => { onSmsConfigChange(tempSms); alert("SMS Ayarları Kaydedildi!"); }} 
                className="bg-brand-gold text-brand-navy font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg active:scale-95 uppercase text-[10px] tracking-widest"
              >
                <Save size={16} /> AYARLARI KAYDET
              </button>
              <button 
                disabled={isTestingSms}
                onClick={handleManualSmsTest} 
                className="bg-indigo-600 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg active:scale-95 uppercase text-[10px] tracking-widest disabled:opacity-50"
              >
                {isTestingSms ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} 
                ŞİMDİ TEST SMS'İ GÖNDER
              </button>
              <button 
                onClick={() => setShowAutomationGuide(!showAutomationGuide)}
                className="bg-slate-800 text-white font-black py-3 rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest"
              >
                <Terminal size={18} /> KURULUM REHBERİ
              </button>
            </div>

            {showAutomationGuide && (
              <div className="bg-slate-950 text-emerald-400 p-6 rounded-2xl border border-emerald-900/30 font-mono text-[10px] animate-in fade-in slide-in-from-bottom duration-500 space-y-4">
                 <div className="flex justify-between items-center border-b border-emerald-900/30 pb-4">
                    <span className="text-white font-bold uppercase tracking-wider">// KURULUM BAŞARIYLA TAMAMLANDI! <PartyPopper className="inline ml-2" size={14} /></span>
                    <button onClick={() => setShowAutomationGuide(false)} className="text-slate-500 hover:text-white">KAPAT</button>
                 </div>
                 <p className="text-slate-400 text-[11px]">Sistem her gün 09:00, 14:00 ve 20:00'de otomatik çalışır. SQL Editor'da şu kodu çalıştırarak durumu kontrol edebilirsin:</p>
                 <div className="relative">
                    <pre className="bg-slate-900 p-3 rounded-lg border border-white/5 text-emerald-300">{checkCronSql}</pre>
                    <button onClick={() => copyToClipboard(checkCronSql, 'check-cron')} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:text-white transition-all">
                       {copied === 'check-cron' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Gider Analizi */}
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

      {/* 5. Firma Performansı & Günlük Dağılım */}
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

      {/* DB Ayarları */}
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
