import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguration
const INTERNAL_PORT = 3000;
const APP_URL = `http://localhost:${INTERNAL_PORT}`;

let mainWindow;
let server;

function startLocalServer() {
  const serverApp = express();
  // Bedient die statischen Dateien aus dem dist-Ordner
  serverApp.use(express.static(path.join(__dirname, 'dist')));
  
  // Fallback für SPA (Single Page Application) Routing
  serverApp.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });

  server = serverApp.listen(INTERNAL_PORT, () => {
    console.log(`Interner App-Server läuft auf ${APP_URL}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "SyntaxLabCRM",
    icon: path.join(__dirname, 'dist/favicon.ico'), // Falls vorhanden
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Vereinfacht für dieses Setup, in Produktion evtl. anpassen
    },
    autoHideMenuBar: true, // Menüleiste ausblenden für App-Feeling
  });

  // Im Dev-Modus (wenn Vite läuft) nutzen wir Vite, sonst den internen Server
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Produktion: Starte Server und lade localhost
    // Dies ist wichtig für Google OAuth (Origin Mismatch Prevention)
    startLocalServer();
    mainWindow.loadURL(APP_URL);
  }

  // WICHTIG: Fenster-Management für OAuth Popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 1. Google Login Popups MÜSSEN in der App bleiben, damit der Token zurückkommt
    if (url.includes('accounts.google.com') || url.includes('googleusercontent.com')) {
        return { action: 'allow' };
    }

    // 2. Alle anderen externen Links (LinkedIn, Firmenwebseite etc.) im Standard-Browser öffnen
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    // Server stoppen
    if (server) {
        server.close();
    }
  }
});