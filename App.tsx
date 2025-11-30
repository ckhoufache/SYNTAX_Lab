
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Settings } from './components/Settings';
import { Tasks } from './components/Tasks';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ViewState, Contact, Deal, UserProfile, Theme, Task, DealStage, ProductPreset } from './types';
import { mockTasks, mockDeals, mockContacts } from './services/mockData';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // App Settings State
  const [theme, setTheme] = useState<Theme>('light');
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max@nex-crm.de',
    role: 'Admin',
    avatar: 'https://picsum.photos/id/64/100/100'
  });

  // Product Presets State
  const [productPresets, setProductPresets] = useState<ProductPreset[]>([
    { id: 'beta', title: 'Beta Version', value: 500 },
    { id: 'release', title: 'Release Version', value: 1500 }
  ]);

  // State für Daten
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  // State für Pipeline Filter (Global, damit Dashboard ihn steuern kann)
  const [pipelineVisibleStages, setPipelineVisibleStages] = useState<DealStage[]>(Object.values(DealStage));

  // State für Lösch-Dialog
  const [deleteIntent, setDeleteIntent] = useState<{ type: 'contact' | 'deal' | 'task', id: string } | null>(null);

  // State für Navigation mit Filter (z.B. vom Dashboard zu Kontakten)
  const [contactFilterMode, setContactFilterMode] = useState<'all' | 'recent'>('all');

  // Theme Effekt
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

  const confirmDelete = () => {
    if (!deleteIntent) return;

    if (deleteIntent.type === 'contact') {
      setContacts(prev => prev.filter(c => c.id !== deleteIntent.id));
      // Optional: Zugehörige Deals löschen? Vorerst nicht, um Datenverlust zu vermeiden.
    } else if (deleteIntent.type === 'deal') {
      setDeals(prev => prev.filter(d => d.id !== deleteIntent.id));
    } else if (deleteIntent.type === 'task') {
      setTasks(prev => prev.filter(t => t.id !== deleteIntent.id));
    }
    setDeleteIntent(null);
  };

  // Navigation Logic
  const handleNavigateToContacts = (filter: 'all' | 'recent') => {
    setContactFilterMode(filter);
    setCurrentView('contacts');
  };

  const handleNavigateToPipelineFilter = (stages: DealStage[]) => {
    setPipelineVisibleStages(stages);
    setCurrentView('pipeline');
  };
  
  const handleNavigateToTasks = () => {
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
          />
        );
      case 'tasks':
        return (
          <Tasks 
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={onRequestDeleteTask}
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
        onChangeView={setCurrentView} 
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
            deleteIntent?.type === 'contact' ? 'Möchten Sie diesen Kontakt wirklich entfernen? Diese Aktion kann nicht rückgängig gemacht werden.' : 
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
