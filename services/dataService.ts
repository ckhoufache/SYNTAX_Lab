
import { Contact, Deal, Task, Invoice, Expense, Activity, UserProfile, ProductPreset, InvoiceConfig, EmailTemplate, EmailAttachment, DealStage, BackupData, EmailMessage, BackendConfig } from '../types';
import { FirebaseDataService } from './firebaseService';

declare global {
    interface Window {
        google: any;
        gapi: any;
        require: any;
    }
}

export const DEFAULT_PDF_TEMPLATE = `<!DOCTYPE html>...`;

export const compileInvoiceTemplate = (invoice: Invoice, config: InvoiceConfig, contact?: Contact): string => {
    return '';
};

export const replaceEmailPlaceholders = (text: string, contact: Contact, config?: InvoiceConfig): string => {
   return text;
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
    async getInvoiceConfig() { return JSON.parse(localStorage.getItem('invoiceConfig') || '{}'); }
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
    async getAppVersion() { return '1.3.36'; }
    async generatePdf() { return ''; }
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
