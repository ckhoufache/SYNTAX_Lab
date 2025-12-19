
import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Plus, Trash2, Package, User, Share2, Palette, ChevronDown, ChevronUp, Pencil, X, Calendar, Database, Download, Upload, Mail, Server, Globe, Laptop, HelpCircle, Loader2, AlertTriangle, RefreshCw, Copy, FileText, Image as ImageIcon, Briefcase, Settings as SettingsIcon, HardDrive, Users, DownloadCloud, RefreshCcw, Sparkles, Sliders, Link, Paperclip, Star, PaperclipIcon, FileCode, Printer, Info, AlertOctagon, Repeat, Cloud, CloudLightning, ShieldAlert, Wifi, UserPlus, Zap, Cpu, Plug, Eye, RotateCcw, Key, ExternalLink } from 'lucide-react';
import { UserProfile, Theme, ProductPreset, Contact, Deal, Task, BackupData, BackendConfig, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate, EmailAttachment, FirebaseConfig } from '../types';
import { IDataService, DEFAULT_PDF_TEMPLATE, compileInvoiceTemplate } from '../services/dataService';

export interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
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

const SettingsSection: React.FC<{ 
    title: string; 
    icon: any; 
    isDark: boolean; 
    description: string; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode 
}> = ({ title, icon: Icon, isDark, description, isOpen, onToggle, children }) => (
    <div className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-indigo-500 shadow-md' : 'border-slate-200'}`}>
        <button onClick={onToggle} className="w-full flex items-center justify-between p-6 text-left">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
            </div>
            {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        {isOpen && <div className="border-t border-slate-100">{children}</div>}
    </div>
);

const SubSection: React.FC<{ 
    title: string; 
    isDark: boolean; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode 
}> = ({ title, isDark, isOpen, onToggle, children }) => (
    <div className="border-b border-slate-100 last:border-0">
        <button onClick={onToggle} className="w-full flex items-center justify-between py-4 text-left hover:bg-slate-50 transition-colors px-4 rounded-lg">
            <h3 className="text-sm font-bold text-slate-700">{title}</h3>
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {isOpen && <div className="pb-6 px-4 animate-in slide-in-from-top-2">{children}</div>}
    </div>
);

export const Settings: React.FC<SettingsProps> = ({ 
  userProfile, onUpdateProfile, productPresets, onUpdatePresets,
  contacts, deals, tasks, invoices, expenses, activities, onImportData, backendConfig, onUpdateBackendConfig,
  dataService, invoiceConfig, onUpdateInvoiceConfig, emailTemplates, onAddTemplate, onUpdateTemplate, onDeleteTemplate
}) => {
  const isDark = false; 
  const CONST_UPDATE_URL = "https://ckhoufache.github.io/SYNTAX_Lab/";
  
  const [activeSection, setActiveSection] = useState<string | null>('profile');
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [showSaved, setShowSaved] = useState(false);
  
  const [invConfigForm, setInvConfigForm] = useState<InvoiceConfig>(invoiceConfig);
  
  const [backendForm, setBackendForm] = useState<BackendConfig>(backendConfig);
  const [fbConfig, setFbConfig] = useState<FirebaseConfig>(backendConfig.firebaseConfig || { apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
  
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isMailConnected, setIsMailConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState<'calendar' | 'mail' | null>(null);
  
  const [appVersion, setAppVersion] = useState('Checking...');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');

  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  const [newProduct, setNewProduct] = useState<Partial<ProductPreset>>({ title: '', value: 0, isRetainer: false, retainerInterval: 'monthly' });
  const [templateForm, setTemplateForm] = useState<{id?: string, title: string, subject: string, body: string}>({ title: '', subject: '', body: '' });
  
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const checkGeminiKeyStatus = async () => {
    if ((window as any).aistudio) {
        setIsCheckingKey(true);
        try {
            const hasKey = await (window as any).aistudio.hasSelectedApiKey();
            setHasGeminiKey(hasKey);
        } catch (e) {
            console.error("Key Check failed", e);
        } finally {
            setIsCheckingKey(false);
        }
    }
  };

  useEffect(() => {
    dataService.getIntegrationStatus('calendar').then(setIsCalendarConnected);
    dataService.getIntegrationStatus('mail').then(setIsMailConnected);
    dataService.getAppVersion().then(setAppVersion);
    dataService.getAllUsers().then(setTeamMembers);
    checkGeminiKeyStatus();
  }, [dataService, backendConfig]);

  const toggleSection = (section: string) => setActiveSection(activeSection === section ? null : section);
  const toggleSubSection = (sub: string) => setActiveSubSection(activeSubSection === sub ? null : sub);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleInvConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setInvConfigForm({ ...invConfigForm, [e.target.name]: e.target.value });
  };
  
  const handleBackendChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setBackendForm({ ...backendForm, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  };

  const handleFbConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFbConfig({ ...fbConfig, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { alert("Logo ist zu groß (Max 2MB)."); return; }
      const reader = new FileReader();
      reader.onloadend = () => { setInvConfigForm(prev => ({ ...prev, logoBase64: reader.result as string })); };
      reader.readAsDataURL(file);
  };
  const handleRemoveLogo = () => { setInvConfigForm(prev => ({ ...prev, logoBase64: undefined })); if (logoInputRef.current) logoInputRef.current.value = ''; };
  
  const handleSaveFirebaseConfig = () => { 
      const newConfig = { ...backendForm, firebaseConfig: fbConfig }; 
      onUpdateBackendConfig(newConfig); 
      alert("Cloud-Konfiguration gespeichert. Die App wird neu geladen."); 
      window.location.reload(); 
  };
  
  const handleSaveEmailConfig = () => { 
      onUpdateBackendConfig(backendForm); 
      alert("E-Mail Server Konfiguration gespeichert."); 
  };

  const loadStratoDefaults = () => {
      setBackendForm(prev => ({
          ...prev,
          imapHost: 'imap.strato.de',
          imapPort: 993,
          imapTls: true,
          smtpHost: 'smtp.strato.de',
          smtpPort: 465,
          smtpTls: true
      }));
  };

  const handleToggleCalendar = async () => { setIsConnecting('calendar'); if (isCalendarConnected) { await dataService.disconnectGoogle('calendar'); setIsCalendarConnected(false); } else { const success = await dataService.connectGoogle('calendar', backendConfig.googleClientId); setIsCalendarConnected(success); } setIsConnecting(null); };
  const handleToggleMail = async () => { setIsConnecting('mail'); if (isMailConnected) { await dataService.disconnectGoogle('mail'); setIsCalendarConnected(false); } else { const success = await dataService.connectGoogle('mail', backendConfig.googleClientId); setIsMailConnected(success); } setIsConnecting(null); };
  
  const handleSelectGeminiKey = async () => {
      if ((window as any).aistudio) {
          try {
              await (window as any).aistudio.openSelectKey();
              setHasGeminiKey(true);
          } catch (e) {
              console.error("Failed to open key selector", e);
          }
      }
  };

  const handleExport = () => { const data: BackupData = { contacts, deals, tasks, invoices, expenses, activities, userProfile: formData, productPresets, invoiceConfig: invConfigForm, emailTemplates, theme: 'light', timestamp: new Date().toISOString(), version: appVersion }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `crm_backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); };
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target?.result as string); onImportData(data); } catch(err) { alert("Fehler beim Lesen der Backup-Datei."); } }; reader.readAsText(file); };
  const handleCheckUpdate = async (force = false) => { setIsUpdating(true); setUpdateStatus('Prüfe auf Updates...'); try { const hasUpdate = await dataService.checkAndInstallUpdate(CONST_UPDATE_URL, setUpdateStatus, force); if (hasUpdate) { if (confirm("Update installiert. Jetzt neu starten?")) { if ((window as any).require) { (window as any).require('electron').ipcRenderer.invoke('quit-and-install'); } else { window.location.reload(); } } } else { setUpdateStatus('Auf dem neuesten Stand.'); setTimeout(() => setUpdateStatus(''), 3000); } } catch (e: any) { setUpdateStatus('Fehler: ' + e.message); } finally { setIsUpdating(false); } };
  const handleWipeData = async () => { if (confirm("Sicher? Dies kann nicht rückgängig gemacht werden!")) { await dataService.wipeAllData(); } };
  const handleInviteUser = async () => { if (!inviteEmail) return; const normalizedEmail = inviteEmail.toLowerCase().trim(); setIsInviting(true); try { await dataService.inviteUser(normalizedEmail, 'Mitarbeiter'); alert(`Benutzer ${normalizedEmail} wurde zur Whitelist hinzugefügt.`); setInviteEmail(''); const team = await dataService.getAllUsers(); setTeamMembers(team); } catch (e: any) { console.error(e); alert("Fehler beim Einladen: " + e.message); } finally { setIsInviting(false); } };

  const handleAddProduct = () => {
      if (!newProduct.title || !newProduct.value) return;
      const newItem: ProductPreset = { id: crypto.randomUUID(), title: newProduct.title!, value: Number(newProduct.value), isRetainer: newProduct.isRetainer, retainerInterval: newProduct.retainerInterval };
      onUpdatePresets([...productPresets, newItem]);
      setNewProduct({ title: '', value: 0, isRetainer: false, retainerInterval: 'monthly' });
  };

  const handleDeleteProduct = async (id: string) => {
       await dataService.deleteProductPreset(id);
       onUpdatePresets(productPresets.filter(p => p.id !== id));
  };

  const handleTemplateSubmit = () => {
      if (!templateForm.title || !templateForm.subject) return;
      if (templateForm.id) { onUpdateTemplate({ id: templateForm.id, ...templateForm }); } 
      else { onAddTemplate({ id: crypto.randomUUID(), ...templateForm }); }
      setTemplateForm({ title: '', subject: '', body: '' });
  };

  const handlePreviewPdfTemplate = () => {
      const dummyInvoice: Invoice = { id: 'preview-123', invoiceNumber: 'RE-2024-001', date: new Date().toISOString().split('T')[0], contactId: 'dummy', contactName: 'Max Mustermann', description: 'Webdesign & CRM Entwicklung (Vorschau)', amount: 1500.00, isPaid: false, type: 'customer' };
      const dummyContact: Contact = { id: 'dummy', name: 'Max Mustermann', company: 'Muster GmbH', role: 'Geschäftsführer', email: 'max@muster.de', lastContact: '', avatar: '', street: 'Testweg 42', zip: '12345', city: 'Musterhausen' };
      const html = compileInvoiceTemplate(dummyInvoice, invConfigForm, dummyContact);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
  };

  const handleResetPdfTemplate = () => {
      if (confirm("Möchten Sie das Dokument-Template wirklich auf den Systemstandard zurücksetzen? Alle Ihre HTML-Änderungen gehen verloren.")) {
          setInvConfigForm(prev => ({ ...prev, pdfTemplate: DEFAULT_PDF_TEMPLATE }));
      }
  };

  return (
    <div className="flex-1 bg-slate-50 h-screen overflow-y-auto flex flex-col relative">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
          <h1 className="text-2xl font-bold text-slate-800">Einstellungen</h1>
          <p className="text-slate-500 text-sm mt-1">Konfigurieren Sie Ihr CRM.</p>
      </header>
      
      <main className="p-8 space-y-6 pb-20 max-w-5xl mx-auto w-full">
         
         <SettingsSection title="Profil & Darstellung" icon={User} isDark={isDark} description="Persönliche Daten und Design" isOpen={activeSection === 'profile'} onToggle={() => toggleSection('profile')}>
             <div className="px-6">
                <SubSection title="Stammdaten" isDark={isDark} isOpen={activeSubSection === 'profile_data'} onToggle={() => toggleSubSection('profile_data')}>
                    <div className="flex items-center gap-6 mb-6">
                        <img src={formData.avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-4 ring-slate-50" />
                        <div className="space-y-2 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-slate-500">Vorname</label><input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" /></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500">Nachname</label><input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" /></div>
                            </div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">E-Mail</label><input name="email" value={formData.email} onChange={handleChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" /></div>
                        </div>
                    </div>
                    <div className="flex justify-end mb-4"><button onClick={() => { onUpdateProfile(formData); setShowSaved(true); setTimeout(() => setShowSaved(false), 2000); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">{showSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />} Speichern</button></div>
                </SubSection>
                <SubSection title="Team & Zugriffsrechte" isDark={isDark} isOpen={activeSubSection === 'profile_team'} onToggle={() => toggleSubSection('profile_team')}>
                    <div className="py-2 space-y-4">
                        {backendConfig.mode === 'firebase' && (
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                <h3 className="text-sm font-bold text-indigo-800 mb-2 flex items-center gap-2"><UserPlus className="w-4 h-4"/> Benutzer einladen (Whitelist)</h3>
                                <div className="flex gap-2"><input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value.toLowerCase())} placeholder="kollege@gmail.com" className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/><button onClick={handleInviteUser} disabled={!inviteEmail || isInviting} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{isInviting ? '...' : 'Hinzufügen'}</button></div>
                            </div>
                        )}
                        <h4 className="text-xs font-bold uppercase text-slate-500 mt-4">Aktive Mitglieder</h4>
                        {teamMembers.length > 0 ? (
                            <div className="grid gap-3">
                                {teamMembers.map((member, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        {member.avatar ? <img src={member.avatar} alt="User" className="w-8 h-8 rounded-full object-cover"/> : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</div>}
                                        <div><p className="text-sm font-bold">{member.firstName} {member.lastName}</p><p className="text-xs text-slate-500">{member.email}</p></div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-slate-400 italic">Keine weiteren Teammitglieder.</p>}
                    </div>
                </SubSection>
             </div>
         </SettingsSection>

         <SettingsSection title="Integrationen & API" icon={Share2} isDark={isDark} description="Google, Firebase & Gemini Anbindung" isOpen={activeSection === 'integrations'} onToggle={() => toggleSection('integrations')}>
             <div className="px-6">
                 <SubSection title="Gemini KI-Konfiguration" isDark={isDark} isOpen={activeSubSection === 'int_gemini'} onToggle={() => toggleSubSection('int_gemini')}>
                    <div className="space-y-4 py-2">
                        <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-purple-800">KI-Funktionen verwalten</p>
                                <p className="text-xs text-purple-700">Wählen Sie einen persönlichen API-Key aus einem <strong>bezahlten GCP-Projekt (Paid Project)</strong> aus. In kostenlosen Projekten werden oft keine Keys im Dialog angezeigt.</p>
                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 mt-2 flex items-center gap-1 hover:underline">
                                    <ExternalLink className="w-2.5 h-2.5" /> Abrechnungs-Dokumentation (ai.google.dev)
                                </a>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800">API Key Status</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    {hasGeminiKey ? (
                                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-100">
                                            <Check className="w-3 h-3"/> Aktiviert
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-100">
                                            <AlertTriangle className="w-3 h-3"/> Kein Key ausgewählt
                                        </span>
                                    )}
                                    <button onClick={checkGeminiKeyStatus} className="p-1 hover:bg-slate-100 rounded ml-2" title="Status manuell prüfen">
                                        <RefreshCw className={`w-3 h-3 text-slate-400 ${isCheckingKey ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            <button 
                                onClick={handleSelectGeminiKey}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Key className="w-3 h-3" /> Key auswählen / ändern
                            </button>
                        </div>
                    </div>
                 </SubSection>

                 <SubSection title="Google OAuth Konfiguration" isDark={isDark} isOpen={activeSubSection === 'int_oauth'} onToggle={() => toggleSubSection('int_oauth')}>
                    <div className="space-y-4 py-2">
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start gap-3">
                            <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">OAuth Client ID</p>
                                <p className="text-xs text-amber-700">Wird für den Google Login und die API-Synchronisierung benötigt.</p>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500">Google Client ID</label>
                            <div className="flex gap-2 mt-1">
                                <input name="googleClientId" value={backendForm.googleClientId || ''} onChange={handleBackendChange} className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white font-mono text-[10px]" placeholder="123...apps.googleusercontent.com" />
                                <button onClick={() => { onUpdateBackendConfig(backendForm); alert('OAuth konfiguriert.'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><Save className="w-4 h-4" /> Sichern</button>
                            </div>
                        </div>
                    </div>
                 </SubSection>

                 <SubSection title="Google Cloud Dienste (Synchronisierung)" isDark={isDark} isOpen={activeSubSection === 'int_google'} onToggle={() => toggleSubSection('int_google')}>
                     <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm"><Calendar className="w-5 h-5 text-indigo-600" /></div>
                                <div><h4 className="text-sm font-bold">Google Kalender</h4><p className="text-xs text-slate-500">Termine automatisch synchronisieren.</p></div>
                            </div>
                            <button onClick={handleToggleCalendar} disabled={isConnecting === 'calendar'} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isCalendarConnected ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{isConnecting === 'calendar' ? 'Verbinde...' : isCalendarConnected ? 'Verbunden' : 'Verbinden'}</button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 border rounded-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm"><Mail className="w-5 h-5 text-red-500" /></div>
                                <div><h4 className="text-sm font-bold">Gmail (Quick Send)</h4><p className="text-xs text-slate-500">Schnelles Senden via OAuth API.</p></div>
                            </div>
                            <button onClick={handleToggleMail} disabled={isConnecting === 'mail'} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isMailConnected ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{isConnecting === 'mail' ? 'Verbinde...' : isMailConnected ? 'Verbunden' : 'Verbinden'}</button>
                        </div>
                     </div>
                 </SubSection>

                 <SubSection title="Firebase / Cloud Datenbank" isDark={isDark} isOpen={activeSubSection === 'int_firebase'} onToggle={() => toggleSubSection('int_firebase')}>
                    <div className="space-y-4 py-2">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-start gap-3">
                            <Cloud className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-indigo-800">Cloud Backend</p>
                                <p className="text-xs text-indigo-700">Diese Einstellungen verbinden Ihre App mit dem Google Firebase Projekt.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold uppercase text-slate-400">API Key</label><input name="apiKey" value={fbConfig.apiKey} onChange={handleFbConfigChange} className="w-full border p-2 rounded text-xs bg-white font-mono" /></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-400">Project ID</label><input name="projectId" value={fbConfig.projectId} onChange={handleFbConfigChange} className="w-full border p-2 rounded text-xs bg-white font-mono" /></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-400">Auth Domain</label><input name="authDomain" value={fbConfig.authDomain} onChange={handleFbConfigChange} className="w-full border p-2 rounded text-xs bg-white font-mono" /></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-400">Storage Bucket</label><input name="storageBucket" value={fbConfig.storageBucket} onChange={handleFbConfigChange} className="w-full border p-2 rounded text-xs bg-white font-mono" /></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-400">Sender ID</label><input name="messagingSenderId" value={fbConfig.messagingSenderId} onChange={handleFbConfigChange} className="w-full border p-2 rounded text-xs bg-white font-mono" /></div>
                            <div><label className="text-[10px] font-bold uppercase text-slate-400">App ID</label><input name="appId" value={fbConfig.appId} onChange={handleFbConfigChange} className="w-full border p-2 rounded text-xs bg-white font-mono" /></div>
                        </div>
                        <div className="flex justify-end pt-2"><button onClick={handleSaveFirebaseConfig} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"><RefreshCw className="w-4 h-4"/> Konfiguration speichern & Neustart</button></div>
                    </div>
                 </SubSection>

                 <SubSection title="E-Mail Server (IMAP/SMTP)" isDark={isDark} isOpen={activeSubSection === 'int_email'} onToggle={() => toggleSubSection('int_email')}>
                    <div className="space-y-4 py-2">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-blue-800">Eigener Server</p>
                                <p className="text-xs text-blue-700">Wird für den integrierten E-Mail Client benötigt.</p>
                                <button onClick={loadStratoDefaults} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">Strato Standardwerte laden</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500">Benutzername / E-Mail</label><input name="imapUser" value={backendForm.imapUser || ''} onChange={handleBackendChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="info@deinedomain.de" /></div>
                            <div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500">Passwort</label><input name="imapPassword" type="password" value={backendForm.imapPassword || ''} onChange={handleBackendChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="••••••••" /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">IMAP Host</label><input name="imapHost" value={backendForm.imapHost || ''} onChange={handleBackendChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="imap.strato.de" /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">IMAP Port</label><input name="imapPort" type="number" value={backendForm.imapPort || 993} onChange={handleBackendChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">SMTP Host</label><input name="smtpHost" value={backendForm.smtpHost || ''} onChange={handleBackendChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="smtp.strato.de" /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500">SMTP Port</label><input name="smtpPort" type="number" value={backendForm.smtpPort || 465} onChange={handleBackendChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" /></div>
                        </div>
                        <div className="flex justify-end pt-2"><button onClick={handleSaveEmailConfig} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Speichern</button></div>
                    </div>
                 </SubSection>
             </div>
         </SettingsSection>
         
         <SettingsSection title="Geschäftsprozesse" icon={Briefcase} isDark={isDark} description="Rechnungen, Produkte & Vorlagen" isOpen={activeSection === 'business'} onToggle={() => toggleSection('business')}>
             <div className="px-6">
                 <SubSection title="Rechnungskonfiguration" isDark={isDark} isOpen={activeSubSection === 'config_invoice'} onToggle={() => toggleSubSection('config_invoice')}>
                     <div className="py-2 grid grid-cols-2 gap-4">
                         <div className="col-span-2 border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 flex items-center gap-4">
                             <div className="w-20 h-20 bg-white rounded border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                 {invConfigForm.logoBase64 ? <img src={invConfigForm.logoBase64} alt="Firmenlogo" className="w-full h-full object-contain" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}
                             </div>
                             <div className="flex-1">
                                 <h4 className="text-sm font-bold text-slate-700">Firmenlogo</h4>
                                 <p className="text-xs text-slate-500 mb-2">Erscheint oben rechts auf allen Rechnungen.</p>
                                 <div className="flex gap-2">
                                     <button onClick={() => logoInputRef.current?.click()} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium hover:bg-slate-50 transition-colors">Bild hochladen</button>
                                     {invConfigForm.logoBase64 && <button onClick={handleRemoveLogo} className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition-colors">Entfernen</button>}
                                 </div>
                                 <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                             </div>
                         </div>
                         <div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500">Firmenname</label><input name="companyName" value={invConfigForm.companyName} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="Muster GmbH" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500">Straße & Nr.</label><input name="addressLine1" value={invConfigForm.addressLine1} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="Musterstraße 123" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500">PLZ & Ort</label><input name="addressLine2" value={invConfigForm.addressLine2} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="12345 Musterstadt" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500">Bankname</label><input name="bankName" value={invConfigForm.bankName} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="Volksbank" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500">IBAN</label><input name="iban" value={invConfigForm.iban} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="DE00 0000 0000 0000 0000 00" /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500">BIC</label><input name="bic" value={invConfigForm.bic} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="GENO..." /></div>
                         <div><label className="text-xs font-bold uppercase text-slate-500">Steuer-ID / USt-IdNr.</label><input name="taxId" value={invConfigForm.taxId} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="DE123456789" /></div>
                         <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                             <div><label className="text-xs font-bold uppercase text-slate-500">Firmen E-Mail</label><input name="email" value={invConfigForm.email} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="buchhaltung@firma.de" /></div>
                             <div><label className="text-xs font-bold uppercase text-slate-500">Webseite</label><input name="website" value={invConfigForm.website} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="www.firma.de" /></div>
                         </div>
                         <div className="col-span-2">
                             <label className="text-xs font-bold uppercase text-slate-500">Steuermodus</label>
                             <div className="mt-1 p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                                 <select name="taxRule" value={invConfigForm.taxRule || 'standard'} onChange={handleInvConfigChange} className="w-full px-3 py-2 border border-slate-300 rounded text-sm bg-white">
                                     <option value="standard">Standard (Regelbesteuerung - 19% MwSt. Ausweis)</option>
                                     <option value="small_business">Kleinunternehmer (Kein MwSt. Ausweis gemäß § 19 UStG)</option>
                                 </select>
                                 <p className="text-[10px] text-indigo-700 mt-1">Ändert das Layout und die Rechtstexte auf Kundenrechnungen.</p>
                             </div>
                         </div>
                         <div className="col-span-2"><label className="text-xs font-bold uppercase text-slate-500">Fußzeile (Rechnung)</label><input name="footerText" value={invConfigForm.footerText} onChange={handleInvConfigChange} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-white" placeholder="Geschäftsführer: Max Muster | HRB 12345 Amtsgericht Musterstadt" /></div>
                         <div className="col-span-2 flex justify-end pt-2"><button onClick={() => { onUpdateInvoiceConfig(invConfigForm); alert('Gespeichert'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Speichern</button></div>
                     </div>
                 </SubSection>

                 <SubSection title="Dokumenten-Templates (HTML)" isDark={isDark} isOpen={activeSubSection === 'config_pdf_template'} onToggle={() => toggleSubSection('config_pdf_template')}>
                     <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Experten-Option</p>
                                <p className="text-xs text-amber-700">Hier können Sie das HTML/CSS-Grundgerüst Ihrer Rechnungen und Gutschriften anpassen.</p>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">HTML/CSS Code</label>
                            <textarea 
                                name="pdfTemplate"
                                value={invConfigForm.pdfTemplate || DEFAULT_PDF_TEMPLATE}
                                onChange={handleInvConfigChange}
                                rows={15}
                                className="w-full px-4 py-3 font-mono text-xs bg-slate-900 text-indigo-300 border border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                placeholder="<!DOCTYPE html>..."
                            />
                            <div className="absolute top-8 right-4 flex gap-2">
                                <button 
                                    onClick={handlePreviewPdfTemplate}
                                    className="p-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg transition-colors border border-indigo-500/30 flex items-center gap-1.5 text-[10px] font-bold uppercase"
                                    title="HTML Vorschau im Browser"
                                >
                                    <Eye className="w-3 h-3" /> Vorschau
                                </button>
                                <button 
                                    onClick={handleResetPdfTemplate}
                                    className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors border border-red-500/30 flex items-center gap-1.5 text-[10px] font-bold uppercase"
                                    title="Standard wiederherstellen"
                                >
                                    <RotateCcw className="w-3 h-3" /> Reset
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button onClick={() => { onUpdateInvoiceConfig(invConfigForm); alert('Template gespeichert'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                                <Save className="w-4 h-4"/> Template speichern
                            </button>
                        </div>
                     </div>
                 </SubSection>

                 <SubSection title="Produkt Presets" isDark={isDark} isOpen={activeSubSection === 'config_products'} onToggle={() => toggleSubSection('config_products')}>
                     <div className="space-y-4">
                        <div className="grid gap-2">
                            {productPresets.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg">
                                    <div>
                                        <span className="font-medium text-sm text-slate-700 block">{p.title}</span>
                                        {p.isRetainer && (
                                            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1 w-fit mt-1">
                                                <Repeat className="w-3 h-3"/> {p.retainerInterval === 'monthly' ? 'Monatlich' : p.retainerInterval === 'quarterly' ? 'Vierteljährlich' : 'Jährlich'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-indigo-600">{p.value.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                                        <button onClick={() => handleDeleteProduct(p.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Neues Produkt hinzufügen</h4>
                            <div className="flex gap-2 items-start">
                                <div className="flex-1 space-y-2">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2"><input value={newProduct.title} onChange={e => setNewProduct({...newProduct, title: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" placeholder="Produktname" /></div>
                                        <div><input type="number" value={newProduct.value} onChange={e => setNewProduct({...newProduct, value: Number(e.target.value)})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white" placeholder="Preis €" /></div>
                                    </div>
                                    <div className="flex items-center gap-4 pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={newProduct.isRetainer} onChange={e => setNewProduct({...newProduct, isRetainer: e.target.checked})} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                                            <span className="text-sm text-slate-600">Ist Abo/Retainer?</span>
                                        </label>
                                        {newProduct.isRetainer && (
                                            <select value={newProduct.retainerInterval} onChange={e => setNewProduct({...newProduct, retainerInterval: e.target.value as any})} className="px-2 py-1 border border-slate-200 rounded text-xs bg-white focus:outline-none focus:border-indigo-500">
                                                <option value="monthly">Monatlich</option><option value="quarterly">Vierteljährlich</option><option value="yearly">Jährlich</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <button onClick={handleAddProduct} disabled={!newProduct.title || !newProduct.value} className="bg-indigo-600 disabled:opacity-50 text-white p-2.5 rounded-lg hover:bg-indigo-700 h-fit mt-0.5"><Plus className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                 </SubSection>

                 <SubSection title="E-Mail Vorlagen" isDark={isDark} isOpen={activeSubSection === 'config_templates'} onToggle={() => toggleSubSection('config_templates')}>
                    <div className="space-y-6">
                        <div className="grid gap-3">
                            {emailTemplates.map(t => (
                                <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center group">
                                    <div><h4 className="font-bold text-slate-700 text-sm">{t.title}</h4><p className="text-xs text-slate-500 truncate max-w-md">{t.subject}</p></div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setTemplateForm(t)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Pencil className="w-4 h-4"/></button>
                                        <button onClick={() => onDeleteTemplate(t.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">{templateForm.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h4>
                            <div className="space-y-3">
                                <input placeholder="Titel (Intern)" value={templateForm.title} onChange={e => setTemplateForm({...templateForm, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
                                <input placeholder="Betreff" value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white" />
                                <textarea placeholder="Nachrichtentext... Nutzen Sie {name}, {firstName} als Platzhalter." rows={5} value={templateForm.body} onChange={e => setTemplateForm({...templateForm, body: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white resize-y" />
                                <div className="flex justify-end gap-2">
                                    {templateForm.id && <button onClick={() => setTemplateForm({title: '', subject: '', body: ''})} className="text-xs text-slate-500 hover:text-slate-700">Abbrechen</button>}
                                    <button onClick={handleTemplateSubmit} disabled={!templateForm.title || !templateForm.subject} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">{templateForm.id ? 'Update' : 'Erstellen'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                 </SubSection>
             </div>
         </SettingsSection>

         <SettingsSection title="Wartung & Daten" icon={Database} isDark={isDark} description="Backup, Import & Updates" isOpen={activeSection === 'maintenance'} onToggle={() => toggleSection('maintenance')}>
             <div className="px-6 py-4 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                     <button onClick={handleExport} className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                         <Download className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                         <span className="font-bold text-slate-700 group-hover:text-indigo-800">Backup exportieren</span>
                         <span className="text-xs text-slate-400">JSON Datei herunterladen</span>
                     </button>
                     <button onClick={handleImportClick} className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                         <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mb-2" />
                         <span className="font-bold text-slate-700 group-hover:text-indigo-800">Backup importieren</span>
                         <span className="text-xs text-slate-400">JSON Datei wiederherstellen</span>
                     </button>
                     <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                 </div>
                 <div className="border-t border-slate-100 pt-4">
                     <h4 className="font-bold text-slate-800 text-sm mb-3">System Updates</h4>
                     <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center">
                         <div><p className="text-sm font-medium text-slate-700">Installierte Version: v{appVersion}</p><p className="text-xs text-slate-500">{updateStatus}</p></div>
                         <button onClick={() => handleCheckUpdate(true)} disabled={isUpdating} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center gap-2">
                             {isUpdating ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>} Prüfen
                         </button>
                     </div>
                 </div>
                 <div className="border-t border-slate-100 pt-4">
                     <h4 className="font-bold text-slate-800 text-sm mb-3 text-red-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Danger Zone</h4>
                     <button onClick={handleWipeData} className="w-full py-3 border border-red-200 bg-red-50 text-red-700 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors">Alle lokalen Daten löschen (Factory Reset)</button>
                 </div>
             </div>
         </SettingsSection>

      </main>
    </div>
  );
};
