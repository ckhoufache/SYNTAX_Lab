
import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Plus, Trash2, Package, User, Share2, Palette, ChevronDown, ChevronUp, Pencil, X, Calendar, Database, Download, Upload, Mail, Server, Globe, Laptop, HelpCircle, Loader2, AlertTriangle, Key, RefreshCw, Copy, FileText, Image as ImageIcon, Briefcase, Settings as SettingsIcon, HardDrive, Users, DownloadCloud, RefreshCcw, Sparkles } from 'lucide-react';
import { UserProfile, Theme, ProductPreset, Contact, Deal, Task, BackupData, BackendConfig, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate } from '../types';
import { IDataService } from '../services/dataService';

// Fix for Electron's window.require
declare global {
  interface Window {
    require: any;
  }
}

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
  invoices: Invoice[];
  expenses: Expense[];
  activities: Activity[];
  onImportData: (data: BackupData) => void;
  backendConfig: BackendConfig;
  onUpdateBackendConfig: (config: BackendConfig) => void;
  dataService: IDataService;
  invoiceConfig: InvoiceConfig;
  onUpdateInvoiceConfig: (config: InvoiceConfig) => void;
  emailTemplates: EmailTemplate[];
  onAddTemplate: (t: EmailTemplate) => void;
  onUpdateTemplate: (t: EmailTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

// Haupt-Sektion (Das "Übermenü")
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
    children?: React.ReactNode; 
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
                <div className={`px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200`}>
                    <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

// Unter-Sektion (Zum Aufklappen innerhalb einer Haupt-Sektion)
const SubSection = ({
    title,
    children,
    isDark,
    defaultOpen = false
}: {
    title: string;
    children?: React.ReactNode;
    isDark: boolean;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border-b last:border-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between py-4 text-sm font-semibold transition-colors hover:text-indigo-600 ${
                    isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
            >
                {title}
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 opacity-50" />
                ) : (
                    <ChevronDown className="w-4 h-4 opacity-50" />
                )}
            </button>
            {isOpen && (
                <div className="pb-6 pt-2 animate-in slide-in-from-top-1 duration-200">
                    {children}
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
  invoices,
  expenses,
  activities,
  onImportData,
  backendConfig,
  onUpdateBackendConfig,
  dataService,
  invoiceConfig,
  onUpdateInvoiceConfig,
  emailTemplates,
  onAddTemplate,
  onUpdateTemplate,
  onDeleteTemplate
}) => {
  const isDark = currentTheme === 'dark';
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [backendForm, setBackendForm] = useState<BackendConfig>(backendConfig);
  
  // Invoice Config Form
  const [invConfigForm, setInvConfigForm] = useState<InvoiceConfig>(invoiceConfig);
  
  // AI Config
  const [geminiKey, setGeminiKey] = useState('');

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
  
  // Template States
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({ title: '', subject: '', body: '' });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Update States
  const [updateUrl, setUpdateUrl] = useState(localStorage.getItem('update_url') || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setFormData(userProfile), [userProfile]);
  useEffect(() => setLocalPresets(productPresets), [productPresets]);
  useEffect(() => setBackendForm(backendConfig), [backendConfig]);
  
  useEffect(() => {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) setGeminiKey(storedKey);
  }, []);

  useEffect(() => {
      if (invoiceConfig.companyName !== invConfigForm.companyName && !invConfigForm.companyName) {
           setInvConfigForm(invoiceConfig);
      }
  }, [invoiceConfig]);

  useEffect(() => {
    const loadIntegrations = async () => {
        const cal = await dataService.getIntegrationStatus('calendar');
        const mail = await dataService.getIntegrationStatus('mail');
        setIsCalendarConnected(cal);
        setIsMailConnected(mail);
    };
    loadIntegrations();
    try {
        if (window.location.protocol === 'blob:' || window.parent !== window) setIsPreviewEnv(true);
    } catch(e) { setIsPreviewEnv(true); }

  }, [dataService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInvConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setInvConfigForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) { 
          alert(`Die Datei "${file.name}" ist zu groß (${(file.size / 1024 / 1024).toFixed(2)} MB). Bitte wählen Sie ein Bild unter 5 MB.`);
          e.target.value = ''; 
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result;
          if (typeof result === 'string') {
              setInvConfigForm(prev => ({ ...prev, logoBase64: result }));
          }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleToggleCalendar = async () => {
      if (isCalendarConnected) {
          setIsConnecting('calendar');
          await dataService.disconnectGoogle('calendar');
          setIsCalendarConnected(false);
          setIsConnecting(null);
      } else {
          setIsConnecting('calendar');
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

  const handleDeletePreset = (id: string) => { setLocalPresets(localPresets.filter(p => p.id !== id)); };

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
          contacts, deals, tasks, invoices, expenses, activities,
          invoiceConfig: invConfigForm,
          userProfile: formData,
          productPresets: localPresets,
          emailTemplates: emailTemplates,
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

  const handleImportClick = () => { if (fileInputRef.current) fileInputRef.current.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.version && (json.contacts || json.deals)) {
                  onImportData(json);
              } else { alert('Ungültiges Dateiformat.'); }
          } catch (error) { console.error(error); alert('Fehler beim Lesen der Datei.'); }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const openTemplateModal = (template?: EmailTemplate) => {
      if (template) {
          setEditingTemplateId(template.id);
          setTemplateForm({ title: template.title, subject: template.subject, body: template.body });
      } else {
          setEditingTemplateId(null);
          setTemplateForm({ title: '', subject: '', body: '' });
      }
      setIsTemplateModalOpen(true);
  };

  const saveTemplate = (e: React.FormEvent) => {
      e.preventDefault();
      if (!templateForm.title || !templateForm.subject) return;
      
      const newTemplate: EmailTemplate = {
          id: editingTemplateId || Math.random().toString(36).substr(2, 9),
          title: templateForm.title,
          subject: templateForm.subject,
          body: templateForm.body
      };

      editingTemplateId ? onUpdateTemplate(newTemplate) : onAddTemplate(newTemplate);
      setIsTemplateModalOpen(false);
  };

  const generateApiKey = () => {
      const key = 'sk_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
      setBackendForm({...backendForm, apiKey: key});
  };

  const copyApiKey = () => {
      if (backendForm.apiKey) {
          navigator.clipboard.writeText(backendForm.apiKey);
          alert('API Key kopiert!');
      }
  };

  // --- UPDATE MECHANISM ---
  const handleCheckUpdate = async () => {
      if (!updateUrl) {
          alert("Bitte geben Sie eine URL an.");
          return;
      }
      
      // Speichere URL für später
      localStorage.setItem('update_url', updateUrl);
      
      setIsUpdating(true);
      setUpdateStatus('Prüfe URL...');

      try {
          // 1. Fetch index.html to verify and parse
          // Ensure URL ends with / if it's a folder, or handle exact index.html link
          let baseUrl = updateUrl.replace(/\/index\.html$/, '').replace(/\/$/, '');
          const indexUrl = `${baseUrl}/index.html`;

          const indexResponse = await fetch(indexUrl, { cache: 'no-store' });
          if (!indexResponse.ok) throw new Error("Konnte index.html nicht laden");
          const indexHtml = await indexResponse.text();

          setUpdateStatus('Analysiere Version...');
          
          // 2. Extract asset filenames (stupid regex parsing, effective for Vite builds)
          // Look for src="/assets/..." or href="/assets/..."
          // Note: In Vite build, it's usually ./assets/ or /assets/
          const assetRegex = /["'](?:\.?\/)?assets\/([^"']+)["']/g;
          const matches = [...indexHtml.matchAll(assetRegex)];
          const assets = matches.map(m => m[1]); // filenames only
          
          const uniqueAssets = [...new Set(assets)];
          console.log("Found assets:", uniqueAssets);

          if (uniqueAssets.length === 0) {
              // Maybe it's not a vite build or path is different.
              // Warning only.
              setUpdateStatus("Warnung: Keine Assets gefunden. Fahre fort...");
          }

          setUpdateStatus(`Lade ${uniqueAssets.length + 1} Dateien...`);

          const filesToInstall = [];
          
          // Add Index.html
          filesToInstall.push({ name: 'index.html', content: indexHtml, type: 'root' });

          // Fetch all assets
          for (const asset of uniqueAssets) {
               setUpdateStatus(`Lade Asset: ${asset}...`);
               const assetRes = await fetch(`${baseUrl}/assets/${asset}`);
               if (assetRes.ok) {
                   const content = await assetRes.text();
                   filesToInstall.push({ name: asset, content: content, type: 'asset' });
               } else {
                   console.warn(`Failed to fetch asset ${asset}`);
               }
          }

          setUpdateStatus('Installiere Update...');
          
          // Send to Electron
          if (window.require) {
              const { ipcRenderer } = window.require('electron');
              const result = await ipcRenderer.invoke('install-update', filesToInstall);
              
              if (result.success) {
                  setUpdateStatus('Update erfolgreich! Neustart...');
                  setTimeout(() => {
                      ipcRenderer.invoke('restart-app');
                  }, 1500);
              } else {
                  throw new Error(result.error || "Unbekannter Fehler beim Schreiben");
              }
          } else {
              throw new Error("Electron Umgebung nicht gefunden.");
          }

      } catch (e: any) {
          console.error(e);
          setUpdateStatus(`Fehler: ${e.message}`);
          setIsUpdating(false);
      }
  };

  const handleResetUpdate = async () => {
      if (confirm("Dies setzt die App auf die Originalversion zurück. Fortfahren?")) {
          if (window.require) {
              const { ipcRenderer } = window.require('electron');
              await ipcRenderer.invoke('reset-update');
              ipcRenderer.invoke('restart-app');
          }
      }
  };

  const handleSaveAll = () => {
    if (backendForm.googleClientId) {
        const cleanedId = backendForm.googleClientId.trim();
        if (cleanedId !== backendForm.googleClientId) {
            setBackendForm(prev => ({...prev, googleClientId: cleanedId}));
        }
    }
    
    // 1. Profile
    onUpdateProfile(formData);
    // 2. Theme
    onUpdateTheme(currentTheme);
    // 3. Presets
    onUpdatePresets(localPresets);
    // 4. Backend Config
    onUpdateBackendConfig(backendForm);
    // 5. Invoice Config
    onUpdateInvoiceConfig(invConfigForm);
    // 6. API Keys
    if (geminiKey) localStorage.setItem('gemini_api_key', geminiKey);
    else localStorage.removeItem('gemini_api_key');

    // Show saved feedback
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-screen overflow-y-auto flex flex-col relative">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Einstellungen</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Konfigurieren Sie Ihr CRM.</p>
        </div>
        <button 
            onClick={handleSaveAll}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95"
        >
            {showSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {showSaved ? 'Gespeichert!' : 'Einstellungen speichern'}
        </button>
      </header>

      <div className="p-8 pb-24 max-w-5xl mx-auto space-y-6">
        
        {/* SECTION: MEIN PROFIL */}
        <SettingsSection title="Mein Profil" icon={User} isDark={isDark} description="Ihre persönlichen Daten und Anzeigeoptionen." defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <img src={formData.avatar} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover" />
                        <div className="flex-1">
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avatar URL</label>
                            <input name="avatar" value={formData.avatar} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                    </div>
                    <div>
                        <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vorname</label>
                        <input name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                    <div>
                        <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Nachname</label>
                        <input name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>E-Mail Adresse</label>
                        <input name="email" value={formData.email} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                    <div>
                        <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Rolle</label>
                        <input name="role" value={formData.role} onChange={handleChange} className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                    <div>
                         <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Design</label>
                         <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
                            <button onClick={() => onUpdateTheme('light')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentTheme === 'light' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Light</button>
                            <button onClick={() => onUpdateTheme('dark')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentTheme === 'dark' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>Dark</button>
                         </div>
                    </div>
                </div>
            </div>
        </SettingsSection>
        
        {/* SECTION: SYSTEM & VERBINDUNGEN */}
        <SettingsSection title="System & Verbindungen" icon={HardDrive} isDark={isDark} description="Google Integration, API Keys und Backend-Konfiguration.">
             {/* Google Integration */}
             <div className="py-6 space-y-6">
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50 border-blue-100'}`}>
                    <h3 className={`font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
                        <Globe className="w-4 h-4" /> Google Integration
                    </h3>
                    <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : 'text-blue-700'}`}>
                        Verbinden Sie Ihren Google Account für Kalender-Sync und E-Mail Versand.
                        {isPreviewEnv && <span className="block mt-1 font-bold text-red-500">Hinweis: In der Web-Preview funktioniert die Google API evtl. nicht korrekt aufgrund von Cross-Origin Policies. Nutzen Sie die Electron App.</span>}
                    </p>
                    <div className="space-y-3">
                         <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Google Client ID (OAuth 2.0)</label>
                            <input 
                                value={backendForm.googleClientId || ''} 
                                onChange={(e) => setBackendForm({...backendForm, googleClientId: e.target.value})} 
                                placeholder="z.B. 12345-abcde.apps.googleusercontent.com"
                                className={`w-full px-3 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-indigo-500 font-mono ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-200'}`} 
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Erforderlich für Login, Kalender & Mail. Zu finden in der Google Cloud Console.</p>
                         </div>
                         <div className="flex gap-4 pt-2">
                             <button 
                                onClick={handleToggleCalendar}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${isCalendarConnected ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                             >
                                 <Calendar className="w-4 h-4" /> {isConnecting === 'calendar' ? 'Verbinde...' : (isCalendarConnected ? 'Kalender verbunden' : 'Kalender verbinden')}
                             </button>
                             <button 
                                onClick={handleToggleMail}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-2 ${isMailConnected ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                             >
                                 <Mail className="w-4 h-4" /> {isConnecting === 'mail' ? 'Verbinde...' : (isMailConnected ? 'Gmail verbunden' : 'Gmail verbinden')}
                             </button>
                         </div>
                    </div>
                </div>

                {/* AI Configuration */}
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-purple-50 border-purple-100'}`}>
                    <h3 className={`font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-purple-400' : 'text-purple-800'}`}>
                        <Sparkles className="w-4 h-4" /> Künstliche Intelligenz (Gemini)
                    </h3>
                    <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : 'text-purple-700'}`}>
                        Hinterlegen Sie Ihren API Key, um KI-Features wie das Daily Briefing zu nutzen.
                    </p>
                    <div>
                        <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Google Gemini API Key</label>
                        <div className="flex gap-2">
                            <input 
                                type="password"
                                value={geminiKey} 
                                onChange={(e) => setGeminiKey(e.target.value)} 
                                placeholder="AIzaSy..."
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all outline-none focus:ring-2 focus:ring-purple-500 font-mono ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-slate-200'}`} 
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Der Key wird lokal im Browser gespeichert.</p>
                    </div>
                </div>

                {/* Backend Mode */}
                <div>
                     <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Daten-Speicherort</label>
                     <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => setBackendForm({...backendForm, mode: 'local'})} className={`cursor-pointer border rounded-xl p-4 transition-all ${backendForm.mode === 'local' ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1 font-bold text-slate-700 dark:text-slate-200"><Laptop className="w-4 h-4"/> Lokal (Browser)</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Daten werden im LocalStorage gespeichert. Keine externe Cloud nötig.</p>
                        </div>
                        <div onClick={() => setBackendForm({...backendForm, mode: 'api'})} className={`cursor-pointer border rounded-xl p-4 transition-all ${backendForm.mode === 'api' ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center gap-2 mb-1 font-bold text-slate-700 dark:text-slate-200"><Server className="w-4 h-4"/> Externes Backend</div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Verbindung zu einer REST API (z.B. Node.js/Express Server).</p>
                        </div>
                     </div>
                </div>

                {/* API Config (if external) */}
                {backendForm.mode === 'api' && (
                    <div className="animate-in fade-in slide-in-from-top-4 space-y-4 pt-2">
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>API URL</label>
                            <input value={backendForm.apiUrl || ''} onChange={(e) => setBackendForm({...backendForm, apiUrl: e.target.value})} placeholder="https://api.meincrm.de" className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>API Token (Optional)</label>
                            <input type="password" value={backendForm.apiToken || ''} onChange={(e) => setBackendForm({...backendForm, apiToken: e.target.value})} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                    </div>
                )}
             </div>
        </SettingsSection>

        {/* SECTION: BUCHHALTUNG */}
        <SettingsSection title="Rechnungen & Buchhaltung" icon={FileText} isDark={isDark} description="Firmendaten, Bankverbindung und Layout für PDF-Rechnungen.">
            <div className="py-6 space-y-6">
                {/* Logo Upload */}
                <div className="flex items-start gap-6">
                     <div 
                        onClick={() => logoInputRef.current?.click()}
                        className={`w-32 h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden relative ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300'}`}
                     >
                        {invConfigForm.logoBase64 ? (
                            <img src={invConfigForm.logoBase64} alt="Firmenlogo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <>
                                <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                                <span className="text-xs text-slate-500 text-center px-2">Logo hochladen</span>
                            </>
                        )}
                        <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                     </div>
                     <div className="flex-1 space-y-4">
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Firmenname</label>
                            <input name="companyName" value={invConfigForm.companyName} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Straße & Nr.</label>
                                <input name="addressLine1" value={invConfigForm.addressLine1} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                            </div>
                            <div>
                                <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>PLZ & Ort</label>
                                <input name="addressLine2" value={invConfigForm.addressLine2} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                            </div>
                        </div>
                     </div>
                </div>

                <SubSection title="Bankverbindung & Steuer" isDark={isDark}>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Bankname</label>
                            <input name="bankName" value={invConfigForm.bankName} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                         <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Steuernummer / USt-ID</label>
                            <input name="taxId" value={invConfigForm.taxId} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>IBAN</label>
                            <input name="iban" value={invConfigForm.iban} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>BIC</label>
                            <input name="bic" value={invConfigForm.bic} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                     </div>
                </SubSection>

                <SubSection title="Kontakt & Footer" isDark={isDark}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>E-Mail (Rechnung)</label>
                            <input name="email" value={invConfigForm.email} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                        <div>
                            <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Webseite</label>
                            <input name="website" value={invConfigForm.website} onChange={handleInvConfigChange} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                        </div>
                    </div>
                    <div>
                        <label className={`text-xs font-semibold uppercase mb-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fußzeile (Text)</label>
                        <textarea name="footerText" value={invConfigForm.footerText} onChange={handleInvConfigChange} rows={3} className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                    </div>
                </SubSection>
            </div>
        </SettingsSection>

        {/* SECTION: VORLAGEN & PRESETS */}
        <SettingsSection title="Vorlagen & Presets" icon={Package} isDark={isDark} description="E-Mail Templates und Produkt-Schnellwahl verwalten.">
            <div className="py-6 space-y-6">
                
                {/* Product Presets */}
                <div>
                    <h3 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>Produkt-Pakete (Pipeline)</h3>
                    <div className="space-y-3">
                        {localPresets.map(preset => (
                            <div key={preset.id} className={`flex items-center justify-between p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                {editingPresetId === preset.id ? (
                                    <div className="flex-1 flex gap-2 items-center">
                                        <input autoFocus value={editPresetTitle} onChange={e => setEditPresetTitle(e.target.value)} className={`flex-1 px-2 py-1 rounded text-sm border outline-none ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300'}`} />
                                        <input type="number" value={editPresetValue} onChange={e => setEditPresetValue(e.target.value)} className={`w-24 px-2 py-1 rounded text-sm border outline-none ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300'}`} />
                                        <button onClick={handleSaveEditPreset} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check className="w-4 h-4"/></button>
                                        <button onClick={handleCancelEditPreset} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"><X className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <span className={`font-medium text-sm block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{preset.title}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-indigo-600">{preset.value} €</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleStartEditPreset(preset)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeletePreset(preset.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <input 
                                value={newPresetTitle} 
                                onChange={(e) => setNewPresetTitle(e.target.value)} 
                                placeholder="Neues Produkt / Paket..." 
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                            />
                            <input 
                                type="number" 
                                value={newPresetValue} 
                                onChange={(e) => setNewPresetValue(e.target.value)} 
                                placeholder="Betrag €" 
                                className={`w-32 px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                            />
                            <button onClick={handleAddPreset} disabled={!newPresetTitle} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-lg disabled:opacity-50"><Plus className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
                
                <div className={`border-t my-6 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}></div>

                {/* Email Templates */}
                <div>
                     <div className="flex justify-between items-center mb-3">
                         <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>E-Mail Vorlagen</h3>
                         <button onClick={() => openTemplateModal()} className="text-xs text-indigo-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3"/> Neu erstellen</button>
                     </div>
                     <div className="space-y-3">
                        {emailTemplates.map(tpl => (
                            <div key={tpl.id} className={`p-3 rounded-lg border flex justify-between items-center group ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <div>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{tpl.title}</p>
                                    <p className="text-xs text-slate-500 truncate max-w-md">{tpl.subject}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openTemplateModal(tpl)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => onDeleteTemplate(tpl.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                        {emailTemplates.length === 0 && <p className="text-sm text-slate-400 italic">Keine Vorlagen vorhanden.</p>}
                     </div>
                </div>

            </div>
        </SettingsSection>
        
        {/* SECTION: WARTUNG & UPDATES */}
        <SettingsSection title="Wartung & Updates" icon={DownloadCloud} isDark={isDark} description="Backup, Restore und App-Updates." >
             <div className="py-6 space-y-6">
                
                {/* Backup & Restore */}
                <div>
                    <h3 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>Datenverwaltung</h3>
                    <div className="flex gap-4">
                        <button onClick={handleExport} className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                            <Download className="w-6 h-6 text-indigo-500" />
                            <span className="font-semibold text-sm">Backup erstellen (JSON)</span>
                        </button>
                        <button onClick={handleImportClick} className={`flex-1 py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                            <Upload className="w-6 h-6 text-emerald-500" />
                            <span className="font-semibold text-sm">Backup wiederherstellen</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>
                </div>

                <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}></div>

                {/* App Update */}
                <div>
                    <h3 className={`font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}><RefreshCcw className="w-4 h-4" /> App Update</h3>
                    <div className={`p-4 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-xs text-slate-500 mb-2 uppercase font-bold">Update Server URL</p>
                        <div className="flex gap-2 mb-3">
                             <input 
                                value={updateUrl} 
                                onChange={(e) => setUpdateUrl(e.target.value)} 
                                placeholder="http://localhost:8080" 
                                className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none font-mono ${isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`} 
                             />
                             <button onClick={handleCheckUpdate} disabled={isUpdating} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 min-w-[100px]">
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Prüfen'}
                             </button>
                        </div>
                        {updateStatus && (
                            <div className="text-xs font-mono p-2 bg-black/10 rounded text-slate-600 dark:text-slate-400 mb-3">
                                {updateStatus}
                            </div>
                        )}
                        <button onClick={handleResetUpdate} className="text-xs text-red-500 hover:underline">
                            App zurücksetzen (Factory Reset)
                        </button>
                    </div>
                </div>
             </div>
        </SettingsSection>
        
        {/* About */}
        <div className="text-center pt-8 pb-4">
             <p className="text-xs text-slate-400">SyntaxLabCRM v1.0.0 • Built with React & Electron</p>
        </div>

      </div>

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className={`bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col ${isDark ? 'bg-slate-800 text-white' : ''}`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-900' : 'bg-slate-50 border-slate-100'}`}>
                    <h2 className="font-bold">{editingTemplateId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h2>
                    <button onClick={() => setIsTemplateModalOpen(false)}><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={saveTemplate} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase opacity-70">Titel (Intern)</label>
                        <input required value={templateForm.title} onChange={e => setTemplateForm({...templateForm, title: e.target.value})} className={`w-full px-3 py-2 rounded border outline-none ${isDark ? 'bg-slate-700 border-slate-600' : 'border-slate-200'}`} placeholder="z.B. Erstkontakt" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase opacity-70">Betreff</label>
                        <input required value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} className={`w-full px-3 py-2 rounded border outline-none ${isDark ? 'bg-slate-700 border-slate-600' : 'border-slate-200'}`} placeholder="Betreff der E-Mail" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase opacity-70">Text</label>
                        <textarea required value={templateForm.body} onChange={e => setTemplateForm({...templateForm, body: e.target.value})} rows={6} className={`w-full px-3 py-2 rounded border outline-none ${isDark ? 'bg-slate-700 border-slate-600' : 'border-slate-200'}`} placeholder="Hallo {name}..." />
                        <p className="text-[10px] opacity-50">Platzhalter: {"{name}"}</p>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium">Speichern</button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
};
