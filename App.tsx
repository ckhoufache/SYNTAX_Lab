
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Settings } from './components/Settings';
import { Tasks } from './components/Tasks';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ViewState, Contact, Deal, UserProfile, Theme, Task, DealStage, ProductPreset, BackupData } from './types';
import { mockTasks, mockDeals, mockContacts } from './services/mockData';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // --- PERSISTENZ HELPERS ---
  const loadFromStorage = <T,>(key: string, fallback: T): T => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(`Fehler beim Laden von ${key}`, e);
        return fallback;
      }
    }
    return fallback;
  };

  const saveToStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // --- APP STATE ---
  
  // App Settings State
  const [theme, setTheme] = useState<Theme>(() => loadFromStorage('theme', 'light'));
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadFromStorage('userProfile', {
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@nex-crm.de',
    role: 'Admin',
    avatar: 'https://picsum.photos/id/64/100/100'
  }));

  // Product Presets State
  const [productPresets, setProductPresets] = useState<ProductPreset[]>(() => loadFromStorage('productPresets', [
    { id: 'beta', title: 'Beta Version', value: 500 },
    { id: 'release', title: 'Release Version', value: 1500 }
  ]));

  // State für Daten (Lade aus LocalStorage oder nutze MockData als Startwert)
  const [contacts, setContacts] = useState<Contact[]>(() => loadFromStorage('contacts', mockContacts));
  const [deals, setDeals] = useState<Deal[]>(() => loadFromStorage('deals', mockDeals));
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage('tasks', mockTasks));

  // --- EFFECT HOOKS FÜR AUTOMATISCHES SPEICHERN ---
  
  useEffect(() => saveToStorage('theme', theme), [theme]);
  useEffect(() => saveToStorage('userProfile', userProfile), [userProfile]);
  useEffect(() => saveToStorage('productPresets', productPresets), [productPresets]);
  useEffect(() => saveToStorage('contacts', contacts), [contacts]);
  useEffect(() => saveToStorage('deals', deals), [deals]);
  useEffect(() => saveToStorage('tasks', tasks), [tasks]);


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
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0f172a'; // slate-900
      document.body.style.color = '#f8fafc'; // slate-50
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f8fafc'; // slate-50
      document.body.style.color = '#1e293b'; // slate-800
    }
  }, [theme]);

  // Handle View Change via Sidebar (Resets search filters)
  const handleChangeView = (view: ViewState) => {
      setCurrentView(view);
      setFocusedContactId(null);
      setFocusedDealId(null);
      setFocusedTaskId(null);
      setContactFilterMode('all'); // Reset filter when coming from sidebar
  };

  // --- Handlers Contacts ---
  const handleAddContact = (newContact: Contact) => {
    setContacts(prev => [newContact, ...prev]);
    
    // Automatisch Ghost-Deal erstellen
    const ghostDeal: Deal = {
      id: Math.random().toString(36).substr(2, 9),
      title: 'Neuer Lead', // Platzhalter Titel
      value: 0,
      stage: DealStage.LEAD,
      contactId: newContact.id,
      dueDate: newContact.lastContact, // Datum des Hinzufügens
      stageEnteredDate: new Date().toISOString().split('T')[0], // Datum des Status
      isPlaceholder: true
    };
    setDeals(prev => [ghostDeal, ...prev]);
  };

  const handleUpdateContact = (updatedContact: Contact) => {
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
  };

  const onRequestDeleteContact = (contactId: string) => {
    setDeleteIntent({ type: 'contact', id: contactId });
  };

  // --- Handlers Deals ---
  const handleAddDeal = (newDeal: Deal) => {
    // Wenn manuell erstellt, auch das stageEnteredDate setzen
    const dealWithDate = {
        ...newDeal,
        stageEnteredDate: new Date().toISOString().split('T')[0]
    };
    setDeals(prev => [dealWithDate, ...prev]);
  };

  const handleUpdateDeal = (updatedDeal: Deal) => {
    setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
  };

  const onRequestDeleteDeal = (dealId: string) => {
    setDeleteIntent({ type: 'deal', id: dealId });
  };

  // --- Handlers Tasks ---
  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    // 1. Task Update durchführen
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

    // 2. AUTOMATISIERUNG: Wenn Task erledigt wird
    if (updatedTask.isCompleted && updatedTask.relatedEntityId) {
        // Prüfen, ob es einen Deal zu diesem Kontakt gibt, der auf "Kontaktiert" steht
        const relatedDeal = deals.find(d => d.contactId === updatedTask.relatedEntityId);
        
        if (relatedDeal && relatedDeal.stage === DealStage.CONTACTED) {
            // Deal auf Follow-up verschieben
            const updatedDeal: Deal = {
                ...relatedDeal,
                stage: DealStage.FOLLOW_UP,
                stageEnteredDate: new Date().toISOString().split('T')[0]
            };
            // Deal Update triggern
            setDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d));
        }
    }
  };

  const onRequestDeleteTask = (taskId: string) => {
    setDeleteIntent({ type: 'task', id: taskId });
  };

  // Spezielle Funktion für automatisches Löschen ohne Bestätigungsdialog (System-Aktion)
  const handleAutoDeleteTask = (taskId: string) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // --- BACKUP HANDLER ---
  const handleImportData = (data: BackupData) => {
    try {
      if (data.contacts) setContacts(data.contacts);
      if (data.deals) setDeals(data.deals);
      if (data.tasks) setTasks(data.tasks);
      if (data.userProfile) setUserProfile(data.userProfile);
      if (data.productPresets) setProductPresets(data.productPresets);
      if (data.theme) setTheme(data.theme);
      
      // Force persist immediately
      saveToStorage('contacts', data.contacts || []);
      saveToStorage('deals', data.deals || []);
      saveToStorage('tasks', data.tasks || []);
      saveToStorage('userProfile', data.userProfile);
      saveToStorage('productPresets', data.productPresets || []);
      saveToStorage('theme', data.theme || 'light');

      alert('Daten wurden erfolgreich wiederhergestellt!');
    } catch (e) {
      console.error("Import Fehler", e);
      alert('Fehler beim Importieren der Daten. Das Format scheint ungültig zu sein.');
    }
  };

  const confirmDelete = () => {
    if (!deleteIntent) return;

    if (deleteIntent.type === 'contact') {
      const contactIdToDelete = deleteIntent.id;
      
      // 1. Kontakt löschen
      setContacts(prev => prev.filter(c => c.id !== contactIdToDelete));
      
      // 2. Zugehörige Deals löschen (Kaskadierend)
      setDeals(prev => prev.filter(d => d.contactId !== contactIdToDelete));
      
      // 3. Zugehörige Aufgaben löschen (Kaskadierend)
      setTasks(prev => prev.filter(t => t.relatedEntityId !== contactIdToDelete));

    } else if (deleteIntent.type === 'deal') {
      setDeals(prev => prev.filter(d => d.id !== deleteIntent.id));
    } else if (deleteIntent.type === 'task') {
      setTasks(prev => prev.filter(t => t.id !== deleteIntent.id));
    }
    setDeleteIntent(null);
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
            onUpdateProfile={setUserProfile}
            currentTheme={theme}
            onUpdateTheme={setTheme}
            productPresets={productPresets}
            onUpdatePresets={setProductPresets}
            // Props for Data Management
            contacts={contacts}
            deals={deals}
            tasks={tasks}
            onImportData={handleImportData}
          />
        );
      default:
        return <Dashboard tasks={tasks} deals={deals} contacts={contacts} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={onRequestDeleteTask} onNavigateToContacts={handleNavigateToContacts} onNavigateToPipeline={handleNavigateToPipelineFilter} onNavigateToTasks={handleNavigateToTasks} />;
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
