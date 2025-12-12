
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

// NEUE UPDATE STRUKTUR
const userDataPath = app.getPath('userData');
const updatesRootDir = path.join(userDataPath, 'updates');
const activeVersionFile = path.join(userDataPath, 'active_version.json');
const logFile = path.join(userDataPath, 'update_log.txt');

// Logging Funktion für Debugging
function log(message) {
    const timestamp = new Date().toISOString();
    const msg = `[${timestamp}] ${message}\n`;
    console.log(msg.trim());
    try {
        fs.appendFileSync(logFile, msg);
    } catch (e) {
        console.error("Logging failed:", e);
    }
}

function safeDeleteFolder(folderPath) {
    try {
        if (fs.existsSync(folderPath)) {
            fs.rmSync(folderPath, { recursive: true, force: true });
        }
    } catch (e) {
        log(`Warnung: Konnte Ordner ${folderPath} nicht löschen: ${e.message}`);
    }
}

// Simple Semver Compare: Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
function compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

function getActiveUpdatePath() {
    try {
        if (fs.existsSync(activeVersionFile)) {
            const data = JSON.parse(fs.readFileSync(activeVersionFile, 'utf-8'));
            
            // SECURITY CHECK: 
            // Wenn die native App Version neuer ist als das heruntergeladene Update,
            // müssen wir das alte Update verwerfen, damit der neue Code (aus der .exe) greift.
            const nativeVersion = app.getVersion();
            const updateVersion = data.current;

            // Wenn Native >= Update (oder Update fehlerhaft), lösche Pointer
            if (compareVersions(nativeVersion, updateVersion) >= 0) {
                log(`Native Version (${nativeVersion}) ist neuer oder gleich alt wie Hot-Update (${updateVersion}). Lösche veraltetes Update.`);
                try {
                    fs.unlinkSync(activeVersionFile);
                    // Optional: Aufräumen des Ordners
                    const versionDir = path.join(updatesRootDir, updateVersion);
                    safeDeleteFolder(versionDir);
                } catch(err) {
                    log("Fehler beim Löschen des veralteten Pointers: " + err.message);
                }
                return null;
            }

            if (data.current) {
                const versionDir = path.join(updatesRootDir, data.current);
                if (fs.existsSync(path.join(versionDir, 'index.html'))) {
                    return { path: versionDir, version: data.current };
                } else {
                    log(`Fehler: Aktive Version ${data.current} hat keine index.html. Fallback auf Bundle.`);
                }
            }
        }
    } catch (e) {
        log(`Fehler beim Lesen der aktiven Version: ${e.message}`);
    }
    return null;
}

function cleanupOldVersions(activeVersion) {
    try {
        if (!fs.existsSync(updatesRootDir)) return;
        const versions = fs.readdirSync(updatesRootDir);
        versions.forEach(v => {
            if (v !== activeVersion) {
                const dirToRemove = path.join(updatesRootDir, v);
                log(`Bereinige alte Version: ${v}`);
                safeDeleteFolder(dirToRemove);
            }
        });
    } catch (e) {
        log(`Cleanup Fehler: ${e.message}`);
    }
}

function startLocalServer() {
  const serverApp = express();
  const activeUpdate = getActiveUpdatePath();

  if (activeUpdate) {
      log(`Server startet mit UPDATE Version: ${activeUpdate.version}`);
      serverApp.use(express.static(activeUpdate.path));
      setTimeout(() => cleanupOldVersions(activeUpdate.version), 10000);
  } else {
      log(`Server startet mit BUNDLED Version (dist) - Native v${app.getVersion()}`);
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
    log(`Internal server running at ${APP_URL}`);
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC HANDLERS
ipcMain.handle('get-app-version', () => {
    try {
        const active = getActiveUpdatePath();
        if (active) {
            return `${active.version} (Hot)`;
        }
    } catch(e) {}
    return app.getVersion();
});

ipcMain.handle('install-update', async (event, payload) => {
  const { manifest, version } = payload;
  const targetDir = path.join(updatesRootDir, version);
  log(`--- UPDATE START: v${version} ---`);

  try {
    // 1. Ordner vorbereiten
    if (fs.existsSync(targetDir)) {
        log(`Zielordner existiert bereits, lösche: ${targetDir}`);
        safeDeleteFolder(targetDir); 
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // 2. Download
    log(`Starte Download von ${manifest.length} Dateien...`);
    for (const item of manifest) {
        // Normalize path separators to OS specific
        const normalizedRelativePath = item.relativePath.split('/').join(path.sep);
        const targetPath = path.join(targetDir, normalizedRelativePath);
        
        // Ensure dir exists
        const dirName = path.dirname(targetPath);
        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }

        log(`Lade: ${item.relativePath}`);
        
        const response = await fetch(item.url, { 
            headers: { 'User-Agent': APP_USER_AGENT },
            cache: 'no-store'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} beim Laden von ${item.url}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
    }

    // 3. Verifikation
    if (!fs.existsSync(path.join(targetDir, 'index.html'))) {
        throw new Error("Update fehlerhaft: index.html fehlt im Zielordner.");
    }

    // 4. Pointer aktualisieren
    const newConfig = { current: version, installedAt: new Date().toISOString() };
    fs.writeFileSync(activeVersionFile, JSON.stringify(newConfig, null, 2));
    
    log(`Update erfolgreich installiert. Pointer gesetzt auf ${version}`);
    return { success: true };

  } catch (error) {
    log(`CRITICAL UPDATE ERROR: ${error.message}`);
    log(error.stack);
    // Cleanup
    safeDeleteFolder(targetDir);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('restart-app', () => {
  log("Neustart angefordert.");
  app.relaunch();
  app.exit(0);
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
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    if (server) server.close();
  }
});
