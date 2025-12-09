
import React from 'react';
import { LayoutDashboard, Users, KanbanSquare, Settings, Hexagon, ClipboardList, Banknote, User, LogOut } from 'lucide-react';
import { ViewState, UserProfile, Theme } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  userProfile: UserProfile | null;
  theme: Theme;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ currentView, onChangeView, userProfile, theme, onLogout }) => {
  const isDark = theme === 'dark';
  
  const navItemClass = (view: ViewState) => 
    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg cursor-pointer transition-colors duration-200 ${
      currentView === view 
        ? 'bg-indigo-600 text-white shadow-md' 
        : isDark 
          ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <aside className={`w-64 border-r h-screen flex flex-col shrink-0 z-20 transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      {/* Header */}
      <div className={`h-16 flex items-center px-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        <Hexagon className="w-8 h-8 text-indigo-600 fill-indigo-100 mr-2" />
        <span className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>SyntaxLabCRM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1">
        <div onClick={() => onChangeView('dashboard')} className={navItemClass('dashboard')}><LayoutDashboard className="w-5 h-5" /><span className="font-medium">Dashboard</span></div>
        <div onClick={() => onChangeView('contacts')} className={navItemClass('contacts')}><Users className="w-5 h-5" /><span className="font-medium">Kontakte</span></div>
        <div onClick={() => onChangeView('pipeline')} className={navItemClass('pipeline')}><KanbanSquare className="w-5 h-5" /><span className="font-medium">Pipeline</span></div>
        <div onClick={() => onChangeView('tasks')} className={navItemClass('tasks')}><ClipboardList className="w-5 h-5" /><span className="font-medium">Aufgaben</span></div>
        <div onClick={() => onChangeView('finances')} className={navItemClass('finances')}><Banknote className="w-5 h-5" /><span className="font-medium">Finanzen</span></div>
        <div onClick={() => onChangeView('settings')} className={navItemClass('settings')}><Settings className="w-5 h-5" /><span className="font-medium">Einstellungen</span></div>
      </nav>

      {/* Footer (Profile Display & Logout) */}
      <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
        {userProfile && (
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    {userProfile.avatar && userProfile.avatar.length > 5 ? (
                        <img 
                            src={userProfile.avatar} 
                            alt="User" 
                            className={`w-9 h-9 rounded-full ring-2 object-cover shrink-0 ${isDark ? 'ring-slate-700' : 'ring-slate-100'}`}
                        />
                    ) : (
                        <div className={`w-9 h-9 rounded-full ring-2 flex items-center justify-center shrink-0 ${isDark ? 'ring-slate-700 bg-slate-800' : 'ring-slate-100 bg-slate-200'}`}>
                            <User className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {userProfile.firstName}
                        </span>
                        <span className="text-xs text-slate-400 truncate w-24">{userProfile.role}</span>
                    </div>
                </div>
                {onLogout && (
                    <button 
                        onClick={onLogout}
                        className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-500 hover:text-red-400' : 'hover:bg-slate-100 text-slate-400 hover:text-red-500'}`}
                        title="Abmelden"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                )}
            </div>
        )}
      </div>
    </aside>
  );
});
