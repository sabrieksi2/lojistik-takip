
import React, { useState } from 'react';
import { Search, Plane, MapPin, Clock, Calendar, Info, Loader2, PlaneTakeoff, PlaneLanding, Radar, ExternalLink, AlertTriangle, ShieldCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { FlightInfo } from '../types';

const FlightTracker: React.FC = () => {
  const [flightNo, setFlightNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightData, setFlightData] = useState<FlightInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trackFlight = async () => {
    if (!flightNo) return;
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Lütfen şu uçuş numarasına ait CANLI uçuş bilgilerini getir: ${flightNo}. 
      Hangi şehirden kalkıyor, nereye iniyor, planlanan iniş saati, gerçek/beklenen iniş saati, rötar süresi, kapı numarası ve şu anki durumu (havada, indi, rötar vb.) hakkında net bilgi ver. 
      Lütfen BK Lojistik VIP Transfer operasyonu için kullanılacağını unutma, bilgiler çok net olmalı.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "Bilgi alınamadı.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      
      // Basit bir parser simülasyonu (Text'ten bilgi ayıklama)
      // Normalde daha gelişmiş bir parsing gerekir ama burada UI için metni de gösteriyoruz
      setFlightData({
        flightNumber: flightNo.toUpperCase(),
        status: text.includes("indi") || text.includes("landed") ? "TAMAMLANDI" : text.includes("rötarlı") || text.includes("delay") ? "RÖTARLI" : "HAVADA / ZAMANINDA",
        departure: "Detaylar Aşağıda",
        arrival: "Detaylar Aşağıda",
        scheduledArrival: "-",
        actualArrival: "-",
        delay: text.includes("dakika") ? "Var" : "Yok",
        gate: "-",
        lastUpdated: new Date().toLocaleTimeString('tr-TR'),
        sources: chunks
      });
      
      // Asıl ham metni detay olarak bir state'e alabiliriz
      (window as any).flightDetailsText = text;

    } catch (err) {
      console.error(err);
      setError("Uçuş bilgileri çekilirken bir hata oluştu kanka. Lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-brand-gold/20 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 blur-[100px] -mr-32 -mt-32 transition-all duration-1000 group-hover:bg-brand-gold/10"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-brand-navy rounded-[1.5rem] text-white shadow-2xl shadow-brand-navy/20 animate-pulse">
              <Radar size={32} className="text-brand-gold" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.2em]">UÇUŞ TAKİP MERKEZİ</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Canlı VIP Transfer Koordinasyonu</p>
            </div>
          </div>

          <div className="w-full md:w-96 relative">
            <input 
              type="text" 
              value={flightNo} 
              onChange={(e) => setFlightNo(e.target.value)}
              placeholder="Örn: TK1874 veya THY123"
              className="w-full pl-6 pr-20 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[1.5rem] text-lg font-black uppercase tracking-widest focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all shadow-inner"
              onKeyDown={(e) => e.key === 'Enter' && trackFlight()}
            />
            <button 
              onClick={trackFlight}
              disabled={loading || !flightNo}
              className="absolute right-2 top-2 bottom-2 px-6 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-2xl flex items-center justify-center transition-all active:scale-90 hover:brightness-110 disabled:opacity-50"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <Search size={24} />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-6 bg-red-50 dark:bg-red-900/10 border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-3xl flex items-center gap-4 text-red-600 font-black animate-in slide-in-from-top-4">
          <AlertTriangle size={24} />
          {error}
        </div>
      )}

      {flightData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95 duration-500">
          {/* Main Info Card */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-xl font-black text-xs">CANLI VERİ</div>
                   <div className="text-slate-400 font-bold text-xs">SON GÜNCELLEME: {flightData.lastUpdated}</div>
                </div>
                <div className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest ${flightData.status === 'RÖTARLI' ? 'bg-red-500 text-white animate-bounce' : 'bg-brand-gold text-brand-navy'}`}>
                  {flightData.status}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
                 <div className="text-center">
                    <PlaneTakeoff size={40} className="mx-auto text-slate-300 mb-4" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">KALKIŞ</h4>
                    <div className="text-2xl font-black text-brand-navy dark:text-white uppercase">YÜKLENİYOR...</div>
                 </div>

                 <div className="relative h-px bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <div className="absolute p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full text-brand-gold shadow-lg transform rotate-90">
                       <Plane size={24} />
                    </div>
                 </div>

                 <div className="text-center">
                    <PlaneLanding size={40} className="mx-auto text-brand-gold mb-4" />
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">VARIŞ</h4>
                    <div className="text-2xl font-black text-brand-navy dark:text-white uppercase">YÜKLENİYOR...</div>
                 </div>
              </div>

              <div className="mt-12 p-8 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                 <h5 className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ShieldCheck size={16}/> GEMINI AI ANALİZ RAPORU
                 </h5>
                 <div className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-relaxed whitespace-pre-wrap italic">
                    {(window as any).flightDetailsText || "Uçuş analizi yapılıyor..."}
                 </div>
              </div>

              {flightData.sources && flightData.sources.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase w-full">KAYNAKLAR:</span>
                  {flightData.sources.map((s, i) => (
                    <a key={i} href={s.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-brand-gold rounded-xl text-[10px] font-black transition-colors border border-slate-100 dark:border-slate-700">
                      <ExternalLink size={12} />
                      {s.web.title.substring(0, 30)}...
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - FlightRadar24 Entegrasyonu */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col">
              <div className="p-6 bg-brand-navy text-white flex items-center gap-3">
                 <Radar size={20} className="text-brand-gold" />
                 <h3 className="text-xs font-black uppercase tracking-widest">RADAR GÖRÜNTÜSÜ</h3>
              </div>
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 min-h-[400px] relative group">
                <iframe 
                  src={`https://www.flightradar24.com/simple_index.php?lat=41.0138&lon=28.9497&z=8&flight=${flightNo}`} 
                  width="100%" 
                  height="100%" 
                  className="border-none opacity-80 group-hover:opacity-100 transition-opacity"
                  title="FlightRadar24"
                />
                <div className="absolute inset-0 pointer-events-none border-4 border-inset border-brand-navy/10"></div>
                
                {/* Overlay for interaction info */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md">
                   <p className="text-[10px] font-black text-slate-500 uppercase leading-tight">
                     FlightRadar24 canlı verisidir kanka. Eğer uçuş koduyla veri gelmezse manuel arama yapabilirsin.
                   </p>
                </div>
              </div>
              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                 <button className="w-full py-4 bg-brand-gold text-brand-navy font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Plane size={16} /> HARİTAYI GENİŞLET
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Landing Placeholder */}
      {!flightData && !loading && (
        <div className="p-20 bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800 text-center space-y-6">
           <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-10 border border-slate-100 dark:border-slate-700">
              <PlaneTakeoff size={48} className="text-slate-300" />
           </div>
           <h3 className="text-2xl font-black text-slate-300 uppercase tracking-widest">TAKİP EDİLECEK UÇUŞ YOK</h3>
           <p className="max-w-md mx-auto text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
             Yukarıya uçuş numarasını girerek (Örn: TK1874) canlı verileri çekmeye başlayabilirsin kanka. İniş saati ve rötar anlık olarak kontrol edilir.
           </p>
        </div>
      )}
    </div>
  );
};

export default FlightTracker;
