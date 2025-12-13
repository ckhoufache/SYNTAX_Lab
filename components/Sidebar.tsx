
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, KanbanSquare, Settings, Hexagon, ClipboardList, Banknote, User, LogOut, Activity } from 'lucide-react';
import { ViewState, UserProfile } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  userProfile: UserProfile | null;
  onLogout?: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ currentView, onChangeView, userProfile, onLogout, isCollapsed, onToggle }) => {
  const isDark = false; // Forced Light Mode
  const [logoSrc, setLogoSrc] = useState<string>('');
  const [imgError, setImgError] = useState(false);

  // Dynamischer Import des Logos, um Build-Fehler zu vermeiden
  useEffect(() => {
    // Versuche sowohl den relativen Pfad als auch den Alias, falls einer fehlschlägt
    import('../logo.png')
      .then((mod) => {
        setLogoSrc(mod.default);
        setImgError(false);
      })
      .catch((err) => {
        console.warn("Logo konnte nicht geladen werden (Standard-Fallback wird genutzt):", err);
        setImgError(true);
      });
  }, []);
  
  const navItemClass = (view: ViewState) => 
    `flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 mx-2 rounded-lg cursor-pointer transition-all duration-200 group relative ${
      currentView === view 
        ? 'bg-indigo-600 text-white shadow-md' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`;

  // Tooltip helper for collapsed state
  const Tooltip = ({ text }: { text: string }) => {
      if (!isCollapsed) return null;
      return (
          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {text}
          </div>
      );
  };

  return (
    <aside 
        className={`${isCollapsed ? 'w-20' : 'w-64'} border-r h-screen flex flex-col shrink-0 z-20 transition-all duration-300 ease-in-out bg-white border-slate-200`}
    >
      {/* Header with Logo Toggle */}
      <div 
        className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors`}
        onClick={onToggle}
        title={isCollapsed ? "Menü ausklappen" : "Menü einklappen"}
      >
        {isCollapsed ? (
            // Collapsed State: Display Icon only
            <Hexagon className="w-8 h-8 text-indigo-600 fill-indigo-100" /> 
        ) : (
            // Expanded State: Display Logo Image if available
            (logoSrc && !imgError) ? (
                <img 
                    src={logoSrc} 
                    alt="Syntax Lab" 
                    className="h-8 w-auto object-contain max-w-[180px]"
                    onError={() => setImgError(true)} 
                />
            ) : (
                // Fallback Text
                <div className="flex items-center">
                    <Hexagon className="w-8 h-8 text-indigo-600 fill-indigo-100 mr-2" />
                    <span className="text-xl font-bold tracking-tight text-slate-800">SyntaxLab</span>
                </div>
            )
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-1 overflow-x-hidden">
        <div onClick={() => onChangeView('dashboard')} className={navItemClass('dashboard')}>
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">Dashboard</span>}
            <Tooltip text="Dashboard" />
        </div>
        <div onClick={() => onChangeView('contacts')} className={navItemClass('contacts')}>
            <Users className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">Kontakte</span>}
            <Tooltip text="Kontakte" />
        </div>
        <div onClick={() => onChangeView('pipeline')} className={navItemClass('pipeline')}>
            <KanbanSquare className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">Pipeline</span>}
            <Tooltip text="Pipeline" />
        </div>
        <div onClick={() => onChangeView('tasks')} className={navItemClass('tasks')}>
            <ClipboardList className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">Aufgaben</span>}
            <Tooltip text="Aufgaben" />
        </div>
        <div onClick={() => onChangeView('finances')} className={navItemClass('finances')}>
            <Banknote className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">Finanzen</span>}
            <Tooltip text="Finanzen" />
        </div>
        <div onClick={() => onChangeView('settings')} className={navItemClass('settings')}>
            <Settings className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium whitespace-nowrap">Einstellungen</span>}
            <Tooltip text="Einstellungen" />
        </div>
      </nav>

      {/* Footer (Profile Display & Logout) */}
      <div className={`p-4 border-t border-slate-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
        {userProfile && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    {userProfile.avatar && userProfile.avatar.length > 5 ? (
                        <img 
                            src={userProfile.avatar} 
                            alt="User" 
                            className="w-9 h-9 rounded-full ring-2 object-cover shrink-0 ring-slate-100"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full ring-2 flex items-center justify-center shrink-0 ring-slate-100 bg-slate-200">
                            <User className="w-5 h-5 text-slate-500" />
                        </div>
                    )}
                    
                    {!isCollapsed && (
                        <div className="flex flex-col min-w-0 transition-opacity duration-200">
                            <span className="text-sm font-semibold truncate text-slate-800">
                                {userProfile.firstName}
                            </span>
                            <span className="text-xs text-slate-400 truncate w-24">{userProfile.role}</span>
                        </div>
                    )}
                </div>
                
                {onLogout && (
                    <button 
                        onClick={onLogout}
                        className={`p-2 rounded-full transition-colors hover:bg-slate-100 text-slate-400 hover:text-red-500 ${isCollapsed ? 'mt-2' : ''}`}
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
