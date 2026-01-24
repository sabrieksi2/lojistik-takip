
import React, { useState, useEffect } from 'react';
// Added 'Clock' to the imports to fix the "Cannot find name 'Clock'" error on line 165.
import { Search, Plane, Loader2, PlaneTakeoff, PlaneLanding, Radar, Map as MapIcon, RefreshCw, ExternalLink, Info, Gauge, Clock } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface ParsedFlightInfo {
  departure: string;
  arrival: string;
  aircraftModel: string;
  estimatedArrival: string;
  status: string;
}

const FlightTracker: React.FC = () => {
  const [flightNo, setFlightNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState<ParsedFlightInfo | null>(null);
  const [radarKey, setRadarKey] = useState(Date.now());
  const [mapSource, setMapSource] = useState<'fr24' | 'radarbox'>('fr24');

  const trackFlight = async () => {
    const cleanFlightNo = flightNo.trim().toUpperCase();
    if (!cleanFlightNo) return;
    
    setLoading(true);
    // Haritayı hemen güncellemek için key'i değiştiriyoruz
    setRadarKey(Date.now());

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `${cleanFlightNo} uçuş numarası için şu bilgileri kısa ve net getir: 
      {
        "departure": "Şehir (Havalimanı Kodu)",
        "arrival": "Şehir (Havalimanı Kodu)",
        "aircraftModel": "Model",
        "estimatedArrival": "Saat",
        "status": "Durum Özeti"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text) as ParsedFlightInfo;
      setFlightDetails(data);
    } catch (err) {
      console.error("Flight info error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMapUrl = () => {
    const cleanNo = flightNo.trim().toUpperCase();
    if (mapSource === 'fr24') {
      return cleanNo 
        ? `https://www.flightradar24.com/simple?flight=${cleanNo}&z=7&label1=flight&label2=aircraft`
        : `https://www.flightradar24.com/simple?lat=41.01&lon=28.97&z=6`;
    } else {
      return cleanNo
        ? `https://www.radarbox.com/widget?flight=${cleanNo}&z=7`
        : `https://www.radarbox.com/widget?lat=41.01&lng=28.97&z=6`;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Search Bar - Sticky on top */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-2xl border border-brand-gold/20 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-gold group-focus-within:scale-110 transition-transform">
            <Radar size={24} className={loading ? "animate-spin" : ""} />
          </div>
          <input 
            type="text" 
            value={flightNo} 
            onChange={(e) => setFlightNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && trackFlight()}
            placeholder="Uçuş No (TK1234, PC456...)"
            className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-xl font-black uppercase tracking-[0.2em] focus:ring-4 focus:ring-brand-gold/10 focus:border-brand-gold outline-none transition-all text-slate-800 dark:text-white"
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={trackFlight}
            disabled={loading || !flightNo}
            className="flex-1 md:flex-none px-10 bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy rounded-2xl font-black text-sm uppercase shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            TAKİP ET
          </button>
          <button 
            onClick={() => { setMapSource(mapSource === 'fr24' ? 'radarbox' : 'fr24'); setRadarKey(Date.now()); }}
            className="p-5 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-brand-gold rounded-2xl transition-colors"
            title="Harita Kaynağını Değiştir"
          >
            <RefreshCw size={24} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Canlı Radar Kartı */}
        <div className="relative w-full h-[65vh] bg-slate-200 dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border-4 border-white dark:border-slate-900">
          <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
            <div className="px-4 py-2 bg-brand-navy/90 backdrop-blur-md text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-white/10 shadow-2xl">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              CANLI RADAR: {mapSource.toUpperCase()}
            </div>
            {flightDetails && (
              <div className="px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-brand-navy dark:text-brand-gold rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border border-brand-gold/20 shadow-xl">
                <Plane size={12} /> {flightNo.toUpperCase()} TAKİBİ AKTİF
              </div>
            )}
          </div>

          <iframe 
            key={`${radarKey}-${mapSource}`}
            src={getMapUrl()} 
            width="100%" 
            height="100%" 
            className="border-none"
            allow="geolocation"
            title="Live Radar"
          />

          {loading && (
            <div className="absolute inset-0 bg-brand-navy/20 backdrop-blur-[2px] flex items-center justify-center z-20">
               <div className="flex flex-col items-center gap-4">
                  <Loader2 size={64} className="text-white animate-spin" />
                  <span className="text-white font-black text-xs tracking-widest animate-pulse">RADAR BAĞLANTISI KURULUYOR...</span>
               </div>
            </div>
          )}
        </div>

        {/* Bilgi Kartları - Sadece uçuş aktifse görünür */}
        {flightDetails && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">KALKIŞ</span>
              <div className="flex items-center gap-2 text-sm font-black text-brand-navy dark:text-white uppercase">
                <PlaneTakeoff size={16} className="text-indigo-500" />
                {flightDetails.departure}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">VARIŞ</span>
              <div className="flex items-center gap-2 text-sm font-black text-brand-navy dark:text-white uppercase">
                <PlaneLanding size={16} className="text-emerald-500" />
                {flightDetails.arrival}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-black text-slate-400 uppercase mb-1">UÇAK / TİP</span>
              <div className="text-sm font-black text-brand-gold uppercase truncate">
                {flightDetails.aircraftModel}
              </div>
            </div>
            <div className="bg-brand-navy p-5 rounded-3xl shadow-xl flex flex-col justify-center">
              <span className="text-[10px] font-black text-brand-gold/60 uppercase mb-1">TAHMİNİ İNİŞ</span>
              <div className="text-lg font-black text-white flex items-center gap-2">
                <Clock size={18} className="text-brand-gold" />
                {flightDetails.estimatedArrival}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center p-4">
        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest text-center">
          <Info size={14} className="text-brand-gold" />
          Radar verileri gecikmeli olabilir. Kesin bilgi için operasyon merkezini takip ediniz kanka.
        </p>
      </div>
    </div>
  );
};

export default FlightTracker;
