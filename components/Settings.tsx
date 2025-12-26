
import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Plus, Trash2, Package, User, ChevronDown, ChevronUp, 
  Database, Upload, Mail, Landmark, Key, Info, Zap, 
  DownloadCloud, Shield, Building2, Cpu, Wrench, FileText, 
  ImageIcon, BellRing, Settings2, Fingerprint, Globe, Check, X,
  RefreshCw, Play
} from 'lucide-react';
import { UserProfile, ProductPreset, Contact, Deal, Task, BackupData, BackendConfig, Invoice, Expense, Activity, EmailTemplate, InvoiceConfig, EmailSettings } from '../types';
import { IDataService } from '../services/dataService';

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

const SettingsCategory: React.FC<{ 
    title: string; icon: any; isOpen: boolean; onToggle: () => void; children: React.ReactNode 
}> = ({ title, icon: Icon, isOpen, onToggle, children }) => (
    <div className={`mb-4 rounded-3xl border transition-all duration-500 ${isOpen ? 'bg-white border-indigo-200 shadow-xl' : 'bg-white border-slate-200'}`}>
        <button onClick={onToggle} className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50/50 rounded-t-3xl transition-colors outline-none">
            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Icon className="w-7 h-7" />
                </div>
                <h2 className={`text-xl font-black ${isOpen ? 'text-indigo-900' : 'text-slate-800'}`}>{title}</h2>
            </div>
            {isOpen ? <ChevronUp className="w-6 h-6 text-indigo-400" /> : <ChevronDown className="w-6 h-6 text-slate-300" />}
        </button>
        {isOpen && <div className="p-8 pt-2 space-y-6 animate-in slide-in-from-top-4 duration-500">{children}</div>}
    </div>
);

