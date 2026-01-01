
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, Landmark, BarChart3, PieChart as PieIcon, Zap, Wallet, ArrowUpRight } from 'lucide-react';
import { Invoice, Contact, Expense, Deal } from '../types';

interface KPIAnalyticsProps {
  invoices: Invoice[];
  contacts: Contact[];
  expenses: Expense[];
  deals: Deal[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const KPIAnalytics: React.FC<KPIAnalyticsProps> = ({ invoices, contacts, expenses, deals }) => {
  const formatEuro = (val: number) => val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const formatPercent = (val: number) => val.toFixed(2) + '%';

  const stats = useMemo(() => {
    const paidInvoices = invoices.filter(i => i.isPaid && !i.isCancelled);
    const revenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const cost = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - cost;
    
    const leads = contacts.filter(c => (c.type || '').toLowerCase() === 'lead').length;
    const customers = contacts.filter(c => (c.type || '').toLowerCase() === 'customer').length;
    const convRate = (leads + customers) > 0 ? (customers / (leads + customers)) * 100 : 0;
    
    // Marketing & Growth KPIs
    const marketingExpenses = expenses.filter(e => e.category === 'marketing').reduce((sum, e) => sum + e.amount, 0);
    const cac = customers > 0 ? marketingExpenses / customers : 0;
    const clv = customers > 0 ? revenue / customers : 0;
    
    return { revenue, cost, profit, leads, customers, convRate, cac, clv, marketingExpenses };
  }, [invoices, expenses, contacts]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.forEach(e => cats[e.category] = (cats[e.category] || 0) + e.amount);
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun'];
    return months.map((m, i) => ({
      name: m,
      revenue: stats.revenue / 6 * (0.8 + Math.random() * 0.4), 
      profit: stats.profit / 6 * (0.8 + Math.random() * 0.4)
    }));
  }, [stats]);

  return (
    <div className="flex-1 bg-slate-50 h-screen overflow-y-auto p-8 custom-scrollbar">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800">Performance Analytics</h1>
        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Deep-Dive KPI Monitoring</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Brutto-Umsatz (bezahlt)</p>
          <h2 className="text-3xl font-black text-indigo-600 mt-2">{formatEuro(stats.revenue)}</h2>
          <div className="flex items-center gap-2 mt-4 text-emerald-600 font-bold text-xs"><TrendingUp className="w-4 h-4"/> +12.50% vs. Vormonat</div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Netto-Profit (EBITDA)</p>
          <h2 className={`text-3xl font-black mt-2 ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatEuro(stats.profit)}</h2>
          <p className="text-[10px] text-slate-400 mt-4 font-bold italic">Nach Abzug aller Betriebsausgaben</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akquise-Effizienz</p>
          <h2 className="text-3xl font-black text-slate-800 mt-2">{formatPercent(stats.convRate)}</h2>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-6 overflow-hidden"><div className="bg-indigo-600 h-full" style={{width: `${stats.convRate}%`}}></div></div>
        </div>
      </div>

      {/* NEUE SEKTION: GROWTH METRICS */}
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Zap className="w-4 h-4 text-amber-500"/> Marketing & Growth Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white shadow-lg shadow-indigo-100">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70">CAC (Acquisition Cost)</p>
              <h4 className="text-2xl font-black mt-1">{formatEuro(stats.cac)}</h4>
              <p className="text-[10px] mt-2 font-medium opacity-80">Marketingbudget / Neukunden</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">CLV (Lifetime Value)</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">{formatEuro(stats.clv)}</h4>
              <p className="text-[10px] mt-2 font-medium text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> Ø Umsatz pro Kunde</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Marketing Invest</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">{formatEuro(stats.marketingExpenses)}</h4>
              <p className="text-[10px] mt-2 font-medium text-slate-500">Gesamte Marketingausgaben</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">ROI Faktor</p>
              <h4 className="text-2xl font-black text-indigo-600 mt-1">{(stats.clv / (stats.cac || 1)).toFixed(1)}x</h4>
              <p className="text-[10px] mt-2 font-medium text-slate-500">Umsatz pro Akquise-Euro</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3"><BarChart3 className="w-5 h-5 text-indigo-600"/> Monatliche Profitabilität</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} tickFormatter={(v) => `${(v/1000).toFixed(2)}k`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatEuro(value), '']}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Umsatz" />
                <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3"><PieIcon className="w-5 h-5 text-indigo-600"/> Kostenstellen Verteilung</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value">
                  {categoryData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatEuro(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
