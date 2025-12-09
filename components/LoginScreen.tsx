
import React, { useState, useEffect } from 'react';
import { Hexagon, Globe, Settings, Check, AlertCircle, WifiOff, RefreshCcw, Trash2, Bug, LogIn, ShieldAlert } from 'lucide-react';
import { BackendConfig, Theme, UserProfile } from '../types';
import { DataServiceFactory } from '../services/dataService';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("Warte auf Google Dienste...");
  
  const isDark = theme === 'dark';

  // JWT Decoder (Simple implementation to avoid external lib dependency)
  const parseJwt = (token: string) => {
      try {
        return JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        return null;
      }
  };

  useEffect(() => {
    // 1. Check if Client ID is present
    if (!backendConfig.googleClientId) {
        setStatusMsg("Konfiguration erforderlich.");
        return;
    }

    // 2. Initialize Google Sign-In
    const initializeGoogleSignIn = () => {
        if (window.google && window.google.accounts) {
            try {
                window.google.accounts.id.initialize({
                    client_id: backendConfig.googleClientId,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                
                // Render the button
                window.google.accounts.id.renderButton(
                    document.getElementById("googleButtonDiv"),
                    { theme: isDark ? "filled_black" : "outline", size: "large", width: "100%", text: "continue_with" }
                );
                
                setStatusMsg("Bereit.");
            } catch (e: any) {
                console.error("GSI Init Error", e);
                setErrorMsg("Fehler beim Laden des Google Buttons. Prüfen Sie die Client ID.");
            }
        } else {
            // Retry if script not yet loaded
            setTimeout(initializeGoogleSignIn, 1000);
        }
    };

    initializeGoogleSignIn();
  }, [backendConfig.googleClientId, isDark]);

  const handleCredentialResponse = async (response: any) => {
      setErrorMsg(null);
      setStatusMsg("Prüfe Zugriffsrechte...");
      
      try {
          const payload = parseJwt(response.credential);
          if (!payload) throw new Error("Konnte Login-Daten nicht verarbeiten.");

          const userProfile: UserProfile = {
              firstName: payload.given_name || payload.name,
              lastName: payload.family_name || '',
              email: payload.email,
              avatar: payload.picture,
              role: 'Benutzer' // Default, will be updated by DB
          };

          // CHECK WHITELIST / ACCESS CONTROL
          const service = DataServiceFactory.create(backendConfig);
          await service.init();
          
          const hasAccess = await service.checkUserAccess(userProfile.email);
          
          if (hasAccess) {
              setStatusMsg("Zugriff genehmigt. Lade Daten...");
              onLogin(userProfile);
          } else {
              setErrorMsg("Zugriff verweigert. Ihre E-Mail ist nicht für dieses CRM freigeschaltet.");
              setStatusMsg("");
          }

      } catch (e: any) {
          console.error(e);
          setErrorMsg(e.message || "Ein unbekannter Fehler ist aufgetreten.");
          setStatusMsg("");
      }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({ ...backendConfig, googleClientId: clientId });
    setShowConfig(false);
    setStatusMsg("Konfiguration gespeichert. Bitte warten...");
    setTimeout(() => window.location.reload(), 500); // Reload to re-init GSI
  };
  
  const handleResetApp = () => {
      if(confirm("ACHTUNG: Dies löscht ALLE lokalen Einstellungen. Fortfahren?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  return (
    <div className={`w-full h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Background FX */}
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none`}>
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500 blur-[100px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500 blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none mb-6">
                <Hexagon className="w-10 h-10 text-white fill-white/20" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">SyntaxLabCRM</h1>
            <p className={`text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Interne Unternehmenssoftware
            </p>
        </div>

        <div className={`rounded-2xl shadow-xl border overflow-hidden transition-all ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {/* ERROR MESSAGE */}
            {errorMsg && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 text-sm flex items-start gap-3 border-b border-red-100 dark:border-red-900">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Anmeldung fehlgeschlagen</p>
                        <p>{errorMsg}</p>
                    </div>
                </div>
            )}

            {!showConfig && (
                <div className="p-8 flex flex-col gap-6">
                    <div className="min-h-[50px] flex items-center justify-center">
                        {/* GOOGLE BUTTON TARGET */}
                        <div id="googleButtonDiv" className="w-full"></div>
                    </div>
                    
                    <div className="text-center text-xs text-slate-400">
                        {statusMsg}
                    </div>
                    
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><div className={`w-full border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className={`px-2 ${isDark ? 'bg-slate-900 text-slate-500' : 'bg-white text-slate-400'}`}>Optionen</span></div>
                    </div>
                    
                    <div className="flex justify-center gap-6">
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
                            <Trash2 className="w-3 h-3" /> App Reset
                        </button>
                    </div>
                </div>
            )}

            {showConfig && (
                <div className="p-8">
                    <div className="flex items-center gap-2 mb-4 text-amber-500">
                        <AlertCircle className="w-5 h-5" />
                        <h3 className="font-bold text-sm">Google API Setup</h3>
                    </div>
                    <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Bitte geben Sie Ihre <strong>Google Client ID</strong> ein, um sich anzumelden und Dienste wie Gmail oder Kalender zu nutzen.
                    </p>
                    <form onSubmit={handleSaveConfig} className="space-y-4">
                        <div>
                            <label className={`text-xs font-bold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Client ID</label>
                            <input 
                                required
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="123...apps.googleusercontent.com"
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
        
        <p className="text-center text-[10px] text-slate-400 mt-8">
            Verwenden Sie Ihre Firmen-E-Mail Adresse zur Anmeldung.
            <br/>Nicht autorisierte Konten haben keinen Zugriff.
        </p>
      </div>
    </div>
  );
};
