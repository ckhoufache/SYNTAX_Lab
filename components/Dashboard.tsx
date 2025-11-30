
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Bell, Search, Sparkles, CheckCircle2, Phone, Mail, Calendar, ArrowUpRight, Plus, X, Trash2, Circle, User, KanbanSquare, ClipboardList, AlertCircle, Clock, Check } from 'lucide-react';
import { Task, Deal, Contact, DealStage } from '../types';
import { chartData } from '../services/mockData';
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
  onNavigateToTasks
}) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  
  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<'view' | 'add'>('view');
  
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
  
  // Dismissed Notifications Logic (Persisted in LocalStorage)
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
      const stored = localStorage.getItem('dismissed_notifications');
      return stored ? JSON.parse(stored) : [];
  });

  // Regular sync for state changes (e.g. mark all as read)
  useEffect(() => {
      localStorage.setItem('dismissed_notifications', JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<Task['type']>('todo');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived Stats
  const totalRevenue = deals.reduce((acc, curr) => curr.stage === DealStage.WON ? acc + curr.value : acc, 0);
  
  // Berechnung angepasst: Nur "Verhandlung" und "Angebot"
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
      
      // Setze Zeit auf 00:00:00 für korrekten Datumsvergleich
      taskDate.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      
      return taskDate.getTime() === today.getTime();
  }).sort((a, b) => {
      // Sortiere nach Priorität (High first) dann nach Zeit
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return 0;
  });

  // --- Notifications Logic ---
  const notifications = useMemo(() => {
      const list = [];
      const today = new Date();
      today.setHours(0,0,0,0);

      // 1. Overdue Tasks
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

      // 2. High Priority Today
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

      // 3. Deals in Negotiation (Movement needed)
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

      // Filter out dismissed notifications
      return list.filter(n => !dismissedNotificationIds.includes(n.id));
  }, [tasks, deals, upcomingTasks, dismissedNotificationIds]);

  const handleNotificationClick = (id: string, action: () => void) => {
      // Calculate new state
      const newDismissedIds = [...dismissedNotificationIds, id];
      
      // Update State
      setDismissedNotificationIds(newDismissedIds);
      
      // CRITICAL: Persist immediately to LocalStorage.
      // Doing this here ensures the "read" status is saved even if the component unmounts immediately due to navigation.
      localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissedIds));

      // Execute navigation action
      action();
      
      // Close dropdown
      setShowNotifications(false);
  };

  const handleMarkAllAsRead = () => {
      const allIds = notifications.map(n => n.id);
      const newDismissedIds = [...dismissedNotificationIds, ...allIds];
      
      setDismissedNotificationIds(newDismissedIds);
      // Persist immediately as well
      localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissedIds));
  };

  // Search Logic
  useEffect(() => {
    if (!searchTerm.trim()) {
        setSearchResults({ contacts: [], deals: [], tasks: [] });
        return;
    }
    const lower = searchTerm.toLowerCase();
    
    const foundContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(lower) || 
        c.company.toLowerCase().includes(lower)
    ).slice(0, 3); // Limit results

    const foundDeals = deals.filter(d => 
        d.title.toLowerCase().includes(lower)
    ).slice(0, 3);

    const foundTasks = tasks.filter(t => 
        t.title.toLowerCase().includes(lower)
    ).slice(0, 3);

    setSearchResults({ contacts: foundContacts, deals: foundDeals, tasks: foundTasks });
  }, [searchTerm, contacts, deals, tasks]);

  // Click outside handlers
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          // Search
          if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
              setShowSearchResults(false);
          }
          // Notifications
          if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
              setShowNotifications(false);
          }
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
    
    // Wenn wir im "Add Only" Modus waren, schließen wir das Modal nach dem Hinzufügen
    if (taskModalMode === 'add') {
        setIsTaskModalOpen(false);
    }
  };

  const toggleTaskCompletion = (task: Task) => {
      onUpdateTask({ ...task, isCompleted: !task.isCompleted });
  };

  // Handler buttons
  const openTaskQuickView = () => {
      onNavigateToTasks(); // Redirects to Tasks Page instead of opening modal
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
      {/* Top Bar */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm">Willkommen zurück, Max.</p>
        </div>
        <div className="flex items-center gap-4">
          
          {/* Search Bar */}
          <div className="relative" ref={searchRef}>
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Suche..." 
              value={searchTerm}
              onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="pl-10 pr-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
            />
            
            {/* Search Dropdown */}
            {showSearchResults && searchTerm.trim() && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                    {/* Contacts Results */}
                    {searchResults.contacts.length > 0 && (
                        <div className="p-2">
                            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-2 mb-1">Kontakte</h4>
                            {searchResults.contacts.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => {
                                        onNavigateToContacts('all', c.id);
                                        setShowSearchResults(false);
                                        setSearchTerm('');
                                    }}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                    <div className="p-1.5 bg-indigo-50 dark:bg-slate-700 rounded-full text-indigo-600 dark:text-indigo-400">
                                        <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{c.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{c.company}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Deals Results */}
                    {searchResults.deals.length > 0 && (
                        <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                             <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-2 mb-1">Deals</h4>
                             {searchResults.deals.map(d => (
                                <div 
                                    key={d.id} 
                                    onClick={() => {
                                        onNavigateToPipeline([d.stage], d.id);
                                        setShowSearchResults(false);
                                        setSearchTerm('');
                                    }}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                    <div className="p-1.5 bg-amber-50 dark:bg-slate-700 rounded-full text-amber-600 dark:text-amber-500">
                                        <KanbanSquare className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{d.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{d.value}€ • {d.stage}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tasks Results */}
                    {searchResults.tasks.length > 0 && (
                        <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                             <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase px-2 mb-1">Aufgaben</h4>
                             {searchResults.tasks.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => {
                                        onNavigateToTasks(t.id);
                                        setShowSearchResults(false);
                                        setSearchTerm('');
                                    }}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                    <div className="p-1.5 bg-green-50 dark:bg-slate-700 rounded-full text-green-600 dark:text-green-500">
                                        <ClipboardList className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{t.priority} • {t.dueDate}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {searchResults.contacts.length === 0 && searchResults.deals.length === 0 && searchResults.tasks.length === 0 && (
                        <div className="p-6 text-center">
                            <p className="text-sm text-slate-500">Keine Ergebnisse gefunden.</p>
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${showNotifications ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                <Bell className={`w-5 h-5 ${isDark(notifications.length > 0 ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400')}`} />
                {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                  <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                          <h3 className="font-semibold text-sm text-slate-800 dark:text-white">Benachrichtigungen</h3>
                          <div className="flex items-center gap-2">
                             <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300">
                                 {notifications.length}
                             </span>
                             {notifications.length > 0 && (
                                 <button 
                                    onClick={handleMarkAllAsRead}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                                    title="Alles als gelesen markieren"
                                 >
                                     <Check className="w-3 h-3" />
                                     Alle
                                 </button>
                             )}
                          </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                          {notifications.length > 0 ? (
                              notifications.map(n => (
                                  <div 
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n.id, n.onClick)}
                                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700/50 cursor-pointer transition-colors flex gap-3 items-start group"
                                  >
                                      <div className={`mt-0.5 p-1.5 rounded-full shrink-0 ${
                                          n.type === 'alert' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                          n.type === 'warning' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                                          'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                      }`}>
                                          {n.type === 'alert' ? <AlertCircle className="w-4 h-4" /> :
                                           n.type === 'warning' ? <Clock className="w-4 h-4" /> :
                                           <Sparkles className="w-4 h-4" />}
                                      </div>
                                      <div>
                                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                                              {n.title}
                                          </p>
                                          <p className="text-xs text-slate-500 mt-1">{n.time}</p>
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="p-8 text-center text-slate-400">
                                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                  <p className="text-sm">Alles auf dem Laufenden.</p>
                              </div>
                          )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-2 text-center border-t border-slate-100 dark:border-slate-700">
                          <button 
                              onClick={() => setShowNotifications(false)}
                              className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                          >
                              Schließen
                          </button>
                      </div>
                  </div>
              )}
          </div>

        </div>
      </header>

      <main className="p-8 space-y-8 pb-20">
        
        {/* AI Briefing Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                <h2 className="font-semibold text-lg">Smart Insight</h2>
              </div>
              
              <button
                onClick={handleGenerateInsight}
                disabled={loadingBriefing}
                className="bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm border border-white/30 flex items-center gap-2"
              >
                 {loadingBriefing ? 'Analysiere...' : (briefing ? 'Neu analysieren' : 'Jetzt analysieren')}
                 {!loadingBriefing && <Sparkles className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            <div className="min-h-[40px]">
                {loadingBriefing ? (
                    <div className="space-y-2 opacity-50 animate-pulse">
                        <div className="h-4 bg-white/30 rounded w-3/4"></div>
                        <div className="h-4 bg-white/30 rounded w-1/2"></div>
                    </div>
                ) : (
                    <p className="text-indigo-100 max-w-3xl leading-relaxed whitespace-pre-line">
                      {briefing || "Lassen Sie die KI Ihre aktuellen Aufgaben und Pipeline-Daten analysieren, um personalisierte Handlungsempfehlungen zu erhalten."}
                    </p>
                )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Gesamtumsatz" 
            value={`${totalRevenue.toLocaleString('de-DE')} €`} 
            sub="+12% zum Vormonat" 
            icon={CheckCircle2} 
            color="bg-emerald-500" 
          />
          <StatCard 
            title="Aktive Pipeline" 
            value={`${activeVolume.toLocaleString('de-DE')} €`} 
            sub="Verhandlung & Angebot" 
            icon={Calendar} 
            color="bg-blue-500"
            onClick={() => onNavigateToPipeline([DealStage.PROPOSAL, DealStage.NEGOTIATION])}
          />
          <StatCard 
            title="Neue Kontakte" 
            value={`+${contacts.length}`} 
            sub="Diese Woche" 
            icon={Phone} 
            color="bg-orange-500"
            onClick={() => onNavigateToContacts('recent')}
          />
          <StatCard 
            title="Offene Aufgaben" 
            value={dueTasksCount} 
            sub="2 hohe Priorität" 
            icon={Mail} 
            color="bg-pink-500"
            onClick={() => onNavigateToTasks()}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Umsatzentwicklung</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks List Widget */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Heute fällig</h3>
              <button 
                onClick={openTaskQuickView}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Alle ansehen
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {upcomingTasks.map(task => (
                <div 
                    key={task.id} 
                    onClick={openTaskQuickView}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-600 group"
                >
                  <div 
                    onClick={(e) => { e.stopPropagation(); toggleTaskCompletion(task); }}
                    className={`mt-1.5 w-4 h-4 rounded-full border cursor-pointer flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-500 hover:border-indigo-500'}`}
                  >
                      {task.isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${
                        task.priority === 'high' ? 'bg-red-500' : 
                        task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                      }`} />
                      {task.type === 'call' && <Phone className="w-3 h-3 text-slate-400" />}
                      {task.type === 'email' && <Mail className="w-3 h-3 text-slate-400" />}
                      {task.type === 'todo' && <CheckCircle2 className="w-3 h-3 text-slate-400" />}
                      <span className="text-xs text-slate-500">{task.startTime ? task.startTime : 'Ganztägig'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {upcomingTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                    <CheckCircle2 className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm text-center">Nichts fällig heute.</p>
                </div>
              )}
            </div>
            <button 
                onClick={openAddTaskModal}
                className="w-full mt-4 py-2 text-sm text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" /> Aufgabe hinzufügen
            </button>
          </div>
        </div>
      </main>

      {/* Task Manager Modal (Only for adding new tasks from Dashboard) */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col`}>
                
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-600" />
                        Neue Aufgabe
                    </h2>
                    <button 
                        onClick={() => setIsTaskModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Add Task Form */}
                <form 
                    onSubmit={handleAddNewTask} 
                    className="p-6 bg-white dark:bg-slate-800"
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                             <input 
                                required
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                type="text" 
                                placeholder="Was muss erledigt werden?" 
                                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                autoFocus
                            />
                            <button 
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                                Hinzufügen
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={newTaskType}
                                onChange={(e) => setNewTaskType(e.target.value as any)}
                                className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                            >
                                <option value="call">Anruf</option>
                                <option value="email">E-Mail</option>
                                <option value="meeting">Meeting</option>
                                <option value="todo">To-Do</option>
                            </select>
                            <select 
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                            >
                                <option value="low">Niedrig</option>
                                <option value="medium">Mittel</option>
                                <option value="high">Hoch</option>
                            </select>
                            <input 
                                type="date"
                                value={newTaskDate}
                                onChange={(e) => setNewTaskDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                            />
                        </div>
                    </div>
                </form>

            </div>
        </div>
      )}
    </div>
  );
};

// Helper for dark mode check inside render (usually would be better as hook or prop)
function isDark(classes: string) {
    return classes;
}