const SubAccordion: React.FC<{ title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, isOpen, onToggle, children }) => (
    <div className={`border rounded-2xl transition-all overflow-hidden ${isOpen ? 'border-indigo-100 bg-indigo-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
        <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/50 transition-colors">
            <span className="text-sm font-bold text-slate-700">{title}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        {isOpen && <div className="p-5 pt-0 border-t border-indigo-50/50">{children}</div>}
    </div>
);

export const Settings: React.FC<SettingsProps> = (props) => {
  const { 
    userProfile, onUpdateProfile, productPresets, onUpdatePresets, 
    invoiceConfig, onUpdateInvoiceConfig, backendConfig, onUpdateBackendConfig, 
    contacts, deals, tasks, invoices, expenses, activities, onImportData,
    emailTemplates, onAddTemplate, onUpdateTemplate, onDeleteTemplate, dataService 
  } = props;
  
  const [activeCat, setActiveCat] = useState<string | null>('id');
  const [subOpen, setSubOpen] = useState<string | null>('profile');
  const [updateStatus, setUpdateStatus] = useState<string>('Bereit zur Prüfung');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState(userProfile);
  const [invConfigForm, setInvConfigForm] = useState(invoiceConfig);
  const [emailConfig, setEmailConfig] = useState({ 
    imapHost: backendConfig.imapHost || '', imapPort: backendConfig.imapPort || 993, imapUser: backendConfig.imapUser || '', imapPassword: backendConfig.imapPassword || '', 
    smtpHost: backendConfig.smtpHost || '', smtpPort: backendConfig.smtpPort || 465, smtpUser: backendConfig.smtpUser || '', smtpPassword: backendConfig.smtpPassword || '',
    imapTls: backendConfig.imapTls ?? true, smtpTls: backendConfig.smtpTls ?? true
  });
  const [geminiKey, setGeminiKey] = useState(backendConfig.geminiApiKey || '');

  useEffect(() => { setProfileForm(userProfile); }, [userProfile]);
  useEffect(() => { setInvConfigForm(invoiceConfig); }, [invoiceConfig]);

  const handleProfileSubmit = (e: React.FormEvent) => { e.preventDefault(); onUpdateProfile(profileForm); alert("Profil gespeichert!"); };
  const handleEmailSubmit = (e: React.FormEvent) => { e.preventDefault(); onUpdateBackendConfig({ ...backendConfig, ...emailConfig }); alert("Server-Konfiguration gespeichert!"); };
  const handleInvSubmit = (e: React.FormEvent) => { e.preventDefault(); onUpdateInvoiceConfig(invConfigForm); alert("Daten gespeichert!"); };
  const handleAiSubmit = (e: React.FormEvent) => { e.preventDefault(); onUpdateBackendConfig({ ...backendConfig, geminiApiKey: geminiKey }); alert("KI-Key gespeichert!"); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setInvConfigForm({...invConfigForm, logoBase64: reader.result as string}); };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setProfileForm({...profileForm, avatar: reader.result as string}); };
    reader.readAsDataURL(file);
  };

  const handleCheckUpdate = async () => {
    setIsUpdating(true);
    setUpdateStatus("Prüfe auf neue Version...");
    try {
        await dataService.checkAndInstallUpdate(
            'https://ckhoufache.github.io/SYNTAX_Lab/', 
            (status) => setUpdateStatus(status),
            true // force check
        );
    } catch (err: any) {
        setUpdateStatus("Fehler: " + err.message);
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50/50 min-h-screen overflow-y-auto custom-scrollbar">
      <header className="bg-white border-b border-slate-200 px-8 py-8 sticky top-0 z-20">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Einstellungen</h1>
          <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">Global Configuration & Architecture</p>
      </header>
      
      <main className="p-8 max-w-5xl mx-auto space-y-4 pb-32">
         
         {/* KATEGORIE: IDENTITÄT */}
         <SettingsCategory title="Identität & Team" icon={Building2} isOpen={activeCat === 'id'} onToggle={() => setActiveCat(activeCat === 'id' ? null : 'id')}>
            <SubAccordion title="Benutzerprofil" isOpen={subOpen === 'profile'} onToggle={() => setSubOpen(subOpen === 'profile' ? null : 'profile')}>
                <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">Vorname</label><input value={profileForm.firstName} onChange={e=>setProfileForm({...profileForm, firstName: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">Nachname</label><input value={profileForm.lastName} onChange={e=>setProfileForm({...profileForm, lastName: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div className="space-y-1"><label className="text-[10px] font-black uppercase text-slate-400">Rolle</label><input value={profileForm.role} onChange={e=>setProfileForm({...profileForm, role: e.target.value})} className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Profilbild (Avatar)</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden bg-white shrink-0 group">
                                {profileForm.avatar ? (
                                    <>
                                        <img src={profileForm.avatar} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setProfileForm({...profileForm, avatar: ''})} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Trash2 className="w-4 h-4"/></button>
                                    </>
                                ) : (
                                    <div onClick={() => avatarInputRef.current?.click()} className="cursor-pointer flex flex-col items-center">
                                        <User className="w-6 h-6 text-slate-300" />
                                    </div>
                                )}
                                <input type="file" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                            </div>
                            {!profileForm.avatar && (
                                <button type="button" onClick={() => avatarInputRef.current?.click()} className="text-xs font-bold text-indigo-600 hover:underline">Bild hochladen</button>
                            )}
                        </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Save className="w-4 h-4"/> Profil speichern</button></div>
                </form>
            </SubAccordion>
            <SubAccordion title="Unternehmens-Branding" isOpen={subOpen === 'company'} onToggle={() => setSubOpen(subOpen === 'company' ? null : 'company')}>
                <form onSubmit={handleInvSubmit} className="space-y-6">
                    <div className="flex items-start gap-6">
                        <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden bg-white shrink-0 group">
                            {invConfigForm.logoBase64 ? (
                                <>
                                    <img src={invConfigForm.logoBase64} className="w-full h-full object-contain" />
                                    <button type="button" onClick={() => setInvConfigForm({...invConfigForm, logoBase64: undefined})} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Trash2 className="w-6 h-6"/></button>
                                </>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer flex flex-col items-center">
                                    <ImageIcon className="w-8 h-8 text-slate-300 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-400">Logo Upload</span>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                        </div>
                        <div className="flex-1 space-y-4">
                            <div><label className="text-[10px] font-black uppercase text-slate-400">Firmenname</label><input value={invConfigForm.companyName} onChange={e=>setInvConfigForm({...invConfigForm, companyName: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black uppercase text-slate-400">Website</label><input value={invConfigForm.website} onChange={e=>setInvConfigForm({...invConfigForm, website: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400">Firmen-E-Mail</label><input value={invConfigForm.email} onChange={e=>setInvConfigForm({...invConfigForm, email: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Branding speichern</button></div>
                </form>
            </SubAccordion>
         </SettingsCategory>

         {/* KATEGORIE: FINANZEN */}
         <SettingsCategory title="Finanzen & Steuern" icon={Landmark} isOpen={activeCat === 'finances'} onToggle={() => setActiveCat(activeCat === 'finances' ? null : 'finances')}>
            <SubAccordion title="Bankverbindung" isOpen={subOpen === 'bank'} onToggle={() => setSubOpen(subOpen === 'bank' ? null : 'bank')}>
                <form onSubmit={handleInvSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400">Bankname</label><input value={invConfigForm.bankName} onChange={e=>setInvConfigForm({...invConfigForm, bankName: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400">IBAN</label><input value={invConfigForm.iban} onChange={e=>setInvConfigForm({...invConfigForm, iban: e.target.value})} className="w-full p-2 border rounded-lg font-mono" /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-black uppercase text-slate-400">BIC</label><input value={invConfigForm.bic} onChange={e=>setInvConfigForm({...invConfigForm, bic: e.target.value})} className="w-full p-2 border rounded-lg font-mono" /></div>
                    </div>
                    <div className="flex justify-end"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Bankdaten sichern</button></div>
                </form>
            </SubAccordion>
            <SubAccordion title="Steuer-Regelung & Adresse" isOpen={subOpen === 'tax'} onToggle={() => setSubOpen(subOpen === 'tax' ? null : 'tax')}>
                <form onSubmit={handleInvSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400">Besteuerungsart</label>
                            <select value={invConfigForm.taxRule} onChange={e=>setInvConfigForm({...invConfigForm, taxRule: e.target.value as any})} className="w-full p-2 border rounded-lg bg-white">
                                <option value="standard">Regelbesteuerung (19% MwSt.)</option>
                                <option value="small_business">Kleinunternehmer (§ 19 UStG)</option>
                            </select>
                        </div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400">Steuernummer / USt-ID</label><input value={invConfigForm.taxId} onChange={e=>setInvConfigForm({...invConfigForm, taxId: e.target.value})} className="w-full p-2 border rounded-lg" /></div>
                    </div>
                    <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-xs font-bold text-slate-800">Rechnungsadresse (Layout)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-black uppercase text-slate-400">Adresszeile 1</label><input value={invConfigForm.addressLine1} onChange={e=>setInvConfigForm({...invConfigForm, addressLine1: e.target.value})} placeholder="Straße Hausnr." className="w-full p-2 border rounded-lg" /></div>
                            <div><label className="text-[10px] font-black uppercase text-slate-400">Adresszeile 2</label><input value={invConfigForm.addressLine2} onChange={e=>setInvConfigForm({...invConfigForm, addressLine2: e.target.value})} placeholder="PLZ Ort" className="w-full p-2 border rounded-lg" /></div>
                        </div>
                        <div><label className="text-[10px] font-black uppercase text-slate-400">Fußzeilentext (PDF)</label><textarea value={invConfigForm.footerText} onChange={e=>setInvConfigForm({...invConfigForm, footerText: e.target.value})} className="w-full p-2 border rounded-lg h-20 text-sm" placeholder="Vielen Dank für Ihren Auftrag..." /></div>
                    </div>
                    <div className="flex justify-end"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Finanz-Settings speichern</button></div>
                </form>
            </SubAccordion>
         </SettingsCategory>

         {/* KATEGORIE: INTEGRATIONEN */}
         <SettingsCategory title="Integrationen & KI" icon={Cpu} isOpen={activeCat === 'ai'} onToggle={() => setActiveCat(activeCat === 'ai' ? null : 'ai')}>
            <SubAccordion title="Gemini KI-Modell" isOpen={subOpen === 'gemini'} onToggle={() => setSubOpen(subOpen === 'gemini' ? null : 'gemini')}>
                <form onSubmit={handleAiSubmit} className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 font-medium">Ihr Key wird lokal verschlüsselt gespeichert und für den Lagebericht genutzt.</div>
                    <div className="relative"><Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="API Key..." className="w-full pl-10 pr-4 py-2 border rounded-xl font-mono" /></div>
                    <div className="flex justify-end"><button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">Key sichern</button></div>
                </form>
            </SubAccordion>
            <SubAccordion title="E-Mail Server (IMAP/SMTP)" isOpen={subOpen === 'email'} onToggle={() => setSubOpen(subOpen === 'email' ? null : 'email')}>
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3 p-4 bg-white border rounded-2xl">
                            <h4 className="text-xs font-black uppercase text-indigo-600 flex items-center gap-2"><DownloadCloud className="w-3 h-3"/> Eingang (IMAP)</h4>
                            <input value={emailConfig.imapHost} onChange={e=>setEmailConfig({...emailConfig, imapHost:e.target.value})} placeholder="imap.provider.de" className="w-full p-2 border rounded-lg text-sm" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={emailConfig.imapPort} onChange={e=>setEmailConfig({...emailConfig, imapPort:parseInt(e.target.value)})} placeholder="Port (993)" className="w-full p-2 border rounded-lg text-sm" />
                                <div className="flex items-center gap-2 px-2"><input type="checkbox" checked={emailConfig.imapTls} onChange={e=>setEmailConfig({...emailConfig, imapTls:e.target.checked})} className="rounded"/><span className="text-[10px] font-bold">SSL/TLS</span></div>
                            </div>
                            <input value={emailConfig.imapUser} onChange={e=>setEmailConfig({...emailConfig, imapUser:e.target.value})} placeholder="Benutzer / E-Mail" className="w-full p-2 border rounded-lg text-sm" />
                            <input type="password" value={emailConfig.imapPassword} onChange={e=>setEmailConfig({...emailConfig, imapPassword:e.target.value})} placeholder="Passwort" className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div className="space-y-3 p-4 bg-white border rounded-2xl">
                            <h4 className="text-xs font-black uppercase text-emerald-600 flex items-center gap-2"><Upload className="w-3 h-3"/> Ausgang (SMTP)</h4>
                            <input value={emailConfig.smtpHost} onChange={e=>setEmailConfig({...emailConfig, smtpHost:e.target.value})} placeholder="smtp.provider.de" className="w-full p-2 border rounded-lg text-sm" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" value={emailConfig.smtpPort} onChange={e=>setEmailConfig({...emailConfig, smtpPort:parseInt(e.target.value)})} placeholder="Port (465)" className="w-full p-2 border rounded-lg text-sm" />
                                <div className="flex items-center gap-2 px-2"><input type="checkbox" checked={emailConfig.smtpTls} onChange={e=>setEmailConfig({...emailConfig, smtpTls:e.target.checked})} className="rounded"/><span className="text-[10px] font-bold">SSL/TLS</span></div>
                            </div>
                            <input value={emailConfig.smtpUser} onChange={e=>setEmailConfig({...emailConfig, smtpUser:e.target.value})} placeholder="Benutzer / E-Mail" className="w-full p-2 border rounded-lg text-sm" />
                            <input type="password" value={emailConfig.smtpPassword} onChange={e=>setEmailConfig({...emailConfig, smtpPassword:e.target.value})} placeholder="Passwort" className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="flex justify-end"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold">Server-Verbindung speichern</button></div>
                </form>
            </SubAccordion>
         </SettingsCategory>

         {/* KATEGORIE: AUTOMATISIERUNG */}
         <SettingsCategory title="Automatisierung & Templates" icon={BellRing} isOpen={activeCat === 'automation'} onToggle={() => setActiveCat(activeCat === 'automation' ? null : 'automation')}>
            <SubAccordion title="E-Mail Vorlagen" isOpen={subOpen === 'templates'} onToggle={() => setSubOpen(subOpen === 'templates' ? null : 'templates')}>
                <div className="space-y-3">
                    {emailTemplates.map(t => (
                        <div key={t.id} className="p-3 bg-white border rounded-xl flex items-center justify-between group">
                            <div><p className="font-bold text-slate-800 text-sm">{t.title}</p><p className="text-[10px] text-slate-500">{t.subject}</p></div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => {
                                    const body = prompt("Neuer Inhalt:", t.body);
                                    if(body !== null) onUpdateTemplate({...t, body});
                                }} className="p-1.5 text-slate-400 hover:text-indigo-600"><Settings2 className="w-4 h-4"/></button>
                                <button onClick={() => onDeleteTemplate(t.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => {
                        const title = prompt("Name der Vorlage:");
                        const subject = prompt("Betreff:");
                        if(title && subject) onAddTemplate({ id: crypto.randomUUID(), title, subject, body: '' });
                    }} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Vorlage hinzufügen</button>
                </div>
            </SubAccordion>
            <SubAccordion title="Produkt-Presets" isOpen={subOpen === 'presets'} onToggle={() => setSubOpen(subOpen === 'presets' ? null : 'presets')}>
                <div className="space-y-3">
                    {productPresets.map(p => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                            <div><p className="font-bold text-slate-800">{p.title}</p><p className="text-xs text-slate-500">{p.value.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</p></div>
                            <button onClick={() => onUpdatePresets(productPresets.filter(x => x.id !== p.id))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                    <button onClick={() => { const t = prompt("Leistung:"); const v = prompt("Preis:"); if(t && v) onUpdatePresets([...productPresets, { id: crypto.randomUUID(), title: t, value: parseFloat(v) }]); }} className="w-full py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Neues Preset</button>
                </div>
            </SubAccordion>
         </SettingsCategory>

         {/* KATEGORIE: SYSTEM */}
         <SettingsCategory title="System & Daten" icon={Database} isOpen={activeCat === 'system'} onToggle={() => setActiveCat(activeCat === 'system' ? null : 'system')}>
            <SubAccordion title="Software-Update & Version" isOpen={subOpen === 'updates'} onToggle={() => setSubOpen(subOpen === 'updates' ? null : 'updates')}>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Fingerprint className="w-6 h-6"/></div>
                            <div>
                                <p className="text-xs font-black uppercase text-slate-400">Aktuelle Version</p>
                                <p className="font-bold text-slate-800 text-lg">v1.3.35-Stable</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleCheckUpdate} 
                            disabled={isUpdating}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${isUpdating ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
                            {isUpdating ? 'Prüfung...' : 'Nach Updates suchen'}
                        </button>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-xs font-bold text-slate-600">{updateStatus}</span>
                    </div>
                </div>
            </SubAccordion>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 text-center space-y-4">
                    <DownloadCloud className="w-10 h-10 text-indigo-600 mx-auto" /><h3 className="font-black text-slate-800">Export</h3><p className="text-xs text-slate-500">JSON Voll-Backup aller Daten.</p>
                    <button onClick={() => {
                        const data: BackupData = { contacts, deals, tasks, invoices, expenses, activities, invoiceConfig, userProfile, productPresets, backendConfig, theme: 'light', timestamp: new Date().toISOString(), version: '1.3.35' };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `CRM_Backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
                    }} className="w-full bg-white border border-indigo-200 py-2 rounded-xl font-bold text-indigo-600 hover:bg-indigo-100 transition-all">Download Backup</button>
                </div>
                <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 text-center space-y-4">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto" /><h3 className="font-black text-slate-800">Wiederherstellen</h3><p className="text-xs text-slate-500">Vorhandene Daten überschreiben.</p>
                    <label className="w-full bg-slate-900 text-white py-2 rounded-xl font-bold hover:bg-black transition-all cursor-pointer flex justify-center items-center text-sm">
                        <input type="file" accept=".json" onChange={(e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const reader = new FileReader(); reader.onload = (ev) => { try { const data = JSON.parse(ev.target?.result as string); onImportData(data); } catch { alert("Fehler!"); } }; reader.readAsText(file);
                        }} className="hidden" /> Backup einspielen
                    </label>
                </div>
            </div>
            <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between p-4 bg-white border rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg"><Fingerprint className="w-5 h-5 text-slate-500"/></div>
                        <div><p className="text-xs font-black uppercase text-slate-400">DB Status</p><p className="font-bold text-slate-800">Lokal / Cloud Verschlüsselt</p></div>
                    </div>
                    <button onClick={() => { if(confirm("ALLES LÖSCHEN?")) props.dataService.wipeAllData(); }} className="text-xs font-black text-red-500 hover:underline uppercase tracking-widest">Wipe all data</button>
                </div>
            </div>
         </SettingsCategory>

      </main>
    </div>
  );
};
