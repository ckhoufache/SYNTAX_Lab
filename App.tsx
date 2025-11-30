import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Contacts } from './components/Contacts';
import { Pipeline } from './components/Pipeline';
import { Settings } from './components/Settings';
import { ViewState } from './types';
import { mockTasks, mockDeals, mockContacts } from './services/mockData';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard tasks={mockTasks} deals={mockDeals} contacts={mockContacts} />;
      case 'contacts':
        return <Contacts contacts={mockContacts} />;
      case 'pipeline':
        return <Pipeline deals={mockDeals} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard tasks={mockTasks} deals={mockDeals} contacts={mockContacts} />;
    }
  };

  return (
    <div className="flex w-full h-screen bg-slate-50">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {renderView()}
      </div>
    </div>
  );
};

export default App;