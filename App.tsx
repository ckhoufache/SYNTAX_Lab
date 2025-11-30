
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Settings } from './components/Settings';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ViewState, Contact, Deal, UserProfile, Theme, Task } from './types';
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

  // State für Daten
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [deals, setDeals] = useState<Deal[]>(mockDeals);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

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
  };

  const handleUpdateContact = (updatedContact: Contact) => {
    setContacts(prev => prev.map(c => c.id === updatedContact.id ? updatedContact : c));
  };

  const onRequestDeleteContact = (contactId: string) => {
    setDeleteIntent({ type: 'contact', id: contactId });
  };

  // --- Handlers Deals ---
  const handleAddDeal = (newDeal: Deal) => {
    setDeals(prev => [newDeal, ...prev]);
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
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const onRequestDeleteTask = (taskId: string) => {
    setDeleteIntent({ type: 'task', id: taskId });
  };

  const confirmDelete = () => {
    if (!deleteIntent) return;

    if (deleteIntent.type === 'contact') {
      setContacts(prev => prev.filter(c => c.id !== deleteIntent.id));
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
          />
        );
      case 'settings':
        return (
          <Settings 
            userProfile={userProfile}
            onUpdateProfile={setUserProfile}
            currentTheme={theme}
            onUpdateTheme={setTheme}
          />
        );
      default:
        return <Dashboard tasks={tasks} deals={deals} contacts={contacts} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={onRequestDeleteTask} onNavigateToContacts={handleNavigateToContacts} />;
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
