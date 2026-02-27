
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  Zap, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Sparkles,
  Award
} from 'lucide-react';
import { Job } from '../types';

interface FocusViewProps {
  jobs: Job[];
}

const FocusView: React.FC<FocusViewProps> = ({ jobs }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday

    const days = [];
    // Adjust for Monday start (Turkish style)
    const padding = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    for (let i = 0; i < padding; i++) {
      days.push(null);
    }

    const monthJobs = jobs.filter(j => {
      const d = new Date(j.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    let totalRevenue = 0;
    const workedDaysSet = new Set<number>();

    for (let d = 1; d <= daysInMonth; d++) {
      const dayJobs = monthJobs.filter(j => new Date(j.date).getDate() === d);
      const dailyRev = dayJobs.reduce((acc, j) => acc + j.amount, 0);
      totalRevenue += dailyRev;
      
      if (dayJobs.length > 0) {
        workedDaysSet.add(d);
      }

      days.push({
        day: d,
        revenue: dailyRev,
        hasJobs: dayJobs.length > 0
      });
    }

    const daysWorked = workedDaysSet.size;
    const averagePerWorkedDay = daysWorked > 0 ? totalRevenue / daysWorked : 0;
    const projection = averagePerWorkedDay * daysInMonth;

    return {
      days,
      totalRevenue,
      daysWorked,
      daysInMonth,
      averagePerWorkedDay,
      projection,
      monthName: currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' }).toUpperCase()
    };
  }, [currentDate, jobs]);

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-brand-navy p-8 rounded-[2.5rem] shadow-2xl border border-brand-gold/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <Zap size={80} className="text-brand-gold" />
          </div>
          <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] block mb-2">GÜNLÜK VERİMLİLİK</span>
          <div className="text-4xl font-black text-white mb-2">{Math.round(monthData.averagePerWorkedDay).toLocaleString('tr-TR')} ₺</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Çalışılan gün başına ortalama kazanç</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <TrendingUp size={80} className="text-emerald-500" />
          </div>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] block mb-2">POTANSİYEL ODAK</span>
          <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">{Math.round(monthData.projection).toLocaleString('tr-TR')} ₺</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ay boyu her gün çalışsaydın tahmini ciro</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
            <Target size={80} className="text-brand-navy dark:text-brand-gold" />
          </div>
          <span className="text-[10px] font-black text-brand-navy dark:text-brand-gold uppercase tracking-[0.2em] block mb-2">AYLIK DURUM</span>
          <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">{monthData.totalRevenue.toLocaleString('tr-TR')} ₺</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{monthData.daysWorked} gün iş yapıldı / {monthData.daysInMonth} gün toplam</p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
             <div className="p-4 bg-brand-navy rounded-2xl text-brand-gold shadow-lg shadow-brand-navy/20">
                <CalendarIcon size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-brand-navy dark:text-brand-gold tracking-tight">{monthData.monthName}</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full bg-brand-gold"></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ODAK TAKVİMİ</span>
                </div>
             </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => changeMonth(-1)} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold rounded-2xl transition-all border border-slate-100 dark:border-slate-700"><ChevronLeft size={24}/></button>
            <button onClick={() => changeMonth(1)} className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-brand-navy dark:hover:text-brand-gold rounded-2xl transition-all border border-slate-100 dark:border-slate-700"><ChevronRight size={24}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-3">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
            <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">{day}</div>
          ))}
          {monthData.days.map((day, idx) => (
            <div key={idx} className={`relative aspect-square rounded-[1.5rem] flex flex-col items-center justify-center transition-all duration-300 border-2 ${
              day === null 
                ? 'bg-transparent border-transparent' 
                : day.hasJobs 
                  ? 'bg-brand-navy border-brand-gold text-white shadow-xl shadow-brand-navy/20 scale-105 z-10' 
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }`}>
              {day && (
                <>
                  <span className={`text-xl font-black ${day.hasJobs ? 'text-brand-gold' : 'text-slate-500'}`}>{day.day}</span>
                  {day.hasJobs && (
                    <div className="absolute bottom-2 text-[8px] font-black uppercase tracking-tighter opacity-80">
                      {Math.round(day.revenue).toLocaleString('tr-TR')} ₺
                    </div>
                  )}
                  {day.hasJobs && (
                    <div className="absolute -top-1 -right-1 bg-brand-gold text-brand-navy p-1 rounded-full shadow-lg">
                      <Sparkles size={10} />
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Advice Section */}
      <div className="bg-brand-navy/[0.03] dark:bg-brand-gold/[0.03] p-10 rounded-[3rem] border-4 border-dashed border-brand-gold/20 flex flex-col md:flex-row items-center gap-8">
         <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl text-brand-gold border border-brand-gold/30">
            <Award size={48} />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h4 className="text-lg font-black text-brand-navy dark:text-brand-gold uppercase tracking-widest mb-3">AI ODAK TAVSİYESİ</h4>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed italic">
              "Kanka, bu ay toplam <b>{monthData.daysWorked} gün</b> çalıştın ve ortalama <b>{Math.round(monthData.averagePerWorkedDay).toLocaleString('tr-TR')} ₺</b> ciro yaptın. 
              Eğer bu tempoyu tüm aya yayabilseydin cebine tam <b>{Math.round(monthData.projection).toLocaleString('tr-TR')} ₺</b> daha fazla girecekti. 
              Boş günlerini verimli transferlerle doldurursan cironu <b>%{Math.round((monthData.projection / monthData.totalRevenue) * 100 - 100)}</b> oranında artırabilirsin! Odaklan ve devam et 🚀"
            </p>
         </div>
      </div>
    </div>
  );
};

export default FocusView;
