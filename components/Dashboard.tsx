import { 
  Bell, Search, Sparkles, CheckCircle2, User, TrendingUp, 
  Target, Zap, BarChart3, Clock, 
  AlertCircle, Landmark, RefreshCw, Terminal, ArrowUpRight,
  TrendingDown, ArrowRight, PieChart as PieIcon, Mail, Inbox,
  ListTodo, Check, Circle
} from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Task, Deal, Contact, Invoice, Expense, UserProfile, Activity, BackendConfig } from '../types'; 
import { generateDailyBriefing } from '../services/gemini';

interface DashboardProps {
  tasks: Task[];
  deals: Deal[];
  contacts: Contact[];
  invoices?: Invoice[]; 
  expenses: Expense[]; 
  activities: Activity[];
  teamMembers?: UserProfile[];
  backendConfig: BackendConfig;
  onNavigateToSettings: () => void;
  onNavigateToKPI: () => void;
  onNavigateToEmail: () => void;
  onUpdateActivity?: (activity: Activity) => void;
}

export const Dashboard: React.FC<DashboardProps> = React.memo(({ 
  tasks, deals, contacts, invoices = [], expenses, activities, teamMembers = [], backendConfig, onNavigateToSettings, onNavigateToKPI, onNavigateToEmail, onUpdateActivity
}) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const formatEuro = (val: number) => val.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  const stats = useMemo(() => {
    const totalLeads = contacts.filter(c => (c.type || '').toLowerCase() === 'lead').length;
    const totalCustomers = contacts.filter(c => (c.type || '').toLowerCase() === 'customer').length;
    const conversion = (totalLeads + totalCustomers) > 0 ? (totalCustomers / (totalLeads + totalCustomers)) * 100 : 0;
    const paidInvoices = invoices.filter(i => i.isPaid && !i.isCancelled);
    const revenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);
    const cost = expenses.reduce((sum, e) => sum + e.amount, 0);
    const ebitda = revenue - cost;
    const grossMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;
    return { totalLeads, conversion, ebitda, grossMargin, revenue };
  }, [contacts, invoices, expenses]);

  const unreadActivities = useMemo(() => activities.filter(a => !a.isRead).slice(0, 10), [activities]);
  const hasUnread = unreadActivities.length > 0;

  const openTasks = useMemo(() => {
    return tasks
      .filter(t => !t.isCompleted)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [tasks]);

  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const val = invoices.filter(inv => inv.isPaid && !inv.isCancelled && new Date(inv.date).getMonth() === mIdx).reduce((sum, inv) => sum + inv.amount, 0);
      result.push({ name: months[mIdx], revenue: val });
    }
    return result;
  }, [invoices]);

  const handleMarkAllRead = async () => {
    if (onUpdateActivity) {
      // Wir aktualisieren alle parallel im Backend/State
      await Promise.all(unreadActivities.map(act => onUpdateActivity({ ...act, isRead: true })));
    }
    setShowNotifications(false);
  };

  const handleMarkRead = (act: Activity) => {
    if (onUpdateActivity) onUpdateActivity({ ...act, isRead: true });
  };

  const handleRefreshBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const text = await generateDailyBriefing(tasks, deals, backendConfig.geminiApiKey);
      setBriefing(text);
    } catch (e: any) {
      setKeyError(true);
      setBriefing("KI-Dienst nicht konfiguriert.");
    } finally {
      setLoadingBriefing(false);
    }
  };

  const KPIBox = ({ title, value, sub, icon: Icon, colorClass, onClick }: any) => (
    <div onClick={onClick} className={`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl ${colorClass}`}><Icon className="w-6 h-6" /></div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
          <p className="text-[10px] text-slate-500 mt-1 font-bold">{sub}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-slate-50/50 min-h-screen overflow-y-auto custom-scrollbar pb-20">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-6 sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-1">Operational Control Center</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className={`p-3 hover:bg-slate-50 rounded-2xl transition-all relative ${showNotifications ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
              <Bell className="w-6 h-6"/>
              {hasUnread && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-4 w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 z-50 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Benachrichtigungen</h4>
                  <button onClick={handleMarkAllRead} className="text-[10px] font-black text-indigo-600 hover:underline uppercase">Alle lesen</button>
                </div>
                <div className="space-y-5">
                  {unreadActivities.map(act => (
                    <div key={act.id} className="flex gap-4 group">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">{act.content}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(act.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <button onClick={() => handleMarkRead(act)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-indigo-600 transition-all"><Check className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {!hasUnread && <div className="py-6 text-center text-slate-400 text-xs italic">Alles auf dem neuesten Stand.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8 max-w-[1600px] mx-auto">
        <section className={`relative overflow-hidden rounded-[2.5rem] p-10 shadow-2xl transition-all duration-700 ${keyError ? 'bg-slate-900' : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white'}`}>
          <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12"><Sparkles className="w-64 h-64" /></div>
          <div className="relative z-10 flex flex-col lg:flex-row gap-10 items-start lg:items-center justify-between">
            <div className="space-y-5 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md"><Zap className="w-6 h-6 text-indigo-100" /></div>
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-100">Smart Insights Engine</h2>
              </div>
              <p className="text-2xl font-black leading-tight max-w-4xl text-white drop-shadow-lg">{loadingBriefing ? "Analysiere Geschäftsdaten..." : briefing || "Klicken Sie für einen KI-Business-Scan."}</p>
              <div className="flex gap-3">
                <button onClick={onNavigateToKPI} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-xs font-black transition-all border border-white/10">Performance Report <ArrowRight className="w-4 h-4" /></button>
                <button onClick={onNavigateToEmail} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-2xl text-xs font-black transition-all border border-white/10">Postfach <Mail className="w-4 h-4" /></button>
              </div>
            </div>
            <button onClick={handleRefreshBriefing} disabled={loadingBriefing} className="bg-white text-indigo-900 px-10 py-5 rounded-[2rem] text-sm font-black shadow-xl hover:scale-105 transition-all flex items-center gap-4">
              <RefreshCw className={`w-6 h-6 ${loadingBriefing ? 'animate-spin' : ''}`} /> Scan starten
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <KPIBox title="Lead-Volumen" value={stats.totalLeads} sub="Aktive Akquise" icon={User} colorClass="bg-blue-50 text-blue-600" />
          <KPIBox title="Abschlussrate" value={`${stats.conversion.toFixed(2)}%`} sub="Pipeline Effizienz" icon={Target} colorClass="bg-emerald-50 text-emerald-600" />
          <KPIBox title="EBITDA" value={formatEuro(stats.ebitda)} sub="Netto-Ergebnis" icon={Landmark} colorClass="bg-amber-50 text-amber-600" />
          <KPIBox title="Bruttomarge" value={`${stats.grossMargin.toFixed(2)}%`} sub="Profitabilität" icon={BarChart3} colorClass="bg-purple-50 text-purple-600" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><TrendingUp className="w-6 h-6 text-indigo-600" /> Revenue Flow</h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="cRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={5} fill="url(#cRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3"><ListTodo className="w-6 h-6 text-indigo-600" /> Offene Aufgaben</h3>
            <div className="space-y-5 flex-1 overflow-y-auto custom-scrollbar">
              {openTasks.map(task => (
                <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:border-indigo-200 hover:shadow-md">
                   <Circle className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                   <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{task.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Fällig am {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                   </div>
                </div>
              ))}
              {openTasks.length === 0 && <p className="text-center text-slate-400 text-xs italic py-10">Keine anstehenden Aufgaben.</p>}
            </div>
            <button onClick={() => onNavigateToKPI()} className="mt-6 w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all">Alle Aufgaben anzeigen</button>
          </div>
        </section>
      </main>
    </div>
  );
});