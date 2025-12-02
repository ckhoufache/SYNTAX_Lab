
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
  
  // LOGIK FÜR HOT-UPDATES
  const updateIndex = path.join(hotUpdatePath, 'index.html');
  const hasUpdate = fs.existsSync(updateIndex);

  if (hasUpdate) {
      console.log('Serving from Hot Update folder:', hotUpdatePath);
      serverApp.use(express.static(hotUpdatePath));
  }

  // Fallback
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
    console.log(`--------------------------------------------------`);
    console.log(`Interner App-Server läuft auf ${APP_URL}`);
    console.log(`WICHTIG: Fügen Sie '${APP_URL}' zu den "Authorized JavaScript origins" in der Google Cloud Console hinzu.`);
    console.log(`--------------------------------------------------`);
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
      webSecurity: false 
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
    // Liste der erlaubten Domains für Google OAuth
    const allowedDomains = [
        'accounts.google.com', 
        'googleusercontent.com', 
        'oauth2.googleapis.com', 
        'mail.google.com',
        'www.googleapis.com'
    ];
    
    // Prüfen ob die URL zu Google gehört (für Login Popups)
    if (allowedDomains.some(domain => url.includes(domain))) {
        return { action: 'allow' };
    }
    
    // Externe Links im Standard-Browser öffnen
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
