
import { Bell, Search, Sparkles, CheckCircle2, Phone, Mail, Calendar, ArrowUpRight, Plus, X, Trash2, Circle, User, KanbanSquare, ClipboardList, AlertCircle, Clock, Check, BarChart3, TrendingUp, DollarSign, HelpCircle, Target, Zap, Heart, PieChart as PieChartIcon, Landmark, Key } from 'lucide-react';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine
} from 'recharts';
import { Task, Deal, Contact, DealStage, Invoice, Activity, Expense, UserProfile } from '../types'; 
import { generateDailyBriefing } from '../services/gemini';

interface DashboardProps {
  tasks: Task[];
  deals: Deal[];
  contacts: Contact[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onNavigateToContacts: (filter: 'all' | 'recent', focusId?: string) => void;
  onNavigateToPipeline: (stages: DealStage[], focusId?: string) => void;
  onNavigateToTasks: (focusId?: string) => void;
  onNavigateToFinances: () => void;
  onNavigateToEmail: () => void; 
  invoices?: Invoice[]; 
  expenses: Expense[]; 
  activities: Activity[]; 
  teamMembers?: UserProfile[]; 
}

export const Dashboard: React.FC<DashboardProps> = React.memo(({ 
  tasks, 
  deals, 
  contacts,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateToContacts,
  onNavigateToPipeline,
  onNavigateToTasks,
  onNavigateToFinances,
  onNavigateToEmail,
  invoices = [], 
  expenses,
  activities,
  teamMembers = [] 
}) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [keyError, setKeyError] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'view' | 'add'>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<Task['type']>('todo');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');

  // --- REPORTING LOGIC ---
  const kpis = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const normalizedLeads = contacts.filter(c => (c.type || '').toLowerCase() === 'lead');
    const totalLeadsCount = normalizedLeads.length;

    const newLeadsThisMonth = normalizedLeads.filter(c => {
        if (!c.createdAt) return false;
        const created = new Date(c.createdAt);
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    }).length;

    const totalCustomers = contacts.filter(c => (c.type || '').toLowerCase() === 'customer').length;
    const totalPotential = totalLeadsCount + totalCustomers;
    const conversionRate = totalPotential > 0 ? (totalCustomers / totalPotential) * 100 : 0;

    const marketingSalesExpenses = expenses
        .filter(e => e.category === 'marketing' || e.category === 'travel')
        .reduce((sum, e) => sum + e.amount, 0);
    const cac = totalCustomers > 0 ? marketingSalesExpenses / totalCustomers : 0;

    const postsThisMonth = tasks.filter(t => {
        if (t.type !== 'post' || !t.isCompleted || !t.completedAt) return false;
        const comp = new Date(t.completedAt);
        return comp.getMonth() === currentMonth && comp.getFullYear() === currentYear;
    }).length;

    const postTasksWithTimes = tasks.filter(t => t.type === 'post' && t.isCompleted && t.createdAt && t.completedAt);
    const avgCycleTimeHours = postTasksWithTimes.length > 0 
        ? postTasksWithTimes.reduce((sum, t) => {
            const start = new Date(t.createdAt!).getTime();
            const end = new Date(t.completedAt!).getTime();
            return sum + (end - start);
          }, 0) / postTasksWithTimes.length / (1000 * 60 * 60)
        : 0;

    const contactsWithNps = contacts.filter(c => c.nps !== undefined && c.nps !== null);
    const avgNps = contactsWithNps.length > 0 
        ? contactsWithNps.reduce((sum, c) => sum + (c.nps || 0), 0) / contactsWithNps.length 
        : 0;

    const incomeInvoices = invoices.filter(i => (i.type === 'customer' || !i.type) && i.isPaid);
    const totalRevenue = incomeInvoices.reduce((sum, i) => sum + i.amount, 0);
    const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const commissionExpenses = invoices.filter(i => i.type === 'commission' && i.isPaid).reduce((sum, i) => sum + i.amount, 0);
    
    const monthlyEbitda = totalRevenue - totalOperatingExpenses - commissionExpenses;
    
    const directCosts = expenses.filter(e => e.category === 'software' || e.contactId).reduce((sum, e) => sum + e.amount, 0);
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - directCosts) / totalRevenue) * 100 : 0;

    return {
        totalLeads: totalLeadsCount,
        leadsMonth: newLeadsThisMonth,
        conversion: conversionRate,
        cac: cac,
        postsMonth: postsThisMonth,
        cycleTime: avgCycleTimeHours,
        nps: avgNps,
        ebitda: monthlyEbitda,
        grossMargin: grossMargin
    };
  }, [contacts, tasks, expenses, invoices]);

  const customerInvoices = useMemo(() => invoices.filter(i => i.type === 'customer' || !i.type), [invoices]);
  const upcomingTasks = tasks.filter(t => { if (t.isCompleted) return false; const taskDate = new Date(t.dueDate); const today = new Date(); taskDate.setHours(0,0,0,0); today.setHours(0,0,0,0); return taskDate.getTime() === today.getTime(); }).sort((a, b) => (a.priority === 'high' ? -1 : 1));

  const runwayData = useMemo(() => {
    const totalPaidRevenue = customerInvoices.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPaidCommissions = invoices.filter(i => i.type === 'commission' && i.isPaid).reduce((sum, i) => sum + i.amount, 0);
    let currentBalance = totalPaidRevenue - totalExpenses - totalPaidCommissions;
    const mrr = contacts.reduce((sum, c) => { if (!c.retainerActive || !c.retainerAmount) return sum; let monthlyAmount = c.retainerAmount; if (c.retainerInterval === 'quarterly') monthlyAmount = c.retainerAmount / 3; if (c.retainerInterval === 'yearly') monthlyAmount = c.retainerAmount / 12; return sum + monthlyAmount; }, 0);
    const recurringExpenses = expenses.filter(e => e.interval && e.interval !== 'one_time');
    const fixedMonthlyBurn = recurringExpenses.reduce((sum, e) => { if (e.interval === 'monthly') return sum + e.amount; if (e.interval === 'quarterly') return sum + (e.amount / 3); if (e.interval === 'half_yearly') return sum + (e.amount / 6); if (e.interval === 'yearly') return sum + (e.amount / 12); return sum; }, 0);
    const today = new Date(); const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(today.getMonth() - 3);
    const recentVariableExpenses = expenses.filter(e => (!e.interval || e.interval === 'one_time') && new Date(e.date) >= threeMonthsAgo);
    const variableBurnSum = recentVariableExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgVariableBurn = variableBurnSum / 3; 
    const totalBurnRate = fixedMonthlyBurn + avgVariableBurn;
    const data = []; const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    let loopBalance = currentBalance;
    for (let i = 0; i <= 6; i++) { const d = new Date(); d.setMonth(d.getMonth() + i); data.push({ name: i === 0 ? 'Heute' : monthNames[d.getMonth()], balance: loopBalance }); loopBalance = loopBalance + mrr - totalBurnRate; }
    return { data, mrr, burnRate: totalBurnRate, currentBalance };
  }, [invoices, expenses, contacts, customerInvoices]);

  const dynamicChartData = useMemo(() => {
    const today = new Date(); const currentYear = today.getFullYear(); const currentMonthIndex = today.getMonth();
    const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    return Array.from({ length: currentMonthIndex + 1 }, (_, i) => {
        const monthlyRevenue = customerInvoices.filter(inv => { const d = new Date(inv.date); return d.getFullYear() === currentYear && d.getMonth() === i; }).reduce((sum, inv) => sum + inv.amount, 0);
        return { name: monthNames[i], value: monthlyRevenue };
    });
  }, [customerInvoices]);

  const handleSelectKey = async () => {
      if ((window as any).aistudio) {
          try {
              await (window as any).aistudio.openSelectKey();
              // Try again immediately after modal closes
              handleGenerateInsight();
          } catch (e) {
              console.error("Failed to open key selector", e);
          }
      }
  };

  const handleGenerateInsight = async () => { 
    setLoadingBriefing(true);
    setKeyError(false);
    try {
        const text = await generateDailyBriefing(tasks, deals); 
        setBriefing(text); 
    } catch (e: any) {
        console.error("Briefing Failed:", e.message);
        if (e.message === 'API_KEY_MISSING' || e.message === 'API_KEY_INVALID') {
            setKeyError(true);
            setBriefing("Kein gültiger KI-Key gefunden oder Berechtigung fehlt (evtl. kein Paid Project).");
            // Auto-trigger selection if invalid
            if (e.message === 'API_KEY_INVALID') handleSelectKey();
        } else {
            setBriefing("KI-Bericht derzeit nicht verfügbar.");
        }
    } finally {
        setLoadingBriefing(false); 
    }
  };

  const handleAddNewTask = (e: React.FormEvent) => { e.preventDefault(); if (!newTaskTitle) return; const newTask: Task = { id: crypto.randomUUID(), title: newTaskTitle, type: newTaskType, priority: newTaskPriority, dueDate: newTaskDate, isCompleted: false, createdAt: new Date().toISOString(), assignedToEmail: newTaskAssignedTo || undefined }; onAddTask(newTask); setNewTaskTitle(''); setNewTaskType('todo'); setNewTaskPriority('medium'); setNewTaskAssignedTo(''); if (taskModalMode === 'add') setIsTaskModalOpen(false); };
  const toggleTaskCompletion = (task: Task) => { onUpdateTask({ ...task, isCompleted: !task.isCompleted, completedAt: !task.isCompleted ? new Date().toISOString() : undefined }); };

  const KPIBox = ({ title, value, sub, icon: Icon, color }: any) => (
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-${color.split('-')[1]}-600 dark:text-${color.split('-')[1]}-400`}>
              <Icon className="w-5 h-5" />
          </div>
          <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{title}</p>
              <h4 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{value}</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>
          </div>
      </div>
  );

  return (
    <div className="flex-1 bg-slate-50/50 dark:bg-slate-950 min-h-screen overflow-y-auto relative custom-scrollbar">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1><p className="text-slate-500 text-sm">Strategische Übersicht & Performance.</p></div>
        <div className="flex items-center gap-4">
            <div className="relative" ref={searchRef}><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder="Suche..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowSearchResults(true); }} className="pl-10 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 w-64"/></div>
            <button onClick={onNavigateToEmail} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
            <button onClick={() => {}} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" /></button>
        </div>
      </header>

      <main className="p-8 space-y-8 pb-20">
        {/* Smart Insight Card */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Sparkles className="w-32 h-32" /></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-300" /><h2 className="font-bold text-lg uppercase tracking-tight">KI-Lagebericht</h2></div>
                <div className="flex gap-2">
                    {keyError && (
                        <button onClick={handleSelectKey} className="bg-amber-400 hover:bg-amber-500 text-indigo-900 px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-white/30 transition-all">
                            <Key className="w-4 h-4" /> Key auswählen
                        </button>
                    )}
                    <button onClick={handleGenerateInsight} disabled={loadingBriefing} className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg text-sm font-bold border border-white/30 backdrop-blur-md transition-all">
                        {loadingBriefing ? 'Analysiere...' : 'Bericht aktualisieren'}
                    </button>
                </div>
            </div>
            <p className="text-indigo-50 max-w-3xl leading-relaxed font-medium relative z-10 text-sm">
                {briefing || "Lassen Sie die KI Ihre aktuellen Aufgaben, Pipeline-Daten und KPIs analysieren, um strategische Empfehlungen zu erhalten."}
            </p>
        </div>

        {/* --- STRATEGIC KPI REPORTING SECTION --- */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <PieChartIcon className="w-4 h-4 text-indigo-500" /> Business Intelligence & Reporting
                </h3>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase">Live Analyse</span>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2"><Target className="w-3 h-3 text-red-500"/> Akquise & Sales</h4>
                    <KPIBox title="Gesamt-Leads" value={kpis.totalLeads} sub={`Neu diesen Monat: ${kpis.leadsMonth}`} icon={User} color="bg-blue-500" />
                    <KPIBox title="Conversion Lead-Kunde" value={`${kpis.conversion.toFixed(1)}%`} sub="Historische Rate" icon={TrendingUp} color="bg-emerald-500" />
                    <KPIBox title="CAC (Acquisition Cost)" value={`${kpis.cac.toFixed(2)} €`} sub="Marketing / Neukunde" icon={DollarSign} color="bg-amber-500" />
                </div>
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2"><Zap className="w-3 h-3 text-yellow-500"/> Operative Exzellenz</h4>
                    <KPIBox title="Posts / Monat" value={kpis.postsMonth} sub="Abgeschlossene Beiträge" icon={CheckCircle2} color="bg-indigo-500" />
                    <KPIBox title="Ø Durchlaufzeit" value={`${kpis.cycleTime.toFixed(1)}h`} sub="Audio bis Fertigstellung" icon={Clock} color="bg-purple-500" />
                    <KPIBox title="Kundenzufriedenheit" value={`${kpis.nps.toFixed(1)} / 10`} sub="NPS (Net Promoter Score)" icon={Heart} color="bg-pink-500" />
                </div>
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2"><DollarSign className="w-3 h-3 text-green-500"/> Financial Health</h4>
                    <KPIBox title="Monats-EBITDA" value={`${kpis.ebitda.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} sub="Umsatz abzgl. aller Kosten" icon={Landmark} color="bg-green-500" />
                    <KPIBox title="Gross Margin" value={`${kpis.grossMargin.toFixed(1)}%`} sub="Deckungsbeitrag (Rohertrag)" icon={TrendingUp} color="bg-cyan-500" />
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <p className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider">Cash Runway</p>
                        <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-300 leading-tight">
                            {runwayData.burnRate > 0 ? (runwayData.currentBalance / runwayData.burnRate).toFixed(1) : '∞'} Monate
                        </h4>
                        <div className="w-full bg-indigo-200 dark:bg-indigo-800 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-indigo-600 h-full" style={{ width: `${Math.min(100, (runwayData.currentBalance / (runwayData.burnRate * 12)) * 100)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold flex items-center gap-2 dark:text-white"><TrendingUp className="w-5 h-5 text-indigo-600" /> Umsatzentwicklung</h3></div>
                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={dynamicChartData}><defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} /><YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} /><Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v:any) => [`${v.toLocaleString()} €`]}/><Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fill="url(#colorValue)" /></AreaChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold dark:text-white">Heutige Tasks</h3><button onClick={() => onNavigateToTasks()} className="text-xs text-indigo-600 font-bold hover:underline">Alle anzeigen</button></div>
                <div className="space-y-3 flex-1">
                    {upcomingTasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                            <div onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task); }} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}`}>{task.isCompleted && <Check className="w-3 h-3 text-white" />}</div>
                            <div className="flex-1 min-w-0"><p className={`text-sm font-bold truncate ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p><p className="text-[10px] text-slate-400 uppercase font-bold">{task.type}</p></div>
                        </div>
                    ))}
                    {upcomingTasks.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-40"><CheckCircle2 className="w-12 h-12 mb-2"/><p className="text-sm font-medium">Nichts mehr zu tun heute.</p></div>}
                </div>
            </div>
        </div>
      </main>

      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900"><h2 className="text-lg font-bold flex items-center gap-2 dark:text-white"><Plus className="w-5 h-5 text-indigo-600" /> Aufgabe erstellen</h2><button onClick={() => setIsTaskModalOpen(false)}><X className="w-5 h-5"/></button></div>
                <form onSubmit={handleAddNewTask} className="p-6 space-y-4">
                    <input required value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} type="text" placeholder="Titel der Aufgabe..." className="w-full px-4 py-3 border dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-white" autoFocus/>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={newTaskType} onChange={(e) => setNewTaskType(e.target.value as any)} className="px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                            <option value="todo">To-Do</option>
                            <option value="post">Beitrag (Post)</option>
                            <option value="call">Anruf</option>
                            <option value="meeting">Meeting</option>
                        </select>
                        <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)} className="px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                            <option value="low">Niedrig</option><option value="medium">Mittel</option><option value="high">Hoch</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <select value={newTaskAssignedTo} onChange={(e) => setNewTaskAssignedTo(e.target.value)} className="px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white">
                            <option value="">Nicht zugewiesen</option>
                            {teamMembers.map(m => <option key={m.email} value={m.email}>{m.firstName} {m.lastName}</option>)}
                        </select>
                        <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-white" />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t dark:border-slate-700"><button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500">Abbrechen</button><button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-all">Erstellen</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
});
