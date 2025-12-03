import React, { useState, useEffect } from 'react';
import { Hexagon, Globe, ArrowRight, Settings, Check, AlertCircle, LayoutDashboard, WifiOff, RefreshCcw, Trash2, Bug } from 'lucide-react';
import { BackendConfig, Theme } from '../types';

interface LoginScreenProps {
  onLogin: () => void;
  backendConfig: BackendConfig;
  onUpdateConfig: (config: BackendConfig) => void;
  isLoading: boolean;
  theme: Theme;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  backendConfig, 
  onUpdateConfig, 
  isLoading,
  theme
}) => {
  const [showConfig, setShowConfig] = useState(!backendConfig.googleClientId);
  const [clientId, setClientId] = useState(backendConfig.googleClientId || '');
  const [googleReady, setGoogleReady] = useState(false);
  const [statusMsg, setStatusMsg] = useState("Initialisiere...");
  const [origin, setOrigin] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  
  const isDark = theme === 'dark';

  // Debug Helper
  const addLog = (msg: string) => {
      console.log(`[Login] ${msg}`);
      setLogs(prev => [...prev.slice(-4), msg]); // Keep last 5 logs
      setStatusMsg(msg);
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    addLog(`Origin: ${window.location.origin}`);
    
    // Check Internet
    if(!navigator.onLine) addLog("WARNUNG: Keine Internetverbindung!");

    const checkGoogle = () => {
        if (window.google && window.google.accounts) {
            setGoogleReady(true);
            addLog("Google Script (GSI) geladen.");
        } else {
            // Check if script tag exists
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if(script) {
                setStatusMsg("Lade Google Script...");
            } else {
                addLog("Google Script Tag nicht gefunden! Wird von DataService injiziert...");
            }
        }
    };
    
    // Run initial check
    checkGoogle();
    
    // Poll for changes
    const interval = setInterval(checkGoogle, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({ ...backendConfig, googleClientId: clientId });
    addLog("Config gespeichert.");
    setShowConfig(false);
  };

  const handleLoginClick = async () => {
      addLog("Klick auf Login Button...");
      try {
          await onLogin();
          // Note: onLogin is async but might not reject. We rely on DataService logs (which go to console).
          addLog("Login-Prozess angestoßen.");
      } catch (e: any) {
          addLog(`FEHLER im Handler: ${e.message}`);
          alert(`Login Fehler: ${e.message}`);
      }
  };
  
  const handleResetApp = () => {
      if(confirm("ACHTUNG: Dies löscht ALLE lokalen Daten und setzt die App zurück. Nutzen Sie dies nur bei Problemen. Fortfahren?")) {
          localStorage.clear();
          window.location.reload();
      }
  };
  
  const handleOpenDevTools = () => {
      if (window.require) {
          try {
              const { ipcRenderer } = window.require('electron');
              ipcRenderer.invoke('open-dev-tools');
          } catch(e) {
              alert("Konnte DevTools nicht öffnen (nicht in Electron?)");
          }
      } else {
          alert("DevTools nur in Desktop-App verfügbar. Drücken Sie F12.");
      }
  };

  return (
    <div className={`w-full h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Background FX */}
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none`}>
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500 blur-[100px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500 blur-[100px]" />
      </div>

      {/* DevTools Trigger */}
      <button onClick={handleOpenDevTools} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-indigo-500 transition-colors z-50" title="Open Debugger">
          <Bug className="w-5 h-5"/>
      </button>

      {/* VERSION BADGE - Visual Confirmation of Update */}
      <div className="absolute bottom-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse z-50">
          v1.0.1 (Update Erfolgreich)
      </div>

      <div className="z-10 w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none mb-6">
                <Hexagon className="w-10 h-10 text-white fill-white/20" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">SyntaxLabCRM</h1>
            <p className={`text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Willkommen zurück.
            </p>
        </div>

        <div className={`rounded-2xl shadow-xl border overflow-hidden transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {!showConfig && (
                <div className="p-8 flex flex-col gap-4">
                    {!googleReady && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2 mb-2 border border-red-100">
                            <WifiOff className="w-4 h-4" />
                            <span>Keine Verbindung zu Google.</span>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleLoginClick}
                        disabled={isLoading || !googleReady}
                        className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm disabled:opacity-70 disabled:pointer-events-none disabled:grayscale focus:ring-4 focus:ring-indigo-100 outline-none"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin"></span>
                        ) : (
                            <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5" />
                        )}
                        <span>{isLoading ? 'Melde an...' : 'Mit Google anmelden'}</span>
                    </button>
                    
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className={`px-2 ${isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>System</span></div>
                    </div>
                    
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={() => setShowConfig(true)}
                            className={`text-xs flex items-center justify-center gap-1 hover:underline ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Settings className="w-3 h-3" /> Konfiguration
                        </button>
                        <button 
                            onClick={handleResetApp}
                            className={`text-xs flex items-center justify-center gap-1 hover:underline text-red-400 hover:text-red-500`}
                        >
                            <Trash2 className="w-3 h-3" /> Alles Löschen (Hard Reset)
                        </button>
                    </div>
                    
                    {/* Visual Debug Log */}
                    <div className="mt-4 p-2 bg-slate-100 dark:bg-slate-950 rounded text-[10px] font-mono text-slate-500 border border-slate-200 dark:border-slate-800 h-24 overflow-y-auto">
                         <div className="font-bold border-b border-slate-200 dark:border-slate-800 mb-1 pb-1">Debug Log:</div>
                         {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                </div>
            )}

            {showConfig && (
                <div className="p-8">
                    <div className="flex items-center gap-2 mb-4 text-amber-500">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="font-bold text-sm">Setup erforderlich</h3>
                    </div>
                    <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Um Google Login zu nutzen, benötigen Sie eine Client ID aus der Google Cloud Console.
                        <br/><br/>
                        <strong className="text-indigo-500">Wichtig für Desktop:</strong> Fügen Sie <code>{origin}</code> zu den "Authorized Origins" hinzu.
                    </p>
                    <form onSubmit={handleSaveConfig} className="space-y-4">
                        <div>
                            <label className={`text-xs font-bold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Google Client ID</label>
                            <input 
                                required
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="12345-...apps.googleusercontent.com"
                                className={`w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                            />
                        </div>
                        <div className="flex gap-2">
                            {backendConfig.googleClientId && (
                                <button type="button" onClick={() => setShowConfig(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                                    Abbrechen
                                </button>
                            )}
                            <button type="submit" disabled={!clientId} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> Speichern
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};