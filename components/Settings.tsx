
import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Plus, Trash2, Package, User, Share2, Palette, ChevronDown, ChevronUp, Pencil, X, Calendar, Database, Download, Upload, Mail, Server, Globe, Laptop, HelpCircle, Loader2, AlertTriangle, Key, RefreshCw, Copy, FileText, Image as ImageIcon, Briefcase, Settings as SettingsIcon, HardDrive, Users, DownloadCloud, RefreshCcw, Sparkles, Sliders, Link, Paperclip, Star, PaperclipIcon, FileCode, Printer, Info, AlertOctagon, Repeat, Cloud, CloudLightning, ShieldAlert, Wifi, UserPlus } from 'lucide-react';
import { UserProfile, Theme, ProductPreset, Contact, Deal, Task, BackupData, BackendConfig, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate, EmailAttachment, EmailAutomationConfig, FirebaseConfig } from '../types';
import { IDataService } from '../services/dataService';

export interface SettingsProps {
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

// Sub-components
const SettingsSection: React.FC<{ 
    title: string; 
    icon: any; 
    isDark: boolean; 
    description: string; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode 
}> = ({ title, icon: Icon, isDark, description, isOpen, onToggle, children }) => (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-indigo-500 shadow-md' : 'border-slate-200 dark:border-slate-800'}`}>
        <button onClick={onToggle} className="w-full flex items-center justify-between p-6 text-left">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isOpen ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                </div>
            </div>
            {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        {isOpen && <div className="border-t border-slate-100 dark:border-slate-800">{children}</div>}
    </div>
);

const SubSection: React.FC<{ 
    title: string; 
    isDark: boolean; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode 
}> = ({ title, isDark, isOpen, onToggle, children }) => (
    <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
        <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors px-4 rounded-lg">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{title}</h3>
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {isOpen && <div className="pb-6 px-4 animate-in slide-in-from-top-2">{children}</div>}
    </div>
);


export const Settings: React.FC<SettingsProps> = ({ 
  userProfile, onUpdateProfile, currentTheme, onUpdateTheme, productPresets, onUpdatePresets,
  contacts, deals, tasks, invoices, expenses, activities, onImportData, backendConfig, onUpdateBackendConfig,
  dataService, invoiceConfig, onUpdateInvoiceConfig, emailTemplates, onAddTemplate, onUpdateTemplate, onDeleteTemplate
}) => {
  const isDark = currentTheme === 'dark';
  
  // State
  const [activeSection, setActiveSection] = useState<string | null>('profile');
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [showSaved, setShowSaved] = useState(false);
  
  const [invConfigForm, setInvConfigForm] = useState<InvoiceConfig>(invoiceConfig);
  
  const [backendForm, setBackendForm] = useState<BackendConfig>(backendConfig);
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>(backendConfig.firebaseConfig || { apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
  
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isMailConnected, setIsMailConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<'calendar' | 'mail' | null>(null);
  
  const [appVersion, setAppVersion] = useState('Checking...');
  const [updateUrl, setUpdateUrl] = useState(localStorage.getItem('update_url') || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');

  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    dataService.getIntegrationStatus('calendar').then(setIsCalendarConnected);
    dataService.getIntegrationStatus('mail').then(setIsMailConnected);
    dataService.getAppVersion().then(setAppVersion);
    dataService.getAllUsers().then(setTeamMembers);
  }, [dataService]);

  // Handlers
  const toggleSection = (section: string) => setActiveSection(activeSection === section ? null : section);
  const toggleSubSection = (sub: string) => setActiveSubSection(activeSubSection === sub ? null : sub);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleInvConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInvConfigForm({ ...invConfigForm, [e.target.name]: e.target.value });
  };
  
  const handleSaveFirebaseConfig = () => {
      const newConfig = { ...backendForm, firebaseConfig: fbConfig, mode: 'firebase' as const };
      onUpdateBackendConfig(newConfig);
      alert("Konfiguration gespeichert. Die App wird neu geladen.");
      window.location.reload();
  };
  
  const handleSwitchToLocal = () => {
      if(confirm("Wechsel zu lokalem Modus?")) {
          onUpdateBackendConfig({ ...backendForm, mode: 'local' });
          window.location.reload();
      }
  };

  const handleToggleCalendar = async () => {
      setIsConnecting('calendar');
      if (isCalendarConnected) {
          await dataService.disconnectGoogle('calendar');
          setIsCalendarConnected(false);
      } else {
          const success = await dataService.connectGoogle('calendar');
          setIsCalendarConnected(success);
      }
      setIsConnecting(null);
  };
  
  const handleToggleMail = async () => {
      setIsConnecting('mail');
      if (isMailConnected) {
          await dataService.disconnectGoogle('mail');
          setIsMailConnected(false);
      } else {
          const success = await dataService.connectGoogle('mail');
          setIsMailConnected(success);
      }
      setIsConnecting(null);
  };
  
  const handleExport = () => {
      const data: BackupData = {
          contacts, deals, tasks, invoices, expenses, activities, 
          userProfile: formData, productPresets, invoiceConfig: invConfigForm, 
          emailTemplates, theme: currentTheme,
          timestamp: new Date().toISOString(), version: appVersion
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
  };
  
  const handleImportClick = () => fileInputRef.current?.click();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              onImportData(data);
          } catch(err) {
              alert("Fehler beim Lesen der Backup-Datei.");
          }
      };
      reader.readAsText(file);
  };
  
