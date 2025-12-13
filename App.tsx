
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Tasks } from './components/Tasks';
import { Finances } from './components/Finances';
import { Settings } from './components/Settings';
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
  // Theme state removed, defaulted to Light
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ... (State variables same as before) ...
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
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

  // INITIAL LOAD
  useEffect(() => {
      const init = async () => {
          await dataService.init(); 
          // Do NOT load data yet. Load data only after auth.
      };
      init();
  }, [dataService]);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const [c, d, t, i, e, a, up, pp, ic, et] = await Promise.all([
              dataService.getContacts(),
              dataService.getDeals(),
              dataService.getTasks(),
              dataService.getInvoices(),
              dataService.getExpenses(),
              dataService.getActivities(),
              dataService.getUserProfile(),
              dataService.getProductPresets(),
              dataService.getInvoiceConfig(),
              dataService.getEmailTemplates()
          ]);
          setContacts(c); setDeals(d); setTasks(t); setInvoices(i); setExpenses(e); setActivities(a);
          setProductPresets(pp); setInvoiceConfig(ic); setEmailTemplates(et);
          
          if(up) setUserProfile(up);
          
      } catch (err: any) {
          console.error("Load failed", err);
          if (err.code === 'permission-denied') {
              alert("Fehler beim Laden der Daten: Zugriff verweigert. Bitte prüfen Sie Ihre Rechte.");
          } else {
              alert("Daten konnten nicht geladen werden. Bitte prüfen Sie Ihre Verbindung.");
          }
      } finally {
          setIsLoading(false);
      }
  };

  const handleLogin = async (profile: UserProfile) => {
      setUserProfile(profile);
      await dataService.saveUserProfile(profile); // Sync to DB
      await loadData();
      setIsAuthenticated(true);
  };
  
  const handleLogout = () => {
      setIsAuthenticated(false);
      setUserProfile(null);
      setContacts([]); setDeals([]); setInvoices([]);
      window.location.reload(); 
  };

  const handleUpdateBackendConfig = (config: BackendConfig) => {
      setBackendConfig(config);
      localStorage.setItem('backend_config', JSON.stringify(config));
  };

  // ... (CRUD Handlers remain the same) ...
  const handleAddContact = async (c: Contact) => { await dataService.saveContact(c); setContacts(prev => [c, ...prev]); const act: Activity = { id: crypto.randomUUID(), contactId: c.id, type: 'system_deal', content: 'Kontakt erstellt', date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString() }; await handleAddActivity(act); };
  const handleUpdateContact = async (c: Contact) => { await dataService.updateContact(c); setContacts(prev => prev.map(x => x.id === c.id ? c : x)); };
  const handleDeleteContact = async (id: string) => { await dataService.deleteContact(id); setContacts(prev => prev.filter(x => x.id !== id)); setDeals(prev => prev.filter(d => d.contactId !== id)); setTasks(prev => prev.filter(t => t.relatedEntityId !== id)); setActivities(prev => prev.filter(a => a.contactId !== id)); };
  const handleBulkDeleteContacts = async (ids: string[]) => { for(const id of ids) { await dataService.deleteContact(id); } setContacts(prev => prev.filter(c => !ids.includes(c.id))); setDeals(prev => prev.filter(d => !ids.includes(d.contactId))); setTasks(prev => prev.filter(t => !t.relatedEntityId || !ids.includes(t.relatedEntityId))); setActivities(prev => prev.filter(a => !ids.includes(a.contactId))); };
  const handleImportContactsCSV = useCallback(async (csvText: string) => { setIsLoading(true); try { const result = await dataService.importContactsFromCSV(csvText); const freshContacts = await dataService.getContacts(); const freshDeals = await dataService.getDeals(); const freshActivities = await dataService.getActivities(); setContacts(freshContacts); setDeals(freshDeals); setActivities(freshActivities); let msg = `${result.contacts.length} neue Kontakte importiert.`; if (result.skippedCount > 0) msg += `\n${result.skippedCount} Duplikate erkannt und übersprungen.`; alert(msg); } catch (e: any) { console.error(e); alert(`Fehler beim Importieren: ${e.message}`); } finally { setIsLoading(false); } }, [dataService]);
  const handleAddDeal = async (d: Deal) => { await dataService.saveDeal(d); setDeals(prev => [d, ...prev]); };
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
  const handleAddActivity = async (a: Activity) => { await dataService.saveActivity(a); setActivities(prev => [a, ...prev]); };
  const handleDeleteActivity = async (id: string) => { await dataService.deleteActivity(id); setActivities(prev => prev.filter(x => x.id !== id)); };
  const handleUpdateProfile = async (p: UserProfile) => { await dataService.saveUserProfile(p); setUserProfile(p); };
  const handleUpdatePresets = async (p: ProductPreset[]) => { await dataService.saveProductPresets(p); setProductPresets(p); };
  const handleUpdateInvoiceConfig = async (c: InvoiceConfig) => { await dataService.saveInvoiceConfig(c); setInvoiceConfig(c); };
  const handleAddTemplate = async (t: EmailTemplate) => { await dataService.saveEmailTemplate(t); setEmailTemplates(prev => [t, ...prev]); };
  const handleUpdateTemplate = async (t: EmailTemplate) => { await dataService.updateEmailTemplate(t); setEmailTemplates(prev => prev.map(x => x.id === t.id ? t : x)); };
  const handleDeleteTemplate = async (id: string) => { await dataService.deleteEmailTemplate(id); setEmailTemplates(prev => prev.filter(x => x.id !== id)); };
  const handleImportData = useCallback(async (data: BackupData) => { if(confirm("Dies überschreibt alle aktuellen Daten. Fortfahren?")) { setIsLoading(true); try { await dataService.restoreBackup(data); alert("Daten importiert. Seite wird neu geladen."); window.location.reload(); } catch (e: any) { console.error("Backup Restore Failed", e); alert("Fehler beim Wiederherstellen: " + e.message); setIsLoading(false); } } }, [dataService]);
  const handleRunRetainer = async () => { setIsLoading(true); const res = await dataService.processDueRetainers(); if(res.newInvoices.length > 0) { setInvoices(prev => [...res.newInvoices, ...prev]); setActivities(prev => [...res.newActivities, ...prev]); setContacts(prev => prev.map(c => res.updatedContacts.find(u => u.id === c.id) || c)); alert(`${res.newInvoices.length} Retainer-Rechnungen erstellt.`); } else { alert("Keine fälligen Retainer gefunden."); } setIsLoading(false); };

  const navigateToContacts = (filter: 'all' | 'recent', focusId?: string) => { setView('contacts'); setContactFilter(filter); setFocusedContactId(focusId || null); };
  const navigateToPipeline = (stages: DealStage[], focusId?: string) => { setView('pipeline'); setVisibleStages(stages.length ? stages : Object.values(DealStage)); setFocusedDealId(focusId || null); };
  const navigateToTasks = (focusId?: string) => { setView('tasks'); setFocusedTaskId(focusId || null); };
  const navigateToFinances = () => { setView('finances'); };

  if (!isAuthenticated) {
      return (
          <LoginScreen 
            onLogin={handleLogin} 
            backendConfig={backendConfig} 
            onUpdateConfig={handleUpdateBackendConfig}
            isLoading={isLoading}
          />
      );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans bg-slate-50">
        <Sidebar 
            currentView={view} 
            onChangeView={setView} 
            userProfile={userProfile}
            onLogout={handleLogout}
        />
        
        {view === 'dashboard' && (
            <Dashboard 
                tasks={tasks} deals={deals} contacts={contacts} invoices={invoices} expenses={expenses} activities={activities}
                onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
                onNavigateToContacts={navigateToContacts} onNavigateToPipeline={navigateToPipeline} onNavigateToTasks={navigateToTasks} onNavigateToFinances={navigateToFinances}
            />
        )}
        
        {view === 'contacts' && invoiceConfig && (
            <Contacts 
                contacts={contacts} activities={activities} invoices={invoices} expenses={expenses} invoiceConfig={invoiceConfig}
                onAddContact={handleAddContact} onUpdateContact={handleUpdateContact} onDeleteContact={handleDeleteContact}
                onAddActivity={handleAddActivity} onDeleteActivity={handleDeleteActivity}
                initialFilter={contactFilter} onClearFilter={() => setContactFilter('all')} focusedId={focusedContactId} onClearFocus={() => setFocusedContactId(null)}
                emailTemplates={emailTemplates} onImportCSV={handleImportContactsCSV} onBulkDeleteContacts={handleBulkDeleteContacts}
            />
        )}

        {view === 'pipeline' && (
            <Pipeline 
                deals={deals} contacts={contacts} tasks={tasks} invoices={invoices} invoiceConfig={invoiceConfig} emailTemplates={emailTemplates}
                onAddDeal={handleAddDeal} onUpdateDeal={handleUpdateDeal} onDeleteDeal={handleDeleteDeal}
                visibleStages={visibleStages} setVisibleStages={setVisibleStages} productPresets={productPresets}
                onAddTask={handleAddTask} onAutoDeleteTask={handleDeleteTask}
                focusedDealId={focusedDealId} onClearFocus={() => setFocusedDealId(null)}
                onAddInvoice={handleAddInvoice} onAddActivity={handleAddActivity} onNavigateToContacts={navigateToContacts}
            />
        )}

        {view === 'tasks' && (
            <Tasks 
                tasks={tasks}
                onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
                focusedTaskId={focusedTaskId} onClearFocus={() => setFocusedTaskId(null)}
            />
        )}

        {/* NEUE VIEW: EMAIL CLIENT */}
        {view === 'email' && (
            <EmailClient 
                dataService={dataService} 
                config={backendConfig}
            />
        )}

        {view === 'finances' && invoiceConfig && (
            <Finances 
                invoices={invoices} contacts={contacts} expenses={expenses} invoiceConfig={invoiceConfig}
                onAddInvoice={handleAddInvoice} onUpdateInvoice={handleUpdateInvoice} onDeleteInvoice={handleDeleteInvoice}
                onAddExpense={handleAddExpense} onUpdateExpense={handleUpdateExpense} onDeleteExpense={handleDeleteExpense}
                onAddActivity={handleAddActivity} onRunRetainer={handleRunRetainer}
            />
        )}

        {view === 'settings' && userProfile && invoiceConfig && (
            <Settings 
                userProfile={userProfile} onUpdateProfile={handleUpdateProfile}
                productPresets={productPresets} onUpdatePresets={handleUpdatePresets}
                contacts={contacts} deals={deals} tasks={tasks} invoices={invoices} expenses={expenses} activities={activities}
                onImportData={handleImportData} backendConfig={backendConfig} onUpdateBackendConfig={handleUpdateBackendConfig}
                dataService={dataService} invoiceConfig={invoiceConfig} onUpdateInvoiceConfig={handleUpdateInvoiceConfig}
                emailTemplates={emailTemplates} onAddTemplate={handleAddTemplate} onUpdateTemplate={handleUpdateTemplate} onDeleteTemplate={handleDeleteTemplate}
            />
        )}
    </div>
  );
};
