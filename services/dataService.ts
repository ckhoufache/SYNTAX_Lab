
import { Contact, Deal, Task, Invoice, Expense, Activity, UserProfile, ProductPreset, Theme, BackendConfig, BackendMode, BackupData, InvoiceConfig, EmailTemplate, EmailAttachment, DealStage } from '../types';
import { FirebaseDataService } from './firebaseService';

declare global {
    interface Window {
        google: any;
        gapi: any;
        require: any;
    }
}

export const DEFAULT_PDF_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    body { font-family: sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
    .invoice-title { font-size: 32px; font-weight: bold; text-align: right; color: #1e293b; }
    .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .bill-to h3 { font-size: 14px; text-transform: uppercase; color: #64748b; margin-bottom: 10px; }
    .meta table { text-align: right; }
    .meta td { padding: 4px 0; }
    .meta .label { font-weight: bold; color: #64748b; padding-right: 15px; }
    .items { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
    .items th { text-align: left; padding: 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; color: #64748b; }
    .items td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .total-section { display: flex; justify-content: flex-end; }
    .total-table td { padding: 8px 0; text-align: right; }
    .total-table .label { padding-right: 20px; font-weight: bold; color: #64748b; }
    .total-table .grand-total { font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 10px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; text-align: center; color: #94a3b8; }
</style>
</head>
<body>
    <div class="header">
        <div class="logo">{companyName}</div>
        <div class="invoice-title">{docTitle}</div>
    </div>
    <div class="details">
        <div class="bill-to">
            <h3>Empfänger</h3>
            <p><strong>{contactName}</strong></p>
            <!-- Address would go here -->
        </div>
        <div class="meta">
            <table>
                <tr><td class="label">{docNumberLabel}</td><td>{invoiceNumber}</td></tr>
                <tr><td class="label">Datum</td><td>{date}</td></tr>
            </table>
        </div>
    </div>
    <table class="items">
        <thead>
            <tr><th>Beschreibung</th><th style="text-align:right">Betrag</th></tr>
        </thead>
        <tbody>
            <tr>
                <td>{description}</td>
                <td style="text-align:right">{amount} €</td>
            </tr>
        </tbody>
    </table>
    <div class="total-section">
        <table class="total-table">
            <tr><td class="label">Netto</td><td>{amount} €</td></tr>
            <tr><td class="label">USt. (19%)</td><td>{tax} €</td></tr>
            <tr class="grand-total"><td class="label">Gesamtbetrag</td><td>{total} €</td></tr>
        </table>
    </div>
    <div class="footer">
        <p>{companyName} | {iban} | {taxId}</p>
        <p>{footerText}</p>
    </div>
</body>
</html>`;

export const compileInvoiceTemplate = (invoice: Invoice, config: InvoiceConfig): string => {
    let html = config.pdfTemplate || DEFAULT_PDF_TEMPLATE;
    
    const taxRate = config.taxRule === 'small_business' ? 0 : 0.19;
    const tax = invoice.amount * taxRate;
    const total = invoice.amount + tax;
    
    const isCommission = invoice.type === 'commission';

    const replacements: Record<string, string> = {
        '{companyName}': config.companyName || 'Meine Firma',
        '{contactName}': invoice.contactName || 'Kunde',
        '{invoiceNumber}': invoice.invoiceNumber,
        '{date}': invoice.date,
        '{description}': invoice.description,
        '{amount}': invoice.amount.toLocaleString('de-DE', {minimumFractionDigits: 2}),
        '{tax}': tax.toLocaleString('de-DE', {minimumFractionDigits: 2}),
        '{total}': total.toLocaleString('de-DE', {minimumFractionDigits: 2}),
        '{iban}': config.iban || '',
        '{taxId}': config.taxId || '',
        '{footerText}': config.footerText || '',
        // Dynamic labels based on type
        '{docTitle}': isCommission ? 'GUTSCHRIFT' : 'RECHNUNG',
        '{docNumberLabel}': isCommission ? 'Gutschrift-Nr.' : 'Rechnungs-Nr.'
    };

    Object.entries(replacements).forEach(([key, val]) => {
        html = html.split(key).join(val);
    });

    return html;
};

export const replaceEmailPlaceholders = (text: string, contact: Contact, config?: InvoiceConfig): string => {
   let res = text || '';
   const firstName = contact.name.split(' ')[0] || '';
   const lastName = contact.name.split(' ').slice(1).join(' ') || '';
   
   res = res.replace(/{name}/g, contact.name);
   res = res.replace(/{firstName}/g, firstName);
   res = res.replace(/{lastName}/g, lastName);
   res = res.replace(/{company}/g, contact.company);
   res = res.replace(/{email}/g, contact.email);
   
   if (config) {
       res = res.replace(/{myCompany}/g, config.companyName || '');
   }
   
   return res;
};

const makeUrlSafeBase64 = (base64: string) => {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export interface IDataService {
    init(): Promise<void>;
    getContacts(): Promise<Contact[]>;
    saveContact(contact: Contact): Promise<Contact>;
    updateContact(contact: Contact): Promise<Contact>;
    deleteContact(id: string): Promise<void>;
    importContactsFromCSV(csvText: string): Promise<{ contacts: Contact[], deals: Deal[], activities: Activity[], skippedCount: number }>;
    restoreBackup(data: BackupData): Promise<void>;
    getActivities(): Promise<Activity[]>;
    saveActivity(activity: Activity): Promise<Activity>;
    deleteActivity(id: string): Promise<void>;
    getDeals(): Promise<Deal[]>;
    saveDeal(deal: Deal): Promise<Deal>;
    updateDeal(deal: Deal): Promise<Deal>;
    deleteDeal(id: string): Promise<void>;
    getTasks(): Promise<Task[]>;
    saveTask(task: Task): Promise<Task>;
    updateTask(task: Task): Promise<Task>;
    deleteTask(id: string): Promise<void>;
    getInvoices(): Promise<Invoice[]>;
    saveInvoice(invoice: Invoice): Promise<Invoice>;
    updateInvoice(invoice: Invoice): Promise<Invoice>;
    deleteInvoice(id: string): Promise<void>;
    cancelInvoice(id: string): Promise<{ creditNote: Invoice, updatedOriginal: Invoice, activity: Activity }>;
    getExpenses(): Promise<Expense[]>;
    saveExpense(expense: Expense): Promise<Expense>;
    updateExpense(expense: Expense): Promise<Expense>;
    deleteExpense(id: string): Promise<void>;
    getUserProfile(): Promise<UserProfile | null>;
    getAllUsers(): Promise<UserProfile[]>; 
    saveUserProfile(profile: UserProfile): Promise<UserProfile>;
    getProductPresets(): Promise<ProductPreset[]>;
    saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]>;
    deleteProductPreset(id: string): Promise<void>; 
    getInvoiceConfig(): Promise<InvoiceConfig>;
    saveInvoiceConfig(config: InvoiceConfig): Promise<InvoiceConfig>;
    getEmailTemplates(): Promise<EmailTemplate[]>;
    saveEmailTemplate(template: EmailTemplate): Promise<EmailTemplate>;
    updateEmailTemplate(template: EmailTemplate): Promise<EmailTemplate>;
    deleteEmailTemplate(id: string): Promise<void>;
    
    authenticate(token: string): Promise<UserProfile | null>; 
    connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean>;
    disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean>;
    getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean>;
    sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean>;
    
    checkUserAccess(email: string): Promise<boolean>;
    inviteUser(email: string, role: string): Promise<void>;

    processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }>;
    checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void, force?: boolean): Promise<boolean>;
    getAppVersion(): Promise<string>;
    generatePdf(htmlContent: string): Promise<string>;
    wipeAllData(): Promise<void>;
}

class LocalDataService implements IDataService {
    private googleClientId?: string;
    private initialized: boolean = false;
    private accessTokens: { [key: string]: string } = {};
    
    private cache: {
        contacts: Contact[] | null;
        activities: Activity[] | null;
        deals: Deal[] | null;
        tasks: Task[] | null;
        invoices: Invoice[] | null;
        expenses: Expense[] | null;
        userProfile: UserProfile | null;
        productPresets: ProductPreset[] | null;
        invoiceConfig: InvoiceConfig | null;
        emailTemplates: EmailTemplate[] | null;
    } = {
        contacts: null,
        activities: null,
        deals: null,
        tasks: null,
        invoices: null,
        expenses: null,
        userProfile: null,
        productPresets: null,
        invoiceConfig: null,
        emailTemplates: null
    };

    constructor(googleClientId?: string) {
        this.googleClientId = googleClientId;
    }
    
    async init(): Promise<void> {
        this.initialized = true;
        return Promise.resolve();
    }

    private getFromStorage<T>(key: string, fallback: T): T {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : fallback;
        } catch(e) { return fallback; }
    }

    private set<T>(key: keyof typeof this.cache, storageKey: string, data: T): void {
        this.cache[key] = data as any;
        localStorage.setItem(storageKey, JSON.stringify(data));
    }

    async authenticate(token: string): Promise<UserProfile | null> {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                firstName: payload.given_name || payload.name,
                lastName: payload.family_name || '',
                email: payload.email,
                avatar: payload.picture,
                role: 'Lokaler Benutzer'
            };
        } catch (e) {
            console.error("Local Auth Parse Error", e);
            throw new Error("Token ungültig.");
        }
    }

    async connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean> {
        return new Promise((resolve) => {
            const client_id = clientId || this.googleClientId;
            if (!client_id) {
                alert("Client ID fehlt. Bitte in den Einstellungen eintragen.");
                resolve(false);
                return;
            }

            if (!window.google || !window.google.accounts) {
                alert("Google Services nicht geladen.");
                resolve(false);
                return;
            }

            const scope = service === 'mail' 
                ? 'https://www.googleapis.com/auth/gmail.send' 
                : 'https://www.googleapis.com/auth/calendar';

            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: client_id,
                scope: scope,
                callback: (response: any) => {
                    if (response.error) {
                        console.error(response);
                        resolve(false);
                    } else {
                        this.accessTokens[service] = response.access_token;
                        localStorage.setItem(`google_${service}_connected`, 'true');
                        const expiry = Date.now() + (response.expires_in * 1000);
                        localStorage.setItem(`google_${service}_expiry`, expiry.toString());
                        resolve(true);
                    }
                },
            });

            tokenClient.requestAccessToken();
        });
    }

    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        localStorage.removeItem(`google_${service}_connected`);
        localStorage.removeItem(`google_${service}_expiry`);
        delete this.accessTokens[service];
        if (window.google) window.google.accounts.oauth2.revoke(this.accessTokens[service], () => {});
        return false;
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        if (this.accessTokens[service]) return true;
        const wasConnected = localStorage.getItem(`google_${service}_connected`) === 'true';
        if (!wasConnected) return false;
        const expiry = localStorage.getItem(`google_${service}_expiry`);
        if (expiry && Date.now() > parseInt(expiry)) {
            return false;
        }
        return false;
    }

    async sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean> {
        if (!this.accessTokens['mail']) {
            const connected = await this.connectGoogle('mail', this.googleClientId);
            if (!connected) return false;
        }

        const accessToken = this.accessTokens['mail'];
        const boundary = "foo_bar_baz";
        let message = `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
        message += `MIME-Version: 1.0\r\n`;
        message += `To: ${to}\r\n`;
        message += `Subject: ${subject}\r\n\r\n`;

        message += `--${boundary}\r\n`;
        message += `Content-Type: text/plain; charset="UTF-8"\r\n`;
        message += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
        message += `${body}\r\n\r\n`;

        if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                message += `--${boundary}\r\n`;
                message += `Content-Type: ${att.type}\r\n`;
                message += `MIME-Version: 1.0\r\n`;
                message += `Content-Transfer-Encoding: base64\r\n`;
                message += `Content-Disposition: attachment; filename="${att.name}"\r\n\r\n`;
                const base64Data = att.data.split(',')[1] || att.data;
                message += `${base64Data}\r\n\r\n`;
            }
        }

        message += `--${boundary}--`;
        const encodedEmail = makeUrlSafeBase64(window.btoa(unescape(encodeURIComponent(message))));

        try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: encodedEmail })
            });
            if (response.ok) return true;
            const err = await response.json();
            console.error("Gmail API Error:", err);
            alert(`Fehler beim Senden: ${err.error?.message || 'Unbekannter Fehler'}`);
            return false;
        } catch (e: any) {
            console.error("Network Error:", e);
            alert(`Netzwerkfehler: ${e.message}`);
            return false;
        }
    }

    async checkUserAccess(email: string): Promise<boolean> { return true; }
    async inviteUser(email: string, role: string): Promise<void> {
        alert("Benutzer-Einladungen sind nur im Firebase Cloud Modus notwendig/verfügbar.");
    }

    async checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void, force: boolean = false): Promise<boolean> {
        if (force) console.log(`[FORCE] checkAndInstallUpdate gestartet. URL: ${url}`);
        
        if (!url) {
            const msg = "Fehler: Keine Update-URL in den Einstellungen.";
            if(force) window.alert(msg);
            throw new Error(msg);
        }
        const baseUrl = url.replace(/\/$/, "");
        
        const isElectron = !!(window as any).require;
        
        if (!isElectron) {
            const msg = "Updates sind nur in der Desktop-App möglich.";
            if (force) window.alert(msg);
            return false;
        }

        let ipcRenderer;
        try {
            ipcRenderer = (window as any).require('electron').ipcRenderer;
        } catch (e: any) {
            if (force) window.alert("IPC Load Error: " + e.message);
            return false;
        }

        try {
            statusCallback?.("Verbinde mit Server...");
            // EXTRA CACHE BUSTING
            const versionUrl = `${baseUrl}/version.json?t=${Date.now()}&r=${Math.random()}`;
            
            // EXPLICIT NO-CACHE HEADERS
            const response = await fetch(versionUrl, {
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
            });
            
            if (!response.ok) {
                const err = `Server antwortet nicht (Status ${response.status}). URL: ${versionUrl}`;
                if (force) window.alert(err);
                throw new Error(err);
            }
            
            const remoteData = await response.json();
            const currentVersion = await this.getAppVersion();
            const cleanCurrentVersion = currentVersion.split(' ')[0].replace('(Hot)', '').trim();

            const debugMsg = `Server: ${remoteData.version}\nLokal: ${cleanCurrentVersion}`;
            
            // ALERT FOR DEBUGGING
            window.alert(`UPDATE CHECK:\n${debugMsg}`);
            console.log(debugMsg);

            const isNewer = (v1: string, v2: string) => {
                const p1 = v1.split('.').map(Number);
                const p2 = v2.split('.').map(Number);
                for (let i = 0; i < 3; i++) {
                    const n1 = p1[i] || 0;
                    const n2 = p2[i] || 0;
                    if (n1 > n2) return true;
                    if (n1 < n2) return false;
                }
                return false;
            };

            // Force update if force is true OR if versions differ and remote is newer
            if (!force && !isNewer(remoteData.version, cleanCurrentVersion)) {
                return false;
            }

            statusCallback?.(`Starte Download für v${remoteData.version}...`);

            const manifestUrl = `${baseUrl}/manifest.json?t=${Date.now()}`;
            const manifestResponse = await fetch(manifestUrl, { headers: { 'Cache-Control': 'no-cache' } });
            if (!manifestResponse.ok) throw new Error(`Manifest nicht gefunden (Status ${manifestResponse.status})`);
            
            const files: string[] = await manifestResponse.json();
            
            const downloadManifest = files.map(file => ({
                url: `${baseUrl}/${file}`, 
                relativePath: file
            }));
            
            downloadManifest.push({
                url: `${baseUrl}/version.json`,
                relativePath: 'version.json'
            });

            statusCallback?.(`Lade ${downloadManifest.length} Dateien herunter...`);
            
            const result = await ipcRenderer.invoke('install-update', { 
                manifest: downloadManifest, 
                version: remoteData.version 
            });

            if (result.success) {
                statusCallback?.("Download abgeschlossen!");
                return true;
            } else {
                const errMsg = result.error || "Download fehlgeschlagen (Unbekannt)";
                console.error("Update Failed:", errMsg);
                window.alert(`Update Fehler im Hintergrundprozess:\n${errMsg}\n\nEin Log wurde in AppData/update_log.txt geschrieben.`);
                throw new Error(errMsg);
            }

        } catch (e: any) {
            console.error("Update Error:", e);
            statusCallback?.(`Fehler: ${e.message}`);
            if (force) window.alert(`Update Exception UI:\n${e.message}`);
            throw e;
        }
    }

    async getAppVersion(): Promise<string> { 
        if ((window as any).require) {
            try { 
                const v = await (window as any).require('electron').ipcRenderer.invoke('get-app-version'); 
                return v || '0.0.0'; // Fallback to 0.0.0 so we force update if IPC fails
            } catch(e) {
                console.error("Version Check IPC Failed:", e);
            }
        }
        return '0.0.0'; // Safe fallback
    }

    async getContacts(): Promise<Contact[]> { return this.getFromStorage('contacts', []); }
    async saveContact(c: Contact): Promise<Contact> { const l=await this.getContacts(); this.set('contacts','contacts',[c,...l]); return c; }
    async updateContact(c: Contact): Promise<Contact> { const l=await this.getContacts(); const n=l.map(x=>x.id===c.id?c:x); this.set('contacts','contacts',n); return c; }
    async deleteContact(id: string): Promise<void> { 
        const c=await this.getContacts(); 
        this.set('contacts','contacts',c.filter(x=>x.id!==id)); 
        const d=await this.getDeals(); this.set('deals','deals',d.filter(x=>x.contactId!==id));
        const t=await this.getTasks(); this.set('tasks','tasks',t.filter(x=>x.relatedEntityId!==id));
        const a=await this.getActivities(); this.set('activities','activities',a.filter(x=>x.contactId!==id));
    }
    async importContactsFromCSV(t:string): Promise<any> { 
        const rows = t.split('\n');
        const contacts: Contact[] = [];
        let skipped = 0;
        rows.forEach((row, i) => {
            if (i===0) return; 
            const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());

            if (cleanCols.length >= 2) {
                const firstname = cleanCols[0];
                const lastname = cleanCols[1];
                const company = cleanCols[2] || '';
                const role = cleanCols[3] || 'Unbekannt';
                const linkedin = cleanCols[4]?.includes('http') ? cleanCols[4] : '';
                const icebreaker = cleanCols[5] || '';
                
                const email = `${firstname}.${lastname}@example.com`.toLowerCase().replace(/\s/g,'');

                if (firstname) {
                     const c: Contact = {
                        id: crypto.randomUUID(),
                        name: `${firstname} ${lastname}`.trim(),
                        email: email,
                        company: company,
                        role: role,
                        linkedin: linkedin,
                        notes: icebreaker ? `Icebreaker: ${icebreaker}` : '',
                        lastContact: new Date().toISOString().split('T')[0],
                        avatar: ''
                    };
                    contacts.push(c);
                } else { skipped++; }
            }
        });
        const current = await this.getContacts();
        this.set('contacts', 'contacts', [...contacts, ...current]);
        return {contacts, deals:[], activities:[], skippedCount:skipped}; 
    }
    async restoreBackup(d: BackupData): Promise<void> {
        this.set('contacts','contacts',d.contacts);
        this.set('deals','deals',d.deals);
        this.set('tasks','tasks',d.tasks);
        this.set('invoices','invoices',d.invoices);
        this.set('expenses','expenses',d.expenses);
        this.set('activities','activities',d.activities);
        this.set('userProfile','userProfile',d.userProfile);
        this.set('productPresets','productPresets',d.productPresets);
        this.set('invoiceConfig','invoiceConfig',d.invoiceConfig);
        this.set('emailTemplates','emailTemplates',d.emailTemplates || []);
    }
    async getActivities(): Promise<Activity[]> { return this.getFromStorage('activities', []); }
    async saveActivity(a: Activity): Promise<Activity> { const l=await this.getActivities(); this.set('activities','activities',[a,...l]); return a; }
    async deleteActivity(id: string): Promise<void> { const l=await this.getActivities(); this.set('activities','activities',l.filter(x=>x.id!==id)); }
    async getDeals(): Promise<Deal[]> { return this.getFromStorage('deals', []); }
    async saveDeal(d: Deal): Promise<Deal> { const l=await this.getDeals(); this.set('deals','deals',[d,...l]); return d; }
    async updateDeal(d: Deal): Promise<Deal> { const l=await this.getDeals(); const n=l.map(x=>x.id===d.id?d:x); this.set('deals','deals',n); return d; }
    async deleteDeal(id: string): Promise<void> { const l=await this.getDeals(); this.set('deals','deals',l.filter(x=>x.id!==id)); }
    async getTasks(): Promise<Task[]> { return this.getFromStorage('tasks', []); }
    async saveTask(t: Task): Promise<Task> { const l=await this.getTasks(); this.set('tasks','tasks',[t,...l]); return t; }
    async updateTask(t: Task): Promise<Task> { const l=await this.getTasks(); const n=l.map(x=>x.id===t.id?t:x); this.set('tasks','tasks',n); return t; }
    async deleteTask(id: string): Promise<void> { const l=await this.getTasks(); this.set('tasks','tasks',l.filter(x=>x.id!==id)); }
    async getInvoices(): Promise<Invoice[]> { return this.getFromStorage('invoices', []); }
    async saveInvoice(i: Invoice): Promise<Invoice> { const l=await this.getInvoices(); this.set('invoices','invoices',[i,...l]); return i; }
    async updateInvoice(i: Invoice): Promise<Invoice> { const l=await this.getInvoices(); const n=l.map(x=>x.id===i.id?i:x); this.set('invoices','invoices',n); return i; }
    async deleteInvoice(id: string): Promise<void> { const l=await this.getInvoices(); this.set('invoices','invoices',l.filter(x=>x.id!==id)); }
    async cancelInvoice(id: string): Promise<any> { return {}; }
    async getExpenses(): Promise<Expense[]> { return this.getFromStorage('expenses', []); }
    async saveExpense(e: Expense): Promise<Expense> { const l=await this.getExpenses(); this.set('expenses','expenses',[e,...l]); return e; }
    async updateExpense(e: Expense): Promise<Expense> { const l=await this.getExpenses(); const n=l.map(x=>x.id===e.id?e:x); this.set('expenses','expenses',n); return e; }
    async deleteExpense(id: string): Promise<void> { const l=await this.getExpenses(); this.set('expenses','expenses',l.filter(x=>x.id!==id)); }
    async getUserProfile(): Promise<UserProfile|null> { return this.getFromStorage('userProfile', null); }
    async getAllUsers(): Promise<UserProfile[]> { 
        const profile = this.getFromStorage<UserProfile | null>('userProfile', null);
        return profile ? [profile] : []; 
    }
    async saveUserProfile(p: UserProfile): Promise<UserProfile> { this.set('userProfile','userProfile',p); return p; }
    async getProductPresets(): Promise<ProductPreset[]> { return this.getFromStorage('productPresets', []); }
    async saveProductPresets(p: ProductPreset[]): Promise<ProductPreset[]> { this.set('productPresets','productPresets',p); return p; }
    async deleteProductPreset(id: string): Promise<void> { const l=await this.getProductPresets(); this.set('productPresets','productPresets',l.filter(x=>x.id!==id)); }
    async getInvoiceConfig(): Promise<InvoiceConfig> { return this.getFromStorage('invoiceConfig', { companyName: '', addressLine1: '', addressLine2: '', taxId: '', bankName: '', iban: '', bic: '', email: '', website: '', pdfTemplate: DEFAULT_PDF_TEMPLATE }); }
    async saveInvoiceConfig(c: InvoiceConfig): Promise<InvoiceConfig> { this.set('invoiceConfig','invoiceConfig',c); return c; }
    async getEmailTemplates(): Promise<EmailTemplate[]> { return this.getFromStorage('emailTemplates', []); }
    async saveEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { const l=await this.getEmailTemplates(); this.set('emailTemplates','emailTemplates',[t,...l]); return t; }
    async updateEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { const l=await this.getEmailTemplates(); const n=l.map(x=>x.id===t.id?t:x); this.set('emailTemplates','emailTemplates',n); return t; }
    async deleteEmailTemplate(id: string): Promise<void> { const l=await this.getEmailTemplates(); this.set('emailTemplates','emailTemplates',l.filter(x=>x.id!==id)); }
    async processDueRetainers(): Promise<any> { return {updatedContacts:[], newInvoices:[], newActivities:[]}; }
    async generatePdf(html: string): Promise<string> {
        if ((window as any).require) {
            const buffer = await (window as any).require('electron').ipcRenderer.invoke('generate-pdf', html);
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
            return window.btoa(binary);
        }
        return '';
    }
    async wipeAllData(): Promise<void> { localStorage.clear(); window.location.reload(); }
}

let instance: IDataService | null = null;
export class DataServiceFactory {
    static create(config: BackendConfig): IDataService {
        if (instance) {
             const isFirebase = instance instanceof FirebaseDataService;
             if (config.mode === 'firebase' && !isFirebase) instance = null;
             if (config.mode === 'local' && isFirebase) instance = null;
        }
        if (!instance) {
            if (config.mode === 'firebase') {
                instance = new FirebaseDataService(config);
            } else {
                instance = new LocalDataService(config.googleClientId);
            }
        }
        return instance;
    }
}