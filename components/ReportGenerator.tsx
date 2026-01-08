
import React, { useState, useMemo } from 'react';
import { FileText, Download, Settings2, Save, Check, MapPinned, Clock, FileType } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  const [isGenerating, setIsGenerating] = useState(false);

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

  const downloadReport = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const pageBottomLimit = pdfHeight - 25; // Sayfa sonu güvenli bölge (25mm)
    let currentY = margin;

    // Geçici bir container oluştur (Render için)
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.backgroundColor = '#ffffff';
    document.body.appendChild(container);

    const renderElementToPdf = async (html: string) => {
      const el = document.createElement('div');
      el.innerHTML = html;
      el.style.padding = '1px'; // Border-box hesaplamaları için
      container.innerHTML = '';
      container.appendChild(el);

      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const imgDisplayWidth = pdfWidth - (margin * 2);
      const imgDisplayHeight = (imgProps.height * imgDisplayWidth) / imgProps.width;

      // Eğer eklenen parça sayfa sonunu geçiyorsa yeni sayfaya at
      if (currentY + imgDisplayHeight > pageBottomLimit) {
        pdf.addPage();
        currentY = margin;
      }

      pdf.addImage(imgData, 'PNG', margin, currentY, imgDisplayWidth, imgDisplayHeight, undefined, 'FAST');
      currentY += imgDisplayHeight + 5; // Parçalar arası 5mm boşluk
    };

    try {
      // 1. BAŞLIK BÖLÜMÜ
      const headerHtml = `
        <div style="text-align: center; padding: 40px 0; font-family: Arial, sans-serif;">
          <h1 style="color: #0a192f; font-size: 32pt; margin: 0; font-weight: 900; letter-spacing: 3px;">BK TURİZM</h1>
          <div style="height: 3px; background-color: #d4af37; width: 150px; margin: 15px auto;"></div>
          <h2 style="color: #0a192f; font-size: 16pt; margin: 5px 0 10px; font-weight: 700; letter-spacing: 2px;">AYLIK HİZMET RAPORU</h2>
          <p style="color: #64748b; font-size: 11pt; font-weight: bold;">Dönem: ${startDate} — ${endDate}</p>
          <div style="margin-top: 20px; border-bottom: 1px solid #f1f5f9;"></div>
        </div>
      `;
      await renderElementToPdf(headerHtml);

      // 2. İŞ KALEMLERİ (Her biri ayrı parça)
      let grandTotalService = 0, grandTotalFerry = 0, grandTotalYss = 0, grandTotalMarmara = 0, grandTotalOsmangazi = 0, grandTotalParking = 0;

      for (const job of allRelevantJobs) {
        const model = jobConfigs[job.id] || 'ist-pickup';
        const dateFormatted = new Date(job.date).toLocaleDateString('tr-TR');
        let costs = [];
        let subTotal = Number(fixedFees.service);
        
        grandTotalService += Number(fixedFees.service);
        costs.push(`Hizmet: ${fixedFees.service} TL`);
        grandTotalFerry += Number(fixedFees.ferry);
        costs.push(`Gemi: ${fixedFees.ferry} TL`);
        grandTotalOsmangazi += Number(fixedFees.osmangazi);
        costs.push(`Osmangazi: ${fixedFees.osmangazi} TL`);

        if (model === 'ist-pickup' || model === 'ist-dropoff') {
          subTotal += Number(fixedFees.yss) + Number(fixedFees.marmara);
          grandTotalYss += Number(fixedFees.yss);
          grandTotalMarmara += Number(fixedFees.marmara);
          costs.push(`YSS: ${fixedFees.yss} TL`, `K.Marmara: ${fixedFees.marmara} TL`);
        }
        if (model === 'ist-pickup') {
          subTotal += Number(fixedFees.parking);
          grandTotalParking += Number(fixedFees.parking);
          costs.push(`Otopark: ${fixedFees.parking} TL`);
        }

        const jobHtml = `
          <div style="margin-bottom: 10px; border-left: 5px solid #d4af37; padding: 15px; font-family: Arial, sans-serif; background: #ffffff;">
            <div style="font-size: 12pt; font-weight: bold; color: #0a192f;">${dateFormatted} | ${job.time} - ${job.passengerName}</div>
            <div style="font-size: 10pt; color: #334155; margin: 5px 0;">${job.from} <span style="color: #d4af37;">→</span> ${job.to}</div>
            <div style="font-size: 9pt; color: #64748b; border-top: 1px dashed #eee; padding-top: 5px; margin-top: 5px;">
              Döküm: ${costs.join(', ')} | <b style="color: #0a192f;">Toplam: ${subTotal} TL</b>
            </div>
          </div>
        `;
        await renderElementToPdf(jobHtml);
      }

      // 3. ÖZET TABLOSU (KDV Dahil)
      const totalSummary = grandTotalService + grandTotalFerry + grandTotalYss + grandTotalMarmara + grandTotalOsmangazi + grandTotalParking;
      const vatAmount = totalSummary * 0.20;
      const grandTotalWithVat = totalSummary + vatAmount;

      const summaryHtml = `
        <div style="background-color: #f8fafc; border: 2px solid #0a192f; padding: 30px; border-radius: 15px; font-family: Arial, sans-serif; margin-top: 20px;">
          <h3 style="color: #0a192f; border-bottom: 2px solid #d4af37; padding-bottom: 12px; margin-bottom: 20px; font-size: 16pt; font-weight: 800;">GENEL HAKEDİŞ ÖZETİ</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12pt;">
            <tr><td style="padding: 6px 0;">Toplam Hizmet Bedeli</td><td style="text-align: right; font-weight: bold;">${grandTotalService.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td style="padding: 6px 0;">Toplam Gemi Geçiş Ücreti</td><td style="text-align: right; font-weight: bold;">${grandTotalFerry.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td style="padding: 6px 0;">Toplam YSS Köprü Ücreti</td><td style="text-align: right; font-weight: bold;">${grandTotalYss.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td style="padding: 6px 0;">Toplam Kuzey Marmara Ücreti</td><td style="text-align: right; font-weight: bold;">${grandTotalMarmara.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td style="padding: 6px 0;">Toplam Osmangazi Ücreti</td><td style="text-align: right; font-weight: bold;">${grandTotalOsmangazi.toLocaleString('tr-TR')} TL</td></tr>
            <tr><td style="padding: 6px 0; border-bottom: 1px solid #cbd5e1;">Toplam Otopark Ücreti</td><td style="text-align: right; font-weight: bold; border-bottom: 1px solid #cbd5e1;">${grandTotalParking.toLocaleString('tr-TR')} TL</td></tr>
            
            <tr style="color: #334155;">
              <td style="padding: 12px 0 5px; font-weight: 700;">MATRAH (ARA TOPLAM)</td>
              <td style="text-align: right; padding: 12px 0 5px; font-weight: 800;">${totalSummary.toLocaleString('tr-TR')} TL</td>
            </tr>
            <tr style="color: #64748b; font-size: 11pt;">
              <td style="padding: 5px 0;">KDV (%20)</td>
              <td style="text-align: right; padding: 5px 0;">${vatAmount.toLocaleString('tr-TR')} TL</td>
            </tr>
            <tr style="border-top: 3px solid #0a192f;">
              <td style="padding: 20px 0 0; font-weight: 900; font-size: 16pt; color: #0a192f;">GENEL TOPLAM (KDV DAHİL)</td>
              <td style="text-align: right; padding: 20px 0 0; font-weight: 900; font-size: 18pt; color: #d4af37;">${grandTotalWithVat.toLocaleString('tr-TR')} TL</td>
            </tr>
          </table>
          <div style="margin-top: 40px; font-weight: bold; color: #0a192f; font-size: 12pt;">İyi Çalışmalar Dileriz.</div>
        </div>
      `;
      await renderElementToPdf(summaryHtml);

      pdf.save(`BK_Turizm_Raporu_${startDate}_${endDate}.pdf`);
    } catch (error) {
      console.error('PDF error:', error);
      alert('Hata oluştu kanka, konsola bak.');
    } finally {
      document.body.removeChild(container);
      setIsGenerating(false);
    }
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
            disabled={allRelevantJobs.length === 0 || isGenerating}
            onClick={downloadReport}
            className="w-full relative group overflow-hidden bg-brand-navy dark:bg-brand-gold text-white dark:text-brand-navy font-black py-6 rounded-[2rem] shadow-2xl transition-all active:scale-[0.98] uppercase tracking-[0.3em] flex items-center justify-center gap-4 disabled:opacity-30 disabled:grayscale"
          >
            {isGenerating ? (
              <FileType size={22} className="animate-pulse" />
            ) : (
              <Download size={22} />
            )}
            {isGenerating ? 'RAPOR HAZIRLANIYOR...' : 'AYLIK HAKEDİŞ RAPORUNU İNDİR (.PDF)'}
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
