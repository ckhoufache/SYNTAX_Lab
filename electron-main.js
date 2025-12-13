
import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import path from 'path';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater'; // Fix: Default import
const { autoUpdater } = electronUpdater;        // Fix: Destructuring aus dem Default Export

// E-Mail Libraries (Dynamisch importieren)
let imaps, simpleParser, nodemailer;
try {
    imaps = await import('imap-simple');
    simpleParser = (await import('mailparser')).simpleParser;
    nodemailer = await import('nodemailer');
} catch (e) {
    console.warn("E-Mail Module konnten nicht geladen werden.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfiguration
const INTERNAL_PORT = 3000;
const APP_URL = `http://localhost:${INTERNAL_PORT}`;
const APP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SyntaxLabCRM-Desktop';

let mainWindow;
let server;

// --- AUTO UPDATER KONFIGURATION ---
// WICHTIG: Da kein Code-Signing Zertifikat vorhanden ist, müssen wir die Prüfung deaktivieren.
// Dies ist sicherheitstechnisch akzeptabel für interne Tools, aber SmartScreen wird meckern.
Object.defineProperty(app, 'isPackaged', {
  get() {
    return true;
  }
});

// Logs für Updater
autoUpdater.logger = console;
// NEU: Automatisch herunterladen, sobald verfügbar!
autoUpdater.autoDownload = true; 
autoUpdater.autoInstallOnAppQuit = true;

// WICHTIG für unsignierte Apps (Windows)
process.env.ELECTRON_UPDATER_SKIP_SIGNATURE_CHECK = 'true'; 

function startLocalServer() {
  const serverApp = express();
  // Standard-Ordner nutzen, da wir nun die ganze EXE tauschen
  serverApp.use(express.static(path.join(__dirname, 'dist')));
  
  serverApp.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- IPC HANDLERS ---

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

// UPDATER IPC
ipcMain.handle('check-for-update', () => {
    if (process.env.NODE_ENV === 'development') {
        return { updateAvailable: false, message: "Dev Modus: Keine Updates." };
    }
    
    // Mit autoDownload = true startet der Download hier sofort, wenn ein Update gefunden wird.
    return autoUpdater.checkForUpdates()
        .then(result => {
            // FIX: Version Check
            // Wir vergleichen die Version vom Server mit der aktuellen App-Version.
            // Nur wenn sie UNTERSCHIEDLICH sind (und normalerweise höher), melden wir ein Update.
            const localVersion = app.getVersion();
            const remoteVersion = result.updateInfo.version;

            if (localVersion === remoteVersion) {
                return { updateAvailable: false, message: "Bereits aktuell." };
            }

            return { 
                updateAvailable: true, 
                version: remoteVersion,
                files: result.updateInfo.files 
            };
        })
        .catch(err => {
            console.error(err);
            return { updateAvailable: false, error: err.message };
        });
});

ipcMain.handle('download-update', () => {
    // Falls autoDownload false wäre, würden wir das hier manuell triggern.
    // Da es true ist, dient dies nur als Fallback.
    autoUpdater.downloadUpdate();
    return true;
});

ipcMain.handle('quit-and-install', () => {
    // WICHTIG: Wir schließen explizit alle Fenster, um File Locks freizugeben,
    // bevor der Installer startet. Das verhindert "File in Use" Fehler.
    BrowserWindow.getAllWindows().forEach(w => w.close());
    
    // Starte den Installer (silent=false, forceRunAfter=true)
    autoUpdater.quitAndInstall(false, true); 
});

// Updater Events an Frontend senden
autoUpdater.on('update-available', (info) => {
    // Hier können wir auch nochmal filtern, aber checkForUpdates Return Value ist wichtiger für den Button
    if(mainWindow) mainWindow.webContents.send('update-status', { status: 'available', info });
});
autoUpdater.on('update-not-available', () => {
    if(mainWindow) mainWindow.webContents.send('update-status', { status: 'not-available' });
});
autoUpdater.on('error', (err) => {
    if(mainWindow) mainWindow.webContents.send('update-status', { status: 'error', error: err.message });
});
autoUpdater.on('download-progress', (progressObj) => {
    if(mainWindow) mainWindow.webContents.send('update-status', { 
        status: 'downloading', 
        progress: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        total: progressObj.total,
        transferred: progressObj.transferred
    });
});
autoUpdater.on('update-downloaded', (info) => {
    if(mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', info });
});


ipcMain.handle('restart-app', () => {
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

// --- E-MAIL IPC HANDLERS ---
ipcMain.handle('email-imap-fetch', async (event, config, limit = 20, onlyUnread = false) => {
    if (!imaps || !simpleParser) throw new Error("E-Mail Module nicht geladen.");
    
    const imapConfig = {
        imap: {
            user: config.user,
            password: config.password,
            host: config.host,
            port: config.port,
            tls: config.tls,
            authTimeout: 5000,
            tlsOptions: { rejectUnauthorized: false } // Hilft oft bei Zertifikatsproblemen
        }
    };

    let connection;
    try {
        connection = await imaps.default.connect(imapConfig);
        await connection.openBox('INBOX');

        const searchCriteria = onlyUnread ? ['UNSEEN'] : ['ALL'];
        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            markSeen: false,
            struct: true
        };

        let messages = await connection.search(searchCriteria, fetchOptions);
        
        messages.sort((a, b) => {
            const dateA = new Date(a.parts.find(p => p.which === 'HEADER').body.date);
            const dateB = new Date(b.parts.find(p => p.which === 'HEADER').body.date);
            return dateB - dateA;
        });
        
        if (limit && messages.length > limit) {
            messages = messages.slice(0, limit);
        }

        const parsedMessages = [];

        for (const item of messages) {
            const allPart = item.parts.find(p => p.which === '');
            const headerPart = item.parts.find(p => p.which === 'HEADER');
            
            let mail;
            if (allPart) {
                mail = await simpleParser(allPart.body);
            } else {
                mail = { text: "Kein Inhalt", html: "", subject: headerPart?.body?.subject, from: headerPart?.body?.from, date: headerPart?.body?.date };
            }

            parsedMessages.push({
                id: item.attributes.uid,
                uid: item.attributes.uid,
                from: mail.from?.text || 'Unbekannt',
                to: mail.to?.text || 'Ich',
                subject: mail.subject || '(Kein Betreff)',
                date: mail.date ? mail.date.toISOString() : new Date().toISOString(),
                bodyText: mail.text || '',
                bodyHtml: mail.html || '',
                isRead: item.attributes.flags && item.attributes.flags.includes('\\Seen')
            });
        }

        connection.end();
        return parsedMessages;

    } catch (e) {
        if (connection) connection.end();
        console.error("IMAP Error", e);
        throw new Error(`IMAP Fehler: ${e.message}`);
    }
});

ipcMain.handle('email-smtp-send', async (event, config, mailOptions) => {
    if (!nodemailer) throw new Error("E-Mail Module nicht geladen.");

    const transporter = nodemailer.default.createTransport({
        host: config.host,
        port: config.port,
        secure: config.tls, 
        auth: { user: config.user, pass: config.password },
        tls: { rejectUnauthorized: false } // Erlaubt selbstsignierte Zertifikate
    });

    try {
        const info = await transporter.sendMail({
            from: `"${config.senderName}" <${config.user}>`,
            to: mailOptions.to,
            subject: mailOptions.subject,
            text: mailOptions.body,
            html: mailOptions.body.replace(/\n/g, '<br/>'), 
        });
        return { success: true, messageId: info.messageId };
    } catch (e) {
        console.error("SMTP Error", e);
        throw new Error(`SMTP Fehler: ${e.message}`);
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
