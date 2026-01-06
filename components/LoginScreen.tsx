
import React, { useState, useEffect } from 'react';
import { Hexagon, Globe, Settings, Check, AlertCircle, WifiOff, RefreshCcw, Trash2, Bug, LogIn, ShieldAlert, Copy, Cloud, HardDrive, Database } from 'lucide-react';
import { BackendConfig, UserProfile, FirebaseConfig } from '../types';
import { DataServiceFactory } from '../services/dataService';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  backendConfig: BackendConfig;
  onUpdateConfig: (config: BackendConfig) => void;
  isLoading: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  backendConfig, 
  onUpdateConfig, 
  isLoading
}) => {
  const [showConfig, setShowConfig] = useState(!backendConfig.googleClientId);
  
  // Local Config State
  const [clientId, setClientId] = useState(backendConfig.googleClientId || '');
  const [mode, setMode] = useState<'local'|'firebase'>(backendConfig.mode);
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>(backendConfig.firebaseConfig || { 
      apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' 
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("Warte auf Google Dienste...");
  
  const currentOrigin = window.location.origin;

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
                // REMOVED INVALID WIDTH PROPERTY
                window.google.accounts.id.renderButton(
                    document.getElementById("googleButtonDiv"),
                    { theme: "outline", size: "large", text: "continue_with" }
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

    if (!showConfig) {
        initializeGoogleSignIn();
    }
  }, [backendConfig.googleClientId, showConfig]);

  const handleCredentialResponse = async (response: any) => {
      setErrorMsg(null);
      setStatusMsg("Anmeldung läuft...");
      
      try {
          const service = DataServiceFactory.create(backendConfig);
          await service.init();
          
          // Delegate authentication to the service (Local or Firebase)
          const userProfile = await service.authenticate(response.credential);
          
          if (userProfile) {
              setStatusMsg("Erfolgreich angemeldet. Lade Daten...");
              onLogin(userProfile);
          } else {
              throw new Error("Authentifizierung fehlgeschlagen.");
          }

      } catch (e: any) {
          console.error(e);
          setErrorMsg(e.message || "Ein unbekannter Fehler ist aufgetreten.");
          setStatusMsg("");
      }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({ 
        mode: mode,
        googleClientId: clientId,
        firebaseConfig: fbConfig
    });
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
    <div className="w-full h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-300 bg-slate-50 text-slate-900">
      
      {/* Background FX */}
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none`}>
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500 blur-[100px]" />
          <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500 blur-[100px]" />
      </div>

      <div className={`z-10 w-full p-8 animate-in fade-in zoom-in duration-300 ${showConfig ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-200 mb-6">
                <Hexagon className="w-10 h-10 text-white fill-white/20" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">SyntaxLabCRM</h1>
            <p className="text-center text-slate-500 flex items-center gap-2">
                {backendConfig.mode === 'firebase' ? <Cloud className="w-4 h-4 text-indigo-500"/> : <HardDrive className="w-4 h-4 text-slate-400"/>}
                {backendConfig.mode === 'firebase' ? 'Cloud Verbunden' : 'Lokaler Modus'}
            </p>
        </div>

        <div className="rounded-2xl shadow-xl border overflow-hidden transition-all bg-white border-slate-200">
            
            {/* ERROR MESSAGE */}
            {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 text-sm flex items-start gap-3 border-b border-red-100">
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
                        <div id="googleButtonDiv" className="w-full flex justify-center"></div>
                    </div>
                    
                    <div className="text-center text-xs text-slate-400">
                        {statusMsg}
                    </div>
                    
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-white text-slate-400">Optionen</span></div>
                    </div>
                    
                    <div className="flex justify-center gap-6">
                        <button 
                            onClick={() => setShowConfig(true)}
                            className="text-xs flex items-center justify-center gap-1 hover:underline text-slate-400 hover:text-slate-600"
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
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                        <Settings className="w-5 h-5 text-slate-600" />
                        <h3 className="font-bold text-slate-800">System Konfiguration</h3>
                    </div>

                    <form onSubmit={handleSaveConfig} className="space-y-6">
                        {/* MODE SWITCH */}
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button type="button" onClick={() => setMode('local')} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'local' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                <HardDrive className="w-4 h-4" /> Lokal
                            </button>
                            <button type="button" onClick={() => setMode('firebase')} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${mode === 'firebase' ? 'bg-indigo-600 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}>
                                <Cloud className="w-4 h-4" /> Google Cloud
                            </button>
                        </div>

                        {/* GOOGLE CLIENT ID */}
                        <div>
                            <label className="text-xs font-bold uppercase mb-1 block text-slate-500">Google Client ID (OAuth)</label>
                            <input 
                                required
                                value={clientId}
                                onChange={(e) => setClientId(e.target.value)}
                                placeholder="123...apps.googleusercontent.com"
                                className="w-full px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 border-slate-200"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Aus der Google Cloud Console (für Login benötigt).</p>
                        </div>

                        {/* FIREBASE CONFIG FIELDS */}
                        {mode === 'firebase' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-indigo-600 border-t border-slate-100 pt-2">
                                    <Database className="w-4 h-4" />
                                    <span className="text-sm font-bold">Firebase Datenbank Verbindung</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="text-[10px] font-bold uppercase text-slate-400">API Key</label><input required value={fbConfig.apiKey} onChange={e=>setFbConfig({...fbConfig, apiKey: e.target.value})} className="w-full border p-2 rounded text-xs bg-slate-50" /></div>
                                    <div><label className="text-[10px] font-bold uppercase text-slate-400">Project ID</label><input required value={fbConfig.projectId} onChange={e=>setFbConfig({...fbConfig, projectId: e.target.value})} className="w-full border p-2 rounded text-xs bg-slate-50" /></div>
                                    <div><label className="text-[10px] font-bold uppercase text-slate-400">Auth Domain</label><input required value={fbConfig.authDomain} onChange={e=>setFbConfig({...fbConfig, authDomain: e.target.value})} className="w-full border p-2 rounded text-xs bg-slate-50" /></div>
                                    <div><label className="text-[10px] font-bold uppercase text-slate-400">Storage Bucket</label><input required value={fbConfig.storageBucket} onChange={e=>setFbConfig({...fbConfig, storageBucket: e.target.value})} className="w-full border p-2 rounded text-xs bg-slate-50" /></div>
                                    <div><label className="text-[10px] font-bold uppercase text-slate-400">Sender ID</label><input required value={fbConfig.messagingSenderId} onChange={e=>setFbConfig({...fbConfig, messagingSenderId: e.target.value})} className="w-full border p-2 rounded text-xs bg-slate-50" /></div>
                                    <div><label className="text-[10px] font-bold uppercase text-slate-400">App ID</label><input required value={fbConfig.appId} onChange={e=>setFbConfig({...fbConfig, appId: e.target.value})} className="w-full border p-2 rounded text-xs bg-slate-50" /></div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-slate-100">
                            {backendConfig.googleClientId && (
                                <button type="button" onClick={() => setShowConfig(false)} className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-100 text-slate-600">
                                    Abbrechen
                                </button>
                            )}
                            <button type="submit" disabled={!clientId} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                                <Check className="w-4 h-4" /> Speichern & Neustart
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
        
        {!showConfig && (
            <p className="text-center text-[10px] text-slate-400 mt-8">
                Verwenden Sie Ihre Firmen-E-Mail Adresse zur Anmeldung.
                <br/>Nicht autorisierte Konten haben keinen Zugriff.
            </p>
        )}
      </div>
    </div>
  );
};
