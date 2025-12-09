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

// User Agent Spoofing für Google Auth (täuscht echten Chrome vor)
const GOOGLE_AUTH_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let mainWindow;
let server;

// HOT UPDATE PFAD
const userDataPath = app.getPath('userData');
const hotUpdatePath = path.join(userDataPath, 'hot_update');

function startLocalServer() {
  const serverApp = express();

  // FIX: Wir löschen den Ordner NICHT mehr.
  // Stattdessen prüfen wir, ob ein Update existiert, und bedienen Dateien bevorzugt von dort.
  
  if (fs.existsSync(hotUpdatePath)) {
      console.log('Serving updates from hot_update folder');
      // Express schaut zuerst hier nach Dateien (z.B. index.html, assets/...)
      serverApp.use(express.static(hotUpdatePath));
  }

  // Fallback: Wenn Datei nicht im Update-Ordner ist (oder kein Update existiert),
  // nimm die Datei aus der eingebauten App (dist Ordner).
  console.log('Serving fallback from internal dist folder');
  serverApp.use(express.static(path.join(__dirname, 'dist')));
  
  serverApp.get('*', (req, res) => {
      // Auch beim SPA-Fallback: Zuerst im Update-Ordner schauen
      if (fs.existsSync(path.join(hotUpdatePath, 'index.html'))) {
          res.sendFile(path.join(hotUpdatePath, 'index.html'));
      } else {
          res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      }
  });

  server = serverApp.listen(INTERNAL_PORT, () => {
    console.log(`Internal server running at ${APP_URL}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "SyntaxLabCRM v1.0.6",
    icon: path.join(__dirname, 'dist/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Wichtig für lokale CORS Probleme beim Laden von Ressourcen
      allowRunningInsecureContent: true 
    },
    autoHideMenuBar: false, 
  });

  mainWindow.webContents.setUserAgent(GOOGLE_AUTH_USER_AGENT);

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    startLocalServer();
    mainWindow.loadURL(APP_URL);
  }

  // Fenster-Handler für Popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 1. Google Auth Popups: MÜSSEN in der App bleiben (allow)
    // Damit das 'window.opener' Event feuern kann.
    if (url.startsWith('https://accounts.google.com') || url.includes('google.com/signin')) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          width: 600,
          height: 700,
          center: true,
          // Wichtig: Das Popup braucht ähnliche Rechte, aber wir wollen sicherstellen,
          // dass der User-Agent auch hier greift.
          webPreferences: {
             nodeIntegration: false,
             contextIsolation: true,
             enableRemoteModule: false
          }
        }
      };
    }
    
    // 2. Alle anderen externen Links (z.B. LinkedIn Profile): Im Standard-Browser öffnen
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    
    return { action: 'allow' };
  });

  // Event Listener für neu erstellte Fenster (z.B. das Google Popup)
  // Wir müssen sicherstellen, dass auch das Popup den gefälschten User-Agent nutzt,
  // sonst blockiert Google den Zugriff ("Browser nicht sicher").
  mainWindow.webContents.on('did-create-window', (childWindow, details) => {
      childWindow.webContents.setUserAgent(GOOGLE_AUTH_USER_AGENT);
      // Optional: Menüleiste auch im Popup ausblenden
      childWindow.setMenuBarVisibility(false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-dev-tools', () => {
    if (mainWindow) {
        mainWindow.webContents.openDevTools();
    }
});

// Update Handler
ipcMain.handle('install-update', async (event, files) => {
  try {
    if (!fs.existsSync(hotUpdatePath)) {
      fs.mkdirSync(hotUpdatePath, { recursive: true });
    }
    
    const assetsPath = path.join(hotUpdatePath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }

    for (const file of files) {
      const safeName = path.basename(file.name); 
      let targetPath;
      
      if (file.type === 'asset') {
          targetPath = path.join(assetsPath, safeName);
      } else {
          targetPath = path.join(hotUpdatePath, safeName);
      }

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

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit();
});

ipcMain.handle('generate-pdf', async (event, htmlContent) => {
    let pdfWindow = new BrowserWindow({ show: false, width: 800, height: 1200 });
    try {
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        
        const pdfData = await pdfWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { top: 0, bottom: 0, left: 0, right: 0 }
        });
        
        pdfWindow.close();
        pdfWindow = null;
        
        return pdfData; 
    } catch (error) {
        if (pdfWindow) pdfWindow.close();
        throw error;
    }
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