  const handleCheckUpdate = async (force = false) => {
      setIsUpdating(true);
      setUpdateStatus('Prüfe auf Updates...');
      try {
          const hasUpdate = await dataService.checkAndInstallUpdate(updateUrl, setUpdateStatus, force);
          if (hasUpdate) {
              if (confirm("Update installiert. Jetzt neu starten?")) {
                  if ((window as any).require) {
                      (window as any).require('electron').ipcRenderer.invoke('restart-app');
                  } else {
                      window.location.reload();
                  }
              }
          } else {
              setUpdateStatus('Auf dem neuesten Stand.');
              setTimeout(() => setUpdateStatus(''), 3000);
          }
      } catch (e: any) {
          setUpdateStatus('Fehler: ' + e.message);
      } finally {
          setIsUpdating(false);
      }
  };
  
  const handleWipeData = async () => {
      if (confirm("Sicher? Dies kann nicht rückgängig gemacht werden!")) {
          await dataService.wipeAllData();
      }
  };

  const handleInviteUser = async () => {
      if (!inviteEmail) return;
      setIsInviting(true);
      try {
          await dataService.inviteUser(inviteEmail, 'Mitarbeiter');
          alert(`Benutzer ${inviteEmail} wurde zur Whitelist hinzugefügt.`);
          setInviteEmail('');
          const team = await dataService.getAllUsers();
          setTeamMembers(team);
      } catch (e: any) {
          console.error(e);
          alert("Fehler beim Einladen: " + e.message);
      } finally {
          setIsInviting(false);
      }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-screen overflow-y-auto flex flex-col relative">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Einstellungen</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Konfigurieren Sie Ihr CRM.</p>
      </header>
      
      <main className="p-8 space-y-6 pb-20 max-w-5xl mx-auto w-full">
         
         <SettingsSection 
            title="Profil & Darstellung" 
            icon={User} 
            isDark={isDark} 
            description="Persönliche Daten und Design"
            isOpen={activeSection === 'profile'}
            onToggle={() => toggleSection('profile')}
         >
             <div className="px-6">
                <SubSection title="Stammdaten" isDark={isDark} isOpen={activeSubSection === 'profile_data'} onToggle={() => toggleSubSection('profile_data')}>
                    <div className="flex items-center gap-6 mb-6">
                        <img src={formData.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-50 dark:ring-slate-800" />
                        <div className="space-y-2 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Vorname</label><input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Nachname</label><input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                            </div>
                            <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">E-Mail</label><input name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                        </div>
                    </div>
                    <div className="flex justify-end mb-4"><button onClick={() => { onUpdateProfile(formData); setShowSaved(true); setTimeout(() => setShowSaved(false), 2000); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">{showSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} Speichern</button></div>
                </SubSection>
                
                <SubSection title="Design & Theme" isDark={isDark} isOpen={activeSubSection === 'profile_theme'} onToggle={() => toggleSubSection('profile_theme')}>
                    <div className="py-2"><div className="flex gap-4"><button onClick={() => onUpdateTheme('light')} className={`flex-1 py-3 border rounded-xl flex items-center justify-center gap-2 ${currentTheme === 'light' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}><div className="w-4 h-4 rounded-full bg-white border border-slate-300"></div> Hell</button><button onClick={() => onUpdateTheme('dark')} className={`flex-1 py-3 border rounded-xl flex items-center justify-center gap-2 ${currentTheme === 'dark' ? 'border-indigo-600 bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}><div className="w-4 h-4 rounded-full bg-slate-900 border border-slate-700"></div> Dunkel</button></div></div>
                </SubSection>

                <SubSection 
                    title="Team & Zugriffsrechte" 
                    isDark={isDark}
                    isOpen={activeSubSection === 'profile_team'}
                    onToggle={() => toggleSubSection('profile_team')}
                >
                    <div className="py-2 space-y-4">
                        {backendConfig.mode === 'firebase' && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-2">
                                    <UserPlus className="w-4 h-4"/> Benutzer einladen (Whitelist)
                                </h3>
                                <div className="flex gap-2">
                                    <input 
                                        value={inviteEmail} 
                                        onChange={(e) => setInviteEmail(e.target.value)} 
                                        placeholder="kollege@gmail.com" 
                                        className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:border-indigo-900 dark:text-white"
                                    />
                                    <button 
                                        onClick={handleInviteUser} 
                                        disabled={!inviteEmail || isInviting}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {isInviting ? '...' : 'Hinzufügen'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <h4 className="text-xs font-bold uppercase text-slate-500 mt-4">Aktive Mitglieder</h4>
                        {teamMembers.length > 0 ? (
                            <div className="grid gap-3">
                                {teamMembers.map((member, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                        {member.avatar ? (
                                            <img src={member.avatar} alt="User" className="w-8 h-8 rounded-full object-cover"/>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-bold dark:text-white">{member.firstName} {member.lastName}</p>
                                            <p className="text-xs text-slate-500">{member.email}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">Keine weiteren Teammitglieder.</p>
                        )}
                    </div>
                </SubSection>
             </div>
         </SettingsSection>
         
         <SettingsSection
             title="Systemkonfiguration"
             icon={Sliders}
             isDark={isDark}
             description="Rechnungen, Produkte & E-Mail Vorlagen"
             isOpen={activeSection === 'configuration'}
             onToggle={() => toggleSection('configuration')}
         >
             <div className="px-6">
                 <SubSection title="Rechnungskonfiguration" isDark={isDark} isOpen={activeSubSection === 'config_invoice'} onToggle={() => toggleSubSection('config_invoice')}>
                     <div className="py-2 grid grid-cols-2 gap-4">
                         <div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Firmenname</label><input name="companyName" value={invConfigForm.companyName} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                         <div className="col-span-2 flex justify-end"><button onClick={() => { onUpdateInvoiceConfig(invConfigForm); alert('Gespeichert'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Speichern</button></div>
                     </div>
                 </SubSection>
                 <SubSection title="Produkt Presets" isDark={isDark} isOpen={activeSubSection === 'config_products'} onToggle={() => toggleSubSection('config_products')}>
                     <div className="py-2"><p className="text-sm text-slate-500">Verwalten Sie Ihre Produkte hier.</p></div>
                 </SubSection>
                 <SubSection title="E-Mail Versand & Automation" isDark={isDark} isOpen={activeSubSection === 'config_email_automation'} onToggle={() => toggleSubSection('config_email_automation')}>
                     <div className="py-2"><p className="text-sm text-slate-500">Konfigurieren Sie E-Mail Vorlagen.</p></div>
                 </SubSection>
             </div>
         </SettingsSection>

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
                         </button>
                         <button onClick={() => setBackendForm({...backendForm, mode: 'firebase'})} className={`flex-1 p-4 rounded-xl border text-left transition-all ${backendConfig.mode === 'firebase' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-500' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                             <div className="flex items-center gap-2 mb-2"><CloudLightning className={`w-5 h-5 ${backendConfig.mode === 'firebase' ? 'text-indigo-600' : 'text-slate-400'}`} /><span className={`font-bold ${backendConfig.mode === 'firebase' ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'}`}>Google Cloud (Firebase)</span></div>
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
                     <div className="flex items-center gap-4"><div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div><div><h3 className="font-semibold text-sm dark:text-white">Google Calendar</h3></div></div>
                     <button onClick={handleToggleCalendar} disabled={!!isConnecting} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isCalendarConnected ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>{isConnecting === 'calendar' ? 'Lade...' : isCalendarConnected ? 'Verbunden' : 'Verbinden'}</button>
                 </div>
                 <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700">
                     <div className="flex items-center gap-4"><div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><Mail className="w-5 h-5 text-red-600 dark:text-red-400" /></div><div><h3 className="font-semibold text-sm dark:text-white">Google Mail</h3></div></div>
                     <button onClick={handleToggleMail} disabled={!!isConnecting} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isMailConnected ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}>{isConnecting === 'mail' ? 'Lade...' : isMailConnected ? 'Verbunden' : 'Verbinden'}</button>
                 </div>
                 
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-indigo-500"/> Google Gemini API Key</label>
                    <div className="flex gap-2"><input type="password" value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white dark:bg-slate-800 dark:border-slate-600 dark:text-white" placeholder="AIzaSy..." /><button onClick={() => { localStorage.setItem('gemini_api_key', geminiKey); alert('API Key gespeichert.'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Speichern</button></div>
                 </div>
             </div>
         </SettingsSection>

         <SettingsSection 
            title="Datenverwaltung" 
            icon={Database} 
            isDark={isDark} 
            description="Backup, Updates & Reset"
            isOpen={activeSection === 'data'}
            onToggle={() => toggleSection('data')}
         >
             <div className="px-6 pb-6 pt-2">
                 <SubSection title="Backup & Wiederherstellung" isDark={isDark} isOpen={activeSubSection === 'data_backup'} onToggle={() => toggleSubSection('data_backup')}>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleExport} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"><DownloadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" /><span className="font-semibold text-slate-700 dark:text-slate-300">Backup erstellen</span></button>
                        <button onClick={handleImportClick} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"><Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" /><span className="font-semibold text-slate-700 dark:text-slate-300">Backup wiederherstellen</span></button>
                        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".json" />
                    </div>
                 </SubSection>
                 <SubSection title="Software & Updates" isDark={isDark} isOpen={activeSubSection === 'data_updates'} onToggle={() => toggleSubSection('data_updates')}>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                         <div className="flex items-center justify-between mb-4">
                             <div><h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><RefreshCw className="w-4 h-4"/> System Update</h4><p className="text-xs text-slate-500">Installierte Version: <span className="font-mono bg-white dark:bg-slate-900 px-1 rounded border dark:border-slate-700">{appVersion}</span></p></div>
                             <div className="flex flex-col items-end gap-1"><input value={updateUrl} onChange={(e) => { setUpdateUrl(e.target.value); localStorage.setItem('update_url', e.target.value); }} placeholder="Update Server URL..." className="border rounded px-2 py-1 text-xs w-64 dark:bg-slate-800 dark:border-slate-700 dark:text-white"/></div>
                         </div>
                         <div className="flex gap-4">
                             <button onClick={() => handleCheckUpdate(false)} disabled={isUpdating} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50">{isUpdating && updateStatus.includes('Prüfe') ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4"/>} Nach Updates suchen</button>
                             <button onClick={() => { if(confirm("Dies lädt ALLE Systemdateien neu vom Server. Fortfahren?")) { handleCheckUpdate(true); } }} disabled={isUpdating} className="flex-1 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"><ShieldAlert className="w-4 h-4"/> Neuinstallation erzwingen</button>
                         </div>
                         {updateStatus && (<div className="mt-3 p-2 bg-slate-100 dark:bg-black rounded text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center gap-2"><Info className="w-3 h-3"/> {updateStatus}</div>)}
                    </div>
                 </SubSection>
                 <SubSection title="Gefahrenzone" isDark={isDark} isOpen={activeSubSection === 'data_danger'} onToggle={() => toggleSubSection('data_danger')}>
                     <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl">
                         <div className="flex items-start gap-4"><div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full mt-1"><Trash2 className="w-5 h-5" /></div><div className="flex-1"><h3 className="font-bold text-red-700 dark:text-red-400">Alles Löschen (Factory Reset)</h3><p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1 mb-3">Diese Aktion löscht alle Kontakte, Rechnungen, Einstellungen und Aktivitäten unwiderruflich.</p><button onClick={handleWipeData} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-red-200 dark:shadow-none flex items-center gap-2"><AlertOctagon className="w-4 h-4" /> Alle Daten unwiderruflich löschen</button></div></div>
                     </div>
                 </SubSection>
             </div>
         </SettingsSection>

      </main>
    </div>
  );
};
