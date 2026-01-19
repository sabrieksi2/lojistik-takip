
import React, { useState } from 'react';
import { Search, Plane, Loader2, PlaneTakeoff, PlaneLanding, Radar, Info, Clock, MapPin, Gauge, AlertCircle, Calendar } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface ParsedFlightInfo {
  departure: string;
  arrival: string;
  aircraftModel: string;
  scheduledArrival: string;
  estimatedArrival: string;
  delayInfo: string;
  logisticsNote: string;
}

const FlightTracker: React.FC = () => {
  const [flightNo, setFlightNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState<ParsedFlightInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [radarKey, setRadarKey] = useState(0); // Iframe'i yenilemek için

  const trackFlight = async () => {
    if (!flightNo) return;
    
    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `Uçuş numarasını analiz et: ${flightNo}. 
      Lütfen şu bilgileri içeren bir JSON objesi döndür: 
      - departure (Kalkış havalimanı ve şehir)
      - arrival (Varış havalimanı ve şehir)
      - aircraftModel (Uçağın modeli örn: Boeing 737-800)
      - scheduledArrival (Planlanan iniş saati)
      - estimatedArrival (Tahmini veya gerçekleşen iniş saati)
      - delayInfo (Varsa rötar süresi ve nedeni, yoksa 'Rötar Yok' yaz)
      - logisticsNote (Bu uçuşun lojistik operasyonu için kısa bir teknik not)
      Dil Türkçe olsun.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              departure: { type: Type.STRING },
              arrival: { type: Type.STRING },
              aircraftModel: { type: Type.STRING },
              scheduledArrival: { type: Type.STRING },
              estimatedArrival: { type: Type.STRING },
              delayInfo: { type: Type.STRING },
              logisticsNote: { type: Type.STRING },
            },
            required: ["departure", "arrival", "aircraftModel", "scheduledArrival", "estimatedArrival", "delayInfo", "logisticsNote"]
          }
        }
      });

      const data = JSON.parse(response.text) as ParsedFlightInfo;
      setFlightDetails(data);
      setRadarKey(prev => prev + 1); // Haritayı uçağa odaklar

    } catch (err: any) {
      console.error("API Error:", err);
      setError("AI Analizi şu an yapılamıyor ama radar üzerinden manuel takip edebilirsin kanka.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-brand-navy rounded-2xl text-white shadow-xl shadow-brand-navy/20">
              <Radar size={32} className="text-brand-gold animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-widest">LOJİSTİK UÇUŞ KOMUTA</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Havalimanı Transfer & VIP Koordinasyon</p>
            </div>
          </div>

          <div className="w-full md:w-[450px] relative">
            <input 
              type="text" 
              value={flightNo} 
              onChange={(e) => setFlightNo(e.target.value)}
              placeholder="Uçuş No Girin (Örn: TK1752)"
              className="w-full pl-6 pr-24 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-lg font-black uppercase tracking-widest focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all shadow-inner text-slate-800 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && trackFlight()}
            />
            <button 
              onClick={trackFlight}
              disabled={loading || !flightNo}
              className="absolute right-2 top-2 bottom-2 px-8 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-xl font-black text-sm uppercase flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-lg"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : "SORGULA"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-5 bg-amber-50 dark:bg-amber-900/10 border-2 border-dashed border-amber-200 dark:border-amber-900/30 rounded-3xl flex items-center gap-4 text-amber-700 dark:text-amber-400 font-bold text-xs animate-in slide-in-from-top-2">
          <AlertCircle size={24} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Radar Panel */}
        <div className="lg:col-span-8 h-[650px] bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden relative group">
          <div className="absolute top-6 left-6 right-6 p-4 bg-brand-navy/80 backdrop-blur-xl text-white z-10 flex items-center justify-between rounded-2xl border border-white/10 shadow-2xl">
             <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">CANLI RADAR YAYINI</span>
             </div>
             {flightNo && <span className="text-[10px] font-black bg-brand-gold text-brand-navy px-4 py-1.5 rounded-full shadow-lg">{flightNo.toUpperCase()} TAKİBİ</span>}
          </div>
          
          <iframe 
            key={radarKey}
            src={flightNo 
              ? `https://www.flightradar24.com/simple_index.php?flight=${flightNo}&z=8` 
              : `https://www.flightradar24.com/simple_index.php?lat=41.01&lon=28.97&z=6`
            } 
            width="100%" 
            height="100%" 
            className="border-none grayscale-[0.1] contrast-[1.05]"
            title="Live Flight Radar"
          />
        </div>

        {/* Technical Analysis Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 h-full flex flex-col">
            <h3 className="text-xs font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <Gauge size={20} className="text-indigo-500" /> TEKNİK ANALİZ RAPORU
            </h3>
            
            {flightDetails ? (
              <div className="space-y-5 animate-in zoom-in-95 duration-500">
                {/* Havalimanı Bilgileri */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase mb-2">
                      <PlaneTakeoff size={14} className="text-indigo-500" /> Kalkış
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-white uppercase">{flightDetails.departure}</div>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase mb-2">
                      <PlaneLanding size={14} className="text-emerald-500" /> Varış
                    </div>
                    <div className="text-sm font-black text-slate-800 dark:text-white uppercase">{flightDetails.arrival}</div>
                  </div>
                </div>

                {/* Zamanlama ve Rötar */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase mb-2">
                      <Calendar size={14} /> Planlanan
                    </div>
                    <div className="text-xs font-black text-brand-navy dark:text-brand-gold">{flightDetails.scheduledArrival}</div>
                  </div>
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase mb-2">
                      <Clock size={14} /> Tahmini
                    </div>
                    <div className="text-xs font-black text-brand-navy dark:text-brand-gold">{flightDetails.estimatedArrival}</div>
                  </div>
                </div>

                {/* Uçak Tipi ve Rötar Durumu */}
                <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20">
                  <div className="text-[10px] font-black text-indigo-500 uppercase mb-2">Uçak Modeli</div>
                  <div className="text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase">{flightDetails.aircraftModel}</div>
                </div>

                <div className={`p-5 rounded-2xl border ${flightDetails.delayInfo.toLowerCase().includes('yok') ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100' : 'bg-red-50 dark:bg-red-900/10 border-red-100 animate-pulse'}`}>
                  <div className={`text-[10px] font-black uppercase mb-2 ${flightDetails.delayInfo.toLowerCase().includes('yok') ? 'text-emerald-500' : 'text-red-500'}`}>Rötar Durumu</div>
                  <div className={`text-xs font-black ${flightDetails.delayInfo.toLowerCase().includes('yok') ? 'text-emerald-700' : 'text-red-700'}`}>{flightDetails.delayInfo}</div>
                </div>

                {/* Lojistik Notu */}
                <div className="p-6 bg-slate-900 dark:bg-brand-navy rounded-3xl text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Info size={48} />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] block mb-3">Lojistik Operasyon Notu</span>
                    <p className="text-[11px] leading-relaxed font-medium italic opacity-90">{flightDetails.logisticsNote}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Plane size={48} className="text-slate-400" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Uçuş Verisi Bekleniyor...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightTracker;
