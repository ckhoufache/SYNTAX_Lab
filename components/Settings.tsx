import React from 'react';
import { Save } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="flex-1 bg-slate-50 h-screen overflow-y-auto">
      <header className="bg-white border-b border-slate-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-800">Einstellungen</h1>
        <p className="text-slate-500 text-sm mt-1">Konfigurieren Sie Ihr CRM und API Verbindungen.</p>
      </header>

      <main className="max-w-3xl mx-auto p-8 space-y-8">
        {/* Profile Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Profil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Vorname</label>
              <input type="text" defaultValue="Max" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nachname</label>
              <input type="text" defaultValue="Mustermann" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">E-Mail</label>
              <input type="email" defaultValue="max@nex-crm.de" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" />
            </div>
          </div>
        </div>

        {/* API Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Integrationen</h2>
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Google Gemini API Key</label>
                <div className="flex gap-2">
                    <input 
                        type="password" 
                        placeholder="sk-..." 
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-slate-50" 
                        disabled 
                        value={process.env.API_KEY ? '••••••••••••••••' : ''}
                    />
                    {process.env.API_KEY ? (
                        <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200 flex items-center">Verbunden</span>
                    ) : (
                        <span className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200 flex items-center">Nicht konfiguriert</span>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-2">Der API Key wird über Umgebungsvariablen geladen und ermöglicht die "Smart Insight" Funktionen.</p>
             </div>
          </div>
        </div>

         {/* Appearance */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Erscheinungsbild</h2>
          <div className="flex items-center gap-4">
            <div className="border-2 border-indigo-600 rounded-lg p-1 cursor-pointer">
                <div className="w-20 h-12 bg-slate-100 rounded mb-1"></div>
                <span className="text-xs font-medium text-indigo-700 block text-center">Hell</span>
            </div>
            <div className="border border-slate-200 rounded-lg p-1 cursor-pointer hover:border-slate-300 opacity-60">
                <div className="w-20 h-12 bg-slate-800 rounded mb-1"></div>
                <span className="text-xs font-medium text-slate-600 block text-center">Dunkel</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
            <button className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-200/50">
                <Save className="w-4 h-4" />
                Speichern
            </button>
        </div>
      </main>
    </div>
  );
};