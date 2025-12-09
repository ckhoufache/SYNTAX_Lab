import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Plus, Trash2, Package, User, Share2, Palette, ChevronDown, ChevronUp, Pencil, X, Calendar, Database, Download, Upload, Mail, Server, Globe, Laptop, HelpCircle, Loader2, AlertTriangle, Key, RefreshCw, Copy, FileText, Image as ImageIcon, Briefcase, Settings as SettingsIcon, HardDrive, Users, DownloadCloud, RefreshCcw, Sparkles, Sliders, Link, Paperclip, Star, Paperclip as PaperclipIcon, FileCode, Printer, Info, AlertOctagon, Repeat, Cloud, CloudLightning, ShieldAlert, Wifi } from 'lucide-react';
import { UserProfile, Theme, ProductPreset, Contact, Deal, Task, BackupData, BackendConfig, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate, EmailAttachment, EmailAutomationConfig, FirebaseConfig } from '../types';
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

// Haupt-Sektion (Das "Übermenü") - Jetzt Controlled Component
const SettingsSection = ({ 
    title, 
    icon: Icon, 
    children, 
    isDark, 
    description,
    isOpen,
    onToggle
}: { 
    title: string; 
    icon: any; 
    children?: React.ReactNode; 
    isDark: boolean; 
    description?: string;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    return (
        <div className={`rounded-xl shadow-sm border transition-all duration-200 overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
            <button 
                onClick={onToggle}
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

// Unter-Sektion (Zum Aufklappen innerhalb einer Haupt-Sektion) - Jetzt Controlled Component
const SubSection = ({
    title,
    children,
    isDark,
    isOpen,
    onToggle
}: {
    title: string;
    children?: React.ReactNode;
    isDark: boolean;
    isOpen: boolean;
    onToggle: () => void;
}) => {
    return (
        <div className={`border-b last:border-0 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button 
                onClick={onToggle}
                className={`w-full flex items-center justify-between py-4 text-sm font-semibold transition-colors hover:text-indigo-600 ${
                    isDark ? 'text-slate-200' : 'text-slate-700'
                } ${isOpen ? 'text-indigo-600' : ''}`}
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

// 3. Ebene - Akkordeon innerhalb einer SubSection
const InnerSection = ({
    title,
    icon: Icon,
    children,
    isDark,
    isOpen,
    onToggle,
    extraHeader
}: {
    title: string;
    icon?: any;
    children?: React.ReactNode;
    isDark: boolean;
    isOpen: boolean;
    onToggle: () => void;
    extraHeader?: React.ReactNode;
}) => {
    return (
        <div className={`mb-3 rounded-lg border overflow-hidden transition-all ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
             <button 
                onClick={onToggle}
                className={`w-full flex items-center justify-between p-4 text-sm font-medium transition-colors ${
                    isOpen 
                    ? (isDark ? 'bg-slate-800 text-indigo-400' : 'bg-white text-indigo-700 shadow-sm') 
                    : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                }`}
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className={`w-4 h-4 ${isOpen ? 'text-indigo-500' : 'text-slate-400'}`} />}
                    <span>{title}</span>
                </div>
                <div className="flex items-center gap-3">
                    {extraHeader}
                    {isOpen ? <ChevronUp className="w-4 h-4 opacity-50" /> : <ChevronDown className="w-4 h-4 opacity-50" />}
                </div>
            </button>
            {isOpen && (
                <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'} ${isDark ? 'bg-slate-900/30' : 'bg-white'}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

// --- Reusable Email Config Component ---
const EmailConfigurator = ({
    config,
    onChange,
    isDark,
    label
}: {
    config: EmailAutomationConfig;
    onChange: (newConfig: EmailAutomationConfig) => void;
    isDark: boolean;
    label: string;
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 500 * 1024) { // 500KB limit for safety in localStorage
            alert("Die Datei ist zu groß (max 500KB für gespeicherte Vorlagen-Anhänge).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const newAtt: EmailAttachment = {
                name: file.name,
                data: base64,
                type: file.type,
                size: file.size
            };
            onChange({ ...config, attachments: [...(config.attachments || []), newAtt] });
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeAttachment = (index: number) => {
        const newAtts = [...(config.attachments || [])];
        newAtts.splice(index, 1);
        onChange({ ...config, attachments: newAtts });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
             <div>
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Betreff</label>
                <input 
                    value={config.subject || ''} 
                    onChange={(e) => onChange({...config, subject: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder={`Betreff für ${label}`}
                />
            </div>
            <div>
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">Nachrichtentext</label>
                <textarea 
                    value={config.body || ''} 
                    onChange={(e) => onChange({...config, body: e.target.value})}
                    rows={6}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder={`Hallo {name},\n\n...`}
                />
                <p className="text-[10px] text-slate-400 mt-1">Platzhalter: {'{name}'} = Kundenname, {'{nr}'} = Rechnungsnummer, {'{myCompany}'} = Ihr Firmenname</p>
            </div>
            
            <div>
                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">Standard-Anhänge</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {config.attachments && config.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg text-sm">
                            <PaperclipIcon className="w-3.5 h-3.5 text-slate-500" />
                            <span className="dark:text-white truncate max-w-[150px]">{att.name}</span>
                            <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                        </div>
                    ))}
                    {(!config.attachments || config.attachments.length === 0) && <span className="text-sm text-slate-400 italic">Keine Anhänge</span>}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs flex items-center gap-1 text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Datei hochladen
                    </button>
                    <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
                </div>
            </div>
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
  const [appVersion, setAppVersion] = useState("Loading...");
  
  // Accordion State Management
  const [activeSection, setActiveSection] = useState<string | null>('profile');
  const [activeSubSection, setActiveSubSection] = useState<string | null>('profile_data');
  // New State for nested email accordions
  const [activeEmailSub, setActiveEmailSub] = useState<string | null>('welcome');

  const toggleSection = (id: string) => {
      if (activeSection === id) {
          setActiveSection(null);
      } else {
          setActiveSection(id);
          setActiveSubSection(null);
      }
  };

  const toggleSubSection = (id: string) => {
      setActiveSubSection(activeSubSection === id ? null : id);
  };

  const toggleEmailSub = (id: string) => {
      setActiveEmailSub(activeEmailSub === id ? null : id);
  };
  
  // Invoice Config Form
  const [invConfigForm, setInvConfigForm] = useState<InvoiceConfig>(invoiceConfig);
  
  // AI Config
  const [geminiKey, setGeminiKey] = useState('');
  
  // Firebase Config
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>(backendConfig.firebaseConfig || {
      apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: ''
  });

  // Integration States
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isMailConnected, setIsMailConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  
  const [showSaved, setShowSaved] = useState(false);

  const [localPresets, setLocalPresets] = useState<ProductPreset[]>(productPresets);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetValue, setNewPresetValue] = useState('');
  const [newPresetIsSub, setNewPresetIsSub] = useState(false);

  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editPresetTitle, setEditPresetTitle] = useState('');
  const [editPresetValue, setEditPresetValue] = useState('');
  const [editPresetIsSub, setEditPresetIsSub] = useState(false);
  
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

  useEffect(() => { setFormData(userProfile); }, [userProfile]);
  useEffect(() => { setLocalPresets(productPresets); }, [productPresets]);
  useEffect(() => { setBackendForm(backendConfig); }, [backendConfig]);
  
  useEffect(() => {
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) setGeminiKey(storedKey);
      
      const fetchVersion = async () => {
          const ver = await dataService.getAppVersion();
          setAppVersion(ver);
      };
      fetchVersion();
  }, [dataService]);

  useEffect(() => {
    const loadIntegrations = async () => {
        const cal = await dataService.getIntegrationStatus('calendar');
        const mail = await dataService.getIntegrationStatus('mail');
        setIsCalendarConnected(cal);
        setIsMailConnected(mail);
    };
    loadIntegrations();
  }, [dataService]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInvConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setInvConfigForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEmailConfigChange = (type: keyof import('../types').EmailSettings, newConfig: EmailAutomationConfig) => {
      setInvConfigForm(prev => ({
          ...prev,
          emailSettings: {
              ...(prev.emailSettings || {} as any),
              [type]: newConfig
          }
      }));
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
          id: crypto.randomUUID(),
          title: newPresetTitle,
          value: parseFloat(newPresetValue),
          isSubscription: newPresetIsSub
      };
      const newArray = [...localPresets, newPreset];
      setLocalPresets(newArray);
      onUpdatePresets(newArray);
      
      setNewPresetTitle('');
      setNewPresetValue('');
      setNewPresetIsSub(false);
  };

  const handleDeletePreset = (id: string) => { 
      const newArray = localPresets.filter(p => p.id !== id);
      setLocalPresets(newArray);
      onUpdatePresets(newArray);
  };

  const handleStartEditPreset = (preset: ProductPreset) => {
      setEditingPresetId(preset.id);
      setEditPresetTitle(preset.title);
      setEditPresetValue(preset.value.toString());
      setEditPresetIsSub(preset.isSubscription || false);
  };

  const handleCancelEditPreset = () => {
      setEditingPresetId(null);
      setEditPresetTitle('');
      setEditPresetValue('');
      setEditPresetIsSub(false);
  };

  const handleSaveEditPreset = () => {
      if (!editingPresetId) return;
      const updatedPresets = localPresets.map(p => 
          p.id === editingPresetId 
          ? { ...p, title: editPresetTitle, value: parseFloat(editPresetValue), isSubscription: editPresetIsSub } 
          : p
      );
      setLocalPresets(updatedPresets);
      onUpdatePresets(updatedPresets); 
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
  
  const handleWipeData = async () => {
      if (!confirm("WARNUNG: Sie sind dabei, ALLE Daten im Programm zu löschen.\n\nDies beinhaltet Kontakte, Rechnungen, Einstellungen etc.\n\nSind Sie sicher?")) {
          return;
      }
      if (!confirm("WIRKLICH LÖSCHEN?\n\nEs gibt kein 'Rückgängig'. Wenn Sie kein Backup haben, sind die Daten für immer verloren.\n\nWollen Sie wirklich fortfahren?")) {
          return;
      }
      if (!confirm("LETZTE WARNUNG: \n\nSind Sie zu 100% sicher, dass Sie alle Daten unwiderruflich löschen wollen?")) {
          return;
      }
      
      await dataService.wipeAllData();
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
          id: editingTemplateId || crypto.randomUUID(),
          title: templateForm.title,
          subject: templateForm.subject,
          body: templateForm.body
      };

      editingTemplateId ? onUpdateTemplate(newTemplate) : onAddTemplate(newTemplate);
      setIsTemplateModalOpen(false);
  };
  
  const handleSaveFirebaseConfig = () => {
      const newConfig = { ...backendConfig, firebaseConfig: fbConfig, mode: 'firebase' as const };
      onUpdateBackendConfig(newConfig);
      alert("Firebase Konfiguration gespeichert. Die Seite wird neu geladen, um die Verbindung herzustellen.");
      window.location.reload();
  };

  const handleSwitchToLocal = () => {
      const newConfig = { ...backendConfig, mode: 'local' as const };
      onUpdateBackendConfig(newConfig);
      alert("Auf lokalen Modus umgestellt. Seite wird neu geladen.");
      window.location.reload();
  };

  const handleCheckUpdate = async (force: boolean = false) => {
      if (!updateUrl) {
          setUpdateStatus("Bitte geben Sie eine Update-URL an.");
          return;
      }
      setIsUpdating(true);
      setUpdateStatus(force ? "Erzwinge Update..." : "Prüfe auf Updates...");

      try {
          const hasUpdate = await dataService.checkAndInstallUpdate(updateUrl, (status) => setUpdateStatus(status), force);
          
          if (!hasUpdate && !force) {
               if(updateStatus === "Prüfe auf Updates...") setUpdateStatus("System ist aktuell.");
               alert("Kein Update verfügbar. Sie verwenden bereits die neueste Version.");
               setIsUpdating(false);
          }
      } catch (e: any) {
          console.error(e);
          setUpdateStatus(`Fehler: ${e.message}`);
          setIsUpdating(false);
      }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-screen overflow-y-auto flex flex-col relative">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Einstellungen</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Konfigurieren Sie Ihr CRM.</p>
      </header>
      
      <main className="p-8 space-y-6 pb-20 max-w-5xl mx-auto w-full">
         
         {/* --- 1. PROFIL & DARSTELLUNG --- */}
         <SettingsSection 
            title="Profil & Darstellung" 
            icon={User} 
            isDark={isDark} 
            description="Persönliche Daten und Design"
            isOpen={activeSection === 'profile'}
            onToggle={() => toggleSection('profile')}
         >
             <div className="px-6">
                <SubSection 
                    title="Stammdaten" 
                    isDark={isDark}
                    isOpen={activeSubSection === 'profile_data'}
                    onToggle={() => toggleSubSection('profile_data')}
                >
                    <div className="flex items-center gap-6 mb-6">
                        <img src={formData.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-50 dark:ring-slate-800" />
                        <div className="space-y-2 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Vorname</label>
                                    <input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Nachname</label>
                                    <input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">E-Mail</label>
                                <input name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end mb-4">
                        <button onClick={() => { onUpdateProfile(formData); setShowSaved(true); setTimeout(() => setShowSaved(false), 2000); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                            {showSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} Speichern
                        </button>
                    </div>
                </SubSection>
                
                <SubSection 
                    title="Design & Theme" 
                    isDark={isDark}
                    isOpen={activeSubSection === 'profile_theme'}
                    onToggle={() => toggleSubSection('profile_theme')}
                >
                    <div className="py-2">
                         <div className="flex gap-4">
                             <button onClick={() => onUpdateTheme('light')} className={`flex-1 py-3 border rounded-xl flex items-center justify-center gap-2 ${currentTheme === 'light' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                                 <div className="w-4 h-4 rounded-full bg-white border border-slate-300"></div> Hell
                             </button>
                             <button onClick={() => onUpdateTheme('dark')} className={`flex-1 py-3 border rounded-xl flex items-center justify-center gap-2 ${currentTheme === 'dark' ? 'border-indigo-600 bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                                 <div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700"></div> Dunkel
                             </button>
                         </div>
                    </div>
                </SubSection>
             </div>
         </SettingsSection>
         
         {/* --- 2. SYSTEMKONFIGURATION --- */}
         <SettingsSection
             title="Systemkonfiguration"
             icon={Sliders}
             isDark={isDark}
             description="Rechnungen, Produkte & E-Mail Vorlagen"
             isOpen={activeSection === 'configuration'}
             onToggle={() => toggleSection('configuration')}
         >
             <div className="px-6">
                 {/* Rechnungen */}
                 <SubSection
                     title="Rechnungskonfiguration"
                     isDark={isDark}
                     isOpen={activeSubSection === 'config_invoice'}
                     onToggle={() => toggleSubSection('config_invoice')}
                 >
                     <div className="py-2 grid grid-cols-2 gap-4">
                         <div className="col-span-2">
                             <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Firmenlogo</label>
                             <div className="mt-1 flex items-center gap-4">
                                 {invConfigForm.logoBase64 && <img src={invConfigForm.logoBase64} alt="Logo Preview" className="h-12 w-auto object-contain" />}
                                 <button onClick={() => logoInputRef.current?.click()} className="text-sm text-indigo-600 hover:underline">Logo hochladen...</button>
                                 <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                             </div>
                         </div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Firmenname</label><input name="companyName" value={invConfigForm.companyName} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">E-Mail (Firma)</label><input name="email" value={invConfigForm.email} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Straße & Nr.</label><input name="addressLine1" value={invConfigForm.addressLine1} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">PLZ & Ort</label><input name="addressLine2" value={invConfigForm.addressLine2} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">IBAN</label><input name="iban" value={invConfigForm.iban} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">BIC</label><input name="bic" value={invConfigForm.bic} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Bankname</label><input name="bankName" value={invConfigForm.bankName} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Steuernummer</label><input name="taxId" value={invConfigForm.taxId} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         
                         <div className="col-span-2 mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-slate-700">
                             <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block mb-2">Besteuerungsart (Umsatzsteuer)</label>
                             <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="taxRule" value="small_business" checked={invConfigForm.taxRule === 'small_business' || !invConfigForm.taxRule} onChange={handleInvConfigChange} className="text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-sm dark:text-slate-300">Kleinunternehmer (§19 UStG)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="taxRule" value="standard" checked={invConfigForm.taxRule === 'standard'} onChange={handleInvConfigChange} className="text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-sm dark:text-slate-300">Regelbesteuerung (19%)</span>
                                </label>
                             </div>
                         </div>

                         <div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Fußzeile (Text)</label><textarea name="footerText" value={invConfigForm.footerText || ''} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" rows={2} /></div>
                         
                         <div className="col-span-2 mt-2">
                             <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2">
                                 <FileCode className="w-4 h-4" /> PDF Layout & Design (HTML)
                             </label>
                             <div className="relative">
                                 <textarea name="pdfTemplate" value={invConfigForm.pdfTemplate || ''} onChange={handleInvConfigChange} className="w-full px-3 py-2 border rounded-lg text-xs font-mono bg-slate-900 text-slate-200 h-64 focus:ring-2 focus:ring-indigo-500" />
                             </div>
                         </div>
                         <div className="col-span-2 flex justify-end"><button onClick={() => { onUpdateInvoiceConfig(invConfigForm); alert('Gespeichert'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Speichern</button></div>
                     </div>
                 </SubSection>

                 {/* Produkt Presets */}
                 <SubSection
                     title="Produkt Presets"
                     isDark={isDark}
                     isOpen={activeSubSection === 'config_products'}
                     onToggle={() => toggleSubSection('config_products')}
                 >
                     <div className="py-2">
                        <div className="space-y-2 mb-4">
                            {localPresets.map(preset => (
                                <div key={preset.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700">
                                    {editingPresetId === preset.id ? (
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex gap-2">
                                                <input value={editPresetTitle} onChange={e=>setEditPresetTitle(e.target.value)} className="flex-1 border p-1 rounded text-sm dark:bg-slate-700 dark:text-white" />
                                                <input value={editPresetValue} onChange={e=>setEditPresetValue(e.target.value)} type="number" className="w-24 border p-1 rounded text-sm dark:bg-slate-700 dark:text-white" />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={editPresetIsSub} onChange={e => setEditPresetIsSub(e.target.checked)} className="rounded text-indigo-600"/>
                                                    <span className="text-xs text-slate-500">Ist Abo / Wiederkehrend</span>
                                                </label>
                                                <div className="flex gap-2">
                                                    <button onClick={handleSaveEditPreset} className="text-green-600 bg-green-50 p-1 rounded"><Check className="w-4 h-4"/></button>
                                                    <button onClick={handleCancelEditPreset} className="text-red-500 bg-red-50 p-1 rounded"><X className="w-4 h-4"/></button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{preset.title}</span>
                                                    {preset.isSubscription && <span title="Wiederkehrend / Abo" className="flex items-center"><Repeat className="w-3 h-3 text-indigo-500" /></span>}
                                                </div>
                                                <span className="text-xs text-slate-500">{preset.value} €</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleStartEditPreset(preset)} className="text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4"/></button>
                                                <button onClick={() => handleDeletePreset(preset.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex gap-2 mb-2">
                                <input placeholder="Neues Produkt" value={newPresetTitle} onChange={e=>setNewPresetTitle(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                <input placeholder="Preis" type="number" value={newPresetValue} onChange={e=>setNewPresetValue(e.target.value)} className="w-24 px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={newPresetIsSub} onChange={e => setNewPresetIsSub(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Ist Abo / Wiederkehrend</span>
                                </label>
                                <button onClick={handleAddPreset} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"><Plus className="w-3 h-3" /> Hinzufügen</button>
                            </div>
                        </div>
                     </div>
                 </SubSection>

                 {/* Email Versand & Automation */}
                 <SubSection
                     title="E-Mail Versand & Automation"
                     isDark={isDark}
                     isOpen={activeSubSection === 'config_email_automation'}
                     onToggle={() => toggleSubSection('config_email_automation')}
                 >
                     <div className="py-2 space-y-2">
                        <InnerSection title="Willkommens-E-Mail" icon={Star} isDark={isDark} isOpen={activeEmailSub === 'welcome'} onToggle={() => toggleEmailSub('welcome')}>
                             <div className="text-xs text-slate-500 mb-3 bg-slate-100 dark:bg-slate-700 p-2 rounded">
                                 Hinweis: Willkommens-Mails werden nun manuell über den Kontakt versendet (siehe "E-Mail senden" &rarr; Vorlage wählen).
                             </div>
                             <EmailConfigurator config={invConfigForm.emailSettings?.welcome || { subject: '', body: '', attachments: [] }} onChange={(newConfig) => handleEmailConfigChange('welcome', { ...newConfig, enabled: false })} isDark={isDark} label="Willkommens-Mail" />
                        </InnerSection>
                        <InnerSection title="Rechnungsversand" icon={Printer} isDark={isDark} isOpen={activeEmailSub === 'invoice'} onToggle={() => toggleEmailSub('invoice')}>
                             <EmailConfigurator config={invConfigForm.emailSettings?.invoice || { subject: '', body: '', attachments: [] }} onChange={(newConfig) => handleEmailConfigChange('invoice', newConfig)} isDark={isDark} label="Rechnung" />
                        </InnerSection>
                        <InnerSection title="Angebotsversand" icon={Briefcase} isDark={isDark} isOpen={activeEmailSub === 'offer'} onToggle={() => toggleEmailSub('offer')}>
                             <EmailConfigurator config={invConfigForm.emailSettings?.offer || { subject: '', body: '', attachments: [] }} onChange={(newConfig) => handleEmailConfigChange('offer', newConfig)} isDark={isDark} label="Angebot" />
                        </InnerSection>
                        <InnerSection title="Mahnwesen (Erinnerung)" icon={AlertTriangle} isDark={isDark} isOpen={activeEmailSub === 'reminder'} onToggle={() => toggleEmailSub('reminder')}>
                             <EmailConfigurator config={invConfigForm.emailSettings?.reminder || { subject: '', body: '', attachments: [] }} onChange={(newConfig) => handleEmailConfigChange('reminder', newConfig)} isDark={isDark} label="Mahnung" />
                        </InnerSection>
                        <InnerSection title="Allgemeine Textbausteine" icon={FileText} isDark={isDark} isOpen={activeEmailSub === 'templates'} onToggle={() => toggleEmailSub('templates')}>
                            <p className="text-xs text-slate-500 mb-3">Zusätzliche Vorlagen für manuelle E-Mails.</p>
                            <div className="space-y-2 mb-4">
                                {emailTemplates.map(template => (
                                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-indigo-300 transition-colors">
                                        <div><p className="font-medium text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-indigo-500"/> {template.title}</p><p className="text-xs text-slate-500 truncate max-w-xs">{template.subject}</p></div>
                                        <div className="flex gap-2"><button onClick={() => openTemplateModal(template)} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-slate-100 rounded" title="Bearbeiten"><Pencil className="w-4 h-4"/></button><button onClick={() => onDeleteTemplate(template.id)} className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded" title="Löschen"><Trash2 className="w-4 h-4"/></button></div>
                                    </div>
                                ))}
                                {emailTemplates.length === 0 && <p className="text-sm text-slate-400 text-center py-4 italic">Keine manuellen Vorlagen vorhanden.</p>}
                            </div>
                            <button onClick={() => openTemplateModal()} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2 text-sm"><Plus className="w-4 h-4" /> Neue Vorlage erstellen</button>
                        </InnerSection>

                        <div className="flex justify-end sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-4 border-t dark:border-slate-800 -mx-6 -mb-6 z-10">
                             <button onClick={() => { onUpdateInvoiceConfig(invConfigForm); alert('Automatisierungs-Einstellungen gespeichert'); }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 transition-all transform hover:scale-105">Einstellungen Speichern</button>
                        </div>
                     </div>
                 </SubSection>
             </div>
         </SettingsSection>

         {/* --- 3. INTEGRATIONEN & API --- */}
         <SettingsSection 
            title="Integrationen & API" 
            icon={Globe} 
            isDark={isDark} 
            description="Google Dienste, Datenbank & KI"
            isOpen={activeSection === 'integrations'}
            onToggle={() => toggleSection('integrations')}
         >
             <div className="px-6 pb-6 pt-2 space-y-4">
                 <SubSection title="Datenbank Verbindung" isDark={isDark} isOpen={activeSubSection === 'database_conn'} onToggle={() => toggleSubSection('database_conn')}>
                     <div className="flex gap-4 mb-6">
                         <button onClick={handleSwitchToLocal} className={`flex-1 p-4 rounded-xl border text-left transition-all ${backendConfig.mode === 'local' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                             <div className="flex items-center gap-2 mb-2"><HardDrive className={`w-5 h-5 ${backendConfig.mode === 'local' ? 'text-indigo-600' : 'text-slate-400'}`} /><span className={`font-bold ${backendConfig.mode === 'local' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Lokal (Browser)</span></div>
                             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Daten werden im LocalStorage gespeichert. Schnell, aber an dieses Gerät gebunden.</p>
                         </button>
                         <button onClick={() => setBackendForm({...backendForm, mode: 'firebase'})} className={`flex-1 p-4 rounded-xl border text-left transition-all ${backendConfig.mode === 'firebase' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                             <div className="flex items-center gap-2 mb-2"><CloudLightning className={`w-5 h-5 ${backendConfig.mode === 'firebase' ? 'text-indigo-600' : 'text-slate-400'}`} /><span className={`font-bold ${backendConfig.mode === 'firebase' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Google Cloud (Firebase)</span></div>
                             <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Echtzeit-Synchronisation zwischen Geräten. Erfordert Firebase Projekt.</p>
                         </button>
                     </div>
                     <div className={`space-y-4 transition-all ${backendConfig.mode === 'firebase' || backendForm.mode === 'firebase' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                         <h3 className="text-sm font-bold dark:text-white border-b dark:border-slate-700 pb-2">Firebase Konfiguration</h3>
                         <div className="grid grid-cols-2 gap-4">
                             <div><label className="text-xs font-bold uppercase text-slate-500">API Key</label><input value={fbConfig.apiKey} onChange={e=>setFbConfig({...fbConfig, apiKey: e.target.value})} className="w-full border p-2 rounded text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                             <div><label className="text-xs font-bold uppercase text-slate-500">Auth Domain</label><input value={fbConfig.authDomain} onChange={e=>setFbConfig({...fbConfig, authDomain: e.target.value})} className="w-full border p-2 rounded text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                             <div><label className="text-xs font-bold uppercase text-slate-500">Project ID</label><input value={fbConfig.projectId} onChange={e=>setFbConfig({...fbConfig, projectId: e.target.value})} className="w-full border p-2 rounded text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                             <div><label className="text-xs font-bold uppercase text-slate-500">Storage Bucket</label><input value={fbConfig.storageBucket} onChange={e=>setFbConfig({...fbConfig, storageBucket: e.target.value})} className="w-full border p-2 rounded text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                             <div><label className="text-xs font-bold uppercase text-slate-500">Messaging Sender ID</label><input value={fbConfig.messagingSenderId} onChange={e=>setFbConfig({...fbConfig, messagingSenderId: e.target.value})} className="w-full border p-2 rounded text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                             <div><label className="text-xs font-bold uppercase text-slate-500">App ID</label><input value={fbConfig.appId} onChange={e=>setFbConfig({...fbConfig, appId: e.target.value})} className="w-full border p-2 rounded text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         </div>
                         <div className="flex justify-end pt-2"><button onClick={handleSaveFirebaseConfig} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Verbindung herstellen & Speichern</button></div>
                     </div>
                 </SubSection>

                 <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700">
                     <div className="flex items-center gap-4">
                         <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                         <div><h3 className="font-semibold text-sm dark:text-white">Google Calendar</h3><p className="text-xs text-slate-500 dark:text-slate-400">Termine synchronisieren</p></div>
                     </div>
                     <button onClick={handleToggleCalendar} disabled={!!isConnecting} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isCalendarConnected ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                         {isConnecting === 'calendar' ? 'Lade...' : isCalendarConnected ? 'Verbunden' : 'Verbinden'}
                     </button>
                 </div>

                 <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700">
                     <div className="flex items-center gap-4">
                         <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><Mail className="w-5 h-5 text-red-600 dark:text-red-400" /></div>
                         <div><h3 className="font-semibold text-sm dark:text-white">Google Mail</h3><p className="text-xs text-slate-500 dark:text-slate-400">E-Mails direkt senden</p></div>
                     </div>
                     <button onClick={handleToggleMail} disabled={!!isConnecting} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isMailConnected ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                         {isConnecting === 'mail' ? 'Lade...' : isMailConnected ? 'Verbunden' : 'Verbinden'}
                     </button>
                 </div>
                 
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-indigo-500"/> Google Gemini API Key</label>
                    <div className="flex gap-2">
                        <input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="AIzaSy..." />
                        <button onClick={() => { localStorage.setItem('gemini_api_key', geminiKey); alert('API Key gespeichert.'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Speichern</button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Benötigt für KI-Analysen. Wird nur lokal im Browser gespeichert.</p>
                 </div>
             </div>
         </SettingsSection>

         {/* --- 4. DATENVERWALTUNG (NEU ORGANISIERT) --- */}
         <SettingsSection 
            title="Datenverwaltung" 
            icon={Database} 
            isDark={isDark} 
            description="Backup, Updates & Reset"
            isOpen={activeSection === 'data'}
            onToggle={() => toggleSection('data')}
         >
             <div className="px-6 pb-6 pt-2">
                 {/* Backup & Import */}
                 <SubSection title="Backup & Wiederherstellung" isDark={isDark} isOpen={activeSubSection === 'data_backup'} onToggle={() => toggleSubSection('data_backup')}>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleExport} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                            <DownloadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Backup erstellen</span>
                            <span className="text-xs text-slate-400">Alle Daten als JSON exportieren</span>
                        </button>
                        <button onClick={handleImportClick} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Backup wiederherstellen</span>
                            <span className="text-xs text-slate-400">JSON-Datei importieren</span>
                        </button>
                        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>
                 </SubSection>

                 {/* Software & Updates */}
                 <SubSection title="Software & Updates" isDark={isDark} isOpen={activeSubSection === 'data_updates'} onToggle={() => toggleSubSection('data_updates')}>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                         <div className="flex items-center justify-between mb-4">
                             <div>
                                 <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><RefreshCw className="w-4 h-4"/> System Update</h4>
                                 <p className="text-xs text-slate-500">Installierte Version: <span className="font-mono bg-white dark:bg-slate-900 px-1 rounded border dark:border-slate-700">{appVersion}</span></p>
                             </div>
                             <div className="flex flex-col items-end gap-1">
                                 <input 
                                     value={updateUrl}
                                     onChange={(e) => { setUpdateUrl(e.target.value); localStorage.setItem('update_url', e.target.value); }}
                                     placeholder="Update Server URL..." 
                                     className="border rounded px-2 py-1 text-xs w-64 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                                 />
                             </div>
                         </div>
                         
                         <div className="flex gap-4">
                             <button 
                                onClick={() => handleCheckUpdate(false)}
                                disabled={isUpdating}
                                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                             >
                                 {isUpdating && updateStatus.includes('Prüfe') ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4"/>}
                                 Nach Updates suchen
                             </button>
                             <button 
                                onClick={() => { if(confirm("Dies lädt ALLE Systemdateien neu vom Server. Fortfahren?")) { handleCheckUpdate(true); } }}
                                disabled={isUpdating}
                                className="flex-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                             >
                                 <ShieldAlert className="w-4 h-4"/>
                                 Neuinstallation erzwingen
                             </button>
                         </div>
                         {updateStatus && (
                             <div className="mt-3 p-2 bg-slate-100 dark:bg-black rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                 <Info className="w-3 h-3"/> {updateStatus}
                             </div>
                         )}
                    </div>
                 </SubSection>

                 {/* Gefahrenzone */}
                 <SubSection title="Gefahrenzone" isDark={isDark} isOpen={activeSubSection === 'data_danger'} onToggle={() => toggleSubSection('data_danger')}>
                     <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                         <div className="flex items-start gap-4">
                             <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full mt-1">
                                 <Trash2 className="w-5 h-5" />
                             </div>
                             <div className="flex-1">
                                 <h3 className="font-bold text-red-700 dark:text-red-400">Alles Löschen (Factory Reset)</h3>
                                 <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 mb-3">
                                     Diese Aktion löscht alle Kontakte, Rechnungen, Einstellungen und Aktivitäten unwiderruflich. 
                                     Das Programm wird auf den Werkszustand zurückgesetzt.
                                 </p>
                                 <button 
                                     onClick={handleWipeData}
                                     className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-red-200 dark:shadow-none flex items-center gap-2"
                                 >
                                     <AlertOctagon className="w-4 h-4" />
                                     Alle Daten unwiderruflich löschen
                                 </button>
                             </div>
                         </div>
                     </div>
                 </SubSection>
             </div>
         </SettingsSection>

      </main>

      {/* Template Modal */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="px-6 py-4 border-b dark:border-slate-700 flex justify-between items-center">
                      <h2 className="font-bold dark:text-white">{editingTemplateId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h2>
                      <button onClick={() => setIsTemplateModalOpen(false)} className="dark:text-slate-400"><X className="w-5 h-5"/></button>
                  </div>
                  <form onSubmit={saveTemplate} className="p-6 space-y-4">
                      <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Titel (Intern)</label><input value={templateForm.title} onChange={e=>setTemplateForm({...templateForm, title:e.target.value})} className="w-full border p-2 rounded mt-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" autoFocus required/></div>
                      <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Betreff</label><input value={templateForm.subject} onChange={e=>setTemplateForm({...templateForm, subject:e.target.value})} className="w-full border p-2 rounded mt-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" required/></div>
                      <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Nachricht</label><textarea value={templateForm.body} onChange={e=>setTemplateForm({...templateForm, body:e.target.value})} className="w-full border p-2 rounded mt-1 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" rows={6}/></div>
                      <div className="flex justify-end pt-2"><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700">Speichern</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};