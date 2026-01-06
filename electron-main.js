
import { app, BrowserWindow, shell, ipcMain, session } from 'electron';
import path from 'path';
import express from 'express';
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

const INTERNAL_PORT = 3000;
const APP_URL = `http://localhost:${INTERNAL_PORT}`;
const APP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let mainWindow;
let server;

Object.defineProperty(app, 'isPackaged', { get() { return true; } });
autoUpdater.logger = console;
autoUpdater.autoDownload = true; 
autoUpdater.autoInstallOnAppQuit = true;
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
    title: `SyntaxLabCRM v1.4.0`,
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
}

function getFolderPaths(box, parentPath = '', parentDelimiter = '/') {
    let paths = [];
    for (const key in box) {
        const child = box[key];
        const myDelimiter = child.delimiter || parentDelimiter || '/';
        let fullPath = parentPath ? `${parentPath}${myDelimiter}${key}` : key;
        
        paths.push({ 
            name: key, 
            path: fullPath, 
            delimiter: myDelimiter,
            hasChildren: child.children && Object.keys(child.children).length > 0
        });
        
        if (child.children && Object.keys(child.children).length > 0) {
            paths = paths.concat(getFolderPaths(child.children, fullPath, myDelimiter));
        }
    }
    return paths;
}

const getImapConfig = (config) => ({
    imap: {
        user: config.user,
        password: config.password,
        host: config.host,
        port: parseInt(config.port) || 993,
        tls: config.tls !== false,
        authTimeout: 15000,
        tlsOptions: { rejectUnauthorized: false }
    }
});

// IPC Handlers for Auto-Update
ipcMain.handle('check-for-update', async () => {
    if (!app.isPackaged && process.env.NODE_ENV === 'development') {
        return { error: 'Dev Modus (Keine Updates)' };
    }
    try {
        const result = await autoUpdater.checkForUpdates();
        return { 
            updateAvailable: result?.updateInfo.version !== app.getVersion(),
            version: result?.updateInfo.version 
        };
    } catch (e) {
        console.error('Check update error:', e);
        return { error: e.message };
    }
});

ipcMain.handle('download-update', async () => {
    return new Promise((resolve, reject) => {
        autoUpdater.downloadUpdate().catch(reject);
        resolve(true);
    });
});

ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
});

// Forward updater events to renderer
autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-status', { status: 'available', info });
});
autoUpdater.on('update-not-available', (info) => {
    mainWindow.webContents.send('update-status', { status: 'not-available', info });
});
autoUpdater.on('download-progress', (progressObj) => {
    mainWindow.webContents.send('update-status', { status: 'downloading', progress: progressObj.percent });
});
autoUpdater.on('update-downloaded', (info) => {
    mainWindow.webContents.send('update-status', { status: 'downloaded', info });
});
autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('update-status', { status: 'error', error: err.message });
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('email-imap-get-boxes', async (event, config) => {
    if (!imaps) throw new Error("E-Mail Module nicht geladen.");
    let connection;
    try {
        connection = await imaps.default.connect(getImapConfig(config));
        const boxes = await new Promise((resolve, reject) => {
            connection.imap.getBoxes((err, boxes) => {
                if (err) reject(err);
                else resolve(boxes);
            });
        });
        connection.end();
        return getFolderPaths(boxes);
    } catch (e) {
        if (connection) connection.end();
        throw new Error(`IMAP Ordner Fehler: ${e.message}`);
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
            const hA = a.parts.find(p => p.which === 'HEADER')?.body;
            const hB = b.parts.find(p => p.which === 'HEADER')?.body;
            return new Date(hB?.date || 0) - new Date(hA?.date || 0);
        });
        
        if (limit && messages.length > limit) { messages = messages.slice(0, limit); }
        const parsedMessages = [];
        for (const item of messages) {
            const allPart = item.parts.find(p => p.which === '');
            const headerPart = item.parts.find(p => p.which === 'HEADER');
            let mail = allPart ? await simpleParser(allPart.body) : {};
            
            parsedMessages.push({
                id: item.attributes.uid.toString(), uid: item.attributes.uid,
                from: mail.from?.text || headerPart?.body?.from?.[0] || 'Unbekannt',
                to: mail.to?.text || 'Ich',
                subject: mail.subject || headerPart?.body?.subject?.[0] || '(Kein Betreff)',
                date: (mail.date || new Date()).toISOString(),
                bodyText: mail.text || '', bodyHtml: mail.html || '',
                isRead: item.attributes.flags && item.attributes.flags.includes('\\Seen')
            });
        }
        connection.end();
        return parsedMessages;
    } catch (e) {
        if (connection) connection.end();
        throw e;
    }
});

ipcMain.handle('email-mark-read', async (event, config, uid, boxName = 'INBOX') => {
    if (!imaps) return false;
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

ipcMain.handle('email-imap-move', async (event, config, uid, fromBox, toBox) => {
    if (!imaps) return false;
    let connection;
    try {
        connection = await imaps.default.connect(getImapConfig(config));
        await connection.openBox(fromBox);
        await connection.moveMessage(uid, toBox);
        connection.end();
        return true;
    } catch (e) {
        if (connection) connection.end();
        throw e;
    }
});

ipcMain.handle('email-smtp-send', async (event, config, mailOptions) => {
    if (!nodemailer) throw new Error("Module fehlen.");
    const transporter = nodemailer.default.createTransport({
        host: config.host, port: parseInt(config.port) || 465, secure: config.tls !== false, 
        auth: { user: config.user, pass: config.password },
        tls: { rejectUnauthorized: false }
    });
    const info = await transporter.sendMail({
        from: `"${config.senderName}" <${config.user}>`,
        to: mailOptions.to, subject: mailOptions.subject,
        text: mailOptions.body, html: mailOptions.body.replace(/\n/g, '<br/>'), 
    });
    return { success: true, messageId: info.messageId };
});

ipcMain.handle('generate-pdf', async (event, htmlContent) => {
    let pdfWindow = new BrowserWindow({ show: false });
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    const pdfData = await pdfWindow.webContents.printToPDF({ printBackground: true });
    pdfWindow.close();
    return pdfData;
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
