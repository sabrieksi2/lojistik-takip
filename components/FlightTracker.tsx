
import React, { useState } from 'react';
import { Search, Plane, Loader2, PlaneTakeoff, PlaneLanding, Radar, ExternalLink, Info, Gauge, Clock, MessageSquare, AlertCircle, Crosshair, Navigation, Wifi, Globe, Map as MapIcon, Share2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface FlightDetails {
  flightNo: string;
  status: string;
  departure: { city: string; code: string; time: string };
  arrival: { city: string; code: string; time: string };
  aircraft: string;
  livePosition: string;
  delayStatus: string;
  logisticsNote: string;
  sources: { title: string; uri: string }[];
}

const FlightTracker: React.FC = () => {
  const [flightNo, setFlightNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<FlightDetails | null>(null);

  const searchFlight = async () => {
    const cleanNo = flightNo.trim().toUpperCase();
    if (!cleanNo) return;
    
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `${cleanNo} uçuş numaralı uçağın şu anki canlı durumunu, rotasını, hızını, yüksekliğini ve iniş yapacağı havalimanındaki gate (kapı) bilgisini araştır. 
      Ayrıca lojistik işi yapan biri için inişten sonraki süreci (tahmini boşaltma/çıkış süresi) yorumla. 
      JSON formatında cevap ver:
      {
        "flightNo": "...",
        "status": "Havada/İndi/Rötarlı vb.",
        "departure": { "city": "...", "code": "...", "time": "..." },
        "arrival": { "city": "...", "code": "...", "time": "..." },
        "aircraft": "Uçak Tipi",
        "livePosition": "Şu an nerenin üzerinde olduğu bilgisi",
        "delayStatus": "Rötar var mı yok mu?",
        "logisticsNote": "Lojistikçi için operasyonel not"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text);
      // Grounding verilerini (kaynakları) ekleyelim
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Kaynak',
        uri: chunk.web?.uri || '#'
      })) || [];

      setDetails({ ...data, sources });
    } catch (err) {
      console.error("Flight search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getExternalLink = (platform: 'fr24' | 'flightaware' | 'adsb') => {
    const no = flightNo.trim().toLowerCase();
    if (platform === 'fr24') return `https://www.flightradar24.com/flight/${no}`;
    if (platform === 'flightaware') return `https://flightaware.com/live/flight/${no}`;
    return `https://globe.adsbexchange.com/?callsign=${no}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto pb-12">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-brand-gold/20">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-gold">
              <Radar size={28} className={loading ? "animate-spin" : ""} />
            </div>
            <input 
              type="text" 
              value={flightNo} 
              onChange={(e) => setFlightNo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchFlight()}
              placeholder="Uçuş No (Örn: TK1821, PC2130...)"
              className="w-full pl-16 pr-6 py-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-[1.8rem] text-2xl font-black uppercase tracking-[0.2em] focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all text-brand-navy dark:text-white"
            />
          </div>
          <button 
            onClick={searchFlight}
            disabled={loading || !flightNo}
            className="w-full md:w-auto px-12 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-[1.8rem] py-6 font-black text-sm uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            SORGULA
          </button>
        </div>
      </div>

      {details ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* Left: Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <Plane size={150} />
              </div>
              
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-4xl font-black text-brand-navy dark:text-brand-gold tracking-tighter">{details.flightNo}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-[10px] font-black uppercase rounded-full tracking-widest">
                      {details.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">• {details.aircraft}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">RÖTAR DURUMU</span>
                  <div className="text-sm font-black text-red-500">{details.delayStatus}</div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8 py-8 border-y border-slate-100 dark:border-slate-800">
                <div className="text-center md:text-left flex-1">
                  <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">{details.departure.code}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">{details.departure.city}</div>
                  <div className="text-[10px] font-black text-brand-gold mt-2 uppercase">KALKIŞ: {details.departure.time}</div>
                </div>
                
                <div className="flex flex-col items-center gap-2 px-4">
                  <div className="w-16 h-[2px] bg-slate-200 dark:bg-slate-700 relative">
                    <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-gold" size={16} />
                  </div>
                </div>

                <div className="text-center md:text-right flex-1">
                  <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">{details.arrival.code}</div>
                  <div className="text-xs font-bold text-slate-500 uppercase">{details.arrival.city}</div>
                  <div className="text-[10px] font-black text-brand-gold mt-2 uppercase">VARİŞ: {details.arrival.time}</div>
                </div>
              </div>

              <div className="mt-8 flex items-start gap-4 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <Navigation className="text-brand-gold flex-shrink-0" size={24} />
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GÜNCEL KONUM</span>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                    {details.livePosition}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Link Buttons (The fix for broken maps) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={() => window.open(getExternalLink('fr24'), '_blank')} className="flex items-center justify-between p-6 bg-brand-navy text-white rounded-[2rem] hover:scale-105 transition-all shadow-lg group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-brand-gold transition-colors"><MapIcon size={20} className="group-hover:text-brand-navy" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">FLIGHTRADAR24</span>
                </div>
                <ExternalLink size={14} className="opacity-40" />
              </button>
              <button onClick={() => window.open(getExternalLink('flightaware'), '_blank')} className="flex items-center justify-between p-6 bg-indigo-600 text-white rounded-[2rem] hover:scale-105 transition-all shadow-lg group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white transition-colors"><Wifi size={20} className="group-hover:text-indigo-600" /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">FLIGHTAWARE</span>
                </div>
                <ExternalLink size={14} className="opacity-40" />
              </button>
              <button onClick={() => window.open(getExternalLink('adsb'), '_blank')} className="flex items-center justify-between p-6 bg-slate-800 text-white rounded-[2rem] hover:scale-105 transition-all shadow-lg group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-xl group-hover:bg-emerald-500 transition-colors"><Globe size={20} /></div>
                  <span className="text-[10px] font-black uppercase tracking-widest">ADS-B (SANSÜRSÜZ)</span>
                </div>
                <ExternalLink size={14} className="opacity-40" />
              </button>
            </div>
          </div>

          {/* Right Side: Logistics & Grounding */}
          <div className="space-y-6">
            <div className="bg-brand-navy p-8 rounded-[3rem] shadow-2xl border border-brand-gold/30">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="text-brand-gold" size={24} />
                <span className="text-xs font-black text-brand-gold uppercase tracking-[0.2em]">LOJİSTİK ANALİZ</span>
              </div>
              <p className="text-sm font-bold text-slate-300 leading-relaxed italic border-l-4 border-brand-gold pl-4">
                "{details.logisticsNote}"
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">DOĞRULANMIŞ KAYNAKLAR</span>
              <div className="space-y-3">
                {details.sources.map((src, i) => (
                  <a key={i} href={src.uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-brand-gold/10 transition-colors group">
                    <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-700 text-brand-gold">
                      {i + 1}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate flex-1 group-hover:text-brand-gold">{src.title}</span>
                    <ExternalLink size={12} className="text-slate-300" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
           <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-full mb-6">
              <Plane size={60} className="text-slate-300" />
           </div>
           <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Sorgulama Bekleniyor</h3>
           <p className="text-xs text-slate-400 mt-2 font-bold max-w-xs">
             Kanka uçuş numarasını yaz, AI senin için tüm web'i tarasın ve uçağın gerçek yerini bulsun.
           </p>
        </div>
      )}

      <div className="text-center pt-8 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
          <Info size={14} className="text-brand-gold" />
          Ücretsiz haritalar kısıtlı olduğu için Google Search ve AI tabanlı canlı sorgulama sistemi aktiftir.
        </p>
      </div>
    </div>
  );
};

export default FlightTracker;
