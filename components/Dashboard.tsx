import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Bell, Search, Sparkles, CheckCircle2, Phone, Mail, Calendar, ArrowUpRight } from 'lucide-react';
import { Task, Deal, Contact } from '../types';
import { chartData } from '../services/mockData';
import { generateDailyBriefing } from '../services/gemini';

interface DashboardProps {
  tasks: Task[];
  deals: Deal[];
  contacts: Contact[];
}

export const Dashboard: React.FC<DashboardProps> = ({ tasks, deals, contacts }) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loadingBriefing, setLoadingBriefing] = useState<boolean>(false);

  // Derived Stats
  const totalRevenue = deals.reduce((acc, curr) => curr.stage === 'Gewonnen' ? acc + curr.value : acc, 0);
  const activeVolume = deals.reduce((acc, curr) => curr.stage !== 'Gewonnen' && curr.stage !== 'Lead' ? acc + curr.value : acc, 0);
  const dueTasks = tasks.filter(t => !t.isCompleted).length;

  useEffect(() => {
    // Attempt to fetch AI briefing on mount
    const fetchBriefing = async () => {
        if (!process.env.API_KEY) {
            setBriefing("Verbinden Sie Ihre API Key für tägliche Insights.");
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

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
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
    <div className="flex-1 bg-slate-50/50 min-h-screen overflow-y-auto">
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

      <main className="p-8 space-y-8">
        
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
          />
          <StatCard 
            title="Offene Aufgaben" 
            value={dueTasks} 
            sub="2 hohe Priorität" 
            icon={Mail} 
            color="bg-pink-500" 
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

          {/* Tasks List */}
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Fällige Aufgaben</h3>
              <button className="text-xs text-indigo-600 font-medium hover:underline">Alle ansehen</button>
            </div>
            <div className="space-y-4">
              {tasks.filter(t => !t.isCompleted).slice(0, 4).map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'high' ? 'bg-red-500' : 
                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
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
                <p className="text-sm text-slate-400 text-center py-4">Keine offenen Aufgaben.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};