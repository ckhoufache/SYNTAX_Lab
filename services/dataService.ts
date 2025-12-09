
import { Contact, Deal, Task, UserProfile, ProductPreset, Theme, BackendConfig, BackendMode, BackupData, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate, EmailAttachment, DealStage } from '../types';
import { FirebaseDataService } from './firebaseService';

// Declare Google Types globally for TS
declare global {
    interface Window {
        google: any;
        gapi: any;
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
        <div class="invoice-title">RECHNUNG</div>
    </div>
    <div class="details">
        <div class="bill-to">
            <h3>Empfänger</h3>
            <p><strong>{contactName}</strong></p>
            <!-- Address would go here -->
        </div>
        <div class="meta">
            <table>
                <tr><td class="label">Rechnungs-Nr.</td><td>{invoiceNumber}</td></tr>
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

    const replacements: Record<string, string> = {
        '{companyName}': config.companyName || 'Meine Firma',
        '{contactName}': invoice.contactName || 'Kunde',
        '{invoiceNumber}': invoice.invoiceNumber,
        '{date}': invoice.date,
        '{description}': invoice.description,
        '{amount}': invoice.amount.toFixed(2),
        '{tax}': tax.toFixed(2),
        '{total}': total.toFixed(2),
        '{iban}': config.iban || '',
        '{taxId}': config.taxId || '',
        '{footerText}': config.footerText || ''
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

// Helper to make base64 URL safe for Gmail API
const makeUrlSafeBase64 = (base64: string) => {
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Interface extension
export interface IDataService {
    // ... Existing CRUD methods ...
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
    
    // Auth & Integration
    connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean>;
    disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean>;
    getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean>;
    sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean>;
    
    // Access Control (NEW)
    checkUserAccess(email: string): Promise<boolean>;
    inviteUser(email: string, role: string): Promise<void>;

    // System
    processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }>;
    checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void, force?: boolean): Promise<boolean>;
    getAppVersion(): Promise<string>;
    generatePdf(htmlContent: string): Promise<string>;
    wipeAllData(): Promise<void>;
}

class LocalDataService implements IDataService {
    private googleClientId?: string;
    private initialized: boolean = false;
    // Store OAuth access tokens in memory (not LS for security best practice, though this resets on refresh)
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
    
    // ... (Init and generic methods remain similar, adding Access Control logic) ...

    async init(): Promise<void> {
        // ... (Existing init logic) ...
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

    // --- REAL GOOGLE INTEGRATION ---

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
                        // Store Token
                        this.accessTokens[service] = response.access_token;
                        // Persist "Connected" state locally for UI (token expires but status remains)
                        localStorage.setItem(`google_${service}_connected`, 'true');
                        // Store expiration to force re-auth later
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
        
        // Revoke if possible (optional)
        if (window.google) window.google.accounts.oauth2.revoke(this.accessTokens[service], () => {});
        return false;
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        // Check if we have a valid token in memory
        if (this.accessTokens[service]) return true;
        
        // Check if we were connected previously
        const wasConnected = localStorage.getItem(`google_${service}_connected`) === 'true';
        if (!wasConnected) return false;

        // Check if token is expired (rough check)
        const expiry = localStorage.getItem(`google_${service}_expiry`);
        if (expiry && Date.now() > parseInt(expiry)) {
            // Token expired, need re-auth. Return false to trigger "Connect" button in UI
            return false;
        }
        
        // NOTE: In a real app, we might silently refresh here if we had a refresh token, 
        // but Implicit Flow (Client-Side) doesn't give refresh tokens. User must re-click connect.
        return false;
    }

    async sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean> {
        // 1. Ensure we have a token
        if (!this.accessTokens['mail']) {
            const connected = await this.connectGoogle('mail', this.googleClientId);
            if (!connected) return false;
        }

        const accessToken = this.accessTokens['mail'];

        // 2. Construct MIME Message
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
                // Ensure pure base64 (strip data: prefix if present)
                const base64Data = att.data.split(',')[1] || att.data;
                message += `${base64Data}\r\n\r\n`;
            }
        }

        message += `--${boundary}--`;

        // 3. Encode to Base64URL
        // Note: Standard btoa handles UTF-16 badly. We need to encodeURI first.
        const encodedEmail = makeUrlSafeBase64(window.btoa(unescape(encodeURIComponent(message))));

        // 4. Send via API
        try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    raw: encodedEmail
                })
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

    // --- ACCESS CONTROL (Local Mode) ---
    async checkUserAccess(email: string): Promise<boolean> {
        // In Local Mode, we assume the user running the app has access.
        // We could implement a local whitelist, but usually local apps are single-user or implicitly trusted.
        return true; 
    }

    async inviteUser(email: string, role: string): Promise<void> {
        alert("Benutzer-Einladungen sind nur im Firebase Cloud Modus notwendig/verfügbar.");
    }

    // ... (Other methods: getAppVersion, checkAndInstallUpdate, etc. remain unchanged) ...
    async getContacts(): Promise<Contact[]> { return this.cache.contacts || []; }
    async saveContact(c: Contact): Promise<Contact> { const l=this.cache.contacts||[]; this.set('contacts','contacts',[c,...l]); return c; }
    async updateContact(c: Contact): Promise<Contact> { const l=this.cache.contacts||[]; const n=l.map(x=>x.id===c.id?c:x); this.set('contacts','contacts',n); return c; }
    async deleteContact(id: string): Promise<void> { /* ... */ }
    async importContactsFromCSV(t:string): Promise<any> { 
        // Simple mock implementation for parsing CSV
        const rows = t.split('\n');
        const contacts: Contact[] = [];
        let skipped = 0;
        rows.forEach((row, i) => {
            if (i===0) return; // Header
            const cols = row.split(',');
            if (cols.length >= 3) {
                const name = cols[0].trim();
                const email = cols[1].trim();
                if (name && email) {
                    contacts.push({
                        id: crypto.randomUUID(),
                        name, email,
                        company: cols[2]?.trim() || '',
                        role: 'Imported',
                        lastContact: new Date().toISOString().split('T')[0],
                        avatar: ''
                    });
                } else { skipped++; }
            }
        });
        const current = this.cache.contacts || [];
        this.set('contacts', 'contacts', [...contacts, ...current]);
        return {contacts, deals:[], activities:[], skippedCount:skipped}; 
    }
    async restoreBackup(d: BackupData): Promise<void> { /* ... */ }
    async getActivities(): Promise<Activity[]> { return this.cache.activities||[]; }
    async saveActivity(a: Activity): Promise<Activity> { const l=this.cache.activities||[]; this.set('activities','activities',[a,...l]); return a; }
    async deleteActivity(id: string): Promise<void> { /* ... */ }
    async getDeals(): Promise<Deal[]> { return this.cache.deals||[]; }
    async saveDeal(d: Deal): Promise<Deal> { const l=this.cache.deals||[]; this.set('deals','deals',[d,...l]); return d; }
    async updateDeal(d: Deal): Promise<Deal> { const l=this.cache.deals||[]; const n=l.map(x=>x.id===d.id?d:x); this.set('deals','deals',n); return d; }
    async deleteDeal(id: string): Promise<void> { /* ... */ }
    async getTasks(): Promise<Task[]> { return this.cache.tasks||[]; }
    async saveTask(t: Task): Promise<Task> { const l=this.cache.tasks||[]; this.set('tasks','tasks',[t,...l]); return t; }
    async updateTask(t: Task): Promise<Task> { const l=this.cache.tasks||[]; const n=l.map(x=>x.id===t.id?t:x); this.set('tasks','tasks',n); return t; }
    async deleteTask(id: string): Promise<void> { /* ... */ }
    async getInvoices(): Promise<Invoice[]> { return this.cache.invoices||[]; }
    async saveInvoice(i: Invoice): Promise<Invoice> { const l=this.cache.invoices||[]; this.set('invoices','invoices',[i,...l]); return i; }
    async updateInvoice(i: Invoice): Promise<Invoice> { const l=this.cache.invoices||[]; const n=l.map(x=>x.id===i.id?i:x); this.set('invoices','invoices',n); return i; }
    async deleteInvoice(id: string): Promise<void> { /* ... */ }
    async cancelInvoice(id: string): Promise<any> { /* ... */ return {} as any; }
    async getExpenses(): Promise<Expense[]> { return this.cache.expenses||[]; }
    async saveExpense(e: Expense): Promise<Expense> { const l=this.cache.expenses||[]; this.set('expenses','expenses',[e,...l]); return e; }
    async updateExpense(e: Expense): Promise<Expense> { const l=this.cache.expenses||[]; const n=l.map(x=>x.id===e.id?e:x); this.set('expenses','expenses',n); return e; }
    async deleteExpense(id: string): Promise<void> { /* ... */ }
    async getUserProfile(): Promise<UserProfile|null> { return this.cache.userProfile; }
    async getAllUsers(): Promise<UserProfile[]> { return this.cache.userProfile ? [this.cache.userProfile] : []; }
    async saveUserProfile(p: UserProfile): Promise<UserProfile> { this.set('userProfile','userProfile',p); return p; }
    async getProductPresets(): Promise<ProductPreset[]> { return this.cache.productPresets||[]; }
    async saveProductPresets(p: ProductPreset[]): Promise<ProductPreset[]> { this.set('productPresets','productPresets',p); return p; }
    async deleteProductPreset(id: string): Promise<void> { /* ... */ }
    async getInvoiceConfig(): Promise<InvoiceConfig> { return this.cache.invoiceConfig as any; }
    async saveInvoiceConfig(c: InvoiceConfig): Promise<InvoiceConfig> { this.set('invoiceConfig','invoiceConfig',c); return c; }
    async getEmailTemplates(): Promise<EmailTemplate[]> { return this.cache.emailTemplates||[]; }
    async saveEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { const l=this.cache.emailTemplates||[]; this.set('emailTemplates','emailTemplates',[t,...l]); return t; }
    async updateEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { const l=this.cache.emailTemplates||[]; const n=l.map(x=>x.id===t.id?t:x); this.set('emailTemplates','emailTemplates',n); return t; }
    async deleteEmailTemplate(id: string): Promise<void> { /* ... */ }
    async processDueRetainers(): Promise<any> { return {updatedContacts:[], newInvoices:[], newActivities:[]}; }
    async checkAndInstallUpdate(u:string, c?:any, f?:boolean): Promise<boolean> { return false; }
    async getAppVersion(): Promise<string> { return '1.2.7'; }
    async generatePdf(h: string): Promise<string> { return ''; }
    async wipeAllData(): Promise<void> { localStorage.clear(); window.location.reload(); }
}

// ... Singleton Logic ...
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
