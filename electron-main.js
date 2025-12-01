import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguration
const INTERNAL_PORT = 3000;
const APP_URL = `http://localhost:${INTERNAL_PORT}`;

let mainWindow;
let server;

// HOT UPDATE PFAD: Hier speichern wir Updates
const userDataPath = app.getPath('userData');
const hotUpdatePath = path.join(userDataPath, 'hot_update');

function startLocalServer() {
  const serverApp = express();
  
  // 1. Prüfen, ob ein Hot-Update existiert
  if (fs.existsSync(hotUpdatePath) && fs.existsSync(path.join(hotUpdatePath, 'index.html'))) {
    console.log('Serving from Hot-Update folder:', hotUpdatePath);
    serverApp.use(express.static(hotUpdatePath));
    
    // Fallback Routing für SPA
    serverApp.get('*', (req, res) => {
      res.sendFile(path.join(hotUpdatePath, 'index.html'));
    });
  } else {
    // 2. Standard: Integrierte Dateien nutzen
    console.log('Serving from internal dist folder');
    serverApp.use(express.static(path.join(__dirname, 'dist')));
    
    serverApp.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server = serverApp.listen(INTERNAL_PORT, () => {
    console.log(`Interner App-Server läuft auf ${APP_URL}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "SyntaxLabCRM",
    icon: path.join(__dirname, 'dist/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false // Erlaubt Zugriff auf lokale Ressourcen für Updates
    },
    autoHideMenuBar: true,
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    startLocalServer();
    mainWindow.loadURL(APP_URL);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('accounts.google.com') || url.includes('googleusercontent.com')) {
        return { action: 'allow' };
    }
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

// --- IPC HANDLER FÜR UPDATES ---

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('install-update', async (event, files) => {
  try {
    // Ordner erstellen falls nicht existent
    if (!fs.existsSync(hotUpdatePath)) {
      fs.mkdirSync(hotUpdatePath, { recursive: true });
    }
    
    // Assets Ordner erstellen
    const assetsPath = path.join(hotUpdatePath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }

    // Dateien schreiben
    for (const file of files) {
      // Sicherheitscheck: Verhindert Pfad-Traversal
      const safeName = path.basename(file.name); 
      let targetPath;
      
      if (file.type === 'asset') {
          targetPath = path.join(assetsPath, safeName);
      } else {
          targetPath = path.join(hotUpdatePath, safeName);
      }

      // Base64 decoding für binäre Daten (falls nötig) oder direkter String write
      if (file.content) {
          fs.writeFileSync(targetPath, file.content, 'utf-8');
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Update failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('reset-update', async () => {
    try {
        if (fs.existsSync(hotUpdatePath)) {
            fs.rmSync(hotUpdatePath, { recursive: true, force: true });
        }
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit();
});

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
    if (server) {
        server.close();
    }
  }
});