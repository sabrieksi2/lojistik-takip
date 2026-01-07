
import React, { useMemo, useState } from 'react';
import { Job, ScheduledJob, Expense, ExpenseType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, PieChart as PieIcon, CalendarSearch } from 'lucide-react';

interface StatsOverviewProps {
  jobs: Job[];
  scheduledJobs: ScheduledJob[];
  expenses: Expense[];
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ jobs, expenses }) => {
  const [queryDate, setQueryDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

    const breakdown: Record<ExpenseType, number> = { 'Köprü': 0, 'Gemi': 0, 'Yakıt': 0, 'Diğer': 0 };
    periodExpenses.forEach(e => {
      breakdown[e.type] += e.amount;
    });

    return { revenue, expenseTotal, profit: revenue - expenseTotal, breakdown };
  };

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const d = new Date(now);
    const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(d.setDate(diff)).setHours(0,0,0,0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const qd = new Date(queryDate);
    const startOfQuery = new Date(qd.getFullYear(), qd.getMonth(), qd.getDate()).getTime();
    const endOfQuery = startOfQuery + (24 * 60 * 60 * 1000) - 1;

    return {
      daily: getPeriodStats(startOfToday),
      weekly: getPeriodStats(startOfWeek),
      monthly: getPeriodStats(startOfMonth),
      total: getPeriodStats(0),
      historical: getPeriodStats(startOfQuery, endOfQuery)
    };
  }, [jobs, expenses, queryDate]);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'];

  const getPieData = (breakdown: Record<string, number>) => 
    Object.entries(breakdown).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6 pb-8">
      {/* Historical Query Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <CalendarSearch size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Geçmiş Tarihli Sorgu</h3>
              <p className="text-xs text-slate-500">Belirli bir günün gelir ve giderini inceleyin.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={queryDate}
              onChange={(e) => setQueryDate(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all font-medium text-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-green-50 p-4 rounded-xl border border-green-100">
            <div className="text-xs font-bold text-green-600 uppercase mb-1">Gelir</div>
            <div className="text-2xl font-black text-green-700">{stats.historical.revenue.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-100">
            <div className="text-xs font-bold text-red-600 uppercase mb-1">Gider</div>
            <div className="text-2xl font-black text-red-700">{stats.historical.expenseTotal.toLocaleString('tr-TR')} ₺</div>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="text-xs font-bold text-indigo-600 uppercase mb-1">Net Kar</div>
            <div className="text-2xl font-black text-indigo-700">{stats.historical.profit.toLocaleString('tr-TR')} ₺</div>
          </div>
        </div>
      </div>

      {/* Top Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Günlük Kar', data: stats.daily, color: 'blue' },
          { label: 'Haftalık Kar', data: stats.weekly, color: 'indigo' },
          { label: 'Aylık Kar', data: stats.monthly, color: 'green' },
          { label: 'Toplam Kar', data: stats.total, color: 'slate' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-slate-500 font-medium text-sm">{item.label}</span>
              <div className={`p-2 rounded-lg bg-${item.color}-50 text-${item.color}-600`}>
                <DollarSign size={20} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mb-2">
              {item.data.profit.toLocaleString('tr-TR')} ₺
            </div>
            <div className="flex flex-col text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Gelir:</span>
                <span className="text-green-600 font-bold">{item.data.revenue.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gider:</span>
                <span className="text-red-600 font-bold">{item.data.expenseTotal.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Activity size={20} className="text-blue-500" />
            Dönemsel Karşılaştırma
          </h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={[
                { name: 'Günlük', gelir: stats.daily.revenue, gider: stats.daily.expenseTotal },
                { name: 'Haftalık', gelir: stats.weekly.revenue, gider: stats.weekly.expenseTotal },
                { name: 'Aylık', gelir: stats.monthly.revenue, gider: stats.monthly.expenseTotal },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="gelir" name="Gelir" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gider" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <PieIcon size={20} className="text-red-500" />
            Toplam Gider Kalemleri
          </h3>
          <div className="w-full h-[300px]">
            {getPieData(stats.total.breakdown).length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={getPieData(stats.total.breakdown)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getPieData(stats.total.breakdown).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">Gider verisi bulunmuyor.</div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Table for Expense Periods */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Dönemsel Gider Detayları</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-4">Dönem</th>
                <th className="p-4">Köprü</th>
                <th className="p-4">Gemi</th>
                <th className="p-4">Yakıt</th>
                <th className="p-4">Diğer</th>
                <th className="p-4 text-slate-800">Toplam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {[
                { label: 'Günlük', data: stats.daily },
                { label: 'Haftalık', data: stats.weekly },
                { label: 'Aylık', data: stats.monthly },
                { label: 'Sorgulanan Gün', data: stats.historical },
                { label: 'Toplam', data: stats.total },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-700">{row.label}</td>
                  <td className="p-4 text-red-500">{row.data.breakdown['Köprü'].toLocaleString('tr-TR')} ₺</td>
                  <td className="p-4 text-red-500">{row.data.breakdown['Gemi'].toLocaleString('tr-TR')} ₺</td>
                  <td className="p-4 text-red-500">{row.data.breakdown['Yakıt'].toLocaleString('tr-TR')} ₺</td>
                  <td className="p-4 text-red-500">{row.data.breakdown['Diğer'].toLocaleString('tr-TR')} ₺</td>
                  <td className="p-4 font-black text-slate-900">{row.data.expenseTotal.toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
