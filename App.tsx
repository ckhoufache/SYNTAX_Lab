
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Settings } from './components/Settings';
import { Tasks } from './components/Tasks';
import { Finances } from './components/Finances';
import { LoginScreen } from './components/LoginScreen';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ViewState, Contact, Deal, UserProfile, Theme, Task, DealStage, ProductPreset, BackupData, BackendConfig, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate } from './types';
import { DataServiceFactory, IDataService } from './services/dataService';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // --- BACKEND CONFIGURATION ---
  const [backendConfig, setBackendConfig] = useState<BackendConfig>(() => {
      const stored = localStorage.getItem('backend_config');
      return stored ? JSON.parse(stored) : { mode: 'local' };
  });

  // --- SERVICE INSTANCE ---
  const [dataService, setDataService] = useState<IDataService>(DataServiceFactory.create(backendConfig));

  // --- APP STATE ---
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  
  // OPTIMIZED THEME INITIALIZATION
  const [theme, setTheme] = useState<Theme>(() => {
      if (typeof window !== 'undefined') {
          return (localStorage.getItem('theme') as Theme) || 'light';
      }
      return 'light';
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [productPresets, setProductPresets] = useState<ProductPreset[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]); // HISTORY STATE
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Re-Initialize Service when Config changes
  useEffect(() => {
    const service = DataServiceFactory.create(backendConfig);
    setDataService(service);
    setIsLoading(true);
    
    const loadData = async () => {
        try {
            await service.init();
            
            // Parallel loading for speed
            const [c, a, d, t, i, e, p, presets, invConf, templ] = await Promise.all([
                service.getContacts(),
                service.getActivities(),
                service.getDeals(),
                service.getTasks(),
                service.getInvoices(),
                service.getExpenses(),
                service.getUserProfile(),
                service.getProductPresets(),
                service.getInvoiceConfig(),
                service.getEmailTemplates()
            ]);

            setContacts(c);
            setActivities(a);
            setDeals(d);
            setTasks(t);
            setInvoices(i);
            setExpenses(e);
            setUserProfile(p);
            setProductPresets(presets);
            setInvoiceConfig(invConf);
            setEmailTemplates(templ);
            
            // Check if user is effectively logged in via Google Token
            const token = localStorage.getItem('google_access_token');
            if (token) {
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
            }

        } catch (error) {
            console.error("Failed to load data", error);
            alert("Fehler beim Laden der Daten. Bitte prüfen Sie Ihre Backend-Verbindung.");
        } finally {
            setIsLoading(false);
        }
    };

    loadData();
    localStorage.setItem('backend_config', JSON.stringify(backendConfig));

  }, [backendConfig]);

  // State für Pipeline Filter
  const [pipelineVisibleStages, setPipelineVisibleStages] = useState<DealStage[]>(Object.values(DealStage));

  // State für Lösch-Dialog
  const [deleteIntent, setDeleteIntent] = useState<{ type: 'contact' | 'deal' | 'task' | 'invoice' | 'expense' | 'template', id: string } | null>(null);

  // State für Navigation
  const [contactFilterMode, setContactFilterMode] = useState<'all' | 'recent'>('all');

  // --- SUCH FOKUS STATE ---
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const [focusedDealId, setFocusedDealId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#1e293b';
    }
  }, [theme]);

  const handleChangeView = (view: ViewState) => {
      setCurrentView(view);
      setFocusedContactId(null);
      setFocusedDealId(null);
      setFocusedTaskId(null);
      setContactFilterMode('all');
  };

  // --- AUTH HANDLERS ---
  const handleLogin = async () => {
      if (!backendConfig.googleClientId) {
          alert("Fehler: Keine Google Client ID konfiguriert.");
          return;
      }
      setIsLoginLoading(true);
      const profile = await dataService.loginWithGoogle();
      if (profile) {
          setUserProfile(profile);
          setIsLoggedIn(true);
          setCurrentView('dashboard');
      }
      setIsLoginLoading(false);
  };

  const handleLogout = async () => {
      await dataService.logout();
      setIsLoggedIn(false);
  };

  const handleUpdateConfig = (newConfig: BackendConfig) => {
      setBackendConfig(newConfig);
  };

  // --- DATA MODIFICATION HANDLERS ---
  const handleUpdateProfile = async (profile: UserProfile) => {
      const updated = await dataService.saveUserProfile(profile);
      setUserProfile(updated);
  };

  const handleUpdatePresets = async (presets: ProductPreset[]) => {
      const updated = await dataService.saveProductPresets(presets);
      setProductPresets(updated);
  };
  
  const handleUpdateInvoiceConfig = async (config: InvoiceConfig) => {
      const updated = await dataService.saveInvoiceConfig(config);
      setInvoiceConfig(updated);
  };

  // --- ACTIVITIES ---
  const handleAddActivity = async (newActivity: Activity) => {
      const saved = await dataService.saveActivity(newActivity);
      setActivities(prev => [saved, ...prev]);
  };

  const handleDeleteActivity = async (id: string) => {
      if (confirm("Möchten Sie diesen Eintrag wirklich aus der Historie entfernen?")) {
          await dataService.deleteActivity(id);
          setActivities(prev => prev.filter(a => a.id !== id));
      }
  };

  const handleAddContact = async (newContact: Contact) => {
    const savedContact = await dataService.saveContact(newContact);
    setContacts(prev => [savedContact, ...prev]);
    
    // Log Activity
    handleAddActivity({
        id: Math.random().toString(36).substr(2, 9),
        contactId: savedContact.id,
        type: 'system_deal',
        content: 'Kontakt erstellt',
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    });
    
    // Auto Create Deal
    const ghostDeal: Deal = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Neuer Lead',
      value: 0,
      stage: DealStage.LEAD,
      contactId: savedContact.id,
      dueDate: savedContact.lastContact,
      stageEnteredDate: new Date().toISOString().split('T')[0],
      isPlaceholder: true
    };
    const savedDeal = await dataService.saveDeal(ghostDeal);
    setDeals(prev => [savedDeal, ...prev]);
  };

  const handleUpdateContact = async (updatedContact: Contact) => {
    await dataService.updateContact(updatedContact);
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
  };

  const onRequestDeleteContact = (contactId: string) => { setDeleteIntent({ type: 'contact', id: contactId }); };

  // --- NEU: Bulk Delete Function for Contacts ---
  const handleBulkDeleteContacts = async (ids: string[]) => {
      setIsLoading(true);
      try {
          // 1. Delete Contacts
          for (const id of ids) {
              await dataService.deleteContact(id);
          }
          setContacts(prev => prev.filter(c => !ids.includes(c.id)));

          // 2. Cleanup related data (Deals, Tasks) for ALL deleted contacts
          const remainingDeals = deals.filter(d => !ids.includes(d.contactId));
          const dealsToDelete = deals.filter(d => ids.includes(d.contactId));
          for (const d of dealsToDelete) await dataService.deleteDeal(d.id);
          setDeals(remainingDeals);

          const remainingTasks = tasks.filter(t => !ids.includes(t.relatedEntityId || ''));
          const tasksToDelete = tasks.filter(t => ids.includes(t.relatedEntityId || ''));
          for (const t of tasksToDelete) await dataService.deleteTask(t.id);
          setTasks(remainingTasks);

      } catch (e) {
          console.error("Bulk delete failed", e);
          alert("Fehler beim Löschen mehrerer Kontakte.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleAddDeal = async (newDeal: Deal) => {
    const dealWithDate = { ...newDeal, stageEnteredDate: new Date().toISOString().split('T')[0] };
    const saved = await dataService.saveDeal(dealWithDate);
    setDeals(prev => [saved, ...prev]);
  };

  const handleUpdateDeal = async (updatedDeal: Deal) => {
    const oldDeal = deals.find(d => d.id === updatedDeal.id);
    if (oldDeal && oldDeal.stage !== DealStage.WON && updatedDeal.stage === DealStage.WON) {
        handleAddActivity({
            id: Math.random().toString(36).substr(2, 9),
            contactId: updatedDeal.contactId,
            type: 'system_deal',
            content: `Deal gewonnen: ${updatedDeal.title} (${updatedDeal.value} €)`,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            relatedId: updatedDeal.id
        });
    }

    await dataService.updateDeal(updatedDeal);
    setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
  };

  const onRequestDeleteDeal = (dealId: string) => { setDeleteIntent({ type: 'deal', id: dealId }); };

  const handleAddTask = async (newTask: Task) => {
    const saved = await dataService.saveTask(newTask);
    setTasks(prev => [saved, ...prev]);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    await dataService.updateTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    if (updatedTask.isCompleted && updatedTask.relatedEntityId) {
        const relatedDeal = deals.find(d => d.contactId === updatedTask.relatedEntityId);
        if (relatedDeal && relatedDeal.stage === DealStage.CONTACTED) {
            const updatedDeal: Deal = {
                ...relatedDeal,
                stage: DealStage.FOLLOW_UP,
                stageEnteredDate: new Date().toISOString().split('T')[0]
            };
            await dataService.updateDeal(updatedDeal);
            setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
        }
    }
  };

  const onRequestDeleteTask = (taskId: string) => { setDeleteIntent({ type: 'task', id: taskId }); };

  const handleAutoDeleteTask = async (taskId: string) => {
      await dataService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleAddInvoice = async (newInvoice: Invoice) => {
      const saved = await dataService.saveInvoice(newInvoice);
      setInvoices(prev => [saved, ...prev]);
      
      handleAddActivity({
          id: Math.random().toString(36).substr(2, 9),
          contactId: newInvoice.contactId,
          type: 'system_invoice',
          content: `Rechnung erstellt: ${newInvoice.invoiceNumber} (${newInvoice.amount} €)`,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString(),
          relatedId: newInvoice.id
      });
  };
  
  const handleUpdateInvoice = async (updatedInvoice: Invoice) => {
      await dataService.updateInvoice(updatedInvoice);
      setInvoices(prev => prev.map(i => i.id === updatedInvoice.id ? updatedInvoice : i));
  };
  const onRequestDeleteInvoice = (id: string) => { setDeleteIntent({ type: 'invoice', id }); };

  const handleAddExpense = async (newExpense: Expense) => {
      const saved = await dataService.saveExpense(newExpense);
      setExpenses(prev => [saved, ...prev]);
  };
  const handleUpdateExpense = async (updatedExpense: Expense) => {
      await dataService.updateExpense(updatedExpense);
      setExpenses(prev => prev.map(e => e.id === updatedExpense.id ? updatedExpense : e));
  };
  const onRequestDeleteExpense = (id: string) => { setDeleteIntent({ type: 'expense', id }); };

  const handleAddTemplate = async (template: EmailTemplate) => {
      const saved = await dataService.saveEmailTemplate(template);
      setEmailTemplates(prev => [saved, ...prev]);
  };
  const handleUpdateTemplate = async (template: EmailTemplate) => {
      await dataService.updateEmailTemplate(template);
      setEmailTemplates(prev => prev.map(t => t.id === template.id ? template : t));
  };
  const onRequestDeleteTemplate = (id: string) => { setDeleteIntent({ type: 'template', id }); };

  // --- AUTOMATION: RETAINER RUN ---
  const handleRunRetainer = async () => {
      setIsLoading(true);
      const result = await dataService.processDueRetainers();
      
      if (result.newInvoices.length > 0) {
          // Update State
          setInvoices(prev => [...result.newInvoices, ...prev]);
          setContacts(prev => prev.map(c => {
              const updated = result.updatedContacts.find(u => u.id === c.id);
              return updated || c;
          }));
          setActivities(prev => [...result.newActivities, ...prev]);
          
          alert(`${result.newInvoices.length} Retainer-Rechnungen erfolgreich erstellt.`);
      } else {
          alert("Keine fälligen Retainer-Verträge gefunden.");
      }
      setIsLoading(false);
  };

  const parseCSV = (str: string) => {
    const arr: string[][] = [];
    let quote = false;
    let row: string[] = [];
    let val = '';
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === '"') { quote = !quote; } 
      else if (c === ',' && !quote) { row.push(val); val = ''; } 
      else if (c === '\n' && !quote) {
        if (val.endsWith('\r')) val = val.slice(0, -1);
        row.push(val); arr.push(row); row = []; val = '';
      } else if (c !== '\r') { val += c; }
    }
    if (row.length > 0 || val) { if (val.endsWith('\r')) val = val.slice(0, -1); row.push(val); arr.push(row); }
    return arr;
  };

  const handleImportContactsCSV = async (csvText: string) => {
      setIsLoading(true);
      try {
          const rows = parseCSV(csvText);
          if (rows.length < 2) { alert("Die CSV Datei scheint leer oder ungültig zu sein."); setIsLoading(false); return; }
          const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
          const lowerHeaders = headers.map(h => h.toLowerCase());
          const findCol = (candidates: string[]) => { for (const c of candidates) { const i = lowerHeaders.indexOf(c.toLowerCase()); if (i !== -1) return i; } return -1; };
          const idx = {
              fullName: findCol(['fullName', 'Name', 'Full Name', 'Voller Name']),
              firstName: findCol(['firstName', 'Vorname', 'First Name']),
              lastName: findCol(['lastName', 'Nachname', 'Last Name']),
              companyName: findCol(['companyName', 'Company', 'Firma', 'Organization']),
              companyUrl: findCol(['companyUrl', 'Website', 'Webseite', 'URL']),
              role: findCol(['title', 'role', 'Position', 'Job Title']),
              linkedIn: findCol(['linkedInProfileUrl', 'LinkedIn', 'Social']),
              img: findCol(['profileImageUrl', 'avatar', 'image', 'photo']),
              summary: findCol(['summary', 'About', 'Info']),
              location: findCol(['location', 'Ort', 'Stadt']),
              email: findCol(['emailAddress', 'Email', 'Mail'])
          };

          let newContactsCount = 0;
          const newContacts: Contact[] = [];
          const newDeals: Deal[] = [];
          const newActivities: Activity[] = [];

          for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (row.length < 2) continue;
              const getValue = (index: number) => { if (index === -1 || index >= row.length) return ''; return row[index].replace(/^"|"$/g, '').trim(); };
              const name = getValue(idx.fullName) || (getValue(idx.firstName) + ' ' + getValue(idx.lastName)).trim();
              if (!name) continue;
              const contactId = Math.random().toString(36).substr(2, 9);
              let notes = "";
              if (getValue(idx.location)) notes += `Standort: ${getValue(idx.location)}\n\n`;
              if (getValue(idx.summary)) notes += `Summary:\n${getValue(idx.summary)}`;

              newContacts.push({
                  id: contactId,
                  name,
                  role: getValue(idx.role) || 'Unbekannt',
                  company: getValue(idx.companyName),
                  companyUrl: getValue(idx.companyUrl),
                  email: getValue(idx.email) || '',
                  linkedin: getValue(idx.linkedIn),
                  avatar: getValue(idx.img) || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                  lastContact: new Date().toISOString().split('T')[0],
                  notes
              });
              
              newActivities.push({
                  id: Math.random().toString(36).substr(2, 9),
                  contactId: contactId,
                  type: 'system_deal',
                  content: 'Kontakt importiert (CSV)',
                  date: new Date().toISOString().split('T')[0],
                  timestamp: new Date().toISOString()
              });

              newDeals.push({
                  id: Math.random().toString(36).substr(2, 9),
                  title: 'Neuer Lead',
                  value: 0,
                  stage: DealStage.LEAD,
                  contactId: contactId,
                  dueDate: new Date().toISOString().split('T')[0],
                  stageEnteredDate: new Date().toISOString().split('T')[0],
                  isPlaceholder: true
              });
              newContactsCount++;
          }
          for (const c of newContacts) await dataService.saveContact(c);
          for (const d of newDeals) await dataService.saveDeal(d);
          for (const a of newActivities) await dataService.saveActivity(a);
          setContacts(prev => [...newContacts, ...prev]);
          setDeals(prev => [...newDeals, ...prev]);
          setActivities(prev => [...newActivities, ...prev]);
          alert(`${newContactsCount} Kontakte erfolgreich importiert.`);
      } catch (e) { console.error(e); alert("Fehler beim Importieren der CSV Datei."); } finally { setIsLoading(false); }
  };

  const handleImportData = async (data: BackupData) => {
      if (!confirm("Importieren überschreibt alle aktuellen Daten. Fortfahren?")) return;
      setIsLoading(true);
      try {
          if (data.userProfile) await dataService.saveUserProfile(data.userProfile);
          if (data.productPresets) await dataService.saveProductPresets(data.productPresets);
          if (data.invoiceConfig) await dataService.saveInvoiceConfig(data.invoiceConfig);
          if (data.emailTemplates && dataService.saveEmailTemplate) { for (const t of data.emailTemplates) await dataService.saveEmailTemplate(t); }
          if (data.theme) setTheme(data.theme);
          if (data.contacts) { localStorage.setItem('contacts', JSON.stringify(data.contacts)); setContacts(data.contacts); }
           if (data.deals) { localStorage.setItem('deals', JSON.stringify(data.deals)); setDeals(data.deals); }
           if (data.tasks) { localStorage.setItem('tasks', JSON.stringify(data.tasks)); setTasks(data.tasks); }
           if (data.invoices) { localStorage.setItem('invoices', JSON.stringify(data.invoices)); setInvoices(data.invoices); }
           if (data.expenses) { localStorage.setItem('expenses', JSON.stringify(data.expenses)); setExpenses(data.expenses); }
          if (data.activities) { localStorage.setItem('activities', JSON.stringify(data.activities)); setActivities(data.activities); }
          window.location.reload(); 
      } catch(e) { console.error(e); alert("Import fehlgeschlagen."); setIsLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteIntent) return;
    try {
        if (deleteIntent.type === 'contact') {
          await dataService.deleteContact(deleteIntent.id);
          setContacts(prev => prev.filter(c => c.id !== deleteIntent.id));
          const dealsToDelete = deals.filter(d => d.contactId === deleteIntent.id);
          for (const d of dealsToDelete) await dataService.deleteDeal(d.id);
          setDeals(prev => prev.filter(d => d.contactId !== deleteIntent.id));
          const tasksToDelete = tasks.filter(t => t.relatedEntityId === deleteIntent.id);
          for (const t of tasksToDelete) await dataService.deleteTask(t.id);
          setTasks(prev => prev.filter(t => t.relatedEntityId !== deleteIntent.id));
        } else if (deleteIntent.type === 'deal') {
          await dataService.deleteDeal(deleteIntent.id);
          setDeals(prev => prev.filter(d => d.id !== deleteIntent.id));
        } else if (deleteIntent.type === 'task') {
          await dataService.deleteTask(deleteIntent.id);
          setTasks(prev => prev.filter(t => t.id !== deleteIntent.id));
        } else if (deleteIntent.type === 'invoice') {
          // GoBD: Cancel instead of Delete
          const { creditNote, updatedOriginal, activity } = await dataService.cancelInvoice(deleteIntent.id);
          setInvoices(prev => prev.map(i => i.id === updatedOriginal.id ? updatedOriginal : i));
          setInvoices(prev => [creditNote, ...prev]);
          setActivities(prev => [activity, ...prev]);
        } else if (deleteIntent.type === 'expense') {
          await dataService.deleteExpense(deleteIntent.id);
          setExpenses(prev => prev.filter(e => e.id !== deleteIntent.id));
        } else if (deleteIntent.type === 'template') {
          await dataService.deleteEmailTemplate(deleteIntent.id);
          setEmailTemplates(prev => prev.filter(t => t.id !== deleteIntent.id));
        }
    } catch (e) { console.error("Action failed", e); alert("Vorgang fehlgeschlagen: " + (e as Error).message); } finally { setDeleteIntent(null); }
  };

  const handleNavigateToContacts = (filter: 'all' | 'recent', focusId?: string) => {
    setContactFilterMode(filter);
    setFocusedContactId(focusId || null);
    setCurrentView('contacts');
  };
  const handleNavigateToPipelineFilter = (stages: DealStage[], focusId?: string) => {
    setPipelineVisibleStages(stages);
    setFocusedDealId(focusId || null);
    setCurrentView('pipeline');
  };
  const handleNavigateToTasks = (focusId?: string) => {
      setFocusedTaskId(focusId || null);
      setCurrentView('tasks');
  };
  const handleNavigateToFinances = () => { setCurrentView('finances'); };

  if (isLoading || !userProfile || !invoiceConfig) {
      return (
          <div className={`flex h-screen w-full items-center justify-center ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Lade CRM Daten...</p>
              </div>
          </div>
      );
  }

  if (!isLoggedIn) {
      return (
          <LoginScreen 
            onLogin={handleLogin} 
            backendConfig={backendConfig}
            onUpdateConfig={handleUpdateConfig}
            isLoading={isLoginLoading}
            theme={theme}
          />
      );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            tasks={tasks} 
            deals={deals} 
            contacts={contacts} 
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={onRequestDeleteTask}
            onNavigateToContacts={handleNavigateToContacts}
            onNavigateToPipeline={handleNavigateToPipelineFilter}
            onNavigateToTasks={handleNavigateToTasks}
            onNavigateToFinances={handleNavigateToFinances}
            invoices={invoices}
            expenses={expenses}
            activities={activities}
          />
        );
      case 'contacts':
        return (
          <Contacts 
            contacts={contacts} 
            activities={activities}
            onAddContact={handleAddContact} 
            onUpdateContact={handleUpdateContact}
            onDeleteContact={onRequestDeleteContact}
            onAddActivity={handleAddActivity}
            onDeleteActivity={handleDeleteActivity}
            initialFilter={contactFilterMode}
            onClearFilter={() => setContactFilterMode('all')}
            focusedId={focusedContactId}
            onClearFocus={() => setFocusedContactId(null)}
            emailTemplates={emailTemplates}
            onImportCSV={handleImportContactsCSV}
            onBulkDeleteContacts={handleBulkDeleteContacts} // NEW PROP
            invoices={invoices} // PASSED PROP
            expenses={expenses} // PASSED PROP
          />
        );
      case 'pipeline':
        return (
          <Pipeline 
            deals={deals} 
            contacts={contacts}
            onAddDeal={handleAddDeal}
            onUpdateDeal={handleUpdateDeal}
            onDeleteDeal={onRequestDeleteDeal}
            visibleStages={pipelineVisibleStages}
            setVisibleStages={setPipelineVisibleStages}
            productPresets={productPresets}
            onAddTask={handleAddTask}
            tasks={tasks}
            onAutoDeleteTask={handleAutoDeleteTask}
            focusedDealId={focusedDealId}
            onClearFocus={() => setFocusedDealId(null)}
            onAddInvoice={handleAddInvoice}
            invoices={invoices}
            onAddActivity={handleAddActivity}
            onNavigateToContacts={handleNavigateToContacts}
            invoiceConfig={invoiceConfig} // PASSED
            emailTemplates={emailTemplates} // PASSED
          />
        );
      case 'tasks':
        return (
          <Tasks 
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={onRequestDeleteTask}
            focusedTaskId={focusedTaskId}
            onClearFocus={() => setFocusedTaskId(null)}
          />
        );
      case 'finances':
        return (
          <Finances 
            invoices={invoices}
            contacts={contacts}
            onAddInvoice={handleAddInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onDeleteInvoice={onRequestDeleteInvoice}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={onRequestDeleteExpense}
            invoiceConfig={invoiceConfig}
            onAddActivity={handleAddActivity}
            onRunRetainer={handleRunRetainer}
          />
        );
      case 'settings':
        return (
          <Settings 
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            currentTheme={theme}
            onUpdateTheme={setTheme}
            productPresets={productPresets}
            onUpdatePresets={handleUpdatePresets}
            contacts={contacts}
            deals={deals}
            tasks={tasks}
            invoices={invoices}
            expenses={expenses}
            activities={activities}
            onImportData={handleImportData}
            backendConfig={backendConfig}
            onUpdateBackendConfig={setBackendConfig}
            dataService={dataService}
            invoiceConfig={invoiceConfig}
            onUpdateInvoiceConfig={handleUpdateInvoiceConfig}
            emailTemplates={emailTemplates}
            onAddTemplate={handleAddTemplate}
            onUpdateTemplate={handleUpdateTemplate}
            onDeleteTemplate={onRequestDeleteTemplate}
          />
        );
      default: return null;
    }
  };

  return (
    <div className={`flex w-full h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar 
        currentView={currentView} 
        onChangeView={handleChangeView} 
        userProfile={userProfile} 
        theme={theme}
        onLogin={handleLogin} 
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {renderView()}
        <ConfirmDialog 
          isOpen={!!deleteIntent}
          title={
             deleteIntent?.type === 'invoice' ? 'Rechnung stornieren?' : 
             deleteIntent?.type === 'expense' ? 'Ausgabe löschen?' : 
             'Eintrag löschen?'
          }
          message={
             deleteIntent?.type === 'invoice' 
             ? "Gemäß GoBD können Rechnungen nicht einfach gelöscht werden. Stattdessen wird eine Stornorechnung (Gutschrift) erstellt und die Originalrechnung als storniert markiert." 
             : "Möchten Sie diesen Eintrag wirklich unwiderruflich löschen?"
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteIntent(null)}
        />
      </div>
    </div>
  );
};

export default App;