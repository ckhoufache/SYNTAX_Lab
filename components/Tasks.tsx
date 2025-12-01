
import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle2, Calendar as CalendarIcon, Phone, Mail, FileText, Pencil, Trash2, X, ChevronLeft, ChevronRight, Clock, LayoutGrid, List, CheckSquare, Square } from 'lucide-react';
import { Task } from '../types';

interface TasksProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  focusedTaskId: string | null;
  onClearFocus: () => void;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';

export const Tasks: React.FC<TasksProps> = ({ 
    tasks, 
    onAddTask, 
    onUpdateTask, 
    onDeleteTask,
    focusedTaskId,
    onClearFocus
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Standardmäßig Liste anzeigen
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Filter State für Listenansicht: 'open' oder 'completed'
  const [listFilter, setListFilter] = useState<'open' | 'completed'>('open');
  
  // Wenn focusedTaskId gesetzt ist, erzwinge Listenansicht
  useEffect(() => {
      if (focusedTaskId) {
          setViewMode('list');
      }
  }, [focusedTaskId]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Helper to format date as YYYY-MM-DD in LOCAL time, not UTC
  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${d}`;
  };

  // Form State
  const [formData, setFormData] = useState<{
      title: string;
      type: Task['type'];
      priority: Task['priority'];
      dueDate: string;
      isAllDay: boolean;
      startTime: string;
      endTime: string;
  }>({
      title: '',
      type: 'todo',
      priority: 'medium',
      dueDate: toLocalDateString(new Date()),
      isAllDay: true,
      startTime: '09:00',
      endTime: '10:00'
  });

  // --- Date Navigation Helpers ---

  const handleNext = () => {
    if (viewMode === 'list') return;
    
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() + 1);
        newDate.setDate(1); // Reset to first of month to avoid overflow issues
    } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() + 7);
    } else { // day
        newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handlePrev = () => {
    if (viewMode === 'list') return;

    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
        newDate.setMonth(newDate.getMonth() - 1);
        newDate.setDate(1);
    } else if (viewMode === 'week') {
        newDate.setDate(newDate.getDate() - 7);
    } else { // day
        newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  // Helper strings
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  
  const getHeaderTitle = () => {
      if (viewMode === 'list') {
          return "Aufgabenliste";
      } else if (viewMode === 'month') {
          return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
      } else if (viewMode === 'day') {
          return currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      } else { // week
          const startOfWeek = new Date(currentDate);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
          startOfWeek.setDate(diff);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          
          const startMonth = monthNames[startOfWeek.getMonth()];
          const endMonth = monthNames[endOfWeek.getMonth()];
          
          if (startMonth === endMonth) {
              return `${startOfWeek.getDate()}. - ${endOfWeek.getDate()}. ${startMonth} ${startOfWeek.getFullYear()}`;
          } else {
              return `${startOfWeek.getDate()}. ${startMonth} - ${endOfWeek.getDate()}. ${endMonth} ${endOfWeek.getFullYear()}`;
          }
      }
  };

  // --- Task Data Helpers ---

  const getTasksForDate = (date: Date) => {
      const dateString = toLocalDateString(date);

      return tasks.filter(t => t.dueDate === dateString).sort((a, b) => {
          if (a.isAllDay && !b.isAllDay) return -1;
          if (!a.isAllDay && b.isAllDay) return 1;
          if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
          return 0;
      });
  };

  // --- Modal Handlers ---

  const handleOpenCreate = (preselectedDate?: string, preselectedTime?: string) => {
      setEditingTaskId(null);
      setFormData({
          title: '',
          type: 'todo',
          priority: 'medium',
          dueDate: preselectedDate || toLocalDateString(new Date()),
          isAllDay: !preselectedTime, // If time provided, it's not all day
          startTime: preselectedTime || '09:00',
          endTime: preselectedTime ? calculateEndTime(preselectedTime) : '10:00'
      });
      setIsModalOpen(true);
  };

  const calculateEndTime = (startTime: string) => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHour = (hours + 1) % 24;
      return `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const handleOpenEdit = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      setEditingTaskId(task.id);
      setFormData({
          title: task.title,
          type: task.type,
          priority: task.priority,
          dueDate: task.dueDate,
          isAllDay: task.isAllDay ?? true,
          startTime: task.startTime || '09:00',
          endTime: task.endTime || '10:00'
      });
      setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title) return;

      const taskData: Partial<Task> = {
          title: formData.title,
          type: formData.type,
          priority: formData.priority,
          dueDate: formData.dueDate,
          isAllDay: formData.isAllDay,
          startTime: formData.isAllDay ? undefined : formData.startTime,
          endTime: formData.isAllDay ? undefined : formData.endTime
      };

      if (editingTaskId) {
          const original = tasks.find(t => t.id === editingTaskId);
          if (original) {
              onUpdateTask({ ...original, ...taskData });
          }
      } else {
          onAddTask({
              id: Math.random().toString(36).substr(2, 9),
              isCompleted: false,
              ...(taskData as Task)
          });
      }
      setIsModalOpen(false);
  };

  const toggleCompletion = (e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      onUpdateTask({ ...task, isCompleted: !task.isCompleted });
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDeleteTask(id);
  }

  // --- Rendering ---

  // Common Task Item Render
  const renderTaskItem = (task: Task, minimal = false) => (
      <div 
        key={task.id}
        onClick={(e) => handleOpenEdit(e, task)}
        className={`rounded border text-xs shadow-sm flex items-center gap-2 group/item hover:scale-[1.01] transition-all cursor-pointer overflow-hidden ${
            minimal ? 'px-1 py-0.5' : 'px-2 py-1.5'
        } ${
            task.isCompleted 
            ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-70 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500' 
            : `bg-white dark:bg-slate-800 dark:text-slate-200 hover:border-indigo-300 ${task.priority === 'high' ? 'border-red-200 border-l-4 border-l-red-500 dark:border-red-900' : task.priority === 'medium' ? 'border-amber-200 border-l-4 border-l-amber-500 dark:border-amber-900' : 'border-green-200 border-l-4 border-l-green-500 dark:border-green-900'}`
        }`}
      >
        <div 
            onClick={(e) => toggleCompletion(e, task)}
            className={`rounded-full border flex items-center justify-center shrink-0 hover:border-indigo-500 ${minimal ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${task.isCompleted ? 'bg-slate-400 border-slate-400 dark:bg-slate-600 dark:border-slate-600' : 'border-slate-300 dark:border-slate-500'}`}
        >
            {task.isCompleted && <CheckCircle2 className={`${minimal ? 'w-2 h-2' : 'w-2.5 h-2.5'} text-white`} />}
        </div>
        <div className="flex-1 min-w-0">
            <span className={`truncate block font-medium ${task.isCompleted ? 'line-through' : ''}`}>{task.title}</span>
            {!minimal && !task.isAllDay && task.startTime && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block -mt-0.5">{task.startTime} - {task.endTime}</span>
            )}
        </div>
      </div>
  );

  const renderListView = () => {
    // Wenn focusedTaskId existiert, zeige nur diese
    let displayTasks = tasks;
    
    if (focusedTaskId) {
        displayTasks = tasks.filter(t => t.id === focusedTaskId);
    } else {
        // Filter basierend auf Tab-Auswahl (Offen / Erledigt)
        displayTasks = tasks.filter(t => 
            listFilter === 'open' ? !t.isCompleted : t.isCompleted
        ).sort((a, b) => {
            // Sortierung: Überfällige zuerst, dann nach Datum
            if (a.dueDate < b.dueDate) return -1;
            if (a.dueDate > b.dueDate) return 1;
            // Bei gleichem Datum nach Priorität
            const prioValue = { high: 3, medium: 2, low: 1 };
            return prioValue[b.priority] - prioValue[a.priority];
        });
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8">
            <div className="max-w-4xl mx-auto space-y-4">
                 
                 {/* Tabs & Header */}
                 <div className="flex flex-col gap-6 mb-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                            {focusedTaskId ? "Suchergebnis" : (listFilter === 'open' ? "Offene Aufgaben" : "Erledigte Aufgaben")}
                            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {displayTasks.length}
                            </span>
                        </h2>
                        {focusedTaskId && (
                             <button 
                                onClick={onClearFocus}
                                className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
                             >
                                 <X className="w-4 h-4" /> Alle anzeigen
                             </button>
                        )}
                    </div>

                    {/* Filter Toggle (Nur sichtbar wenn kein Fokus) */}
                    {!focusedTaskId && (
                        <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
                            <button
                                onClick={() => setListFilter('open')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    listFilter === 'open' 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Square className="w-4 h-4" />
                                Offen
                            </button>
                            <button
                                onClick={() => setListFilter('completed')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    listFilter === 'completed' 
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800' 
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <CheckSquare className="w-4 h-4" />
                                Erledigt
                            </button>
                        </div>
                    )}
                 </div>

                 {displayTasks.length === 0 && (
                     <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                         <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                         <p className="font-medium">
                             {focusedTaskId 
                                ? "Aufgabe nicht gefunden." 
                                : listFilter === 'open' 
                                    ? "Alles erledigt! Keine offenen Aufgaben." 
                                    : "Noch keine erledigten Aufgaben."}
                         </p>
                     </div>
                 )}

                 {displayTasks.map(task => (
                     <div key={task.id} className={`bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm flex items-center gap-4 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group animate-in slide-in-from-bottom-2 ${focusedTaskId ? 'border-indigo-300 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div 
                            onClick={(e) => toggleCompletion(e, task)}
                            className={`rounded-full border flex items-center justify-center shrink-0 w-6 h-6 cursor-pointer hover:border-indigo-500 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors`}
                            title={task.isCompleted ? "Als offen markieren" : "Als erledigt markieren"}
                        >
                             {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                        </div>
                        
                        <div className="flex-1 cursor-pointer" onClick={(e) => handleOpenEdit(e, task)}>
                            <div className="flex justify-between items-start">
                                <h3 className={`font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${task.isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{task.title}</h3>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                                    task.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                    'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                }`}>{task.priority}</span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                <span className={`flex items-center gap-1 font-medium ${!task.isCompleted && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) ? 'text-red-500 dark:text-red-400' : ''}`}>
                                    <CalendarIcon className="w-3.5 h-3.5" /> 
                                    {new Date(task.dueDate).toLocaleDateString('de-DE')}
                                    {!task.isCompleted && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) && " (Überfällig)"}
                                </span>
                                {!task.isAllDay && task.startTime && (
                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {task.startTime} - {task.endTime} Uhr</span>
                                )}
                                <span className="flex items-center gap-1 uppercase bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-[10px]">
                                    {task.type === 'call' && <Phone className="w-3 h-3"/>}
                                    {task.type === 'email' && <Mail className="w-3 h-3"/>}
                                    {task.type === 'todo' && <CheckCircle2 className="w-3 h-3"/>}
                                    {task.type}
                                </span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={(e) => handleDeleteClick(e, task.id)} 
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Löschen"
                        >
                            <Trash2 className="w-4 h-4"/>
                        </button>
                     </div>
                 ))}
            </div>
        </div>
    );
  };

  const renderMonthView = () => {
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: Date) => {
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1;
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayIndex = getFirstDayOfMonth(currentDate);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-950">
            <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                        <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                    {blanks.map(i => (
                        <div key={`blank-${i}`} className="bg-slate-50/30 dark:bg-slate-900 border-b border-r border-slate-100 dark:border-slate-800"></div>
                    ))}
                    {days.map(day => {
                        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dayTasks = getTasksForDate(checkDate);
                        const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                        return (
                            <div 
                                key={day} 
                                onClick={() => {
                                    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                                    setViewMode('day');
                                }}
                                className={`border-b border-r border-slate-100 dark:border-slate-800 p-2 min-h-[100px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group relative ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'}`}
                            >
                                <div className="flex justify-end mb-1">
                                    <span className={`text-xl font-medium ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                                        {day}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {dayTasks.slice(0, 3).map(task => renderTaskItem(task, true))}
                                    {dayTasks.length > 3 && (
                                        <p className="text-[10px] text-slate-400 pl-1">+{dayTasks.length - 3} weitere</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
  };

  const renderWeekView = () => {
    // Calculate start of week (Monday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        return d;
    });

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 m-4 rounded-xl shadow-sm flex flex-col">
            {/* Header Row */}
            <div className="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <div className="p-4 border-r border-slate-100 dark:border-slate-800"></div> {/* Time Column Header */}
                {weekDays.map((d, i) => {
                    const isToday = d.getDate() === new Date().getDate() && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                    return (
                        <div key={i} className="p-2 text-center border-r border-slate-100 dark:border-slate-800">
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">{['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][d.getDay() === 0 ? 6 : d.getDay() - 1]}</p>
                            <p className={`text-lg font-bold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>{d.getDate()}</p>
                        </div>
                    );
                })}
            </div>
            
            {/* Grid */}
            <div className="flex-1 overflow-y-auto relative">
                 <div className="grid grid-cols-8">
                     {/* Time Labels */}
                     <div className="border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        {hours.map(hour => (
                            <div key={hour} className="h-[80px] border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-right pr-2 pt-1 relative">
                                <span className="-top-2 relative">{hour}:00</span>
                            </div>
                        ))}
                     </div>

                     {/* Days Columns */}
                     {weekDays.map((d, i) => {
                         const dayTasks = getTasksForDate(d);
                         return (
                            <div key={i} className="border-r border-slate-100 dark:border-slate-800 relative group min-h-[1920px]">
                                {/* Hourly Grid Lines */}
                                {hours.map(h => (
                                    <div 
                                        key={h} 
                                        className="h-[80px] border-b border-slate-100 dark:border-slate-800 box-border hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                        onClick={() => handleOpenCreate(toLocalDateString(d), `${String(h).padStart(2, '0')}:00`)}
                                    ></div>
                                ))}

                                {/* Tasks Overlay */}
                                {dayTasks.map(task => {
                                    if (task.isAllDay) return null; // All day tasks handled separately (could be top bar)
                                    if (!task.startTime || !task.endTime) return null;

                                    const [startH, startM] = task.startTime.split(':').map(Number);
                                    const [endH, endM] = task.endTime.split(':').map(Number);
                                    
                                    const startMinutes = startH * 60 + startM;
                                    const endMinutes = endH * 60 + endM;
                                    const duration = endMinutes - startMinutes;

                                    // 1 Hour = 80px (fixed pixel height)
                                    const top = (startMinutes / 60) * 80; // 80px height per hour
                                    const height = (duration / 60) * 80;

                                    return (
                                        <div 
                                            key={task.id}
                                            onClick={(e) => handleOpenEdit(e, task)}
                                            style={{ top: `${top}px`, height: `${height}px` }}
                                            className={`absolute left-1 right-1 rounded border-l-4 p-1 text-[10px] overflow-hidden cursor-pointer shadow-sm hover:z-10 transition-all ${
                                                task.priority === 'high' ? 'bg-red-50 border-red-500 text-red-900 dark:bg-red-900/70 dark:text-red-100' :
                                                task.priority === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-900/70 dark:text-amber-100' :
                                                'bg-green-50 border-green-500 text-green-900 dark:bg-green-900/70 dark:text-green-100'
                                            } ${task.isCompleted ? 'opacity-50 grayscale' : ''}`}
                                        >
                                            <span className="font-bold block truncate">{task.title}</span>
                                            <span className="block">{task.startTime} - {task.endTime}</span>
                                        </div>
                                    );
                                })}

                                {/* All Day Tasks Indicator at Top */}
                                <div className="absolute top-0 left-0 right-0 flex flex-col gap-0.5 p-0.5 pointer-events-none">
                                    {dayTasks.filter(t => t.isAllDay).map(t => (
                                        <div key={t.id} className="h-1.5 w-full bg-indigo-400 rounded-full" title={t.title}></div>
                                    ))}
                                </div>
                            </div>
                         );
                     })}
                 </div>
            </div>
        </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayTasks = getTasksForDate(currentDate);
    const allDayTasks = dayTasks.filter(t => t.isAllDay);
    const timeTasks = dayTasks.filter(t => !t.isAllDay);

    return (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 m-4 rounded-xl shadow-sm flex flex-col">
             {/* All Day Section */}
             {allDayTasks.length > 0 && (
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                     <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Ganztägig</h3>
                     <div className="flex flex-col gap-2">
                        {allDayTasks.map(task => renderTaskItem(task))}
                     </div>
                 </div>
             )}

             {/* Timeline */}
             <div className="flex-1 overflow-y-auto relative">
                <div className="flex min-h-[1920px]">
                    {/* Time Column */}
                    <div className="w-16 border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex-shrink-0">
                         {hours.map(hour => (
                            <div key={hour} className="h-[80px] border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 text-right pr-3 pt-2 relative">
                                <span className="-top-3 relative">{hour}:00</span>
                            </div>
                        ))}
                    </div>

                    {/* Task Area */}
                    <div className="flex-1 relative">
                        {hours.map(h => (
                            <div 
                                key={h} 
                                className="h-[80px] border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 cursor-pointer"
                                onClick={() => handleOpenCreate(toLocalDateString(currentDate), `${String(h).padStart(2, '0')}:00`)}
                            ></div>
                        ))}

                        {/* Tasks Overlay */}
                        {timeTasks.map(task => {
                            if (!task.startTime || !task.endTime) return null;

                            const [startH, startM] = task.startTime.split(':').map(Number);
                            const [endH, endM] = task.endTime.split(':').map(Number);
                            
                            const startMinutes = startH * 60 + startM;
                            const endMinutes = endH * 60 + endM;
                            const duration = endMinutes - startMinutes;

                            // 1 Hour = 80px (fixed pixel height)
                            const top = (startMinutes / 60) * 80;
                            const height = (duration / 60) * 80;

                            return (
                                <div 
                                    key={task.id}
                                    onClick={(e) => handleOpenEdit(e, task)}
                                    style={{ top: `${top}px`, height: `${height}px` }}
                                    className={`absolute left-2 right-4 rounded-lg border-l-4 px-3 py-2 text-sm shadow-md hover:shadow-lg hover:z-10 transition-all cursor-pointer overflow-hidden flex flex-col justify-center ${
                                        task.priority === 'high' ? 'bg-red-50 border-red-500 text-red-900 dark:bg-red-900/70 dark:text-red-100' :
                                        task.priority === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-900/70 dark:text-amber-100' :
                                        'bg-green-50 border-green-500 text-green-900 dark:bg-green-900/70 dark:text-green-100'
                                    } ${task.isCompleted ? 'opacity-60 grayscale' : ''}`}
                                >
                                    <div className="flex justify-between items-center w-full">
                                        <span className="font-bold truncate">{task.title}</span>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, task.id)}
                                            className="p-1 hover:bg-black/10 rounded"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 opacity-50 hover:opacity-100" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 opacity-80 text-xs">
                                        <Clock className="w-3 h-3" />
                                        <span>{task.startTime} - {task.endTime}</span>
                                        {task.type === 'call' && <Phone className="w-3 h-3 ml-2" />}
                                        {task.type === 'email' && <Mail className="w-3 h-3 ml-2" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
             </div>
        </div>
    );
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-screen overflow-hidden flex flex-col relative">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Kalender</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Planen Sie Ihre Aktivitäten.</p>
        </div>
        
        <div className="flex items-center gap-4">
            <button 
                onClick={() => handleOpenCreate()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
                <Plus className="w-4 h-4" />
                Aufgabe hinzufügen
            </button>
        </div>
      </header>

      {/* Calendar Toolbar */}
      <div className="px-8 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0 gap-4">
          
          {/* Left Controls: View Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                  <List className="w-3.5 h-3.5" />
                  Liste
              </button>
              <button 
                onClick={() => setViewMode('month')}
                disabled={!!focusedTaskId}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} ${focusedTaskId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                  Monat
              </button>
              <button 
                onClick={() => setViewMode('week')}
                disabled={!!focusedTaskId}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} ${focusedTaskId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                  Woche
              </button>
              <button 
                onClick={() => setViewMode('day')}
                disabled={!!focusedTaskId}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} ${focusedTaskId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                  Tag
              </button>
          </div>

          {/* Center Controls: Date Navigation (Hide in List View) */}
          {viewMode !== 'list' ? (
             <div className="flex items-center gap-4 animate-in fade-in duration-300">
                  <button onClick={handlePrev} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
                      <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white w-64 text-center">
                      {getHeaderTitle()}
                  </h2>
                  <button onClick={handleNext} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-400">
                      <ChevronRight className="w-5 h-5" />
                  </button>
             </div>
          ) : (
             <div className="w-64"></div> // Spacer to keep layout balanced if needed, or remove
          )}

          {/* Right Controls: Today */}
          {viewMode !== 'list' && (
              <button 
                onClick={() => {
                    setCurrentDate(new Date());
                    setViewMode('day');
                }}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-md font-medium"
              >
                  Heute
              </button>
          )}
      </div>

      {/* Views */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'list' && renderListView()}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                        {editingTaskId ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
                    </h2>
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Titel</label>
                        <input 
                            required
                            autoFocus
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            type="text" 
                            placeholder="Was ist zu tun?" 
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Typ</label>
                            <select 
                                value={formData.type}
                                onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                                <option value="call">Anruf</option>
                                <option value="email">E-Mail</option>
                                <option value="meeting">Meeting</option>
                                <option value="todo">To-Do</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Priorität</label>
                            <select 
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            >
                                <option value="low">Niedrig</option>
                                <option value="medium">Mittel</option>
                                <option value="high">Hoch</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                         <div className="flex items-center justify-between mb-1">
                             <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Datum</label>
                             <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={formData.isAllDay}
                                    onChange={(e) => setFormData({...formData, isAllDay: e.target.checked})}
                                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-700"
                                />
                                Ganztägig
                             </label>
                         </div>
                        <input 
                            required
                            type="date"
                            value={formData.dueDate}
                            onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                    </div>

                    {!formData.isAllDay && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                             <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Startzeit</label>
                                <input 
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                />
                             </div>
                             <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Endzeit</label>
                                <input 
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                />
                             </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700 mt-2">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 dark:shadow-none transition-colors"
                        >
                            {editingTaskId ? 'Speichern' : 'Hinzufügen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
