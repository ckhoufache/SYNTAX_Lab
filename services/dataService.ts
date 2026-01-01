
import { Contact, Deal, Task, Invoice, Expense, Activity, UserProfile, ProductPreset, InvoiceConfig, EmailTemplate, EmailAttachment, DealStage, BackupData, EmailMessage, BackendConfig } from '../types';
import { FirebaseDataService } from './firebaseService';

declare global {
    interface Window {
        google: any;
        gapi: any;
        require: any;
    }
}

export const DEFAULT_PDF_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 40px; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; margin-bottom: 60px; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; }
        .logo { max-width: 180px; max-height: 80px; object-fit: contain; }
        .company-info { text-align: right; font-size: 10px; color: #666; }
        .billing-to { margin-bottom: 40px; }
        .billing-to p { margin: 2px 0; font-size: 12px; }
        .invoice-details { margin-bottom: 40px; text-align: right; }
        .invoice-details h1 { margin: 0; color: #4f46e5; font-size: 28px; text-transform: uppercase; }
        .invoice-details p { margin: 2px 0; font-size: 11px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { background: #f9fafb; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #eee; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 12px; }
        .totals { float: right; width: 250px; }
        .totals div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
        .grand-total { font-size: 16px; font-weight: 800; border-top: 2px solid #4f46e5; margin-top: 10px; padding-top: 10px !important; color: #4f46e5; }
        .footer { position: fixed; bottom: 40px; left: 40px; right: 40px; font-size: 9px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        .footer-cols { display: flex; justify-content: space-between; }
        .small-print { font-size: 10px; color: #666; margin-top: 40px; font-style: italic; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            {{#if logoBase64}}
            <img src="{{logoBase64}}" class="logo" />
            {{else}}
            <h2 style="color: #4f46e5; margin: 0;">{{companyName}}</h2>
            {{/if}}
        </div>
        <div class="company-info">
            <strong>{{companyName}}</strong><br>
            {{addressLine1}}<br>
            {{addressLine2}}<br>
            {{email}} | {{website}}
        </div>
    </div>

    <div style="display: flex; justify-content: space-between;">
        <div class="billing-to">
            <p style="text-transform: uppercase; font-size: 10px; color: #999; margin-bottom: 5px;">Empfänger</p>
            <p><strong>{{contactName}}</strong></p>
            {{#if contactCompany}}<p>{{contactCompany}}</p>{{/if}}
            {{#if contactStreet}}<p>{{contactStreet}}</p>{{/if}}
            {{#if contactZip}}<p>{{contactZip}} {{contactCity}}</p>{{/if}}
        </div>
        <div class="invoice-details">
            <h1>{{documentTitle}}</h1>
            <p>Nummer: {{invoiceNumber}}</p>
            <p>Datum: {{date}}</p>
            {{#if taxId}}<p>USt-ID: {{taxId}}</p>{{/if}}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Beschreibung</th>
                <th style="text-align: right;">Betrag (Netto)</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>{{{description}}}</td>
                <td style="text-align: right;">{{amount}} €</td>
            </tr>
        </tbody>
    </table>

    <div class="totals">
        <div><span>Netto:</span><span>{{amount}} €</span></div>
        {{#unless isSmallBusiness}}
        <div><span>USt (19%):</span><span>{{vatAmount}} €</span></div>
        {{/unless}}
        <div class="grand-total"><span>Gesamt:</span><span>{{totalAmount}} €</span></div>
    </div>

    <div style="clear: both;"></div>

    <div class="small-print">
        {{#if isSmallBusiness}}
        Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
        {{else}}
        Zahlbar innerhalb von 14 Tagen ohne Abzug.
        {{/if}}
        <br><br>
        {{footerText}}
    </div>

    <div class="footer">
        <div class="footer-cols">
            <div>
                <strong>Bankverbindung:</strong><br>
                {{bankName}}<br>
                IBAN: {{iban}}<br>
                BIC: {{bic}}
            </div>
            <div style="text-align: right;">
                <strong>Kontakt:</strong><br>
                {{email}}<br>
                {{website}}<br>
                Steuernummer: {{taxId}}
            </div>
        </div>
    </div>
</body>
</html>
`;

export const compileInvoiceTemplate = (invoice: Invoice, config: InvoiceConfig, contact?: Contact): string => {
    let template = config.pdfTemplate || DEFAULT_PDF_TEMPLATE;
    
    const isSmallBusiness = config.taxRule === 'small_business' || (invoice.type === 'commission' && contact?.taxStatus === 'small_business');
    const vatRate = isSmallBusiness ? 0 : 0.19;
    const vatAmount = invoice.amount * vatRate;
    const totalAmount = invoice.amount + vatAmount;

    const data: Record<string, string> = {
        logoBase64: config.logoBase64 || '',
        companyName: config.companyName || 'Syntax Lab CRM',
        addressLine1: config.addressLine1 || '',
        addressLine2: config.addressLine2 || '',
        email: config.email || '',
        website: config.website || '',
        taxId: config.taxId || '',
        bankName: config.bankName || '',
        iban: config.iban || '',
        bic: config.bic || '',
        footerText: config.footerText || '',
        
        documentTitle: invoice.type === 'commission' ? 'Gutschrift' : 'Rechnung',
        invoiceNumber: invoice.invoiceNumber,
        date: new Date(invoice.date).toLocaleDateString('de-DE'),
        description: invoice.description,
        amount: invoice.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 }),
        vatAmount: vatAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 }),
        totalAmount: totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 }),
        
        contactName: contact?.name || invoice.contactName,
        contactCompany: contact?.company || '',
        contactStreet: contact?.street || '',
        contactZip: contact?.zip || '',
        contactCity: contact?.city || ''
    };

    // 1. ZUERST: Logik-Blöcke verarbeiten, BEVOR Platzhalter ersetzt werden
    template = template.replace(/{{#if logoBase64}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g, data.logoBase64 ? '$1' : '$2');
    template = template.replace(/{{#unless isSmallBusiness}}([\s\S]*?){{\/unless}}/g, !isSmallBusiness ? '$1' : '');
    template = template.replace(/{{#if isSmallBusiness}}([\s\S]*?){{\/if}}/g, isSmallBusiness ? '$1' : '');
    template = template.replace(/{{#if contactCompany}}([\s\S]*?){{\/if}}/g, data.contactCompany ? '$1' : '');
    template = template.replace(/{{#if contactStreet}}([\s\S]*?){{\/if}}/g, data.contactStreet ? '$1' : '');
    template = template.replace(/{{#if contactZip}}([\s\S]*?){{\/if}}/g, data.contactZip ? '$1' : '');
    template = template.replace(/{{#if taxId}}([\s\S]*?){{\/if}}/g, data.taxId ? '$1' : '');

    // 2. DANN: Alle Platzhalter ersetzen (Triple-Braces zuerst für HTML)
    Object.entries(data).forEach(([key, value]) => {
        // Triple braces
        template = template.split(`{{{${key}}}}`).join(value);
        // Double braces
        template = template.split(`{{${key}}}`).join(value);
    });
    
    return template;
};

export const replaceEmailPlaceholders = (text: string, contact: Contact, config?: InvoiceConfig): string => {
   return text.replace(/{{name}}/g, contact.name).replace(/{{firma}}/g, contact.company || '');
};

export interface IDataService {
    init(): Promise<void>;
    getContacts(): Promise<Contact[]>;
    saveContact(contact: Contact): Promise<Contact>;
    updateContact(contact: Contact): Promise<Contact>;
    deleteContact(id: string): Promise<void>;
    importContactsFromCSV(csvText: string): Promise<any>;
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
    cancelInvoice(id: string): Promise<any>;
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
    processDueRetainers(): Promise<any>;
    runCommissionBatch(year: number, month: number): Promise<any>;
    checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void, force?: boolean): Promise<boolean>;
    getAppVersion(): Promise<string>;
    generatePdf(htmlContent: string): Promise<string>;
    wipeAllData(): Promise<void>;
    fetchEmails(config: any, limit?: number, onlyUnread?: boolean, boxName?: string): Promise<EmailMessage[]>;
    getEmailFolders(config: any): Promise<{name: string, path: string}[]>; 
    createEmailFolder(config: any, folderName: string): Promise<boolean>; 
    deleteEmailFolder(config: any, folderPath: string): Promise<boolean>; 
    markEmailRead(config: any, uid: number, boxName: string): Promise<boolean>; 
    sendSmtpMail(config: any, to: string, subject: string, body: string): Promise<boolean>;
    moveEmail(config: any, uid: number, fromBox: string, toBox: string): Promise<boolean>;
}

class LocalDataService implements IDataService {
    private initialized = false;
    constructor(private googleClientId?: string) {}

    async moveEmail(config: any, uid: number, fromBox: string, toBox: string): Promise<boolean> {
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('email-imap-move', config, uid, fromBox, toBox);
        }
        return false;
    }
    
    async init(): Promise<void> { this.initialized = true; }
    async getContacts() { return JSON.parse(localStorage.getItem('contacts') || '[]'); }
    async saveContact(c:any) { const l=await this.getContacts(); localStorage.setItem('contacts', JSON.stringify([c,...l])); return c; }
    async updateContact(c:any) { const l=await this.getContacts(); const n=l.map((x:any)=>x.id===c.id?c:x); localStorage.setItem('contacts', JSON.stringify(n)); return c; }
    async deleteContact(id:any) { const l=await this.getContacts(); localStorage.setItem('contacts', JSON.stringify(l.filter((x:any)=>x.id!==id))); }
    
    async importContactsFromCSV(csvText: string): Promise<any> {
        const rows = csvText.split('\n');
        const contacts: Contact[] = [];
        let skipped = 0;
        rows.forEach((row, i) => {
            if (i === 0) return;
            const cols = row.split(',');
            if (cols.length >= 2) {
                const name = cols[0].trim();
                const email = cols[1].trim();
                if (name && email) {
                    const c: Contact = {
                        id: crypto.randomUUID(),
                        name, email,
                        company: cols[2]?.trim() || '',
                        role: 'Imported',
                        lastContact: new Date().toISOString().split('T')[0],
                        avatar: ''
                    };
                    contacts.push(c);
                } else { skipped++; }
            }
        });
        const existing = await this.getContacts();
        localStorage.setItem('contacts', JSON.stringify([...contacts, ...existing]));
        return { contacts, deals: [], activities: [], skippedCount: skipped };
    }

    async restoreBackup(data: BackupData): Promise<void> {
        if (data.contacts) localStorage.setItem('contacts', JSON.stringify(data.contacts));
        if (data.deals) localStorage.setItem('deals', JSON.stringify(data.deals));
        if (data.tasks) localStorage.setItem('tasks', JSON.stringify(data.tasks));
        if (data.invoices) localStorage.setItem('invoices', JSON.stringify(data.invoices));
        if (data.expenses) localStorage.setItem('expenses', JSON.stringify(data.expenses));
        if (data.activities) localStorage.setItem('activities', JSON.stringify(data.activities));
        if (data.invoiceConfig) localStorage.setItem('invoiceConfig', JSON.stringify(data.invoiceConfig));
        if (data.userProfile) localStorage.setItem('userProfile', JSON.stringify(data.userProfile));
        if (data.productPresets) localStorage.setItem('productPresets', JSON.stringify(data.productPresets));
        if (data.emailTemplates) localStorage.setItem('emailTemplates', JSON.stringify(data.emailTemplates));
    }

    async getActivities() { return JSON.parse(localStorage.getItem('activities') || '[]'); }
    
    async saveActivity(a: any) { 
        const l = await this.getActivities(); 
        const idx = l.findIndex((item: any) => item.id === a.id);
        let newList;
        if (idx > -1) {
            newList = l.map((item: any) => item.id === a.id ? a : item);
        } else {
            newList = [a, ...l];
        }
        localStorage.setItem('activities', JSON.stringify(newList)); 
        return a; 
    }

    async deleteActivity(id:any) { const l=await this.getActivities(); localStorage.setItem('activities', JSON.stringify(l.filter((x:any)=>x.id!==id))); }
    async getDeals() { return JSON.parse(localStorage.getItem('deals') || '[]'); }
    async saveDeal(d:any) { const l=await this.getDeals(); localStorage.setItem('deals', JSON.stringify([d,...l])); return d; }
    async updateDeal(d:any) { const l=await this.getDeals(); const n=l.map((x:any)=>x.id===d.id?d:x); localStorage.setItem('deals', JSON.stringify(n)); return d; }
    async deleteDeal(id:any) { const l=await this.getDeals(); localStorage.setItem('deals', JSON.stringify(l.filter((x:any)=>x.id!==id))); }
    async getTasks() { return JSON.parse(localStorage.getItem('tasks') || '[]'); }
    async saveTask(t:any) { const l=await this.getTasks(); localStorage.setItem('tasks', JSON.stringify([t,...l])); return t; }
    async updateTask(t:any) { const l=await this.getTasks(); const n=l.map((x:any)=>x.id===t.id?t:x); localStorage.setItem('tasks', JSON.stringify(n)); return t; }
    async deleteTask(id:any) { const l=await this.getTasks(); localStorage.setItem('tasks', JSON.stringify(l.filter((x:any)=>x.id!==id))); }
    async getInvoices() { return JSON.parse(localStorage.getItem('invoices') || '[]'); }
    async saveInvoice(i:any) { const l=await this.getInvoices(); localStorage.setItem('invoices', JSON.stringify([i,...l])); return i; }
    async updateInvoice(i:any) { const l=await this.getInvoices(); const n=l.map((x:any)=>x.id===i.id?i:x); localStorage.setItem('invoices', JSON.stringify(n)); return i; }
    async deleteInvoice(id:any) { const l=await this.getInvoices(); localStorage.setItem('invoices', JSON.stringify(l.filter((x:any)=>x.id!==id))); }
    async cancelInvoice(id:any) { return {}; }
    async getExpenses() { return JSON.parse(localStorage.getItem('expenses') || '[]'); }
    async saveExpense(e:any) { const l=await this.getExpenses(); localStorage.setItem('expenses', JSON.stringify([e,...l])); return e; }
    async updateExpense(e:any) { const l=await this.getExpenses(); const n=l.map((x:any)=>x.id===e.id?e:x); localStorage.setItem('expenses', JSON.stringify(n)); return e; }
    async deleteExpense(id:any) { const l=await this.getExpenses(); localStorage.setItem('expenses', JSON.stringify(l.filter((x:any)=>x.id!==id))); }
    async getUserProfile() { return JSON.parse(localStorage.getItem('userProfile') || 'null'); }
    async saveUserProfile(p:any) { localStorage.setItem('userProfile', JSON.stringify(p)); return p; }
    async getProductPresets() { return JSON.parse(localStorage.getItem('productPresets') || '[]'); }
    async saveProductPresets(p:any) { localStorage.setItem('productPresets', JSON.stringify(p)); return p; }
    async getInvoiceConfig() { 
        const raw = localStorage.getItem('invoiceConfig');
        const c = raw ? JSON.parse(raw) : { pdfTemplate: DEFAULT_PDF_TEMPLATE };
        if (!c.pdfTemplate) c.pdfTemplate = DEFAULT_PDF_TEMPLATE;
        return c;
    }
    async saveInvoiceConfig(c:any) { localStorage.setItem('invoiceConfig', JSON.stringify(c)); return c; }
    async getEmailTemplates() { return JSON.parse(localStorage.getItem('emailTemplates') || '[]'); }
    async saveEmailTemplate(t:any) { const l=await this.getEmailTemplates(); localStorage.setItem('emailTemplates', JSON.stringify([t,...l])); return t; }
    async updateEmailTemplate(t:any) { const l=await this.getEmailTemplates(); const n=l.map((x:any)=>x.id===t.id?t:x); localStorage.setItem('emailTemplates', JSON.stringify(n)); return t; }
    async deleteEmailTemplate(id:any) { const l=await this.getEmailTemplates(); localStorage.setItem('emailTemplates', JSON.stringify(l.filter((x:any)=>x.id!==id))); }
    async authenticate(t:any) { return { firstName: 'Local', lastName: 'User', email: 'local@syntax.lab', avatar: '', role: 'Admin' }; }
    async connectGoogle() { return false; }
    async disconnectGoogle() { return false; }
    async getIntegrationStatus() { return false; }
    async sendMail() { return false; }
    async checkUserAccess() { return true; }
    async inviteUser() {}
    async processDueRetainers() { return {updatedContacts:[], newInvoices:[], newActivities:[]}; }
    async runCommissionBatch() { return {createdInvoices:[], updatedSourceInvoices:[]}; }
    async checkAndInstallUpdate() { return false; }
    async getAppVersion() { return '1.3.37'; }
    async generatePdf(html: string) { 
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('generate-pdf', html);
        }
        return ''; 
    }
    async wipeAllData() { localStorage.clear(); window.location.reload(); }
    async fetchEmails(config:any, limit:any, unread:any, box:any) { return (window as any).require ? (window as any).require('electron').ipcRenderer.invoke('email-imap-fetch', config, limit, unread, box) : []; }
    async getEmailFolders(config:any) { return (window as any).require ? (window as any).require('electron').ipcRenderer.invoke('email-imap-get-boxes', config) : []; }
    async createEmailFolder(config:any, name:any) { return (window as any).require ? (window as any).require('electron').ipcRenderer.invoke('email-imap-create-folder', config, name) : false; }
    async deleteEmailFolder(config:any, path:any) { return (window as any).require ? (window as any).require('electron').ipcRenderer.invoke('email-imap-delete-folder', config, path) : false; }
    async markEmailRead(config:any, uid:any, box:any) { return (window as any).require ? (window as any).require('electron').ipcRenderer.invoke('email-mark-read', config, uid, box) : false; }
    async sendSmtpMail(config:any, to:any, sub:any, body:any) { return (window as any).require ? (window as any).require('electron').ipcRenderer.invoke('email-smtp-send', config, {to, subject:sub, body}) : false; }
    async getAllUsers() { return []; }
    async deleteProductPreset(id: string) { const l=await this.getProductPresets(); localStorage.setItem('productPresets', JSON.stringify(l.filter((p:any)=>p.id!==id))); }
}

let instance: IDataService | null = null;
export class DataServiceFactory {
    static create(config: BackendConfig): IDataService {
        if (!instance) {
            instance = config.mode === 'firebase' ? new FirebaseDataService(config) : new LocalDataService(config.googleClientId);
        }
        return instance;
    }
}
