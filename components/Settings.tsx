
import React, { useState, useEffect, useRef } from 'react';
import { Save, Check, Plus, Trash2, Package, User, Share2, Palette, ChevronDown, ChevronUp, Pencil, X, Calendar, Database, Download, Upload, Mail, Server, Globe, Laptop, HelpCircle, Loader2, AlertTriangle, Key, RefreshCw, Copy, FileText, Image as ImageIcon, Briefcase, Settings as SettingsIcon, HardDrive, Users } from 'lucide-react';
import { UserProfile, Theme, ProductPreset, Contact, Deal, Task, BackupData, BackendConfig, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate } from '../types';
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
  invoices: Invoice[];
  expenses: Expense[];
  activities: Activity[];
  onImportData: (data: BackupData) => void;
  onImportContactsCSV: (csvText: string) => void; // CSV Import
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
  onImportContactsCSV,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setFormData(userProfile), [userProfile]);
  useEffect(() => setLocalPresets(productPresets), [productPresets]);
  useEffect(() => setBackendForm(backendConfig), [backendConfig]);
  
  // Only update invoice config form if the prop changes significantly (avoids overwriting local edits on parent re-renders)
  useEffect(() => {
      // Basic check to see if we should sync props to state
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

      // Limit auf 5MB erhöht
      if (file.size > 5 * 1024 * 1024) { 
          alert(`Die Datei "${file.name}" ist zu groß (${(file.size / 1024 / 1024).toFixed(2)} MB). Bitte wählen Sie ein Bild unter 5 MB.`);
          e.target.value = ''; // Reset input
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
      
      // Reset input value to allow re-selection
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
  const handleCSVClick = () => { if (csvInputRef.current) csvInputRef.current.click(); };

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

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) onImportContactsCSV(text);
          if (csvInputRef.current) csvInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  // --- TEMPLATE LOGIC ---
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

  const handleSaveAll = () => {
    // Basic Client ID Validation/Cleanup
    if (backendForm.googleClientId) {
        const cleanedId = backendForm.googleClientId.trim();
        if (cleanedId !== backendForm.googleClientId) {
            setBackendForm(prev => ({...prev, googleClientId: cleanedId}));
        }
    }

    onUpdateProfile(formData);
    onUpdatePresets(localPresets);
    onUpdateBackendConfig(backendForm); // This saves the cleaned ID
    onUpdateInvoiceConfig(invConfigForm);

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
        
        {/* PERSONALISIERUNG */}
        <SettingsSection 
            title="Personalisierung" 
            icon={User} 
            isDark={isDark} 
            description="Benutzerprofil und Design anpassen."
            defaultOpen={false}
        >
            <SubSection title="Benutzerprofil" isDark={isDark} defaultOpen={false}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelClass}>Vorname</label><input name="firstName" value={formData.firstName} onChange={handleChange} type="text" className={inputClass} /></div>
                    <div><label className={labelClass}>Nachname</label><input name="lastName" value={formData.lastName} onChange={handleChange} type="text" className={inputClass} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>E-Mail</label><input name="email" value={formData.email} onChange={handleChange} type="email" className={inputClass} /></div>
                </div>
            </SubSection>

            <SubSection title="Erscheinungsbild" isDark={isDark}>
                 <div className="flex items-center gap-4">
                    <div onClick={() => onUpdateTheme('light')} className={`border-2 rounded-lg p-1 cursor-pointer transition-all ${currentTheme === 'light' ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200'}`}>
                        <div className="w-24 h-16 bg-slate-100 rounded mb-2 border border-slate-200 relative overflow-hidden"><div className="absolute top-0 left-0 w-8 h-full bg-white border-r border-slate-200"></div></div>
                        <span className="text-xs font-medium block text-center">Hell</span>
                    </div>
                    <div onClick={() => onUpdateTheme('dark')} className={`border-2 rounded-lg p-1 cursor-pointer transition-all ${currentTheme === 'dark' ? 'border-indigo-500 ring-2 ring-indigo-900' : 'border-slate-200'}`}>
                        <div className="w-24 h-16 bg-slate-800 rounded mb-2 border border-slate-700 relative overflow-hidden"><div className="absolute top-0 left-0 w-8 h-full bg-slate-900 border-r border-slate-700"></div></div>
                        <span className="text-xs font-medium block text-center">Dunkel</span>
                    </div>
                </div>
            </SubSection>
        </SettingsSection>

        {/* GESCHÄFTSKONFIGURATION */}
        <SettingsSection 
            title="Geschäftskonfiguration" 
            icon={Briefcase} 
            isDark={isDark} 
            description="Rechnungsvorlagen und Produktstammdaten."
        >
            <SubSection title="Rechnungsvorlage" isDark={isDark} defaultOpen={false}>
                <div className="space-y-6">
                    <div className="flex items-start gap-6">
                        <div 
                            className={`w-32 h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors relative overflow-hidden ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200'}`} 
                            onClick={(e) => {
                                e.preventDefault();
                                logoInputRef.current?.click();
                            }}
                        >
                            {invConfigForm.logoBase64 ? (
                                <img src={invConfigForm.logoBase64} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <>
                                    <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                                    <span className="text-xs text-slate-400">Logo Upload</span>
                                </>
                            )}
                        </div>
                        {/* Moved INPUT out of the CLICK container to avoid bubbling issues */}
                        <input 
                            type="file" 
                            ref={logoInputRef} 
                            onChange={handleLogoUpload} 
                            accept="image/*" 
                            className="hidden" 
                        />
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className={labelClass}>Firmenname</label>
                                <input name="companyName" value={invConfigForm.companyName} onChange={handleInvConfigChange} type="text" className={inputClass} placeholder="Meine Firma" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>E-Mail</label>
                                    <input name="email" value={invConfigForm.email} onChange={handleInvConfigChange} type="email" className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}>Webseite</label>
                                    <input name="website" value={invConfigForm.website} onChange={handleInvConfigChange} type="text" className={inputClass} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Straße & Nr.</label>
                            <input name="addressLine1" value={invConfigForm.addressLine1} onChange={handleInvConfigChange} type="text" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>PLZ & Ort</label>
                            <input name="addressLine2" value={invConfigForm.addressLine2} onChange={handleInvConfigChange} type="text" className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Steuernummer / USt-ID</label>
                            <input name="taxId" value={invConfigForm.taxId} onChange={handleInvConfigChange} type="text" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Bankname</label>
                            <input name="bankName" value={invConfigForm.bankName} onChange={handleInvConfigChange} type="text" className={inputClass} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>IBAN</label>
                            <input name="iban" value={invConfigForm.iban} onChange={handleInvConfigChange} type="text" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>BIC</label>
                            <input name="bic" value={invConfigForm.bic} onChange={handleInvConfigChange} type="text" className={inputClass} />
                        </div>
                    </div>
                    
                    <div>
                        <label className={labelClass}>Fußzeile (Text)</label>
                        <textarea name="footerText" value={invConfigForm.footerText} onChange={handleInvConfigChange} rows={2} className={inputClass} placeholder="Vielen Dank für Ihren Auftrag." />
                    </div>
                </div>
            </SubSection>

            <SubSection title="Produkt Voreinstellungen" isDark={isDark}>
                 <div className="space-y-3 mb-6">
                    {localPresets.map(preset => (
                        <div key={preset.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            {editingPresetId === preset.id ? (
                                <>
                                    <input type="text" value={editPresetTitle} onChange={(e) => setEditPresetTitle(e.target.value)} className={`flex-1 text-sm ${inputClass}`} />
                                    <input type="number" value={editPresetValue} onChange={(e) => setEditPresetValue(e.target.value)} className={`w-24 text-sm ${inputClass}`} />
                                    <button onClick={handleSaveEditPreset} className="p-2 bg-green-100 text-green-700 rounded-lg"><Check className="w-4 h-4" /></button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1"><p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{preset.title}</p></div>
                                    <div className="font-mono text-sm font-bold text-indigo-600 bg-white/10 px-2 py-1 rounded">{preset.value} €</div>
                                    <button onClick={() => handleStartEditPreset(preset)} className="text-slate-400 hover:text-indigo-500 p-1.5"><Pencil className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeletePreset(preset.id)} className="text-slate-400 hover:text-red-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex items-end gap-3 p-4 rounded-lg bg-slate-100/50 border border-slate-200">
                    <div className="flex-1"><label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Neues Produkt</label><input type="text" value={newPresetTitle} onChange={(e) => setNewPresetTitle(e.target.value)} className={`text-sm ${inputClass}`} /></div>
                    <div className="w-32"><label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Preis</label><input type="number" value={newPresetValue} onChange={(e) => setNewPresetValue(e.target.value)} className={`text-sm ${inputClass}`} /></div>
                    <button onClick={handleAddPreset} disabled={!newPresetTitle || !newPresetValue} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg"><Plus className="w-5 h-5" /></button>
                </div>
            </SubSection>

            <SubSection title="E-Mail Vorlagen" isDark={isDark}>
                <div className="space-y-4">
                    {emailTemplates.map(tpl => (
                        <div key={tpl.id} className={`p-4 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm">{tpl.title}</h4>
                                <div className="flex gap-2">
                                    <button onClick={() => openTemplateModal(tpl)} className="text-slate-400 hover:text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => onDeleteTemplate(tpl.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{tpl.subject}</p>
                        </div>
                    ))}
                    <button onClick={() => openTemplateModal()} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm hover:bg-slate-50 flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Neue Vorlage erstellen
                    </button>
                </div>
            </SubSection>
        </SettingsSection>

        {/* SYSTEM & VERBINDUNGEN (Zusammengeführt) */}
        <SettingsSection 
            title="System & Verbindungen" 
            icon={SettingsIcon} 
            isDark={isDark} 
            description="Backend, API-Integrationen und Datensicherung."
            defaultOpen={false}
        >
            {/* 1. Speichermodus */}
            <SubSection title="Speichermodus" isDark={isDark} defaultOpen={true}>
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
                        <p className="text-xs text-slate-500">Daten werden auf diesem PC gespeichert.</p>
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
                        <p className="text-xs text-slate-500">Für Mehrbenutzer-Teams.</p>
                    </button>
                </div>
            </SubSection>

            {/* 2. Google OAuth (Nur bei Lokal relevant) */}
            {backendForm.mode === 'local' && (
                <SubSection title="Google OAuth Setup" isDark={isDark} defaultOpen={false}>
                    <div className="space-y-4">
                        {isPreviewEnv && (
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800 flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <div>
                                    <strong>Vorschau-Modus erkannt</strong>
                                    <p className="mt-1 text-xs">Google OAuth ist in der Preview eingeschränkt.</p>
                                </div>
                                </div>
                        )}
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
                                <strong>Setup Anleitung</strong>
                                <div className="mt-2 text-xs space-y-1">
                                    <p>1. Erstellen Sie ein Projekt in der <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline">Google Cloud Console</a>.</p>
                                    <p>2. Erstellen Sie eine <strong>OAuth 2.0 Client ID</strong> (Web Application).</p>
                                    <p>3. Fügen Sie unter <strong>Autorisierte JavaScript-Quellen</strong> exakt diese URL hinzu:</p>
                                    <code className="bg-slate-800 text-white px-2 py-1 rounded block mt-1 w-fit">{currentOrigin}</code>
                                </div>
                        </div>
                        <div>
                            <label className={labelClass}>Google Client ID</label>
                            <input 
                                type="text"
                                value={backendForm.googleClientId || ''}
                                onChange={(e) => {
                                    // Remove spaces on paste/type
                                    const cleaned = e.target.value.trim();
                                    setBackendForm({...backendForm, googleClientId: cleaned});
                                }}
                                className={inputClass}
                                placeholder="z.B. 123456789-abc...apps.googleusercontent.com"
                            />
                            {backendForm.googleClientId && !backendForm.googleClientId.endsWith('apps.googleusercontent.com') && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Das sieht nicht wie eine gültige Client ID aus (sollte auf ...apps.googleusercontent.com enden).
                                </p>
                            )}
                        </div>
                    </div>
                </SubSection>
            )}

            {/* 3. API Zugriff für Drittanbieter */}
            <SubSection title="API Zugriff (Drittanbieter)" isDark={isDark} defaultOpen={false}>
                 <div className="space-y-2">
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Nutzen Sie diesen Schlüssel, um von anderen Anwendungen auf dieses CRM zuzugreifen (wenn der Server-Modus aktiv ist).
                    </p>
                    <div className="flex gap-2">
                        <input type="text" readOnly value={backendForm.apiKey || ''} placeholder="Kein Key generiert" className={`${inputClass} font-mono`} />
                        <button onClick={copyApiKey} disabled={!backendForm.apiKey} className="p-2 border rounded-lg hover:bg-slate-50"><Copy className="w-5 h-5" /></button>
                        <button onClick={generateApiKey} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><RefreshCw className="w-5 h-5" /></button>
                    </div>
                </div>
            </SubSection>

            {/* 4. Aktive Integrationen (ehemals eigener Block) */}
            <SubSection title="Verbundene Dienste" isDark={isDark} defaultOpen={false}>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors bg-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar className="w-5 h-5" /></div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Google Kalender</label>
                                <span className="text-xs text-slate-500">{isCalendarConnected ? 'Verbunden' : 'Nicht verbunden'}</span>
                            </div>
                        </div>
                        <button onClick={handleToggleCalendar} disabled={!!isConnecting || (localStorage.getItem('google_access_token') && !isCalendarConnected)} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-slate-100">
                            {isConnecting === 'calendar' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isCalendarConnected ? 'Trennen' : 'Verbinden'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors bg-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Mail className="w-5 h-5" /></div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Google Mail</label>
                                <span className="text-xs text-slate-500">{isMailConnected ? 'Verbunden' : 'Nicht verbunden'}</span>
                            </div>
                        </div>
                        <button onClick={handleToggleMail} disabled={!!isConnecting || (localStorage.getItem('google_access_token') && !isMailConnected)} className="px-3 py-1.5 border rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-slate-100">
                            {isConnecting === 'mail' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isMailConnected ? 'Trennen' : 'Verbinden'}
                        </button>
                    </div>
                </div>
            </SubSection>

             {/* 5. Datenverwaltung (ehemals eigener Block) */}
            <SubSection title="Datenverwaltung" isDark={isDark} defaultOpen={false}>
                 <div className="flex flex-col md:flex-row gap-4">
                    {/* Backup Export */}
                    <div className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><Download className="w-5 h-5" /></div>
                        <button onClick={handleExport} className="mt-1 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">Backup herunterladen</button>
                    </div>
                    {/* Backup Import */}
                    <div className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><Upload className="w-5 h-5" /></div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                        <button onClick={handleImportClick} className="mt-1 w-full py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium">Backup einspielen</button>
                    </div>
                    {/* CSV Import */}
                    <div className={`flex-1 p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Users className="w-5 h-5" /></div>
                        <input type="file" ref={csvInputRef} onChange={handleCSVChange} accept=".csv" className="hidden" />
                        <button onClick={handleCSVClick} className="mt-1 w-full py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium">Kontakt-CSV Importieren</button>
                    </div>
                </div>
            </SubSection>
        </SettingsSection>


        <div className="flex justify-end pt-4 items-center gap-4 sticky bottom-8">
            {showSaved && (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm border border-green-200">
                    <Check className="w-4 h-4" />
                    Gespeichert
                </div>
            )}
            <button onClick={handleSaveAll} className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-lg flex items-center gap-2">
                <Save className="w-4 h-4" />
                Speichern
            </button>
        </div>
      </main>

      {/* Template Modal */}
      {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="px-6 py-4 border-b bg-slate-50 flex justify-between">
                      <h2 className="font-bold">{editingTemplateId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</h2>
                      <button onClick={() => setIsTemplateModalOpen(false)}><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={saveTemplate} className="p-6 space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 uppercase">Name der Vorlage</label>
                          <input required value={templateForm.title} onChange={(e) => setTemplateForm({...templateForm, title: e.target.value})} className={inputClass} placeholder="z.B. Angebot Standard" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 uppercase">Betreff</label>
                          <input required value={templateForm.subject} onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})} className={inputClass} />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 uppercase">Nachricht</label>
                          <textarea required value={templateForm.body} onChange={(e) => setTemplateForm({...templateForm, body: e.target.value})} rows={6} className={inputClass} />
                      </div>
                      <div className="flex justify-end pt-2 gap-2">
                          <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="px-4 py-2 border rounded hover:bg-slate-50">Abbrechen</button>
                          <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">Speichern</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
