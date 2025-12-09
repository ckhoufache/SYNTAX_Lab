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

// User Agent Spoofing für Google Auth (täuscht echten Chrome vor)
const GOOGLE_AUTH_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let mainWindow;
let server;

// HOT UPDATE PFAD
const userDataPath = app.getPath('userData');
const hotUpdatePath = path.join(userDataPath, 'hot_update');
const hotUpdateTempPath = path.join(userDataPath, 'hot_update_temp'); // Temp folder for atomic writes

/**
 * PHASE 1: BOOTLOADER LOGIC
 * Diese Funktion läuft VOR dem Server-Start und VOR dem Fenster-Öffnen.
 * Sie prüft, ob ein fertiges Update im Temp-Ordner liegt und tauscht es aus.
 * Da hier noch nichts geladen ist, gibt es keine File-Locks (Windows).
 */
function applyPendingUpdates() {
    try {
        if (fs.existsSync(hotUpdateTempPath)) {
            console.log("Found pending update in hot_update_temp. Applying...");

            // 1. Altes Update löschen (falls vorhanden)
            if (fs.existsSync(hotUpdatePath)) {
                try {
                    fs.rmSync(hotUpdatePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
                } catch (e) {
                    console.error("Could not delete old hot_update folder. Aborting update apply.", e);
                    // Wenn wir das alte nicht löschen können, behalten wir es und löschen das Temp beim nächsten Cleanup
                    return; 
                }
            }

            // 2. Temp umbenennen zu Live
            try {
                fs.renameSync(hotUpdateTempPath, hotUpdatePath);
                console.log("Update applied successfully!");
            } catch (e) {
                console.error("Failed to move temp folder to live.", e);
            }
        }
    } catch (e) {
        console.error("Critical error in bootloader update logic:", e);
    }
}

/**
 * Vergleicht zwei Versionstrings (z.B. "1.2.0" vs "1.2.1").
 * Gibt 1 zurück wenn v1 > v2, -1 wenn v1 < v2, 0 wenn gleich.
 */
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

/**
 * Bereinigt den Hot-Update Ordner, falls die EXE neuer ist.
 * Strategie:
 * - EXE > Update: Update ist veraltet -> Löschen.
 * - EXE == Update: Update ist ein Hotfix oder Re-Download -> Behalten.
 * - EXE < Update: Update ist neu -> Behalten.
 */
function cleanupStaleUpdates() {
    try {
        // Temp Folder immer bereinigen, falls Reste da sind (z.B. fehlgeschlagener Download)
        // Aber NICHT, wenn wir gerade applyPendingUpdates ausführen wollten (das passiert davor).
        // Hier gehen wir davon aus, dass applyPendingUpdates schon lief.
        if (fs.existsSync(hotUpdateTempPath)) {
             fs.rmSync(hotUpdateTempPath, { recursive: true, force: true });
        }

        if (!fs.existsSync(hotUpdatePath)) return;

        const versionFile = path.join(hotUpdatePath, 'version.json');
        if (fs.existsSync(versionFile)) {
            const hotUpdateData = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
            const hotUpdateVersion = hotUpdateData.version;
            const binaryVersion = app.getVersion();

            console.log(`Checking versions - Binary: ${binaryVersion}, HotUpdate: ${hotUpdateVersion}`);

            // Wenn Binary STRICT GRÖSSER ist als HotUpdate, dann ist das Update alt.
            if (compareVersions(binaryVersion, hotUpdateVersion) === 1) {
                console.log('Binary is strictly newer. Clearing outdated hot_update folder.');
                fs.rmSync(hotUpdatePath, { recursive: true, force: true });
            } else {
                console.log('Hot update is newer or equal (Hotfix). Keeping it.');
            }
        } else {
            console.log('Corrupted hot_update folder detected (no version.json). Clearing.');
            fs.rmSync(hotUpdatePath, { recursive: true, force: true });
        }
    } catch (e) {
        console.error("Error cleaning up updates:", e);
    }
}

function startLocalServer() {
  const serverApp = express();

  // Prüfen ob ein valides Hot Update existiert
  if (fs.existsSync(hotUpdatePath)) {
      console.log('Serving updates from hot_update folder');
      serverApp.use(express.static(hotUpdatePath));
  }

  // Fallback: Dateien aus der eingebauten App (dist Ordner).
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

async function createWindow() {
  console.log('Clearing Cache...');
  await session.defaultSession.clearCache();
  await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] });

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

  mainWindow.webContents.setUserAgent(GOOGLE_AUTH_USER_AGENT);

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
          webPreferences: {
             nodeIntegration: false,
             contextIsolation: true,
             enableRemoteModule: false
          }
        }
      };
    }
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('did-create-window', (childWindow, details) => {
      childWindow.webContents.setUserAgent(GOOGLE_AUTH_USER_AGENT);
      childWindow.setMenuBarVisibility(false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// VERSION CHECK
ipcMain.handle('get-app-version', () => {
    // Versuche Version aus hot_update zu lesen, da diese relevanter ist
    try {
        const versionFile = path.join(hotUpdatePath, 'version.json');
        if (fs.existsSync(versionFile)) {
            const data = JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
            return `${data.version} (Hot)`;
        }
    } catch(e) {}
    return app.getVersion();
});

ipcMain.handle('open-dev-tools', () => {
    if (mainWindow) {
        mainWindow.webContents.openDevTools();
    }
});

// Update Handler (DOWNLOAD ONLY - NO SWAP HERE)
ipcMain.handle('install-update', async (event, downloadManifest) => {
  try {
    // 1. Prepare Temp Directory (Clean Slate)
    if (fs.existsSync(hotUpdateTempPath)) {
        fs.rmSync(hotUpdateTempPath, { recursive: true, force: true });
    }
    fs.mkdirSync(hotUpdateTempPath, { recursive: true });
    
    const assetsPath = path.join(hotUpdateTempPath, 'assets');
    fs.mkdirSync(assetsPath, { recursive: true });

    console.log(`Starting batch download of ${downloadManifest.length} files to TEMP...`);

    // 2. Download files directly in Main process
    for (const item of downloadManifest) {
        const targetPath = path.join(hotUpdateTempPath, item.relativePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        const downloadUrl = `${item.url}?cb=${Date.now()}`; // Cache Buster
        const response = await fetch(downloadUrl, { cache: 'no-store' });
        
        if (!response.ok) {
            throw new Error(`Failed to download ${item.relativePath}: HTTP ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(targetPath, buffer);
    }
    
    // 3. DO NOT SWAP HERE.
    // Wir lassen den 'hot_update_temp' Ordner einfach liegen.
    // Beim nächsten App-Start wird 'applyPendingUpdates()' ihn finden und austauschen.
    
    console.log("Download complete. Ready for restart.");
    return { success: true };

  } catch (error) {
    console.error('Download failed:', error);
    // Cleanup temp on failure
    if (fs.existsSync(hotUpdateTempPath)) {
        fs.rmSync(hotUpdateTempPath, { recursive: true, force: true });
    }
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

// APP LIFECYCLE
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

  // WICHTIG: Updates anwenden BEVOR irgendetwas anderes passiert
  // Wir machen das synchron/direkt hier im Top-Level oder im ready handler VOR createWindow
  applyPendingUpdates();
  
  // Dann erst aufräumen
  cleanupStaleUpdates();

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    if (server) {
        server.close();
    }
  }
});
