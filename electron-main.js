import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import path from 'path';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguration
const INTERNAL_PORT = 3000;
const APP_URL = `http://localhost:${INTERNAL_PORT}`;

const APP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SyntaxLabCRM-Desktop';

let mainWindow;
let server;

// NEUE UPDATE STRUKTUR:
// userData/updates/v1.0.1/
// userData/updates/v1.0.2/
// userData/active_version.json -> { "current": "v1.0.2" }
const userDataPath = app.getPath('userData');
const updatesRootDir = path.join(userDataPath, 'updates');
const activeVersionFile = path.join(userDataPath, 'active_version.json');

// Legacy Pfade zum Bereinigen
const legacyHotUpdatePath = path.join(userDataPath, 'hot_update');
const legacyTempPath = path.join(userDataPath, 'hot_update_temp');

/**
 * Hilfsfunktion: Safe Delete (wirft keinen Fehler, wenn File gelockt ist - ignoriert es einfach)
 */
function safeDeleteFolder(folderPath) {
    try {
        if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    } catch (e) {
        console.warn(`Could not delete folder ${folderPath} (might be locked). Ignoring.`, e.message);
    }
}

/**
 * Ermittelt den Pfad zur AKTUELLEN Version (oder null für Fallback)
 */
function getActiveUpdatePath() {
    try {
        // 1. Legacy Cleanup (einmalig)
        safeDeleteFolder(legacyHotUpdatePath);
        safeDeleteFolder(legacyTempPath);

        if (fs.existsSync(activeVersionFile)) {
            const data = JSON.parse(fs.readFileSync(activeVersionFile, 'utf-8'));
            if (data.current) {
                const versionDir = path.join(updatesRootDir, data.current);
                // Sicherheitscheck: Existiert index.html dort?
                if (fs.existsSync(path.join(versionDir, 'index.html'))) {
                    return { path: versionDir, version: data.current };
                }
            }
        }
    } catch (e) {
        console.error("Error determining active update path:", e);
    }
    return null;
}

/**
 * Bereinigt alte Versionen, behält nur die aktive und evtl. die neuste
 */
function cleanupOldVersions(activeVersion) {
    try {
        if (!fs.existsSync(updatesRootDir)) return;
        
        const versions = fs.readdirSync(updatesRootDir);
        versions.forEach(v => {
            if (v !== activeVersion) {
                // Lösche alles, was nicht die aktive Version ist
                // (Man könnte hier Logik bauen "keep last 2", aber keep simple for now)
                const dirToRemove = path.join(updatesRootDir, v);
                console.log(`Cleaning up old version: ${v}`);
                safeDeleteFolder(dirToRemove);
            }
        });
    } catch (e) {
        console.error("Cleanup error (non-critical):", e);
    }
}

function startLocalServer() {
  const serverApp = express();
  const activeUpdate = getActiveUpdatePath();

  if (activeUpdate) {
      console.log(`Serving from UPDATE folder: ${activeUpdate.version}`);
      serverApp.use(express.static(activeUpdate.path));
      
      // Cleanup im Hintergrund (nicht blockierend)
      setTimeout(() => cleanupOldVersions(activeUpdate.version), 5000);
  } else {
      console.log('Serving from INTERNAL bundle (dist)');
      serverApp.use(express.static(path.join(__dirname, 'dist')));
  }
  
  serverApp.get('*', (req, res) => {
      const currentActive = getActiveUpdatePath();
      if (currentActive) {
          res.sendFile(path.join(currentActive.path, 'index.html'));
      } else {
          res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      }
  });

  server = serverApp.listen(INTERNAL_PORT, () => {
    console.log(`Internal server running at ${APP_URL}`);
  });
}

async function createWindow() {
  await session.defaultSession.clearCache();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: `SyntaxLabCRM v${app.getVersion()}`,
    icon: path.join(__dirname, 'dist/favicon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true 
    },
    autoHideMenuBar: false, 
  });

  mainWindow.webContents.setUserAgent(APP_USER_AGENT);

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    startLocalServer();
    mainWindow.loadURL(APP_URL);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://accounts.google.com') || url.includes('google.com/signin')) {
      return { 
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          width: 600,
          height: 700,
          center: true,
          webPreferences: { nodeIntegration: false, contextIsolation: true }
        }
      };
    }
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-create-window', (childWindow) => {
      childWindow.webContents.setUserAgent(APP_USER_AGENT);
      childWindow.setMenuBarVisibility(false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC HANDLERS
ipcMain.handle('get-app-version', () => {
    try {
        const active = getActiveUpdatePath();
        if (active) {
            // Versuche version.json im Ordner zu lesen für Details, oder nimm Ordnernamen
            const vFile = path.join(active.path, 'version.json');
            if (fs.existsSync(vFile)) {
                const data = JSON.parse(fs.readFileSync(vFile, 'utf-8'));
                return `${data.version} (Hot)`;
            }
            return `${active.version} (Hot)`;
        }
    } catch(e) {}
    return app.getVersion();
});

/**
 * INSTALL UPDATE HANDLER (ROBUST VERSION)
 * Payload: { manifest: [...], version: "1.0.5" }
 */
ipcMain.handle('install-update', async (event, payload) => {
  const { manifest, version } = payload;
  const targetDir = path.join(updatesRootDir, version);

  try {
    console.log(`Starting update installation for version ${version}...`);

    // 1. Ordner erstellen (Wenn er existiert, erst löschen um Clean State zu haben)
    if (fs.existsSync(targetDir)) {
        safeDeleteFolder(targetDir); 
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // 2. Download files into NEW folder (No locking issues possible here)
    for (const item of manifest) {
        const targetPath = path.join(targetDir, item.relativePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        const downloadUrl = `${item.url}?cb=${Date.now()}`;
        const response = await fetch(downloadUrl, { headers: { 'User-Agent': APP_USER_AGENT } });
        
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${item.relativePath}`);
        
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    }

    // 3. Wenn alles erfolgreich heruntergeladen wurde, Pointer aktualisieren
    // Das ist eine atomare Operation (File Write).
    const newConfig = { current: version, installedAt: new Date().toISOString() };
    fs.writeFileSync(activeVersionFile, JSON.stringify(newConfig, null, 2));
    
    console.log(`Pointer updated to version ${version}. Ready for restart.`);
    return { success: true };

  } catch (error) {
    console.error('Download/Install failed:', error);
    // Cleanup failed partial folder
    safeDeleteFolder(targetDir);
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
            pageSize: 'A4'
        });
        pdfWindow.close();
        pdfWindow = null;
        return pdfData; 
    } catch (error) {
        if (pdfWindow) pdfWindow.close();
        throw error;
    }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    if (server) server.close();
  }
});