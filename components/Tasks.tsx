
import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle2, Calendar as CalendarIcon, Clock, X, ChevronLeft, ChevronRight, List, Repeat, Trash2, Pencil, Zap } from 'lucide-react';
import { Task, UserProfile } from '../types';

interface TasksProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  focusedTaskId: string | null;
  onClearFocus: () => void;
  teamMembers?: UserProfile[]; 
}

type ViewMode = 'month' | 'list';

export const Tasks: React.FC<TasksProps> = ({ 
    tasks, 
    onAddTask, 
    onUpdateTask, 
    onDeleteTask,
    focusedTaskId,
    onClearFocus,
    teamMembers = [] 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(focusedTaskId ? 'list' : 'list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const toLocalDateString = (date: Date) => { 
    const year = date.getFullYear(); 
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    const d = String(date.getDate()).padStart(2, '0'); 
    return `${year}-${month}-${d}`; 
  };

  const [formData, setFormData] = useState({
      title: '', type: 'todo' as Task['type'], priority: 'medium' as Task['priority'], dueDate: toLocalDateString(new Date()),
      isAllDay: true, startTime: '09:00', endTime: '10:00', recurrence: 'none' as Task['recurrence'], assignedToEmail: ''
  });

  const getTasksForDate = (date: Date) => {
    const dateString = toLocalDateString(date);
    return tasks.filter(t => {
      if (!t.recurrence || t.recurrence === 'none') return t.dueDate === dateString;
      const taskDate = new Date(t.dueDate);
      if (new Date(dateString) < taskDate) return false;
      if (t.recurrence === 'weekly') return taskDate.getDay() === date.getDay();
      if (t.recurrence === 'monthly') return taskDate.getDate() === date.getDate();
      if (t.recurrence === 'yearly') return taskDate.getDate() === date.getDate() && taskDate.getMonth() === date.getMonth();
      return false;
    });
  };

  const handleOpenCreate = () => { 
    setEditingTaskId(null); 
    setFormData({ title: '', type: 'todo', priority: 'medium', dueDate: toLocalDateString(new Date()), isAllDay: true, startTime: '09:00', endTime: '10:00', recurrence: 'none', assignedToEmail: '' }); 
    setIsModalOpen(true); 
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setFormData({
      title: task.title, type: task.type, priority: task.priority, dueDate: task.dueDate,
      isAllDay: task.isAllDay ?? true, startTime: task.startTime || '09:00', endTime: task.endTime || '10:00',
      recurrence: task.recurrence || 'none', assignedToEmail: task.assignedToEmail || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title) return;
      const taskData: Partial<Task> = {
          title: formData.title, type: formData.type, priority: formData.priority, dueDate: formData.dueDate,
          isAllDay: formData.isAllDay, startTime: formData.isAllDay ? undefined : formData.startTime, endTime: formData.isAllDay ? undefined : formData.endTime,
          recurrence: formData.recurrence, assignedToEmail: formData.assignedToEmail || undefined
      };
      if (editingTaskId) {
          const original = tasks.find(t => t.id === editingTaskId);
          if (original) onUpdateTask({ ...original, ...taskData });
      } else {
          onAddTask({ 
            id: crypto.randomUUID(), 
            isCompleted: false, 
            createdAt: new Date().toISOString(), 
            ...(taskData as Task) 
          });
      }
      setIsModalOpen(false);
  };

  const toggleCompletion = (task: Task) => {
      onUpdateTask({ 
        ...task, 
        isCompleted: !task.isCompleted, 
        completedAt: !task.isCompleted ? new Date().toISOString() : undefined 
      });
  };

  const renderMonthView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="grid grid-cols-7 border-t border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => (
          <div key={d} className="p-3 text-center text-xs font-bold text-slate-400 border-r border-b border-slate-200 dark:border-slate-800 uppercase bg-slate-50 dark:bg-slate-900/50">{d}</div>
        ))}
        {Array(offset).fill(null).map((_, i) => <div key={`empty-${i}`} className="border-r border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30" />)}
        {days.map(day => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dayTasks = getTasksForDate(date);
          const isToday = toLocalDateString(new Date()) === toLocalDateString(date);
          return (
            <div key={day} className={`min-h-[120px] p-2 border-r border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}>
              <span className={`text-sm font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{day}</span>
              <div className="mt-1 space-y-1">
                {dayTasks.slice(0, 3).map(t => (
                  <div key={t.id} onClick={() => handleOpenEdit(t)} className={`text-[10px] p-1 rounded border truncate cursor-pointer transition-all hover:scale-[1.02] ${t.isCompleted ? 'bg-slate-100 text-slate-400 line-through border-slate-200' : 'bg-white dark:bg-slate-700 border-indigo-100 text-slate-700 dark:text-slate-200 font-medium'}`}>
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && <p className="text-[9px] text-slate-400 font-medium pl-1">+{dayTasks.length - 3} weitere</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = () => {
    let displayTasks = focusedTaskId ? tasks.filter(t => t.id === focusedTaskId) : [...tasks];
    displayTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return (
      <div className="space-y-3 max-w-4xl mx-auto">
        {focusedTaskId && (
          <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2">
            <span className="text-sm font-medium text-indigo-700">Filter: Einzelergebnis</span>
            <button onClick={onClearFocus} className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline">
              <X className="w-3 h-3"/> Filter löschen
            </button>
          </div>
        )}
        {displayTasks.map(task => (
          <div key={task.id} className={`group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 transition-all hover:border-indigo-300 ${task.isCompleted ? 'opacity-60' : ''}`}>
            <button onClick={() => toggleCompletion(task)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-indigo-500'}`}>
              {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
            </button>
            <div className="flex-1 cursor-pointer" onClick={() => handleOpenEdit(task)}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{task.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  task.type === 'post' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                }`}>{task.type}</span>
                {task.recurrence && task.recurrence !== 'none' && <Repeat className="w-3 h-3 text-indigo-500" />}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> {new Date(task.dueDate).toLocaleDateString('de-DE')}</span>
                {!task.isAllDay && task.startTime && <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {task.startTime} Uhr</span>}
                {task.assignedToEmail && <span className="text-indigo-600 dark:text-indigo-400 font-medium">@ {teamMembers.find(m => m.email === task.assignedToEmail)?.firstName || task.assignedToEmail}</span>}
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => onDeleteTask(task.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
            </div>
          </div>
        ))}
        {displayTasks.length === 0 && (
          <div className="py-20 text-center text-slate-400 italic">Keine Aufgaben gefunden.</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-screen overflow-hidden flex flex-col relative custom-scrollbar">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Kalender & Aufgaben</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Planen Sie Ihren Workflow und Content.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Liste</button>
            <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Monat</button>
          </div>
          <button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Task erstellen
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
        {viewMode === 'month' ? (
          <div className="space-y-4">
             <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  {currentDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">Heute</button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"><ChevronRight className="w-5 h-5"/></button>
                </div>
             </div>
             {renderMonthView()}
          </div>
        ) : renderListView()}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50 dark:bg-slate-900">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editingTaskId ? 'Task bearbeiten' : 'Neuer Task'}</h2>
                  <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Titel</label>
                      <input required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500">Task-Typ</label>
                          <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            <option value="todo">To-Do</option>
                            <option value="post">Beitrag (Post)</option>
                            <option value="call">Anruf</option>
                            <option value="meeting">Meeting</option>
                            <option value="email">E-Mail</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500">Priorität</label>
                          <select value={formData.priority} onChange={e=>setFormData({...formData, priority: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            <option value="low">Niedrig</option>
                            <option value="medium">Mittel</option>
                            <option value="high">Hoch</option>
                          </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500">Datum</label>
                          <input type="date" value={formData.dueDate} onChange={e=>setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500">Wiederholung</label>
                          <select value={formData.recurrence} onChange={e=>setFormData({...formData, recurrence: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            <option value="none">Keine</option>
                            <option value="weekly">Wöchentlich</option>
                            <option value="monthly">Monatlich</option>
                            <option value="yearly">Jährlich</option>
                          </select>
                        </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Zuständigkeit</label>
                      <select value={formData.assignedToEmail} onChange={e=>setFormData({...formData, assignedToEmail: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                        <option value="">Nicht zugewiesen</option>
                        {teamMembers.map(m => <option key={m.email} value={m.email}>{m.firstName} {m.lastName}</option>)}
                      </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500">Abbrechen</button>
                      <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                        {editingTaskId ? 'Änderungen speichern' : 'Task anlegen'}
                      </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
