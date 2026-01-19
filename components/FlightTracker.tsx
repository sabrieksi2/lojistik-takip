
import React, { useState, useEffect } from 'react';
import { Search, Plane, MapPin, Clock, Calendar, Info, Loader2, PlaneTakeoff, PlaneLanding, Radar, ExternalLink, AlertTriangle, ShieldCheck, Key, HelpCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { FlightInfo } from '../types';

const FlightTracker: React.FC = () => {
  const [flightNo, setFlightNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightData, setFlightData] = useState<FlightInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true); // Default true, will check on mount

  // Check key availability on component mount
  useEffect(() => {
    const checkKeyAvailability = async () => {
      // Use type casting for window.aistudio to avoid conflicts with environment-provided types
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        try {
          const isSelected = await aistudio.hasSelectedApiKey();
          setHasKey(isSelected);
        } catch (e) {
          console.warn("API Key check skipped or failed:", e);
        }
      }
    };
    checkKeyAvailability();
  }, []);

  const handleSelectKey = async () => {
    console.log("Anahtar seçme işlemi başlatılıyor...");
    const aistudio = (window as any).aistudio;
    if (aistudio && typeof aistudio.openSelectKey === 'function') {
      try {
        await aistudio.openSelectKey();
        // Rule: Assume success after triggering openSelectKey
        setHasKey(true);
        setError(null);
      } catch (e) {
        console.error("Anahtar seçme penceresi açılamadı:", e);
        setError("Anahtar seçim penceresi açılamadı. Lütfen sayfayı yenileyip tekrar dene kanka.");
      }
    } else {
      console.error("window.aistudio.openSelectKey bulunamadı!");
      setError("Bu ortamda anahtar seçme özelliği aktif değil. Lütfen tarayıcıyı kontrol et kanka.");
    }
  };

  const trackFlight = async () => {
    if (!flightNo) return;
    
    // Check if we have a key (via process.env as per rules, but selection handles this)
    if (!process.env.API_KEY && (window as any).aistudio) {
      setHasKey(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Rule: Create fresh instance with the latest key right before the call to ensure it uses updated key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Lütfen şu uçuş numarasına ait CANLI uçuş bilgilerini getir: ${flightNo}. 
      Hangi şehirden kalkıyor, nereye iniyor, planlanan iniş saati, gerçek/beklenen iniş saati, rötar süresi, kapı numarası ve şu anki durumu (havada, indi, rötar vb.) hakkında net bilgi ver. 
      Lojistik operasyonu için bu bilgiler çok önemli.`;

      // Using gemini-3-pro-image-preview because it requires key selection and supports search well
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "Uçuş verisine ulaşılamadı.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      setFlightData({
        flightNumber: flightNo.toUpperCase(),
        status: text.toLowerCase().includes("indi") || text.toLowerCase().includes("landed") ? "TAMAMLANDI" : text.toLowerCase().includes("rötarlı") || text.toLowerCase().includes("delay") ? "RÖTARLI" : "ZAMANINDA / HAVADA",
        departure: "Detaylar Aşağıda",
        arrival: "Detaylar Aşağıda",
        scheduledArrival: "-",
        actualArrival: "-",
        delay: text.toLowerCase().includes("dakika") || text.toLowerCase().includes("minute") ? "Var" : "Yok",
        gate: "-",
        lastUpdated: new Date().toLocaleTimeString('tr-TR'),
        sources: chunks
      });
      
      // Store full analysis in a global for easy access in the UI
      (window as any).flightDetailsText = text;

    } catch (err: any) {
      console.error("API Error:", err);
      // Rule: Handle "Requested entity was not found" error by prompting key selection again
      if (err.message?.includes("Requested entity was not found") || err.message?.includes("API Key")) {
        setHasKey(false);
        setError("Kanka API anahtarın geçerli değil veya seçilmedi. Lütfen tekrar seç.");
      } else {
        setError("Uçuş bilgileri çekilirken bir hata oluştu kanka. Lütfen tekrar dene.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-brand-gold/30 text-center space-y-8 animate-in zoom-in-95 shadow-2xl">
        <div className="p-10 bg-brand-gold/10 text-brand-gold rounded-full animate-bounce">
          <Key size={72} />
        </div>
        <div className="max-w-md">
          <h3 className="text-3xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.2em] mb-4">API ANAHTARI GEREKLİ</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
            Google Search altyapısını kullanarak canlı uçuş verisi çekebilmek için bir ücretli/faturası açık API anahtarı seçmen gerekiyor kanka.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-indigo-500 font-bold text-[10px] uppercase">
             <HelpCircle size={14} />
             <span>ÜCRETSİZ DENEME HAKKIN OLABİLİR</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={handleSelectKey}
            className="w-full px-10 py-6 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black rounded-3xl uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 group"
          >
            <Key size={24} className="group-hover:rotate-45 transition-transform" /> ANAHTAR SEÇ VE BAĞLAN
          </button>
          
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[10px] text-slate-400 hover:text-brand-gold font-bold underline transition-colors">
            Fatura & Billing Bilgisi İçin Tıkla
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-brand-gold/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/5 blur-[120px] -mr-40 -mt-40 transition-all duration-1000 group-hover:bg-brand-gold/10"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="p-6 bg-brand-navy rounded-[1.8rem] text-white shadow-2xl shadow-brand-navy/20 animate-pulse">
              <Radar size={36} className="text-brand-gold" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.2em]">UÇUŞ TAKİP MERKEZİ</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Canlı VIP Transfer Koordinasyonu</p>
            </div>
          </div>

          <div className="w-full md:w-[450px] relative">
            <input 
              type="text" 
              value={flightNo} 
              onChange={(e) => setFlightNo(e.target.value)}
              placeholder="Örn: TK1752, THY123, DL45..."
              className="w-full pl-8 pr-24 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.8rem] text-xl font-black uppercase tracking-widest focus:ring-8 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all shadow-inner text-slate-800 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && trackFlight()}
            />
            <button 
              onClick={trackFlight}
              disabled={loading || !flightNo}
              className="absolute right-3 top-3 bottom-3 px-8 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-[1.2rem] flex items-center justify-center transition-all active:scale-90 hover:brightness-110 disabled:opacity-50 shadow-lg"
            >
              {loading ? <Loader2 size={28} className="animate-spin" /> : <Search size={28} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-8 bg-red-50 dark:bg-red-900/10 border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 text-red-600 font-black animate-in slide-in-from-top-4">
          <div className="flex items-center gap-4">
             <AlertTriangle size={32} />
             <div className="text-sm">{error}</div>
          </div>
          {error.includes("Anahtar") && (
            <button onClick={handleSelectKey} className="px-8 py-3 bg-red-600 text-white rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/30">ANAHTARI GÜNCELLE</button>
          )}
        </div>
      )}

      {flightData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95 duration-500">
          {/* Main Info Card */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-5">
                   <div className="p-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-500/20">CANLI ANALİZ</div>
                   <div className="text-slate-400 font-bold text-xs">SON VERİ: {flightData.lastUpdated}</div>
                </div>
                <div className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl ${flightData.status === 'RÖTARLI' ? 'bg-red-500 text-white animate-bounce' : 'bg-brand-gold text-brand-navy'}`}>
                  {flightData.status}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-16 items-center">
                 <div className="text-center group">
                    <PlaneTakeoff size={56} className="mx-auto text-slate-200 dark:text-slate-700 mb-6 group-hover:text-indigo-400 transition-colors" />
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">KALKIŞ NOKTASI</h4>
                    <div className="text-2xl font-black text-brand-navy dark:text-white uppercase tracking-tight">ANALİZ EDİLİYOR</div>
                 </div>

                 <div className="relative h-px bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <div className="absolute p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-brand-gold shadow-2xl transform rotate-90 scale-125">
                       <Plane size={28} />
                    </div>
                 </div>

                 <div className="text-center group">
                    <PlaneLanding size={56} className="mx-auto text-brand-gold mb-6 group-hover:scale-110 transition-transform" />
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">VARIŞ NOKTASI</h4>
                    <div className="text-2xl font-black text-brand-navy dark:text-white uppercase tracking-tight">ANALİZ EDİLİYOR</div>
                 </div>
              </div>

              <div className="mt-16 p-10 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 relative group">
                 <div className="absolute -top-4 left-10 px-6 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-full shadow-lg">GEMINI AI RAPORU</div>
                 <div className="text-slate-700 dark:text-slate-300 text-base font-medium leading-relaxed whitespace-pre-wrap italic mt-4">
                    {(window as any).flightDetailsText || "Uçuş detayları analiz ediliyor kanka..."}
                 </div>
              </div>

              {flightData.sources && flightData.sources.length > 0 && (
                <div className="mt-12 pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase w-full tracking-widest mb-2">VERİ KAYNAKLARI:</span>
                  {flightData.sources.map((s, i) => (
                    <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-brand-gold rounded-2xl text-[10px] font-black transition-all border border-slate-100 dark:border-slate-700 hover:scale-105">
                      <ExternalLink size={14} />
                      {s.web.title.substring(0, 35)}...
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - FlightRadar24 Entegrasyonu */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
              <div className="p-8 bg-brand-navy text-white flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <Radar size={24} className="text-brand-gold animate-spin-slow" />
                    <h3 className="text-xs font-black uppercase tracking-widest">RADAR GÖRÜNTÜSÜ</h3>
                 </div>
                 <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 min-h-[500px] relative group">
                <iframe 
                  src={`https://www.flightradar24.com/simple_index.php?lat=41.0138&lon=28.9497&z=8&flight=${flightNo}`} 
                  width="100%" 
                  height="100%" 
                  className="border-none opacity-90 group-hover:opacity-100 transition-opacity"
                  title="FlightRadar24"
                />
                <div className="absolute inset-0 pointer-events-none border-[12px] border-inset border-brand-navy/5"></div>
                
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-slate-900/95 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4">
                   <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase leading-relaxed text-center">
                     Harita verisi FlightRadar24 tarafından canlı sağlanmaktadır kanka.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Landing Placeholder */}
      {!flightData && !loading && (
        <div className="p-24 bg-white dark:bg-slate-900 rounded-[4rem] border-4 border-dashed border-slate-100 dark:border-slate-800 text-center space-y-8 shadow-inner">
           <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-10 border-2 border-slate-100 dark:border-slate-700 shadow-xl group-hover:scale-110 transition-transform">
              <PlaneTakeoff size={64} className="text-slate-300 dark:text-slate-600" />
           </div>
           <h3 className="text-3xl font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">HİÇBİR UÇUŞ TAKİP EDİLMİYOR</h3>
           <p className="max-w-lg mx-auto text-slate-400 dark:text-slate-500 font-bold uppercase text-[11px] tracking-widest leading-relaxed">
             Uçuş numarasını yukarıdaki alana girerek (Örn: TK1752 veya THY123) canlı radar verilerini ve AI analizini saniyeler içinde görebilirsin kanka.
           </p>
           <div className="flex items-center justify-center gap-4 pt-6">
              <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-400 uppercase border border-slate-100 dark:border-slate-700">7/24 RADAR</div>
              <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-400 uppercase border border-slate-100 dark:border-slate-700">AI ANALİZ</div>
              <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800 rounded-full text-[9px] font-black text-slate-400 uppercase border border-slate-100 dark:border-slate-700">GOOGLE SEARCH</div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FlightTracker;
