
import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Plus, Trash2, Package, User, Share2, Palette, ChevronDown, ChevronUp, Pencil, X, Calendar, Database, Download, Upload, Mail, Server, Globe, Laptop, HelpCircle, Loader2, AlertTriangle } from 'lucide-react';
import { UserProfile, Theme, ProductPreset, Contact, Deal, Task, BackupData, BackendConfig } from '../types';
import { IDataService } from '../services/dataService';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  currentTheme: Theme;
  onUpdateTheme: (theme: Theme) => void;
  productPresets: ProductPreset[];
  onUpdatePresets: (presets: ProductPreset[]) => void;
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  onImportData: (data: BackupData) => void;
  backendConfig: BackendConfig;
  onUpdateBackendConfig: (config: BackendConfig) => void;
  dataService: IDataService;
}

const SettingsSection = ({ 
    title, 
    icon: Icon, 
    children, 
    isDark, 
    description,
    defaultOpen = false
}: { 
    title: string; 
    icon: any; 
    children: React.ReactNode; 
    isDark: boolean; 
    description?: string;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`rounded-xl shadow-sm border transition-all duration-200 overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-6 transition-colors ${
                    !isOpen && !isDark ? 'hover:bg-slate-50' : ''
                } ${!isOpen && isDark ? 'hover:bg-slate-800' : ''}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-indigo-50'}`}>
                        <Icon className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    <div className="text-left">
                        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
                        {description && (
                            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
                        )}
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                ) : (
                    <ChevronDown className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                )}
            </button>
            
            {isOpen && (
                <div className={`px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-200`}>
                    <div className={`border-t pt-6 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Settings: React.FC<SettingsProps> = ({ 
  userProfile, 
  onUpdateProfile, 
  currentTheme, 
  onUpdateTheme,
  productPresets,
  onUpdatePresets,
  contacts,
  deals,
  tasks,
  onImportData,
  backendConfig,
  onUpdateBackendConfig,
  dataService
}) => {
  const isDark = currentTheme === 'dark';
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  
  const [backendForm, setBackendForm] = useState<BackendConfig>(backendConfig);
  
  // Integration States
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isMailConnected, setIsMailConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  
  const [showSaved, setShowSaved] = useState(false);
  const [isPreviewEnv, setIsPreviewEnv] = useState(false);

  const [localPresets, setLocalPresets] = useState<ProductPreset[]>(productPresets);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetValue, setNewPresetValue] = useState('');

  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editPresetTitle, setEditPresetTitle] = useState('');
  const [editPresetValue, setEditPresetValue] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(userProfile);
  }, [userProfile]);

  useEffect(() => {
    setLocalPresets(productPresets);
  }, [productPresets]);

  useEffect(() => {
      setBackendForm(backendConfig);
  }, [backendConfig]);

  useEffect(() => {
    const loadIntegrations = async () => {
        const cal = await dataService.getIntegrationStatus('calendar');
        const mail = await dataService.getIntegrationStatus('mail');
        setIsCalendarConnected(cal);
        setIsMailConnected(mail);
    };
    loadIntegrations();
    
    try {
        if (window.location.protocol === 'blob:' || window.parent !== window) {
            setIsPreviewEnv(true);
        }
    } catch(e) { setIsPreviewEnv(true); }

  }, [dataService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleCalendar = async () => {
      if (isCalendarConnected) {
          setIsConnecting('calendar');
          await dataService.disconnectGoogle('calendar');
          setIsCalendarConnected(false);
          setIsConnecting(null);
      } else {
          setIsConnecting('calendar');
          // Pass current input ID directly to avoid saving requirement first
          const success = await dataService.connectGoogle('calendar', backendForm.googleClientId);
          setIsCalendarConnected(success);
          setIsConnecting(null);
      }
  };

  const handleToggleMail = async () => {
      if (isMailConnected) {
          setIsConnecting('mail');
          await dataService.disconnectGoogle('mail');
          setIsMailConnected(false);
          setIsConnecting(null);
      } else {
          setIsConnecting('mail');
          const success = await dataService.connectGoogle('mail', backendForm.googleClientId);
          setIsMailConnected(success);
          setIsConnecting(null);
      }
  };

  const handleAddPreset = () => {
      if (!newPresetTitle || !newPresetValue) return;
      
      const newPreset: ProductPreset = {
          id: Math.random().toString(36).substr(2, 9),
          title: newPresetTitle,
          value: parseFloat(newPresetValue)
      };

      setLocalPresets([...localPresets, newPreset]);
      setNewPresetTitle('');
      setNewPresetValue('');
  };

  const handleDeletePreset = (id: string) => {
      setLocalPresets(localPresets.filter(p => p.id !== id));
  };

  const handleStartEditPreset = (preset: ProductPreset) => {
      setEditingPresetId(preset.id);
      setEditPresetTitle(preset.title);
      setEditPresetValue(preset.value.toString());
  };

  const handleCancelEditPreset = () => {
      setEditingPresetId(null);
      setEditPresetTitle('');
      setEditPresetValue('');
  };

  const handleSaveEditPreset = () => {
      if (!editingPresetId) return;
      
      const updatedPresets = localPresets.map(p => 
          p.id === editingPresetId 
          ? { ...p, title: editPresetTitle, value: parseFloat(editPresetValue) } 
          : p
      );
      
      setLocalPresets(updatedPresets);
      handleCancelEditPreset();
  };
  
  const handleExport = () => {
      const backup: BackupData = {
          contacts,
          deals,
          tasks,
          userProfile: formData,
          productPresets: localPresets,
          theme: currentTheme,
          timestamp: new Date().toISOString(),
          version: '1.0'
      };
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `crm_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode); 
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.version && (json.contacts || json.deals)) {
                  onImportData(json);
              } else {
                  alert('Ungültiges Dateiformat.');
              }
          } catch (error) {
              console.error(error);
              alert('Fehler beim Lesen der Datei.');
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleSaveAll = () => {
    onUpdateProfile(formData);
    onUpdatePresets(localPresets);
    onUpdateBackendConfig(backendForm);

    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const inputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${
      isDark 
      ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' 
      : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const currentOrigin = window.location.origin;

  return (
    <div className={`flex-1 h-screen overflow-y-auto ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <header className={`px-8 py-6 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Einstellungen</h1>
        <p className="text-slate-500 text-sm mt-1">Konfigurieren Sie Ihr CRM, Backend und API Verbindungen.</p>
      </header>

      <main className="max-w-3xl mx-auto p-8 space-y-6 pb-20">
        
        {/* Backend Configuration */}
        <SettingsSection 
            title="Backend Konfiguration" 
            icon={Server} 
            isDark={isDark} 
            description="Wählen Sie zwischen lokaler Speicherung und externem Server."
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setBackendForm({...backendForm, mode: 'local'})}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            backendForm.mode === 'local' 
                            ? 'border-indigo-600 bg-indigo-50/50' 
                            : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Laptop className={`w-5 h-5 ${backendForm.mode === 'local' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className={`font-bold ${backendForm.mode === 'local' ? 'text-indigo-900' : isDark ? 'text-white' : 'text-slate-900'}`}>Lokal (Desktop App)</span>
                        </div>
                        <p className="text-xs text-slate-500">Daten werden auf diesem PC gespeichert. Direkte Google Anbindung möglich.</p>
                    </button>

                    <button 
                        onClick={() => setBackendForm({...backendForm, mode: 'api'})}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                            backendForm.mode === 'api' 
                            ? 'border-indigo-600 bg-indigo-50/50' 
                            : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Globe className={`w-5 h-5 ${backendForm.mode === 'api' ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className={`font-bold ${backendForm.mode === 'api' ? 'text-indigo-900' : isDark ? 'text-white' : 'text-slate-900'}`}>Externer Server</span>
                        </div>
                        <p className="text-xs text-slate-500">Für Mehrbenutzer-Teams mit eigener Infrastruktur.</p>
                    </button>
                </div>

                {backendForm.mode === 'local' && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-4 border-t border-slate-100">
                        
                        {isPreviewEnv && (
                             <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800 flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div>
                                    <strong>Vorschau-Modus erkannt</strong>
                                    <p className="mt-1 text-xs">
                                        Google OAuth funktioniert in dieser Web-Preview nicht (Sicherheitsrichtlinie). 
                                        Die App wird Verbindungen simulieren, damit Sie das UI testen können.
                                    </p>
                                </div>
                             </div>
                        )}

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                            <div className="flex gap-2 items-start">
                                <HelpCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Google Integration im lokalen Modus</strong>
                                    <p className="mt-1 text-xs opacity-90 leading-relaxed mb-2">
                                        Damit die App (ohne Server) auf Ihren Kalender/Mails zugreifen darf, benötigen Sie eine <strong>Client ID</strong> von Google. 
                                        Erstellen Sie ein Projekt in der <a href="https://console.cloud.google.com/" target="_blank" className="underline hover:text-blue-900">Google Cloud Console</a>.
                                    </p>
                                    <div className="bg-white/50 p-2 rounded border border-blue-200 mb-1">
                                        <p className="text-[10px] uppercase font-bold text-blue-900 mb-1">WICHTIG: Autorisierte JavaScript-Quelle (Origin)</p>
                                        <p className="text-xs mb-1">Fügen Sie folgende URL in der Google Console unter "Authorized JavaScript origins" hinzu:</p>
                                        <code className="block bg-slate-800 text-white px-2 py-1 rounded text-xs select-all cursor-copy break-all">
                                            {currentOrigin}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Google Client ID</label>
                            <input 
                                type="text"
                                placeholder="123456789-abcdefg...apps.googleusercontent.com"
                                value={backendForm.googleClientId || ''}
                                onChange={(e) => setBackendForm({...backendForm, googleClientId: e.target.value})}
                                className={inputClass}
                            />
                            <p className="text-xs text-slate-400 mt-1">Wird lokal gespeichert, um die Verbindung herzustellen.</p>
                        </div>
                    </div>
                )}
            </div>
        </SettingsSection>

        {/* Profile */}
        <SettingsSection 
            title="Benutzerprofil" 
            icon={User} 
            isDark={isDark} 
            description="Verwalten Sie Ihre persönlichen Informationen."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Vorname</label>
              <input 
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                type="text" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Nachname</label>
              <input 
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                type="text" 
                className={inputClass} 
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>E-Mail</label>
              <input 
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email" 
                className={inputClass} 
              />
            </div>
          </div>
        </SettingsSection>
        
        {/* Integrations */}
        <SettingsSection 
            title="Integrationen" 
            icon={Share2} 
            isDark={isDark}
            description="Verbinden Sie externe Dienste wie Google Gemini AI."
        >
          <div className="space-y-6">
             {/* Google Calendar */}
             <div>
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                             <Calendar className="w-5 h-5" />
                         </div>
                         <div>
                             <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Google Kalender</label>
                             <p className="text-xs text-slate-500 mt-0.5">Synchronisieren Sie Ihre Aufgaben automatisch.</p>
                         </div>
                     </div>
                     <button 
                         onClick={handleToggleCalendar}
                         disabled={!!isConnecting}
                         className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2 ${
                             isCalendarConnected 
                             ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                             : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                         }`}
                     >
                         {isConnecting === 'calendar' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                         {isCalendarConnected ? 'Trennen' : 'Verbinden'}
                     </button>
                 </div>
                 {isCalendarConnected && (
                     <div className="mt-3 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-100">
                         <Check className="w-3 h-3" />
                         Ihr Kalender ist erfolgreich verknüpft.
                     </div>
                 )}
             </div>

             {/* Google Mail */}
             <div className="pt-6 border-t border-slate-100">
                 <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                             <Mail className="w-5 h-5" />
                         </div>
                         <div>
                             <label className={`block text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Google Mail</label>
                             <p className="text-xs text-slate-500 mt-0.5">E-Mails direkt über Ihr Google Konto senden.</p>
                         </div>
                     </div>
                     <button 
                         onClick={handleToggleMail}
                         disabled={!!isConnecting}
                         className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border flex items-center gap-2 ${
                             isMailConnected 
                             ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                             : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                         }`}
                     >
                         {isConnecting === 'mail' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                         {isMailConnected ? 'Trennen' : 'Verbinden'}
                     </button>
                 </div>
                 {isMailConnected && (
                     <div className="mt-3 flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-md border border-green-100">
                         <Check className="w-3 h-3" />
                         Google Mail Verknüpfung aktiv.
                     </div>
                 )}
             </div>

          </div>
        </SettingsSection>

         {/* Data Management */}
        <SettingsSection 
            title="Datenverwaltung" 
            icon={Database} 
            isDark={isDark} 
            description="Erstellen Sie Backups oder ziehen Sie Daten um."
        >
            <div className="flex flex-col md:flex-row gap-4">
                <div className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                        <Download className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Backup erstellen</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Exportiert alle Kontakte, Deals und Aufgaben in eine JSON-Datei.</p>
                    </div>
                    <button 
                        onClick={handleExport}
                        className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Daten exportieren
                    </button>
                </div>

                <div className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Backup wiederherstellen</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Lädt eine Backup-Datei und überschreibt den aktuellen Stand.</p>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".json" 
                        className="hidden" 
                    />
                    <button 
                        onClick={handleImportClick}
                        className="mt-2 w-full py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        Datei auswählen
                    </button>
                </div>
            </div>
        </SettingsSection>

        {/* Product Presets */}
        <SettingsSection 
            title="Produkt Voreinstellungen" 
            icon={Package} 
            isDark={isDark}
            description="Definieren Sie Standardprodukte und Preise für Ihre Pipeline."
        >
          {/* Preset List (Same as before) */}
          <div className="space-y-3 mb-6">
            {localPresets.map(preset => (
                <div key={preset.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    
                    {editingPresetId === preset.id ? (
                        <>
                            <div className="flex-1 flex gap-2">
                                <input 
                                    type="text"
                                    value={editPresetTitle}
                                    onChange={(e) => setEditPresetTitle(e.target.value)}
                                    className={`flex-1 text-sm ${inputClass}`}
                                    placeholder="Produktname"
                                    autoFocus
                                />
                                <input 
                                    type="number"
                                    value={editPresetValue}
                                    onChange={(e) => setEditPresetValue(e.target.value)}
                                    className={`w-24 text-sm ${inputClass}`}
                                    placeholder="Preis"
                                />
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={handleSaveEditPreset}
                                    className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={handleCancelEditPreset}
                                    className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex-1">
                                <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{preset.title}</p>
                            </div>
                            <div className="font-mono text-sm font-bold text-indigo-600 bg-white/10 px-2 py-1 rounded">
                                {preset.value} €
                            </div>
                            <div className="flex items-center gap-1 border-l pl-2 ml-2 border-slate-200/20">
                                <button 
                                    onClick={() => handleStartEditPreset(preset)}
                                    className="text-slate-400 hover:text-indigo-500 p-1.5 rounded hover:bg-slate-200/20 transition-colors"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeletePreset(preset.id)}
                                    className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-slate-200/20 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            ))}
          </div>

          <div className="flex items-end gap-3 p-4 rounded-lg bg-slate-100/50 border border-slate-200">
             <div className="flex-1">
                 <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Neues Produkt</label>
                 <input 
                    type="text"
                    value={newPresetTitle}
                    onChange={(e) => setNewPresetTitle(e.target.value)}
                    placeholder="z.B. Enterprise"
                    className={`text-sm ${inputClass}`}
                 />
             </div>
             <div className="w-32">
                 <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Preis (€)</label>
                 <input 
                    type="number"
                    value={newPresetValue}
                    onChange={(e) => setNewPresetValue(e.target.value)}
                    placeholder="0"
                    className={`text-sm ${inputClass}`}
                 />
             </div>
             <button 
                onClick={handleAddPreset}
                disabled={!newPresetTitle || !newPresetValue}
                className="bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 text-white p-2 rounded-lg transition-colors"
             >
                 <Plus className="w-5 h-5" />
             </button>
          </div>
        </SettingsSection>

         {/* Appearance */}
         <SettingsSection 
            title="Erscheinungsbild" 
            icon={Palette} 
            isDark={isDark}
            description="Passen Sie das Design an Ihre Vorlieben an."
        >
          <div className="flex items-center gap-4">
            <div 
                onClick={() => onUpdateTheme('light')}
                className={`border-2 rounded-lg p-1 cursor-pointer transition-all ${
                    currentTheme === 'light' 
                    ? 'border-indigo-600 ring-2 ring-indigo-100' 
                    : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                }`}
            >
                <div className="w-24 h-16 bg-slate-100 rounded mb-2 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-full bg-white border-r border-slate-200"></div>
                </div>
                <span className={`text-xs font-medium block text-center ${currentTheme === 'light' ? 'text-indigo-600' : 'text-slate-500'}`}>Hell</span>
            </div>

            <div 
                onClick={() => onUpdateTheme('dark')}
                className={`border-2 rounded-lg p-1 cursor-pointer transition-all ${
                    currentTheme === 'dark' 
                    ? 'border-indigo-500 ring-2 ring-indigo-900' 
                    : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                }`}
            >
                <div className="w-24 h-16 bg-slate-800 rounded mb-2 border border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-full bg-slate-900 border-r border-slate-700"></div>
                </div>
                <span className={`text-xs font-medium block text-center ${currentTheme === 'dark' ? 'text-indigo-400' : 'text-slate-500'}`}>Dunkel</span>
            </div>
          </div>
        </SettingsSection>

        <div className="flex justify-end pt-4 items-center gap-4 sticky bottom-8">
            {showSaved && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 shadow-sm border border-green-200">
                    <Check className="w-4 h-4" />
                    Einstellungen gespeichert
                </div>
            )}
            <button 
                onClick={handleSaveAll}
                className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200/50 hover:shadow-indigo-200/70 hover:-translate-y-0.5"
            >
                <Save className="w-4 h-4" />
                Speichern
            </button>
        </div>
      </main>
    </div>
  );
};
