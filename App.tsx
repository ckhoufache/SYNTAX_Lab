
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Tasks } from './components/Tasks';
import { Finances } from './components/Finances';
import { Settings } from './components/Settings';
import { KPIAnalytics } from './components/KPIAnalytics'; 
import { LoginScreen } from './components/LoginScreen';
import { EmailClient } from './components/EmailClient';
import { DataServiceFactory, IDataService } from './services/dataService';
import { 
  Contact, Deal, Task, Invoice, Expense, Activity, 
  UserProfile, BackendConfig, ViewState, 
  ProductPreset, InvoiceConfig, EmailTemplate, BackupData, DealStage 
} from './types';

export const App = () => {
  const [view, setView] = useState<ViewState>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [productPresets, setProductPresets] = useState<ProductPreset[]>([]);
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [visibleStages, setVisibleStages] = useState<DealStage[]>(Object.values(DealStage));
  const [contactFilter, setContactFilter] = useState<'all' | 'recent'>('all');
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const [focusedDealId, setFocusedDealId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const [backendConfig, setBackendConfig] = useState<BackendConfig>(() => {
      const stored = localStorage.getItem('backend_config');
      return stored ? JSON.parse(stored) : { mode: 'local', googleClientId: '' };
  });

  const dataService: IDataService = useMemo(() => DataServiceFactory.create(backendConfig), [backendConfig]);

  useEffect(() => {
      const init = async () => {
          await dataService.init(); 
          if ((window as any).require) {
              const ipc = (window as any).require('electron').ipcRenderer;
              ipc.invoke('check-for-update').catch((e: any) => console.log("Update failed", e));
          }
      };
      init();
  }, [dataService]);

  const loadData = useCallback(async (background = false) => {
      if (!background) setIsLoading(true);
      try {
          const [c, d, t, i, e, a, up, pp, ic, et, users] = await Promise.all([
              dataService.getContacts(), dataService.getDeals(), dataService.getTasks(),
              dataService.getInvoices(), dataService.getExpenses(), dataService.getActivities(),
              dataService.getUserProfile(), dataService.getProductPresets(), dataService.getInvoiceConfig(),
              dataService.getEmailTemplates(), dataService.getAllUsers()
          ]);
          setContacts(c); setDeals(d); setTasks(t); setInvoices(i); setExpenses(e); setActivities(a);
          setProductPresets(pp); setInvoiceConfig(ic); setEmailTemplates(et); setTeamMembers(users);
          if(up) setUserProfile(up);
      } catch (err: any) { console.error(err); } finally { if (!background) setIsLoading(false); }
  }, [dataService]);

  useEffect(() => { if (isAuthenticated) loadData(true); }, [view, isAuthenticated, loadData]);

  const handleLogin = async (profile: UserProfile) => { setUserProfile(profile); await dataService.saveUserProfile(profile); await loadData(false); setIsAuthenticated(true); };
  const handleLogout = () => { setIsAuthenticated(false); setUserProfile(null); window.location.reload(); };
  const handleUpdateBackendConfig = (config: BackendConfig) => { setBackendConfig(config); localStorage.setItem('backend_config', JSON.stringify(config)); };

  const handleAddContact = async (c: Contact) => { await dataService.saveContact(c); setContacts(prev => [c, ...prev]); };
  const handleUpdateContact = async (c: Contact) => { await dataService.updateContact(c); setContacts(prev => prev.map(x => x.id === c.id ? c : x)); };
  const handleDeleteContact = async (id: string) => { await dataService.deleteContact(id); setContacts(prev => prev.filter(x => x.id !== id)); };
  
  const handleAddDeal = async (d: Deal) => { 
    await dataService.saveDeal(d); 
    setDeals(prev => [d, ...prev]); 
  };
  const handleUpdateDeal = async (d: Deal) => { await dataService.updateDeal(d); setDeals(prev => prev.map(x => x.id === d.id ? d : x)); };
  const handleDeleteDeal = async (id: string) => { await dataService.deleteDeal(id); setDeals(prev => prev.filter(x => x.id !== id)); };
  
  const handleAddTask = async (t: Task) => { await dataService.saveTask(t); setTasks(prev => [t, ...prev]); };
  const handleUpdateTask = async (t: Task) => { await dataService.updateTask(t); setTasks(prev => prev.map(x => x.id === t.id ? t : x)); };
  const handleDeleteTask = async (id: string) => { await dataService.deleteTask(id); setTasks(prev => prev.filter(x => x.id !== id)); };
  
  const handleAddInvoice = async (i: Invoice) => { await dataService.saveInvoice(i); setInvoices(prev => [i, ...prev]); };
  const handleUpdateInvoice = async (i: Invoice) => { await dataService.updateInvoice(i); setInvoices(prev => prev.map(x => x.id === i.id ? i : x)); };
  const handleDeleteInvoice = async (id: string) => { await dataService.deleteInvoice(id); setInvoices(prev => prev.filter(x => x.id !== id)); };
  
  const handleAddExpense = async (e: Expense) => { await dataService.saveExpense(e); setExpenses(prev => [e, ...prev]); };
  const handleUpdateExpense = async (e: Expense) => { await dataService.updateExpense(e); setExpenses(prev => prev.map(x => x.id === e.id ? e : x)); };
  const handleDeleteExpense = async (id: string) => { await dataService.deleteExpense(id); setExpenses(prev => prev.filter(x => x.id !== id)); };
  
  const handleAddActivity = async (a: Activity) => { 
    await dataService.saveActivity(a); 
    setActivities(prev => [a, ...prev]); 
  };
  
  const handleUpdateActivity = async (a: Activity) => { 
    await dataService.saveActivity(a);
    setActivities(prev => prev.map(x => x.id === a.id ? a : x)); 
  };

  const handleDeleteActivity = async (id: string) => { await dataService.deleteActivity(id); setActivities(prev => prev.filter(x => x.id !== id)); };
  const handleUpdateProfile = async (p: UserProfile) => { await dataService.saveUserProfile(p); setUserProfile(p); };
  const handleUpdatePresets = async (p: ProductPreset[]) => { await dataService.saveProductPresets(p); setProductPresets(p); };
  const handleUpdateInvoiceConfig = async (c: InvoiceConfig) => { await dataService.saveInvoiceConfig(c); setInvoiceConfig(c); };
  const handleAddTemplate = async (t: EmailTemplate) => { await dataService.saveEmailTemplate(t); setEmailTemplates(prev => [t, ...prev]); };
  const handleUpdateTemplate = async (t: EmailTemplate) => { await dataService.updateEmailTemplate(t); setEmailTemplates(prev => prev.map(x => x.id === t.id ? t : x)); };
  const handleDeleteTemplate = async (id: string) => { await dataService.deleteEmailTemplate(id); setEmailTemplates(prev => prev.filter(x => x.id !== id)); };
  const handleImportData = useCallback(async (data: BackupData) => { if(confirm("Überschreiben?")) { setIsLoading(true); try { await dataService.restoreBackup(data); window.location.reload(); } catch { setIsLoading(false); } } }, [dataService]);
  const handleRunRetainer = async () => { setIsLoading(true); const res = await dataService.processDueRetainers(); if(res.newInvoices.length > 0) { setInvoices(prev => [...res.newInvoices, ...prev]); setActivities(prev => [...res.newActivities, ...prev]); setContacts(prev => prev.map(c => res.updatedContacts.find(u => u.id === c.id) || c)); } setIsLoading(false); };

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} backendConfig={backendConfig} onUpdateConfig={handleUpdateBackendConfig} isLoading={isLoading} />;

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50 relative">
        <Sidebar currentView={view} onChangeView={setView} userProfile={userProfile} onLogout={handleLogout} isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            {view === 'dashboard' && <Dashboard tasks={tasks} deals={deals} contacts={contacts} invoices={invoices} expenses={expenses} activities={activities} backendConfig={backendConfig} onNavigateToSettings={() => setView('settings')} onNavigateToKPI={() => setView('kpi')} onNavigateToEmail={() => setView('email')} onUpdateActivity={handleUpdateActivity} />}
            {view === 'contacts' && invoiceConfig && <Contacts contacts={contacts} activities={activities} deals={deals} invoices={invoices} expenses={expenses} invoiceConfig={invoiceConfig} onAddContact={handleAddContact} onUpdateContact={handleUpdateContact} onDeleteContact={handleDeleteContact} onAddActivity={handleAddActivity} onDeleteActivity={handleDeleteActivity} onAddDeal={handleAddDeal} initialFilter={contactFilter} onClearFilter={() => setContactFilter('all')} focusedId={focusedContactId} onClearFocus={() => setFocusedContactId(null)} emailTemplates={emailTemplates} onImportCSV={(csv) => dataService.importContactsFromCSV(csv)} onBulkDeleteContacts={(ids) => ids.forEach(id => handleDeleteContact(id))} />}
            {view === 'pipeline' && <Pipeline deals={deals} contacts={contacts} activities={activities} tasks={tasks} invoices={invoices} invoiceConfig={invoiceConfig} emailTemplates={emailTemplates} onAddDeal={handleAddDeal} onUpdateDeal={handleUpdateDeal} onDeleteDeal={handleDeleteDeal} onUpdateContact={handleUpdateContact} visibleStages={visibleStages} setVisibleStages={setVisibleStages} productPresets={productPresets} onAddTask={handleAddTask} onAutoDeleteTask={handleDeleteTask} focusedDealId={focusedDealId} onClearFocus={() => setFocusedDealId(null)} onAddInvoice={handleAddInvoice} onAddActivity={handleAddActivity} onDeleteActivity={handleDeleteActivity} onNavigateToContacts={(f, id) => {setView('contacts'); setContactFilter(f); setFocusedContactId(id||null);}} />}
            {view === 'tasks' && <Tasks tasks={tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} focusedTaskId={focusedTaskId} onClearFocus={() => setFocusedTaskId(null)} teamMembers={teamMembers} />}
            {view === 'email' && <EmailClient dataService={dataService} config={backendConfig} userProfile={userProfile} />}
            {view === 'finances' && invoiceConfig && <Finances invoices={invoices} contacts={contacts} expenses={expenses} invoiceConfig={invoiceConfig} onAddInvoice={handleAddInvoice} onUpdateInvoice={handleUpdateInvoice} onDeleteInvoice={handleDeleteInvoice} onAddExpense={handleAddExpense} onUpdateExpense={handleUpdateExpense} onDeleteExpense={handleDeleteExpense} onAddActivity={handleAddActivity} onRunRetainer={handleRunRetainer} />}
            {view === 'kpi' && <KPIAnalytics invoices={invoices} contacts={contacts} expenses={expenses} deals={deals} />}
            {view === 'settings' && userProfile && invoiceConfig && <Settings userProfile={userProfile} onUpdateProfile={handleUpdateProfile} productPresets={productPresets} onUpdatePresets={handleUpdatePresets} contacts={contacts} deals={deals} tasks={tasks} invoices={invoices} expenses={expenses} activities={activities} onImportData={handleImportData} backendConfig={backendConfig} onUpdateBackendConfig={handleUpdateBackendConfig} dataService={dataService} invoiceConfig={invoiceConfig} onUpdateInvoiceConfig={handleUpdateInvoiceConfig} emailTemplates={emailTemplates} onAddTemplate={handleAddTemplate} onUpdateTemplate={handleUpdateTemplate} onDeleteTemplate={handleDeleteTemplate} />}
        </div>
    </div>
  );
};
