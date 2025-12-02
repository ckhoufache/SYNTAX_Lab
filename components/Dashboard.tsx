
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine
} from 'recharts';
import { Bell, Search, Sparkles, CheckCircle2, Phone, Mail, Calendar, ArrowUpRight, Plus, X, Trash2, Circle, User, KanbanSquare, ClipboardList, AlertCircle, Clock, Check, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { Task, Deal, Contact, DealStage, Invoice, Activity, Expense } from '../types'; // Import Invoice & Activity
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
  invoices?: Invoice[]; // Default to empty
  expenses: Expense[]; // New prop
  activities: Activity[]; 
}

export const Dashboard: React.FC<DashboardProps> = ({ 
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
  invoices = [], 
  expenses,
  activities
}) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  
  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'view' | 'add'>('view');
  
  // Chart View State
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{
      contacts: Contact[];
      deals: Deal[];
      tasks: Task[];
  }>({ contacts: [], deals: [], tasks: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Notification State
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // Dismissed Notifications Logic
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
      const stored = localStorage.getItem('dismissed_notifications');
      return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
      localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<Task['type']>('todo');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived Stats
  const totalRevenue = invoices.reduce((acc, curr) => acc + curr.amount, 0); // Use Real Invoices
  
  const activeVolume = deals.reduce((acc, curr) => 
    (curr.stage === DealStage.NEGOTIATION || curr.stage === DealStage.PROPOSAL) 
      ? acc + curr.value 
      : acc, 0
  );

  const dueTasksCount = tasks.filter(t => !t.isCompleted).length;

  // Filter für Widget: NUR HEUTE
  const upcomingTasks = tasks.filter(t => {
      if (t.isCompleted) return false;
      const taskDate = new Date(t.dueDate);
      const today = new Date();
      taskDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return taskDate.getTime() === today.getTime();
  }).sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return 0;
  });

  // --- DYNAMIC CHART DATA GENERATION (YTD Revenue) ---
  const dynamicChartData = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth(); // 0 = Jan
    const currentDay = today.getDate();

    if (currentMonthIndex === 0 && currentDay < 7) {
        // Daily View (Jan 1 to today)
        return Array.from({ length: currentDay }, (_, i) => {
            const day = i + 1;
            const dailyRevenue = invoices
                .filter(inv => {
                    const d = new Date(inv.date);
                    return d.getFullYear() === currentYear && d.getMonth() === 0 && d.getDate() === day;
                })
                .reduce((sum, inv) => sum + inv.amount, 0);
            return { name: `${day}. Jan`, value: dailyRevenue };
        });
    } else if (currentMonthIndex === 0) {
        // Weekly View
        const weeks = Math.ceil(currentDay / 7);
        return Array.from({ length: weeks }, (_, i) => {
            const weekNum = i + 1;
            const weeklyRevenue = invoices
                .filter(inv => {
                    const d = new Date(inv.date);
                    const dom = d.getDate();
                    return d.getFullYear() === currentYear && d.getMonth() === 0 && Math.ceil(dom/7) === weekNum;
                })
                .reduce((sum, inv) => sum + inv.amount, 0);
             return { name: `KW ${weekNum}`, value: weeklyRevenue };
        });
    } else {
        // Monthly View
        const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        return Array.from({ length: currentMonthIndex + 1 }, (_, i) => {
            const monthlyRevenue = invoices
                .filter(inv => {
                    const d = new Date(inv.date);
                    return d.getFullYear() === currentYear && d.getMonth() === i;
                })
                .reduce((sum, inv) => sum + inv.amount, 0);
            return { name: monthNames[i], value: monthlyRevenue };
        });
    }
  }, [invoices]);

  // --- RUNWAY FORECAST CALCULATION ---
  const runwayData = useMemo(() => {
    // 1. Current Liquid Assets (Start Point)
    // Formula: Sum of ALL Paid Invoices - Sum of ALL Expenses
    const totalPaidRevenue = invoices.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    let currentBalance = totalPaidRevenue - totalExpenses;

    // 2. MRR (Monthly Recurring Revenue from Active Retainers)
    const mrr = contacts.reduce((sum, c) => {
        if (!c.retainerActive || !c.retainerAmount) return sum;
        let monthlyAmount = c.retainerAmount;
        if (c.retainerInterval === 'quarterly') monthlyAmount = c.retainerAmount / 3;
        if (c.retainerInterval === 'yearly') monthlyAmount = c.retainerAmount / 12;
        return sum + monthlyAmount;
    }, 0);

    // 3. Burn Rate (Average Monthly Expenses - Last 3 Months)
    const today = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const recentExpenses = expenses.filter(e => new Date(e.date) >= threeMonthsAgo);
    const recentExpensesSum = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
    // Use 3 months as divisor for stability, or actual months passed if < 3? 
    // Using simple logic: Sum / 3 (assuming business exists > 3 months)
    const burnRate = recentExpensesSum / 3;

    const data = [];
    const monthNames = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

    // Forecast for next 6 months
    // Month 0 is "Now"
    for (let i = 0; i <= 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        
        data.push({
            name: i === 0 ? 'Heute' : monthNames[d.getMonth()],
            balance: currentBalance,
            burnRate: burnRate,
            mrr: mrr
        });

        // Calculate next month's starting balance
        currentBalance = currentBalance + mrr - burnRate;
    }

    return { data, mrr, burnRate, currentBalance: totalPaidRevenue - totalExpenses };
  }, [invoices, expenses, contacts]);

  // --- Notifications Logic ---
  const notifications = useMemo(() => {
      const list = [];
      const today = new Date();
      today.setHours(0,0,0,0);

      const overdueTasks = tasks.filter(t => {
          if (t.isCompleted) return false;
          const d = new Date(t.dueDate);
          d.setHours(0,0,0,0);
          return d < today;
      });

      overdueTasks.forEach(t => {
          list.push({
              id: `overdue-${t.id}`,
              title: `Überfällig: ${t.title}`,
              type: 'alert',
              time: t.dueDate,
              onClick: () => onNavigateToTasks(t.id)
          });
      });

      const urgentToday = upcomingTasks.filter(t => t.priority === 'high');
      urgentToday.forEach(t => {
          list.push({
              id: `urgent-${t.id}`,
              title: `Heute fällig (Hoch): ${t.title}`,
              type: 'warning',
              time: 'Heute',
              onClick: () => onNavigateToTasks(t.id)
          });
      });

      // New: Check for Leads > 3 Days
      const staleLeads = deals.filter(d => {
          if (d.stage !== DealStage.LEAD) return false;
          if (!d.stageEnteredDate) return false;
          const entered = new Date(d.stageEnteredDate);
          entered.setHours(0,0,0,0);
          const diffTime = Math.abs(today.getTime() - entered.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          return diffDays > 3;
      });

      staleLeads.forEach(d => {
           list.push({
              id: `lead-stale-${d.id}`,
              title: `Lead wartet (>3 Tage): ${d.title}`,
              type: 'warning',
              time: 'Handlungsbedarf',
              onClick: () => onNavigateToPipeline([DealStage.LEAD], d.id)
          });
      });

      const negotiationDeals = deals.filter(d => d.stage === DealStage.NEGOTIATION);
      negotiationDeals.forEach(d => {
          list.push({
              id: `deal-${d.id}`,
              title: `In Verhandlung: ${d.title}`,
              type: 'info',
              time: `${d.value.toLocaleString()} €`,
              onClick: () => onNavigateToPipeline([DealStage.NEGOTIATION], d.id)
          });
      });

      return list.filter(n => !dismissedNotificationIds.includes(n.id));
  }, [tasks, deals, upcomingTasks, dismissedNotificationIds]);

  const handleNotificationClick = (id: string, action: () => void) => {
      const newDismissedIds = [...dismissedNotificationIds, id];
      setDismissedNotificationIds(newDismissedIds);
      localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissedIds));
      action();
      setShowNotifications(false);
  };

  const handleMarkAllAsRead = () => {
      const allIds = notifications.map(n => n.id);
      const newDismissedIds = [...dismissedNotificationIds, ...allIds];
      setDismissedNotificationIds(newDismissedIds);
      localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissedIds));
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
        setSearchResults({ contacts: [], deals: [], tasks: [] });
        return;
    }
    const lower = searchTerm.toLowerCase();
    
    const foundContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(lower) || 
        c.company.toLowerCase().includes(lower)
    ).slice(0, 3);

    const foundDeals = deals.filter(d => 
        d.title.toLowerCase().includes(lower)
    ).slice(0, 3);

    const foundTasks = tasks.filter(t => 
        t.title.toLowerCase().includes(lower)
    ).slice(0, 3);

    setSearchResults({ contacts: foundContacts, deals: foundDeals, tasks: foundTasks });
  }, [searchTerm, contacts, deals, tasks]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSearchResults(false);
          if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotifications(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchRef, notificationRef]);


  const handleGenerateInsight = async () => {
    if (!process.env.API_KEY && !localStorage.getItem('gemini_api_key')) {
        setBriefing("Verbinden Sie Ihre API Key in den Einstellungen für tägliche KI-Insights.");
        return;
    }
    setLoadingBriefing(true);
    const text = await generateDailyBriefing(tasks, deals);
    setBriefing(text);
    setLoadingBriefing(false);
  };

  const handleAddNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: newTaskTitle,
        type: newTaskType,
        priority: newTaskPriority,
        dueDate: newTaskDate,
        isCompleted: false
    };
    onAddTask(newTask);
    setNewTaskTitle('');
    setNewTaskType('todo');
    setNewTaskPriority('medium');
    
    if (taskModalMode === 'add') {
        setIsTaskModalOpen(false);
    }
  };

  const toggleTaskCompletion = (task: Task) => {
      onUpdateTask({ ...task, isCompleted: !task.isCompleted });
  };

  const openTaskQuickView = () => {
      onNavigateToTasks(); 
  };

  const openAddTaskModal = () => {
      setTaskModalMode('add');
      setIsTaskModalOpen(true);
  };

  const StatCard = ({ title, value, sub, icon: Icon, color, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-start justify-between hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
    >
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
        <p className="text-xs text-green-600 flex items-center mt-2 font-medium">
          <ArrowUpRight className="w-3 h-3 mr-1" /> {sub}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-slate-50/50 dark:bg-slate-950 min-h-screen overflow-y-auto relative">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm">Willkommen zurück.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Suche..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setShowSearchResults(true); }}
              onFocus={() => setShowSearchResults(true)}
              className="pl-10 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
            />
            {showSearchResults && searchTerm.trim() && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                     {searchResults.contacts.length > 0 && <div className="p-2"><h4 className="text-xs uppercase text-slate-400 px-2">Kontakte</h4>{searchResults.contacts.map(c => <div key={c.id} onClick={() => onNavigateToContacts('all', c.id)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm font-medium dark:text-slate-200">{c.name}</div>)}</div>}
                     {searchResults.deals.length > 0 && <div className="p-2 border-t dark:border-slate-700"><h4 className="text-xs uppercase text-slate-400 px-2">Deals</h4>{searchResults.deals.map(d => <div key={d.id} onClick={() => onNavigateToPipeline([d.stage], d.id)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm font-medium dark:text-slate-200">{d.title}</div>)}</div>}
                     {searchResults.tasks.length > 0 && <div className="p-2 border-t dark:border-slate-700"><h4 className="text-xs uppercase text-slate-400 px-2">Aufgaben</h4>{searchResults.tasks.map(t => <div key={t.id} onClick={() => onNavigateToTasks(t.id)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm font-medium dark:text-slate-200">{t.title}</div>)}</div>}
                </div>
            )}
          </div>

          <div className="relative" ref={notificationRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className={`relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${showNotifications ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                <Bell className={`w-5 h-5 ${notifications.length > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`} />
                {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
              </button>
              {showNotifications && (
                  <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border dark:border-slate-700 z-50">
                      <div className="px-4 py-3 border-b dark:border-slate-700 flex justify-between items-center"><h3 className="font-semibold text-sm dark:text-white">Benachrichtigungen</h3>{notifications.length > 0 && <button onClick={handleMarkAllAsRead} className="text-xs text-indigo-600 dark:text-indigo-400">Alle lesen</button>}</div>
                      <div className="max-h-[300px] overflow-y-auto">
                          {notifications.map(n => (
                              <div key={n.id} onClick={() => handleNotificationClick(n.id, n.onClick)} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b dark:border-slate-700 cursor-pointer flex gap-3">
                                  <div>
                                      <p className={`text-sm font-medium ${n.type === 'warning' ? 'text-orange-600 dark:text-orange-400' : n.type === 'alert' ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}>{n.title}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">{n.time}</p>
                                  </div>
                              </div>
                          ))}
                          {notifications.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Keine neuen Nachrichten.</div>}
                      </div>
                  </div>
              )}
          </div>
        </div>
      </header>

      <main className="p-8 space-y-8 pb-20">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-300" /><h2 className="font-semibold text-lg">Smart Insight</h2></div>
            <button onClick={handleGenerateInsight} disabled={loadingBriefing} className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-sm font-medium border border-white/30 flex items-center gap-2">{loadingBriefing ? 'Analysiere...' : (briefing ? 'Neu analysieren' : 'Jetzt analysieren')}</button>
          </div>
          <div className="relative z-10 min-h-[40px]"><p className="text-indigo-100 max-w-3xl leading-relaxed whitespace-pre-line">{briefing || "Lassen Sie die KI Ihre aktuellen Aufgaben und Pipeline-Daten analysieren."}</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Gesamtumsatz" value={`${totalRevenue.toLocaleString('de-DE')} €`} sub="Rechnungen (Bezahlt & Offen)" icon={CheckCircle2} color="bg-emerald-500" onClick={onNavigateToFinances}/>
          <StatCard title="Aktive Pipeline" value={`${activeVolume.toLocaleString('de-DE')} €`} sub="Verhandlung & Angebot" icon={Calendar} color="bg-blue-500" onClick={() => onNavigateToPipeline([DealStage.PROPOSAL, DealStage.NEGOTIATION])}/>
          <StatCard title="Neue Kontakte" value={`+${contacts.length}`} sub="Gesamt" icon={Phone} color="bg-orange-500" onClick={() => onNavigateToContacts('recent')}/>
          <StatCard title="Offene Aufgaben" value={dueTasksCount} sub="Dringend" icon={Mail} color="bg-pink-500" onClick={() => onNavigateToTasks()}/>
        </div>
        
        {/* NEW: RUNWAY CHART */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-6">
                <div>
                     <h3 className="text-lg font-bold flex items-center gap-2 dark:text-white">
                        <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Liquiditäts-Forecast (Runway)
                     </h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Projektion der Liquidität für 6 Monate.</p>
                </div>
                <div className="flex gap-4 text-sm">
                     <div className="text-right">
                         <p className="text-slate-400 text-xs uppercase font-bold">MRR (Retainer)</p>
                         <p className="font-bold text-green-600">+{runwayData.mrr.toLocaleString('de-DE', {maximumFractionDigits:0})} €</p>
                     </div>
                     <div className="text-right">
                         <p className="text-slate-400 text-xs uppercase font-bold">Burn Rate (Ø 3M)</p>
                         <p className="font-bold text-red-600">-{runwayData.burnRate.toLocaleString('de-DE', {maximumFractionDigits:0})} €</p>
                     </div>
                     <div className="text-right border-l pl-4 dark:border-slate-700">
                         <p className="text-slate-400 text-xs uppercase font-bold">Aktuell (Cash)</p>
                         <p className={`font-bold ${runwayData.currentBalance < 0 ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>{runwayData.currentBalance.toLocaleString('de-DE', {maximumFractionDigits:0})} €</p>
                     </div>
                </div>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={runwayData.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`${value.toLocaleString('de-DE')} €`, 'Kontostand']}
                    />
                    <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        fill="url(#colorBalance)" 
                    />
                </AreaChart>
              </ResponsiveContainer>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors group">
            <div className="flex justify-between items-center mb-6">
                <h3 onClick={onNavigateToFinances} className="text-lg font-bold flex items-center gap-2 cursor-pointer hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400 transition-colors">
                    Umsatzentwicklung (YTD) <ArrowUpRight className="w-4 h-4" />
                </h3>
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                    <button 
                        onClick={() => setChartType('area')}
                        className={`p-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Flächendiagramm"
                    >
                        <TrendingUp className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setChartType('bar')}
                        className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Balkendiagramm"
                    >
                        <BarChart3 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                {chartType === 'area' ? (
                    <AreaChart data={dynamicChartData}>
                    <defs><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                ) : (
                    <BarChart data={dynamicChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}}/>
                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold dark:text-white">Heute fällig</h3><button onClick={openTaskQuickView} className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Alle ansehen</button></div>
            <div className="space-y-4 flex-1">
              {upcomingTasks.map(task => (
                <div key={task.id} onClick={openTaskQuickView} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                  <div onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task); }} className={`mt-1.5 w-4 h-4 rounded-full border cursor-pointer flex items-center justify-center ${task.isCompleted ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-500 hover:border-indigo-500'}`}>{task.isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}</div>
                  <div className="flex-1 min-w-0"><p className={`text-sm font-medium truncate ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p></div>
                </div>
              ))}
              {upcomingTasks.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8"><CheckCircle2 className="w-10 h-10 mb-2 opacity-20" /><p className="text-sm">Nichts fällig heute.</p></div>}
            </div>
            <button onClick={openAddTaskModal} className="w-full mt-4 py-2 text-sm text-slate-500 dark:text-slate-400 border dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Aufgabe hinzufügen</button>
          </div>
        </div>
      </main>

      {/* Task Manager Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col`}>
                <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900"><h2 className="text-lg font-bold flex items-center gap-2 dark:text-white"><Plus className="w-5 h-5 text-indigo-600" /> Neue Aufgabe</h2><button onClick={() => setIsTaskModalOpen(false)} className="dark:text-slate-400"><X className="w-5 h-5"/></button></div>
                <form onSubmit={handleAddNewTask} className="p-6 bg-white dark:bg-slate-800">
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <input 
                                required 
                                value={newTaskTitle} 
                                onChange={(e) => setNewTaskTitle(e.target.value)} 
                                type="text" 
                                placeholder="Was muss erledigt werden?" 
                                className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg text-sm outline-none bg-white dark:bg-slate-700 dark:text-white" 
                                autoFocus
                            />
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Hinzufügen</button>
                        </div>
                        <div className="flex gap-2">
                            <select value={newTaskType} onChange={(e) => setNewTaskType(e.target.value as any)} className="px-3 py-1.5 border dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white"><option value="call">Anruf</option><option value="email">E-Mail</option><option value="meeting">Meeting</option><option value="todo">To-Do</option></select>
                            <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as any)} className="px-3 py-1.5 border dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white"><option value="low">Niedrig</option><option value="medium">Mittel</option><option value="high">Hoch</option></select>
                            <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="px-3 py-1.5 border dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-700 dark:text-white" />
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
