
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { Hexagon, ShieldAlert } from 'lucide-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Wir rendern die App direkt, da die Plattform-Integration (window.aistudio) 
// oft asynchron injiziert wird und eine zu strenge Prüfung den Start blockieren kann.
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
