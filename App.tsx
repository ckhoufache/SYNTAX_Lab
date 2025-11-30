
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Settings } from './components/Settings';
import { Tasks } from './components/Tasks';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ViewState, Contact, Deal, UserProfile, Theme, Task, DealStage, ProductPreset, BackupData, BackendConfig } from './types';
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
  
  // FIX: Initialize theme directly from localStorage to avoid overwriting it with default 'light' on render
  const [theme, setTheme] = useState<Theme>(() => {
      if (typeof window !== 'undefined') {
          return (localStorage.getItem('theme') as Theme) || 'light';
      }
      return 'light';
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [productPresets, setProductPresets] = useState<ProductPreset[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Re-Initialize Service when Config changes
  useEffect(() => {
    const service = DataServiceFactory.create(backendConfig);
    setDataService(service);
    setIsLoading(true);
    
    const loadData = async () => {
        try {
            await service.init();
            
            // Parallel loading for performance
            const [c, d, t, p, presets] = await Promise.all([
                service.getContacts(),
                service.getDeals(),
                service.getTasks(),
                service.getUserProfile(),
                service.getProductPresets()
            ]);

            setContacts(c);
            setDeals(d);
            setTasks(t);
            setUserProfile(p);
            setProductPresets(presets);

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

  // State für Pipeline Filter (Global, damit Dashboard ihn steuern kann)
  const [pipelineVisibleStages, setPipelineVisibleStages] = useState<DealStage[]>(Object.values(DealStage));

  // State für Lösch-Dialog
  const [deleteIntent, setDeleteIntent] = useState<{ type: 'contact' | 'deal' | 'task', id: string } | null>(null);

  // State für Navigation mit Filter (z.B. vom Dashboard zu Kontakten)
  const [contactFilterMode, setContactFilterMode] = useState<'all' | 'recent'>('all');

  // --- SUCH FOKUS STATE ---
  const [focusedContactId, setFocusedContactId] = useState<string | null>(null);
  const [focusedDealId, setFocusedDealId] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // Theme Effekt (CSS Klasse setzen)
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

  // Handle View Change via Sidebar
  const handleChangeView = (view: ViewState) => {
      setCurrentView(view);
      setFocusedContactId(null);
      setFocusedDealId(null);
      setFocusedTaskId(null);
      setContactFilterMode('all');
  };

  // --- DATA MODIFICATION HANDLERS ---
  // Now these functions are async and update both Backend and UI

  const handleUpdateProfile = async (profile: UserProfile) => {
      const updated = await dataService.saveUserProfile(profile);
      setUserProfile(updated);
  };

  const handleUpdatePresets = async (presets: ProductPreset[]) => {
      const updated = await dataService.saveProductPresets(presets);
      setProductPresets(updated);
  };

  // --- Handlers Contacts ---
  const handleAddContact = async (newContact: Contact) => {
    // 1. Save Contact
    const savedContact = await dataService.saveContact(newContact);
    setContacts(prev => [savedContact, ...prev]);
    
    // 2. Auto-Create Ghost Deal
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

  const onRequestDeleteContact = (contactId: string) => {
    setDeleteIntent({ type: 'contact', id: contactId });
  };

  // --- Handlers Deals ---
  const handleAddDeal = async (newDeal: Deal) => {
    const dealWithDate = {
        ...newDeal,
        stageEnteredDate: new Date().toISOString().split('T')[0]
    };
    const saved = await dataService.saveDeal(dealWithDate);
    setDeals(prev => [saved, ...prev]);
  };

  const handleUpdateDeal = async (updatedDeal: Deal) => {
    await dataService.updateDeal(updatedDeal);
    setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
  };

  const onRequestDeleteDeal = (dealId: string) => {
    setDeleteIntent({ type: 'deal', id: dealId });
  };

  // --- Handlers Tasks ---
  const handleAddTask = async (newTask: Task) => {
    const saved = await dataService.saveTask(newTask);
    setTasks(prev => [saved, ...prev]);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    await dataService.updateTask(updatedTask);
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    // Automation: If task completed related to contacted deal
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

  const onRequestDeleteTask = (taskId: string) => {
    setDeleteIntent({ type: 'task', id: taskId });
  };

  const handleAutoDeleteTask = async (taskId: string) => {
      await dataService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // --- IMPORT / EXPORT ---
  const handleImportData = async (data: BackupData) => {
      if (!confirm("Importieren überschreibt alle aktuellen Daten. Fortfahren?")) return;
      setIsLoading(true);
      try {
          // Sequentially restore data to backend
          if (data.userProfile) await dataService.saveUserProfile(data.userProfile);
          if (data.productPresets) await dataService.saveProductPresets(data.productPresets);
          if (data.theme) setTheme(data.theme); // Theme is local pref mostly

          // Clear existing data (optional, but safer for clean import)
          // For now, we just add/overwrite
          
          // Bulk add contacts (simplified loop, real backend might have bulk endpoint)
          if (data.contacts) {
              setContacts(data.contacts);
              // In a real API scenario, you'd iterate and POST each, or use a bulk endpoint.
              // Since LocalDataService overwrites the whole key, we can cheat a bit for local mode:
              if (backendConfig.mode === 'local') {
                  localStorage.setItem('contacts', JSON.stringify(data.contacts));
              }
          }
           if (data.deals) {
              setDeals(data.deals);
              if (backendConfig.mode === 'local') localStorage.setItem('deals', JSON.stringify(data.deals));
          }
           if (data.tasks) {
              setTasks(data.tasks);
              if (backendConfig.mode === 'local') localStorage.setItem('tasks', JSON.stringify(data.tasks));
          }
          
          // Refresh
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
          
          // Cascading Delete
          const dealsToDelete = deals.filter(d => d.contactId === contactId);
          for (const d of dealsToDelete) await dataService.deleteDeal(d.id);
          setDeals(prev => prev.filter(d => d.contactId !== contactId));

          const tasksToDelete = tasks.filter(t => t.relatedEntityId === contactId);
          for (const t of tasksToDelete) await dataService.deleteTask(t.id);
          setTasks(prev => prev.filter(t => t.relatedEntityId !== contactId));

        } else if (deleteIntent.type === 'deal') {
          await dataService.deleteDeal(deleteIntent.id);
          setDeals(prev => prev.filter(d => d.id !== deleteIntent.id));
        } else if (deleteIntent.type === 'task') {
          await dataService.deleteTask(deleteIntent.id);
          setTasks(prev => prev.filter(t => t.id !== deleteIntent.id));
        }
    } catch (e) {
        console.error("Delete failed", e);
        alert("Löschen fehlgeschlagen.");
    } finally {
        setDeleteIntent(null);
    }
  };

  // Navigation Logic
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

  if (isLoading || !userProfile) {
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
          />
        );
      case 'contacts':
        return (
          <Contacts 
            contacts={contacts} 
            onAddContact={handleAddContact} 
            onUpdateContact={handleUpdateContact}
            onDeleteContact={onRequestDeleteContact}
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
            onImportData={handleImportData}
            // NEW PROPS FOR BACKEND
            backendConfig={backendConfig}
            onUpdateBackendConfig={setBackendConfig}
            dataService={dataService}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex w-full h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Sidebar 
        currentView={currentView} 
        onChangeView={handleChangeView} 
        userProfile={userProfile}
        theme={theme}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {renderView()}
        
        <ConfirmDialog 
          isOpen={!!deleteIntent}
          title={
            deleteIntent?.type === 'contact' ? 'Kontakt löschen?' : 
            deleteIntent?.type === 'deal' ? 'Deal löschen?' :
            'Aufgabe löschen?'
          }
          message={
            deleteIntent?.type === 'contact' ? 'Möchten Sie diesen Kontakt wirklich entfernen? Alle zugehörigen Deals und Aufgaben werden ebenfalls unwiderruflich gelöscht.' : 
            deleteIntent?.type === 'deal' ? 'Möchten Sie diesen Deal wirklich aus der Pipeline entfernen?' :
            'Möchten Sie diese Aufgabe wirklich unwiderruflich löschen?'
          }
          onConfirm={confirmDelete}
          onCancel={() => setDeleteIntent(null)}
        />
      </div>
    </div>
  );
};

export default App;
