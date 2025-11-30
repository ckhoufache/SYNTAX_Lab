import React from 'react';
import { LayoutDashboard, Users, KanbanSquare, Settings, LogOut, Hexagon } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  
  const navItemClass = (view: ViewState) => 
    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors duration-200 ${
      currentView === view 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col shrink-0 z-20">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <Hexagon className="w-8 h-8 text-indigo-600 fill-indigo-100 mr-2" />
        <span className="text-xl font-bold text-slate-800 tracking-tight">NexCRM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1">
        <div 
          onClick={() => onChangeView('dashboard')}
          className={navItemClass('dashboard')}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </div>

        <div 
          onClick={() => onChangeView('contacts')}
          className={navItemClass('contacts')}
        >
          <Users className="w-5 h-5" />
          <span className="font-medium">Kontakte</span>
        </div>

        <div 
          onClick={() => onChangeView('pipeline')}
          className={navItemClass('pipeline')}
        >
          <KanbanSquare className="w-5 h-5" />
          <span className="font-medium">Pipeline</span>
        </div>

        <div 
          onClick={() => onChangeView('settings')}
          className={navItemClass('settings')}
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Einstellungen</span>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 cursor-pointer transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Abmelden</span>
        </div>
        
        <div className="mt-4 px-4 flex items-center gap-3">
          <img 
            src="https://picsum.photos/id/64/100/100" 
            alt="User" 
            className="w-8 h-8 rounded-full ring-2 ring-slate-100"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">Max Mustermann</span>
            <span className="text-xs text-slate-400">Admin</span>
          </div>
        </div>
      </div>
    </aside>
  );
};