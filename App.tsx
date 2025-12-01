
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Settings } from './components/Settings';
import { Tasks } from './components/Tasks';
import { Finances } from './components/Finances';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ViewState, Contact, Deal, UserProfile, Theme, Task, DealStage, ProductPreset, BackupData, BackendConfig, Invoice, Expense, InvoiceConfig, Activity } from './types';
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
            const [c, a, d, t, i, e, p, presets, invConf] = await Promise.all([
                service.getContacts(),
                service.getActivities(),
                service.getDeals(),
                service.getTasks(),
                service.getInvoices(),
                service.getExpenses(),
                service.getUserProfile(),
                service.getProductPresets(),
                service.getInvoiceConfig()
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
            
            // Check if user is effectively logged in via Google Token
            const token = localStorage.getItem('google_access_token');
            setIsLoggedIn(!!token);

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
  const [deleteIntent, setDeleteIntent] = useState<{ type: 'contact' | 'deal' | 'task' | 'invoice' | 'expense', id: string } | null>(null);

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
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f8fafc';
    } else {
      document.documentElement.classList.remove('dark');
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
      if (!backendConfig.googleClientId && backendConfig.mode === 'local') {
          alert("Bitte geben Sie zuerst Ihre Google Client ID in den Einstellungen unter 'System & Verbindungen' ein.");
          setCurrentView('settings');
          return;
      }
      setIsLoading(true);
      const profile = await dataService.loginWithGoogle();
      if (profile) {
          setUserProfile(profile);
          setIsLoggedIn(true);
      }
      setIsLoading(false);
  };

  const handleLogout = async () => {
      await dataService.logout();
      setIsLoggedIn(false);
      alert("Sie wurden erfolgreich abgemeldet.");
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

  const handleAddDeal = async (newDeal: Deal) => {
    const dealWithDate = { ...newDeal, stageEnteredDate: new Date().toISOString().split('T')[0] };
    const saved = await dataService.saveDeal(dealWithDate);
    setDeals(prev => [saved, ...prev]);
  };

  const handleUpdateDeal = async (updatedDeal: Deal) => {
    // Check for Status Change to WON for Logging
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
      
      // Log Activity
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

  const handleImportData = async (data: BackupData) => {
      if (!confirm("Importieren überschreibt alle aktuellen Daten. Fortfahren?")) return;
      setIsLoading(true);
      try {
          if (data.userProfile) await dataService.saveUserProfile(data.userProfile);
          if (data.productPresets) await dataService.saveProductPresets(data.productPresets);
          if (data.invoiceConfig) await dataService.saveInvoiceConfig(data.invoiceConfig);
          if (data.theme) setTheme(data.theme);

          if (data.contacts) {
               localStorage.setItem('contacts', JSON.stringify(data.contacts)); 
               setContacts(data.contacts);
          }
           if (data.deals) {
              localStorage.setItem('deals', JSON.stringify(data.deals));
              setDeals(data.deals);
          }
           if (data.tasks) {
              localStorage.setItem('tasks', JSON.stringify(data.tasks));
              setTasks(data.tasks);
          }
           if (data.invoices) {
              localStorage.setItem('invoices', JSON.stringify(data.invoices));
              setInvoices(data.invoices);
          }
           if (data.expenses) {
              localStorage.setItem('expenses', JSON.stringify(data.expenses));
              setExpenses(data.expenses);
          }
          if (data.activities) {
              localStorage.setItem('activities', JSON.stringify(data.activities));
              setActivities(data.activities);
          }
          
          window.location.reload(); 
      } catch(e) {
          console.error(e);
          alert("Import fehlgeschlagen.");
          setIsLoading(false);
      }
  };

  const confirmDelete = async () => {
    if (!deleteIntent) return;
    try {
        if (deleteIntent.type === 'contact') {
          const contactId = deleteIntent.id;
          await dataService.deleteContact(contactId);
          setContacts(prev => prev.filter(c => c.id !== contactId));
          const dealsToDelete = deals.filter(d => d.contactId === contactId);
          for (const d of dealsToDelete) await dataService.deleteDeal(d.id);
          setDeals(prev => prev.filter(d => d.contactId !== contactId));
          const tasksToDelete = tasks.filter(t => t.relatedEntityId === contactId);
          for (const t of tasksToDelete) await dataService.deleteTask(t.id);
          setTasks(prev => prev.filter(t => t.relatedEntityId !== contactId));
          const actsToDelete = activities.filter(a => a.contactId === contactId);
          for (const a of actsToDelete) await dataService.deleteActivity(a.id);
          setActivities(prev => prev.filter(a => a.contactId !== contactId));

        } else if (deleteIntent.type === 'deal') {
          await dataService.deleteDeal(deleteIntent.id);
          setDeals(prev => prev.filter(d => d.id !== deleteIntent.id));
        } else if (deleteIntent.type === 'task') {
          await dataService.deleteTask(deleteIntent.id);
          setTasks(prev => prev.filter(t => t.id !== deleteIntent.id));
        } else if (deleteIntent.type === 'invoice') {
          await dataService.deleteInvoice(deleteIntent.id);
          setInvoices(prev => prev.filter(i => i.id !== deleteIntent.id));
        } else if (deleteIntent.type === 'expense') {
          await dataService.deleteExpense(deleteIntent.id);
          setExpenses(prev => prev.filter(e => e.id !== deleteIntent.id));
        }
    } catch (e) {
        console.error("Delete failed", e);
        alert("Löschen fehlgeschlagen.");
    } finally {
        setDeleteIntent(null);
    }
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
          <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
              <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                  <p className="text-slate-500 font-medium">Lade CRM Daten...</p>
              </div>
          </div>
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
            initialFilter={contactFilterMode}
            onClearFilter={() => setContactFilterMode('all')}
            focusedId={focusedContactId}
            onClearFocus={() => setFocusedContactId(null)}
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
        userProfile={isLoggedIn ? userProfile : null} 
        theme={theme}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {renderView()}
        <ConfirmDialog 
          isOpen={!!deleteIntent}
          title={deleteIntent?.type === 'expense' ? 'Ausgabe löschen?' : 'Eintrag löschen?'}
          message="Möchten Sie diesen Eintrag wirklich unwiderruflich löschen?"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteIntent(null)}
        />
      </div>
    </div>
  );
};

export default App;
