
import React, { useState, useMemo, useEffect } from 'react';
import { FileText, Calendar, Download, Building2, User, Clock, MapPin, CheckCircle2, Settings2, Save, Check, MapPinned } from 'lucide-react';
import { ScheduledJob } from '../types';

interface ReportGeneratorProps {
  scheduledJobs: ScheduledJob[];
  finishedJobs: ScheduledJob[];
}

type WorkModel = 'ist-pickup' | 'ist-dropoff' | 'saw';

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ scheduledJobs, finishedJobs }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobConfigs, setJobConfigs] = useState<Record<string, WorkModel>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Sabit gider kalemleri - LocalStorage desteği eklendi
  const [fixedFees, setFixedFees] = useState(() => {
    const saved = localStorage.getItem('bk_report_fees');
    return saved ? JSON.parse(saved) : {
      service: 0,
      ferry: 0,
      yss: 0,
      marmara: 0,
      osmangazi: 0,
      parking: 0
    };
  });

  const saveFees = () => {
    localStorage.setItem('bk_report_fees', JSON.stringify(fixedFees));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const allRelevantJobs = useMemo(() => {
    const combined = [...scheduledJobs, ...finishedJobs];
    return combined.filter(job => {
      const jobDate = job.date;
      return jobDate >= startDate && jobDate <= endDate;
    }).sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  }, [scheduledJobs, finishedJobs, startDate, endDate]);

  const handleModelChange = (jobId: string, model: WorkModel) => {
    setJobConfigs(prev => ({ ...prev, [jobId]: model }));
  };

  const downloadReport = () => {
    let grandTotalService = 0;
    let grandTotalFerry = 0;
    let grandTotalYss = 0;
    let grandTotalMarmara = 0;
    let grandTotalOsmangazi = 0;
    let grandTotalParking = 0;

    let reportItemsHtml = '';

    allRelevantJobs.forEach(job => {
      const model = jobConfigs[job.id] || 'ist-pickup';
      const dateFormatted = new Date(job.date).toLocaleDateString('tr-TR');
      
      let jobCosts = [];
      let jobTotal = Number(fixedFees.service);
      
      // Her zaman eklenen kalemler
      grandTotalService += Number(fixedFees.service);
      jobCosts.push(`Hizmet Bedeli: ${fixedFees.service} TL`);

      // Gemi ve Osmangazi her zaman var
      jobTotal += Number(fixedFees.ferry);
      grandTotalFerry += Number(fixedFees.ferry);
      jobCosts.push(`Gemi: ${fixedFees.ferry} TL`);

      // Osmangazi her zaman var
      jobTotal += Number(fixedFees.osmangazi);
      grandTotalOsmangazi += Number(fixedFees.osmangazi);
      jobCosts.push(`Osmangazi Köprüsü: ${fixedFees.osmangazi} TL`);

      // Model 1 ve 2 için YSS ve Marmara
      if (model === 'ist-pickup' || model === 'ist-dropoff') {
        jobTotal += Number(fixedFees.yss);
        grandTotalYss += Number(fixedFees.yss);
        jobCosts.push(`YSS Köprüsü: ${fixedFees.yss} TL`);

        jobTotal += Number(fixedFees.marmara);
        grandTotalMarmara += Number(fixedFees.marmara);
        jobCosts.push(`Kuzey Marmara Yolu: ${fixedFees.marmara} TL`);
      }

      // Sadece Model 1 (Pickup) için Otopark
      if (model === 'ist-pickup') {
        jobTotal += Number(fixedFees.parking);
        grandTotalParking += Number(fixedFees.parking);
        jobCosts.push(`Otopark: ${fixedFees.parking} TL`);
      }

      reportItemsHtml += `
        <div class='item' style='margin-bottom: 18px; font-size: 10.5pt; line-height: 1.5; padding-left: 10px; border-left: 3px solid #d4af37;'>
          - Saat <b>${job.time}</b> 'de (<b>${job.passengerName}</b>) belirttiğiniz <b>${job.from}</b> lokasyonundan <b>${job.to}</b> lokasyonuna <b>${dateFormatted}</b> tarihinde ulaşımı sağlanmıştır.
          <div class='item-details' style='font-size: 9pt; color: #666; margin-top: 4px;'>
            Döküm: ${jobCosts.join(', ')} | <b>Alt Toplam: ${jobTotal} TL</b>
          </div>
        </div>
      `;
    });

    const totalSummary = grandTotalService + grandTotalFerry + grandTotalYss + grandTotalMarmara + grandTotalOsmangazi + grandTotalParking;

    let reportContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Aylık Hizmet Raporu</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
        .header { text-align: center; color: #0a192f; font-size: 24pt; font-weight: bold; margin-bottom: 5px; }
        .sub-header { text-align: center; color: #d4af37; font-size: 14pt; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 2px; }
        .period { text-align: center; font-size: 11pt; margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
        .summary-box { margin-top: 50px; padding: 25px; border: 1pt solid #0a192f; background-color: #fafafa; }
        .summary-title { font-size: 13pt; font-weight: bold; border-bottom: 1px solid #d4af37; margin-bottom: 15px; padding-bottom: 8px; color: #0a192f; }
        .table { width: 100%; border-collapse: collapse; }
        .table td { padding: 6px 0; font-size: 10pt; }
        .grand-total-row { border-top: 2px solid #0a192f; margin-top: 10px; padding-top: 10px; font-size: 14pt; font-weight: bold; color: #0a192f; }
        .footer { margin-top: 60px; font-size: 12pt; font-weight: bold; color: #0a192f; }
      </style>
      </head>
      <body>
        <div class='header'>BK TURİZM</div>
        <div class='sub-header'>AYLIK HİZMET RAPORU</div>
        <div class='period'>Rapor Dönemi: ${startDate} — ${endDate}</div>
        
        ${reportItemsHtml}

        <div class='summary-box'>
          <div class='summary-title'>GENEL HAKEDİŞ ÖZETİ</div>
          <table class='table'>
            <tr><td>Toplam Hizmet Bedeli</td><td align='right'>${grandTotalService.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td>Toplam Gemi Geçiş Ücreti</td><td align='right'>${grandTotalFerry.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td>Toplam YSS Köprü Ücreti</td><td align='right'>${grandTotalYss.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td>Toplam Kuzey Marmara Yolu Ücreti</td><td align='right'>${grandTotalMarmara.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td>Toplam Osmangazi Köprü Ücreti</td><td align='right'>${grandTotalOsmangazi.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td>Toplam Otopark Ücreti</td><td align='right'>${grandTotalParking.toLocaleString('tr-TR')} TL</td></tr>
            <tr class='grand-total-row'>
              <td>GENEL TOPLAM HAKEDİŞ</td>
              <td align='right'>${totalSummary.toLocaleString('tr-TR')} TL</td>
            </tr>
          </table>
        </div>

        <div class='footer'>İyi Çalışmalar Dileriz.</div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', reportContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BK_Turizm_Hizmet_Raporu_${startDate}_${endDate}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl border border-brand-gold/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-brand-navy dark:bg-brand-gold rounded-2xl text-white dark:text-brand-navy shadow-xl">
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.2em]">AYLIK HİZMET RAPORU</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Kurumsal hakediş dökümü oluşturma</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Başlangıç</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-gold outline-none" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Bitiş</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-brand-gold outline-none" />
            </div>
          </div>
        </div>

        <div className="mb-10 p-6 bg-brand-navy/[0.03] dark:bg-brand-gold/[0.03] rounded-3xl border border-brand-gold/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-sm font-black text-brand-navy dark:text-brand-gold flex items-center gap-2 uppercase tracking-widest">
              <Settings2 size={18} /> Gider ve Hakediş Parametreleri (Birim Ücretler)
            </h3>
            <button 
              onClick={saveFees}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-widest shadow-lg ${isSaved ? 'bg-emerald-500 text-white' : 'bg-brand-gold text-brand-navy hover:scale-105 active:scale-95'}`}
            >
              {isSaved ? <Check size={16} /> : <Save size={16} />}
              {isSaved ? 'KAYDEDİLDİ' : 'Birim Ücretleri Kaydet'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { id: 'service', label: 'HİZMET BEDELİ' },
              { id: 'ferry', label: 'GEMİ ÜCRETİ' },
              { id: 'yss', label: 'YAVUZ S.S' },
              { id: 'marmara', label: 'K. MARMARA' },
              { id: 'osmangazi', label: 'OSMANGAZİ' },
              { id: 'parking', label: 'OTOPARK' }
            ].map((fee) => (
              <div key={fee.id} className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase block ml-1">{fee.label}</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={fixedFees[fee.id as keyof typeof fixedFees]} 
                    onChange={e => setFixedFees(prev => ({...prev, [fee.id]: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-brand-navy dark:text-brand-gold outline-none focus:ring-2 focus:ring-brand-gold/50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-30">₺</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-slate-400 font-bold mt-4 uppercase tracking-tighter">* Bu ücretler rapor oluşturulurken seçtiğiniz çalışma modeline göre otomatik toplanır.</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                RAPORLANACAK İŞLER ({allRelevantJobs.length})
            </h3>
            <span className="text-[10px] font-black text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full uppercase">Model Belirleyin</span>
          </div>
          
          {allRelevantJobs.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-300 font-black italic tracking-widest uppercase">TARİH ARALIĞINDA İŞ BULUNAMADI</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-inner">
              {allRelevantJobs.map(job => (
                <div key={job.id} className="p-5 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-5 flex-1">
                    <div className="bg-brand-navy/5 dark:bg-brand-gold/10 p-3 rounded-2xl text-brand-navy dark:text-brand-gold">
                       <Clock size={20} />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-slate-100 text-lg leading-none">{job.passengerName}</div>
                      <div className="flex items-center gap-2 mt-1.5 mb-2">
                        <span className="text-[10px] font-black text-brand-gold uppercase">{job.company}</span>
                        <span className="text-[10px] font-bold text-slate-400">• {job.date} | {job.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400">
                        <MapPinned size={14} className="text-brand-gold/70" />
                        <span className="uppercase tracking-tighter">{job.from}</span>
                        <span className="text-brand-gold">→</span>
                        <span className="uppercase tracking-tighter">{job.to}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full md:w-80">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Çalışma Modeli Tanımla</span>
                    <select 
                      value={jobConfigs[job.id] || 'ist-pickup'} 
                      onChange={(e) => handleModelChange(job.id, e.target.value as WorkModel)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-brand-gold/20 rounded-xl text-xs font-black text-brand-navy dark:text-brand-gold focus:border-brand-gold outline-none transition-all cursor-pointer shadow-sm"
                    >
                      <option value="ist-pickup">1 - İST Havalimanı Alış (Tüm Giderler Dahil)</option>
                      <option value="ist-dropoff">2 - İST Havalimanı Bırakış (Otopark Hariç)</option>
                      <option value="saw">3 - Sabiha Gökçen (Hizmet+Gemi+Osmangazi)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <button 
            disabled={allRelevantJobs.length === 0}
            onClick={downloadReport}
            className="w-full relative group overflow-hidden bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black py-6 rounded-[2rem] shadow-2xl transition-all active:scale-[0.98] uppercase tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-30 disabled:grayscale"
          >
            <Download size={22} />
            AYLIK HAKEDİŞ RAPORUNU İNDİR (.DOC)
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
