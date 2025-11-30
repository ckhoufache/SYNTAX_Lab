import React, { useState, useEffect } from 'react';
import { Save, Check, Eye, EyeOff } from 'lucide-react';
import { UserProfile, Theme } from '../types';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  currentTheme: Theme;
  onUpdateTheme: (theme: Theme) => void;
}

export const Settings: React.FC<SettingsProps> = ({ 
  userProfile, 
  onUpdateProfile, 
  currentTheme, 
  onUpdateTheme 
}) => {
  const isDark = currentTheme === 'dark';
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  const [showSaved, setShowSaved] = useState(false);

  // Sync Profile Data
  useEffect(() => {
    setFormData(userProfile);
  }, [userProfile]);

  // Load API Key from LocalStorage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
        setApiKey(storedKey);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const handleSave = () => {
    // Profil speichern
    onUpdateProfile(formData);
    
    // API Key speichern (oder entfernen wenn leer)
    if (apiKey.trim()) {
        localStorage.setItem('gemini_api_key', apiKey.trim());
    } else {
        localStorage.removeItem('gemini_api_key');
    }

    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const hasActiveKey = apiKey.length > 0 || !!process.env.API_KEY;

  const inputClass = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow ${
      isDark 
      ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' 
      : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;
  const sectionClass = `rounded-xl shadow-sm border p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`;
  const headerBorderClass = isDark ? 'border-slate-800' : 'border-slate-100';

  return (
    <div className={`flex-1 h-screen overflow-y-auto ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <header className={`px-8 py-6 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Einstellungen</h1>
        <p className="text-slate-500 text-sm mt-1">Konfigurieren Sie Ihr CRM und API Verbindungen.</p>
      </header>

      <main className="max-w-3xl mx-auto p-8 space-y-8 pb-20">
        {/* Profile Section */}
        <div className={sectionClass}>
          <h2 className={`text-lg font-bold mb-4 pb-2 border-b ${headerBorderClass} ${isDark ? 'text-white' : 'text-slate-800'}`}>Profil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClass}>Vorname</label>
              <input 
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                type="text" 
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Nachname</label>
              <input 
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                type="text" 
                className={inputClass} 
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>E-Mail</label>
              <input 
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email" 
                className={inputClass} 
              />
            </div>
          </div>
        </div>

        {/* API Section */}
        <div className={sectionClass}>
          <h2 className={`text-lg font-bold mb-4 pb-2 border-b ${headerBorderClass} ${isDark ? 'text-white' : 'text-slate-800'}`}>Integrationen</h2>
          <div className="space-y-4">
             <div>
                <label className={labelClass}>Google Gemini API Key</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            type={showApiKey ? "text" : "password"}
                            placeholder={process.env.API_KEY ? "Wird aus Umgebungsvariable geladen (überschreiben möglich)" : "sk-..."}
                            className={`${inputClass} pr-10`}
                            value={apiKey}
                            onChange={handleApiKeyChange}
                        />
                        <button 
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {hasActiveKey ? (
                        <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium border border-green-200 flex items-center shrink-0">
                            <Check className="w-4 h-4 mr-1" />
                            Verbunden
                        </span>
                    ) : (
                        <span className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium border border-slate-200 flex items-center shrink-0">Nicht konfiguriert</span>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                   Geben Sie hier Ihren eigenen API Key ein, um die KI-Funktionen zu nutzen. Der Schlüssel wird lokal in Ihrer App gespeichert.
                </p>
             </div>
          </div>
        </div>

         {/* Appearance */}
         <div className={sectionClass}>
          <h2 className={`text-lg font-bold mb-4 pb-2 border-b ${headerBorderClass} ${isDark ? 'text-white' : 'text-slate-800'}`}>Erscheinungsbild</h2>
          <div className="flex items-center gap-4">
            
            {/* Light Option */}
            <div 
                onClick={() => onUpdateTheme('light')}
                className={`border-2 rounded-lg p-1 cursor-pointer transition-all ${
                    currentTheme === 'light' 
                    ? 'border-indigo-600 ring-2 ring-indigo-100' 
                    : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                }`}
            >
                <div className="w-24 h-16 bg-slate-100 rounded mb-2 border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-full bg-white border-r border-slate-200"></div>
                    <div className="absolute top-2 left-10 w-10 h-2 bg-white rounded"></div>
                    <div className="absolute top-6 left-10 w-12 h-6 bg-white rounded"></div>
                </div>
                <span className={`text-xs font-medium block text-center ${currentTheme === 'light' ? 'text-indigo-600' : 'text-slate-500'}`}>Hell</span>
            </div>

            {/* Dark Option */}
            <div 
                onClick={() => onUpdateTheme('dark')}
                className={`border-2 rounded-lg p-1 cursor-pointer transition-all ${
                    currentTheme === 'dark' 
                    ? 'border-indigo-500 ring-2 ring-indigo-900' 
                    : isDark ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                }`}
            >
                <div className="w-24 h-16 bg-slate-800 rounded mb-2 border border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-full bg-slate-900 border-r border-slate-700"></div>
                    <div className="absolute top-2 left-10 w-10 h-2 bg-slate-700 rounded"></div>
                    <div className="absolute top-6 left-10 w-12 h-6 bg-slate-700 rounded"></div>
                </div>
                <span className={`text-xs font-medium block text-center ${currentTheme === 'dark' ? 'text-indigo-400' : 'text-slate-500'}`}>Dunkel</span>
            </div>

          </div>
        </div>

        <div className="flex justify-end pt-4 items-center gap-4">
            {showSaved && (
                <span className="text-green-600 flex items-center gap-1.5 text-sm font-medium animate-in fade-in slide-in-from-right-4">
                    <Check className="w-4 h-4" />
                    Gespeichert!
                </span>
            )}
            <button 
                onClick={handleSave}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200/50"
            >
                <Save className="w-4 h-4" />
                Speichern
            </button>
        </div>
      </main>
    </div>
  );
};