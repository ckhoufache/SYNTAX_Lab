
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
      
      localStorage.setItem('update_url', updateUrl);
      setIsUpdating(true);
      setUpdateStatus('Prüfe URL...');

      try {
          let baseUrl = updateUrl.replace(/\/index\.html$/, '').replace(/\/$/, '');
          const indexUrl = `${baseUrl}/index.html`;

          const indexResponse = await fetch(indexUrl, { cache: 'no-store' });
          if (!indexResponse.ok) throw new Error("Konnte index.html nicht laden");
          const indexHtml = await indexResponse.text();

          setUpdateStatus('Analysiere Version...');
          
          const assetRegex = /["'](?:\.?\/)?assets\/([^"']+)["']/g;
          const matches = [...indexHtml.matchAll(assetRegex)];
          const assets = matches.map(m => m[1]);
          const uniqueAssets = [...new Set(assets)];
          
          const files = [];
          files.push({ name: 'index.html', content: indexHtml, type: 'root' });

          setUpdateStatus(`Lade ${uniqueAssets.length} Assets...`);
          
          for (const asset of uniqueAssets) {
               const assetUrl = `${baseUrl}/assets/${asset}`;
               const resp = await fetch(assetUrl);
               if (!resp.ok) console.warn("Failed to fetch asset:", asset);
               else {
                   const content = await resp.text(); 
                   files.push({ name: asset, content, type: 'asset' });
               }
          }

          if (files.length > 0 && window.require) {
              setUpdateStatus('Installiere Update...');
              const { ipcRenderer } = window.require('electron');
              const result = await ipcRenderer.invoke('install-update', files);
              
              if (result.success) {
                  setUpdateStatus('Update installiert! Neustart...');
                  setTimeout(() => {
                      ipcRenderer.invoke('restart-app');
                  }, 2000);
              } else {
                  throw new Error(result.error);
              }
          } else {
              alert("Keine Assets gefunden oder keine Electron Umgebung.");
              setUpdateStatus('');
              setIsUpdating(false);
          }

      } catch (e: any) {
          console.error(e);
          alert(`Update Fehler: ${e.message}`);
          setUpdateStatus('');
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
         
         {/* Profile Section */}
         <SettingsSection title="Profil & Darstellung" icon={User} isDark={isDark} description="Persönliche Daten und Design" defaultOpen={true}>
             <div className="px-6">
                <SubSection title="Stammdaten" isDark={isDark} defaultOpen={true}>
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
                
                <SubSection title="Design & Theme" isDark={isDark}>
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

         {/* Invoice Config */}
         <SettingsSection title="Rechnungskonfiguration" icon={FileText} isDark={isDark} description="Firmendaten für PDF Rechnungen">
             <div className="p-6 grid grid-cols-2 gap-4">
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
                 <div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Fußzeile (Text)</label><textarea name="footerText" value={invConfigForm.footerText || ''} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" rows={2} /></div>
                 <div className="col-span-2 flex justify-end"><button onClick={() => { onUpdateInvoiceConfig(invConfigForm); alert('Gespeichert'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Speichern</button></div>
             </div>
         </SettingsSection>
         
         {/* Integrations */}
         <SettingsSection title="Integrationen & API" icon={Globe} isDark={isDark} description="Google Services & KI Verbindung">
             <div className="px-6">
                 <SubSection title="Google Cloud Platform" isDark={isDark}>
                    <div className="mb-2 mt-2">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Client ID</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Client ID eingeben" 
                                value={backendForm.googleClientId || ''}
                                onChange={(e) => setBackendForm({...backendForm, googleClientId: e.target.value})}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <button onClick={() => { onUpdateBackendConfig(backendForm); alert('Client ID gespeichert'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Speichern</button>
                        </div>
                    </div>
                 </SubSection>

                 <SubSection title="Verbundene Dienste" isDark={isDark}>
                    <div className="grid grid-cols-2 gap-4 mt-2 mb-2">
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Calendar className={`w-5 h-5 ${isCalendarConnected ? 'text-green-500' : 'text-slate-400'}`} />
                                <div>
                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Google Calendar</p>
                                    <p className="text-xs text-slate-500">{isCalendarConnected ? 'Verbunden' : 'Nicht verbunden'}</p>
                                </div>
                            </div>
                            <button onClick={handleToggleCalendar} disabled={isConnecting === 'calendar'} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isCalendarConnected ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                                {isConnecting === 'calendar' ? '...' : (isCalendarConnected ? 'Trennen' : 'Verbinden')}
                            </button>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Mail className={`w-5 h-5 ${isMailConnected ? 'text-green-500' : 'text-slate-400'}`} />
                                <div>
                                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Gmail</p>
                                    <p className="text-xs text-slate-500">{isMailConnected ? 'Verbunden' : 'Nicht verbunden'}</p>
                                </div>
                            </div>
                            <button onClick={handleToggleMail} disabled={isConnecting === 'mail'} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${isMailConnected ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                                {isConnecting === 'mail' ? '...' : (isMailConnected ? 'Trennen' : 'Verbinden')}
                            </button>
                        </div>
                    </div>
                 </SubSection>

                 <SubSection title="Künstliche Intelligenz" isDark={isDark}>
                    <div className="mt-2 mb-2">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Google Gemini AI</h3>
                        <p className="text-xs text-slate-500 mb-2">Für tägliche Briefings und Smart Insights.</p>
                        <div className="flex gap-2">
                            <input 
                                type="password" 
                                placeholder="API Key (startet mit AIza...)" 
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <button onClick={() => { localStorage.setItem('gemini_api_key', geminiKey); alert('API Key gespeichert'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Speichern</button>
                        </div>
                    </div>
                 </SubSection>
                 
                 <SubSection title="API Zugriff" isDark={isDark}>
                    <div className="mt-2 mb-2">
                        <p className="text-xs text-slate-500 mb-2">Für externe Zugriffe auf dieses CRM.</p>
                        <div className="flex gap-2">
                             <div className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-600 dark:text-slate-300 truncate">
                                 {backendForm.apiKey || 'Kein Key generiert'}
                             </div>
                             <button onClick={copyApiKey} disabled={!backendForm.apiKey} className="p-2 text-slate-500 hover:text-indigo-600"><Copy className="w-4 h-4"/></button>
                             <button onClick={() => { generateApiKey(); onUpdateBackendConfig({...backendForm, apiKey: backendForm.apiKey}); }} className="p-2 text-slate-500 hover:text-indigo-600"><RefreshCw className="w-4 h-4"/></button>
                        </div>
                    </div>
                 </SubSection>
             </div>
         </SettingsSection>

         {/* Product Presets */}
         <SettingsSection title="Produkt Presets" icon={Package} isDark={isDark} description="Vorlagen für Deals">
             <div className="p-6">
                 <div className="space-y-2 mb-4">
                     {localPresets.map(preset => (
                         <div key={preset.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700">
                             {editingPresetId === preset.id ? (
                                 <div className="flex gap-2 flex-1 items-center">
                                     <input value={editPresetTitle} onChange={e=>setEditPresetTitle(e.target.value)} className="flex-1 border p-1 rounded text-sm dark:bg-slate-700 dark:text-white" />
                                     <input value={editPresetValue} onChange={e=>setEditPresetValue(e.target.value)} type="number" className="w-24 border p-1 rounded text-sm dark:bg-slate-700 dark:text-white" />
                                     <button onClick={handleSaveEditPreset} className="text-green-600"><Check className="w-4 h-4"/></button>
                                     <button onClick={handleCancelEditPreset} className="text-red-500"><X className="w-4 h-4"/></button>
                                 </div>
                             ) : (
                                 <>
                                     <div className="flex gap-4">
                                         <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{preset.title}</span>
                                         <span className="text-sm text-slate-500">{preset.value} €</span>
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
                 <div className="flex gap-2">
                     <input placeholder="Neues Produkt" value={newPresetTitle} onChange={e=>setNewPresetTitle(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                     <input placeholder="Preis" type="number" value={newPresetValue} onChange={e=>setNewPresetValue(e.target.value)} className="w-24 px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                     <button onClick={() => { handleAddPreset(); onUpdatePresets(localPresets); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
                 </div>
             </div>
         </SettingsSection>

         {/* Email Templates */}
         <SettingsSection title="E-Mail Vorlagen" icon={Mail} isDark={isDark} description="Templates für den Schnellzugriff">
             <div className="p-6">
                 <div className="space-y-2 mb-4">
                     {emailTemplates.map(template => (
                         <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700">
                             <div>
                                 <p className="font-medium text-sm text-slate-800 dark:text-slate-200">{template.title}</p>
                                 <p className="text-xs text-slate-500">{template.subject}</p>
                             </div>
                             <div className="flex gap-2">
                                 <button onClick={() => openTemplateModal(template)} className="text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4"/></button>
                                 <button onClick={() => onDeleteTemplate(template.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                             </div>
                         </div>
                     ))}
                 </div>
                 <button onClick={() => openTemplateModal()} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2 text-sm"><Plus className="w-4 h-4" /> Neue Vorlage erstellen</button>
             </div>
         </SettingsSection>

         {/* Data Management */}
         <SettingsSection title="Datenverwaltung" icon={Database} isDark={isDark} description="Backup und Wiederherstellung">
             <div className="px-6">
                 <SubSection title="Backup & Restore" isDark={isDark} defaultOpen={true}>
                    <div className="grid grid-cols-2 gap-4 mt-2 mb-2">
                        <button onClick={handleExport} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col items-center gap-2 transition-colors">
                            <DownloadCloud className="w-8 h-8 text-indigo-600" />
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Daten exportieren</span>
                            <span className="text-xs text-slate-500 text-center">Erstellt eine JSON Backup Datei</span>
                        </button>
                        <button onClick={handleImportClick} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col items-center gap-2 transition-colors">
                            <Upload className="w-8 h-8 text-amber-600" />
                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Daten importieren</span>
                            <span className="text-xs text-slate-500 text-center">Stellt Daten aus Backup wieder her</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>
                 </SubSection>
                 
                 <SubSection title="Software Update" isDark={isDark}>
                    <div className="mt-2 mb-2">
                        <div className="flex items-center gap-2 mb-2"><RefreshCcw className="w-4 h-4" /> <span className="text-sm font-bold">Update Server (Beta)</span></div>
                        <p className="text-xs text-slate-500 mb-3">Laden Sie Updates von einem lokalen Server oder einer URL.</p>
                        <div className="flex gap-2">
                            <input 
                                placeholder="http://localhost:8080 oder URL" 
                                value={updateUrl} 
                                onChange={(e) => setUpdateUrl(e.target.value)} 
                                className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            />
                            <button 
                                onClick={handleCheckUpdate} 
                                disabled={isUpdating}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Update laden'}
                            </button>
                        </div>
                        {updateStatus && <p className="text-xs text-indigo-600 mt-2 font-mono">{updateStatus}</p>}
                    </div>
                 </SubSection>
             </div>
         </SettingsSection>
      </main>

      {/* Template Modal */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="px-6 py-4 border-b bg-slate-50 flex justify-between"><h2 className="font-bold">E-Mail Vorlage</h2><button onClick={() => setIsTemplateModalOpen(false)}><X className="w-5"/></button></div>
                  <form onSubmit={saveTemplate} className="p-6 space-y-4">
                      <div><label className="text-xs font-bold uppercase text-slate-500">Titel</label><input required value={templateForm.title} onChange={e=>setTemplateForm({...templateForm, title:e.target.value})} className="w-full border p-2 rounded mt-1" placeholder="z.B. Angebot Follow-Up" /></div>
                      <div><label className="text-xs font-bold uppercase text-slate-500">Betreff</label><input required value={templateForm.subject} onChange={e=>setTemplateForm({...templateForm, subject:e.target.value})} className="w-full border p-2 rounded mt-1" /></div>
                      <div><label className="text-xs font-bold uppercase text-slate-500">Text (Platzhalter: {'{name}'})</label><textarea required value={templateForm.body} onChange={e=>setTemplateForm({...templateForm, body:e.target.value})} className="w-full border p-2 rounded mt-1" rows={6} /></div>
                      <div className="flex justify-end pt-2"><button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium">Speichern</button></div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
