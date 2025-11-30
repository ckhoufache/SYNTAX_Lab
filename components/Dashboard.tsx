
import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Bell, Search, Sparkles, CheckCircle2, Phone, Mail, Calendar, ArrowUpRight, Plus, X, Trash2, Circle } from 'lucide-react';
import { Task, Deal, Contact } from '../types';
import { chartData } from '../services/mockData';
import { generateDailyBriefing } from '../services/gemini';

interface DashboardProps {
  tasks: Task[];
  deals: Deal[];
  contacts: Contact[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onNavigateToContacts: (filter: 'all' | 'recent') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  tasks, 
  deals, 
  contacts,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onNavigateToContacts
}) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'open' | 'completed'>('open');

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<Task['type']>('todo');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);

  // Derived Stats
  const totalRevenue = deals.reduce((acc, curr) => curr.stage === 'Gewonnen' ? acc + curr.value : acc, 0);
  const activeVolume = deals.reduce((acc, curr) => curr.stage !== 'Gewonnen' && curr.stage !== 'Lead' ? acc + curr.value : acc, 0);
  const dueTasks = tasks.filter(t => !t.isCompleted).length;

  useEffect(() => {
    const fetchBriefing = async () => {
        if (!process.env.API_KEY && !localStorage.getItem('gemini_api_key')) {
            setBriefing("Verbinden Sie Ihre API Key in den Einstellungen für tägliche KI-Insights.");
            return;
        }
        setLoadingBriefing(true);
        const text = await generateDailyBriefing(tasks, deals);
        setBriefing(text);
        setLoadingBriefing(false);
    };
    fetchBriefing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  };

  const toggleTaskCompletion = (task: Task) => {
      onUpdateTask({ ...task, isCompleted: !task.isCompleted });
  };

  const StatCard = ({ title, value, sub, icon: Icon, color, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
    >
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
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
    <div className="flex-1 bg-slate-50/50 min-h-screen overflow-y-auto relative">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Willkommen zurück, Max.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Suche..." 
              className="pl-10 pr-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
          </div>
          <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      <main className="p-8 space-y-8 pb-20">
        
        {/* AI Briefing Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <h2 className="font-semibold text-lg">Smart Insight</h2>
            </div>
            <p className="text-indigo-100 max-w-3xl leading-relaxed">
              {loadingBriefing ? "Analysiere CRM Daten..." : briefing}
            </p>
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
            sub="5 Deals in Verhandlung" 
            icon={Calendar} 
            color="bg-blue-500" 
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
            value={dueTasks} 
            sub="2 hohe Priorität" 
            icon={Mail} 
            color="bg-pink-500"
            onClick={() => setIsTaskModalOpen(true)}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Umsatzentwicklung</h3>
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
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Fällige Aufgaben</h3>
              <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="text-xs text-indigo-600 font-medium hover:underline"
              >
                Alle ansehen
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {tasks.filter(t => !t.isCompleted).slice(0, 4).map(task => (
                <div 
                    key={task.id} 
                    onClick={() => setIsTaskModalOpen(true)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100 group"
                >
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'high' ? 'bg-red-500' : 
                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.type === 'call' && <Phone className="w-3 h-3 text-slate-400" />}
                      {task.type === 'email' && <Mail className="w-3 h-3 text-slate-400" />}
                      {task.type === 'todo' && <CheckCircle2 className="w-3 h-3 text-slate-400" />}
                      <span className="text-xs text-slate-500">{task.dueDate}</span>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.filter(t => !t.isCompleted).length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                    <CheckCircle2 className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-sm">Keine offenen Aufgaben.</p>
                </div>
              )}
            </div>
            <button 
                onClick={() => setIsTaskModalOpen(true)}
                className="w-full mt-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" /> Aufgabe hinzufügen
            </button>
          </div>
        </div>
      </main>

      {/* Task Manager Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        Aufgaben Manager
                    </h2>
                    <button 
                        onClick={() => setIsTaskModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-slate-100 px-6 pt-2 gap-6 shrink-0">
                    <button 
                        onClick={() => setTaskFilter('open')}
                        className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                            taskFilter === 'open' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Offen ({tasks.filter(t => !t.isCompleted).length})
                    </button>
                    <button 
                        onClick={() => setTaskFilter('completed')}
                        className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                            taskFilter === 'completed' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Erledigt
                    </button>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
                    <div className="space-y-1">
                        {tasks
                          .filter(t => taskFilter === 'open' ? !t.isCompleted : t.isCompleted)
                          .map(task => (
                            <div key={task.id} className="group flex items-center gap-3 p-3 mx-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-200 shadow-sm transition-all">
                                <button 
                                    onClick={() => toggleTaskCompletion(task)}
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                        task.isCompleted 
                                        ? 'bg-green-500 border-green-500 text-white' 
                                        : 'border-slate-300 hover:border-indigo-500'
                                    }`}
                                >
                                    {task.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                        {task.title}
                                    </p>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                            task.priority === 'high' ? 'bg-red-50 text-red-600' :
                                            task.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                                            'bg-green-50 text-green-600'
                                        }`}>
                                            {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {task.dueDate}
                                        </span>
                                        <span className="capitalize">{task.type}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => onDeleteTask(task.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    title="Löschen"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {tasks.filter(t => taskFilter === 'open' ? !t.isCompleted : t.isCompleted).length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <p>Keine {taskFilter === 'open' ? 'offenen' : 'erledigten'} Aufgaben gefunden.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Add Task Form (Footer) */}
                <form onSubmit={handleAddNewTask} className="p-4 bg-white border-t border-slate-200 shrink-0">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Neue Aufgabe erstellen</p>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                             <input 
                                required
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                type="text" 
                                placeholder="Was muss erledigt werden?" 
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                            >
                                <option value="call">Anruf</option>
                                <option value="email">E-Mail</option>
                                <option value="meeting">Meeting</option>
                                <option value="todo">To-Do</option>
                            </select>
                            <select 
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
                            >
                                <option value="low">Niedrig</option>
                                <option value="medium">Mittel</option>
                                <option value="high">Hoch</option>
                            </select>
                            <input 
                                type="date"
                                value={newTaskDate}
                                onChange={(e) => setNewTaskDate(e.target.value)}
                                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-slate-600"
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
