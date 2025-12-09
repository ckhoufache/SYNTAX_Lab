import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { Download, ShieldAlert, Hexagon } from 'lucide-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Einfache Erkennung, ob wir in Electron laufen
// Da wir den User-Agent für Google Auth fälschen ("spoofing"), müssen wir robuster prüfen.
// Wir prüfen auf 'electron' im UA ODER ob 'window.require' existiert (Node Integration).
const isElectron = navigator.userAgent.toLowerCase().includes('electron') || (window as any).require;

const WebLandingPage = () => (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center">
                <div className="bg-indigo-600 p-6 rounded-3xl shadow-2xl shadow-indigo-500/20">
                    <Hexagon className="w-16 h-16 text-white" />
                </div>
            </div>
            
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">SyntaxLabCRM</h1>
                <p className="text-slate-400">Interne Unternehmenssoftware</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl text-left space-y-4">
                <div className="flex items-start gap-3">
                    <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-slate-200">Zugriff beschränkt</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Diese Anwendung ist nur als Desktop-Client verfügbar. 
                            Der Zugriff über den Webbrowser ist deaktiviert.
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-xs text-slate-600">
                Update Server Node: {window.location.hostname}
            </div>
        </div>
    </div>
);

const root = ReactDOM.createRoot(rootElement);

// Weiche: Nur rendern wenn Electron, sonst Landing Page
if (isElectron) {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
} else {
    root.render(
        <React.StrictMode>
            <WebLandingPage />
        </React.StrictMode>
    );
}