
import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import path from 'path';
import express from 'express';
import fs from 'fs';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater'; 
const { autoUpdater } = electronUpdater;        

// E-Mail Libraries
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

// --- AUTO UPDATER ---
// In Produktion sollte dies auf false stehen, für Tests mit GitHub Releases lassen wir es auf true
Object.defineProperty(app, 'isPackaged', { get() { return true; } });
autoUpdater.logger = console;
autoUpdater.autoDownload = true; 
autoUpdater.autoInstallOnAppQuit = true;
// Deaktiviert die Signatur-Prüfung für inoffizielle Builds (GitHub Pages Installer)
process.env.ELECTRON_UPDATER_SKIP_SIGNATURE_CHECK = 'true'; 

function startLocalServer() {
  const serverApp = express();
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

ipcMain.handle('get-app-version', () => { return app.getVersion(); });

ipcMain.handle('check-for-update', () => {
    if (process.env.NODE_ENV === 'development') return { updateAvailable: false, message: "Dev Modus: Keine Updates." };
    return autoUpdater.checkForUpdates()
        .then(result => {
            if (!result) return { updateAvailable: false };
            const localVersion = app.getVersion();
            const remoteVersion = result.updateInfo.version;
            if (localVersion === remoteVersion) return { updateAvailable: false, message: "Bereits aktuell." };
            return { updateAvailable: true, version: remoteVersion, files: result.updateInfo.files };
        })
        .catch(err => ({ updateAvailable: false, error: err.message }));
});

ipcMain.handle('download-update', () => { 
    autoUpdater.downloadUpdate(); 
    return true; 
});

ipcMain.handle('quit-and-install', () => { 
    // WICHTIG: Nicht manuell die Fenster schließen. 
    // quitAndInstall(isSilent, isForceRunAfter) regelt das Ende der App und den Neustart.
    autoUpdater.quitAndInstall(false, true); 
});

autoUpdater.on('update-available', (info) => { if(mainWindow) mainWindow.webContents.send('update-status', { status: 'available', info }); });
autoUpdater.on('update-not-available', () => { if(mainWindow) mainWindow.webContents.send('update-status', { status: 'not-available' }); });
autoUpdater.on('error', (err) => { if(mainWindow) mainWindow.webContents.send('update-status', { status: 'error', error: err.message }); });
autoUpdater.on('download-progress', (progressObj) => { if(mainWindow) mainWindow.webContents.send('update-status', { status: 'downloading', progress: progressObj.percent }); });
autoUpdater.on('update-downloaded', (info) => { if(mainWindow) mainWindow.webContents.send('update-status', { status: 'downloaded', info }); });

ipcMain.handle('restart-app', () => { app.relaunch(); app.exit(0); });

ipcMain.handle('generate-pdf', async (event, htmlContent) => {
    let pdfWindow = new BrowserWindow({ show: false, width: 800, height: 1200 });
    try {
        await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        const pdfData = await pdfWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
        pdfWindow.close();
        return pdfData; 
    } catch (error) { if (pdfWindow) pdfWindow.close(); throw error; }
});

// --- E-MAIL IPC HANDLERS ---
const getImapConfig = (config) => ({
    imap: {
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: config.tls,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
    }
});

function getFolderPaths(box, parentPath = '', parentDelimiter = '/') {
    let paths = [];
    for (const key in box) {
        const child = box[key];
        const myDelimiter = child.delimiter || parentDelimiter || '/';
        let fullPath = key;
        if (parentPath) {
            fullPath = `${parentPath}${myDelimiter}${key}`;
        }
        paths.push({ name: key, path: fullPath });
        if (child.children) {
            paths = paths.concat(getFolderPaths(child.children, fullPath, myDelimiter));
        }
    }
    return paths;
}

ipcMain.handle('email-imap-get-boxes', async (event, config) => {
    if (!imaps) throw new Error("E-Mail Module nicht geladen.");
    let connection;
    try {
        connection = await imaps.default.connect(getImapConfig(config));
        const boxes = await connection.getBoxes();
        connection.end();
        return getFolderPaths(boxes);
    } catch (e) {
        if (connection) connection.end();
        throw new Error(`IMAP Ordner Fehler: ${e.message}`);
    }
});

ipcMain.handle('email-imap-create-folder', async (event, config, folderName) => {
    if (!imaps) throw new Error("E-Mail Module nicht geladen.");
    let connection;
    try {
        connection = await imaps.default.connect(getImapConfig(config));
        await new Promise((resolve, reject) => {
            connection.imap.addBox(folderName, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        connection.end();
        return true;
    } catch (e) {
        if (connection) connection.end();
        throw new Error(`Fehler beim Erstellen: ${e.message}`);
    }
});

ipcMain.handle('email-imap-delete-folder', async (event, config, folderPath) => {
    if (!imaps) throw new Error("E-Mail Module nicht geladen.");
    let connection;
    try {
        connection = await imaps.default.connect(getImapConfig(config));
        await new Promise((resolve, reject) => {
            connection.imap.delBox(folderPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        connection.end();
        return true;
    } catch (e) {
        if (connection) connection.end();
        throw new Error(`Fehler beim Löschen: ${e.message}`);
    }
});

ipcMain.handle('email-imap-fetch', async (event, config, limit = 20, onlyUnread = false, boxName = 'INBOX') => {
    if (!imaps || !simpleParser) throw new Error("E-Mail Module nicht geladen.");
    let connection;
    try {
        connection = await imaps.default.connect(getImapConfig(config));
        await connection.openBox(boxName);
        const searchCriteria = onlyUnread ? ['UNSEEN'] : ['ALL'];
        const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], markSeen: false, struct: true };
        let messages = await connection.search(searchCriteria, fetchOptions);
        messages.sort((a, b) => {
            const dateA = new Date(a.parts.find(p => p.which === 'HEADER').body.date);
            const dateB = new Date(b.parts.find(p => p.which === 'HEADER').body.date);
            return dateB - dateA;
        });
        if (limit && messages.length > limit) { messages = messages.slice(0, limit); }
        const parsedMessages = [];
        for (const item of messages) {
            const allPart = item.parts.find(p => p.which === '');
            const headerPart = item.parts.find(p => p.which === 'HEADER');
            let mail;
            if (allPart) { mail = await simpleParser(allPart.body); } else { mail = { text: "Kein Inhalt", html: "", subject: headerPart?.body?.subject, from: headerPart?.body?.from, date: headerPart?.body?.date }; }
            let dateStr = new Date().toISOString();
            if (mail.date) { dateStr = mail.date.toISOString(); } else if (headerPart?.body?.date) { dateStr = new Date(headerPart.body.date).toISOString(); }
            parsedMessages.push({
                id: item.attributes.uid, uid: item.attributes.uid,
                from: mail.from?.text || 'Unbekannt', to: mail.to?.text || 'Ich',
                subject: mail.subject || '(Kein Betreff)', date: dateStr,
                bodyText: mail.text || '', bodyHtml: mail.html || '',
                isRead: item.attributes.flags && item.attributes.flags.includes('\\Seen')
            });
        }
        connection.end();
        return parsedMessages;
    } catch (e) {
        if (connection) connection.end();
        throw new Error(`IMAP Fehler: ${e.message}`);
    }
});

ipcMain.handle('email-mark-read', async (event, config, uid, boxName = 'INBOX') => {
    if (!imaps) throw new Error("E-Mail Module nicht geladen.");
    let connection;
    try {
        connection = await imaps.default.connect(getImapConfig(config));
        await connection.openBox(boxName);
        await connection.addFlags(uid, '\\Seen');
        connection.end();
        return true;
    } catch (e) {
        if (connection) connection.end();
        return false;
    }
});

ipcMain.handle('email-smtp-send', async (event, config, mailOptions) => {
    if (!nodemailer) throw new Error("E-Mail Module nicht geladen.");
    const transporter = nodemailer.default.createTransport({
        host: config.host, port: config.port, secure: config.tls, 
        auth: { user: config.user, pass: config.password },
        tls: { rejectUnauthorized: false }
    });
    try {
        const info = await transporter.sendMail({
            from: `"${config.senderName}" <${config.user}>`,
            to: mailOptions.to, subject: mailOptions.subject,
            text: mailOptions.body, html: mailOptions.body.replace(/\n/g, '<br/>'), 
        });
        return { success: true, messageId: info.messageId };
    } catch (e) {
        console.error("SMTP Error", e);
        throw new Error(`SMTP Fehler: ${e.message}`);
    }
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); } else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => { createWindow(); });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    if (server) server.close();
  }
});
