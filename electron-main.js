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
  
  // LOGIK FÜR HOT-UPDATES:
  // Wir prüfen, ob eine index.html im Update-Ordner existiert.
  // Wenn ja, bedienen wir Dateien ZUERST von dort.
  const updateIndex = path.join(hotUpdatePath, 'index.html');
  const hasUpdate = fs.existsSync(updateIndex);

  if (hasUpdate) {
      console.log('Serving from Hot Update folder:', hotUpdatePath);
      // Statische Dateien aus dem Update-Ordner priorisieren
      serverApp.use(express.static(hotUpdatePath));
  }

  // Fallback: Statische Dateien aus dem internen 'dist' Ordner
  // (Wichtig für Assets, die sich nicht geändert haben oder wenn kein Update da ist)
  console.log('Serving fallback from internal dist folder');
  serverApp.use(express.static(path.join(__dirname, 'dist')));
  
  serverApp.get('*', (req, res) => {
    if (hasUpdate) {
        res.sendFile(updateIndex);
    } else {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });

  server = serverApp.listen(INTERNAL_PORT, () => {
    console.log(`Interner App-Server läuft auf ${APP_URL} (Update aktiv: ${hasUpdate})`);
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

// --- NEU: PDF GENERATOR ---
ipcMain.handle('generate-pdf', async (event, htmlContent) => {
    let pdfWindow = new BrowserWindow({ show: false, width: 800, height: 1200 });
    try {
        // Load HTML content
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        
        // Generate PDF
        const pdfData = await pdfWindow.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { top: 0, bottom: 0, left: 0, right: 0 } // CSS handles margins
        });
        
        pdfWindow.close();
        pdfWindow = null;
        
        return pdfData; // Returns Buffer (Uint8Array)
    } catch (error) {
        if (pdfWindow) pdfWindow.close();
        console.error('PDF Generation failed:', error);
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