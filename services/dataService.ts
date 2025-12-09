

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
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Rechnung</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact; color: #1e293b; }
        .page { max-width: 210mm; margin: 0 auto; background: white; padding: 40px; min-height: 297mm; position: relative; }
        @media print { 
            body { background: white; } 
            .page { box-shadow: none; margin: 0; padding: 20px; width: 100%; } 
        }
    </style>
</head>
<body class="bg-gray-100">

<div class="page shadow-lg">
    <!-- TOP BAR (Small Info) -->
    <div class="text-[10px] text-gray-400 uppercase tracking-widest mb-12 border-b border-gray-100 pb-2">
        {companyName} • {addressLine1} • {addressLine2}
    </div>

    <!-- HEADER: LOGO & SENDER -->
    <div class="flex justify-between items-start mb-16">
        <div class="w-1/2">
             <!-- Logo Section -->
            <div class="mb-6 h-16 flex items-center">
                {logoSection}
            </div>
            <!-- Recipient Address Block (Window Envelope Style) -->
            <div class="text-sm leading-relaxed text-gray-800 bg-gray-50/50 p-4 rounded-lg border border-gray-100 inline-block min-w-[300px]">
                <p class="font-bold mb-1">{contactName}</p>
                <p>Musterstraße 123</p>
                <p>12345 Musterstadt</p>
                <p class="text-gray-500 mt-2 text-xs">{email}</p>
            </div>
        </div>

        <!-- INVOICE META DATA -->
        <div class="w-1/3 text-right">
            <h1 class="text-3xl font-bold text-slate-800 mb-6 tracking-tight">{titlePrefix}</h1>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between border-b border-gray-100 pb-1">
                    <span class="text-gray-500">Nummer:</span>
                    <span class="font-mono font-semibold">{invoiceNumber}</span>
                </div>
                <div class="flex justify-between border-b border-gray-100 pb-1">
                    <span class="text-gray-500">Datum:</span>
                    <span>{date}</span>
                </div>
                <div class="flex justify-between border-b border-gray-100 pb-1">
                    <span class="text-gray-500">Kundennr:</span>
                    <span>{customerId}</span>
                </div>
                 <div class="flex justify-between border-b border-gray-100 pb-1">
                    <span class="text-gray-500">Bearbeiter:</span>
                    <span>{footerText}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- CONTENT BODY -->
    <div class="mb-8">
        <h2 class="text-lg font-bold mb-2 text-slate-800">{description}</h2>
        <p class="text-sm text-gray-600 mb-6">
            Sehr geehrte Damen und Herren,<br>
            gemäß unserem Vertrag berechnen wir Ihnen folgende Leistungen:
        </p>
    </div>

    <!-- TABLE -->
    <table class="w-full text-left text-sm mb-12">
        <thead>
            <tr class="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                <th class="py-3 px-4 rounded-l-md">Pos.</th>
                <th class="py-3 px-4">Beschreibung</th>
                <th class="py-3 px-4 text-right">Menge</th>
                <th class="py-3 px-4 text-right">Einzelpreis</th>
                <th class="py-3 px-4 text-right rounded-r-md">Gesamt</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
            <tr>
                <td class="py-4 px-4 text-gray-400">01</td>
                <td class="py-4 px-4 font-medium text-slate-800">{description}</td>
                <td class="py-4 px-4 text-right text-gray-600">1,00</td>
                <td class="py-4 px-4 text-right text-gray-600">{netAmount}</td>
                <td class="py-4 px-4 text-right text-slate-800 font-medium">{netAmount}</td>
            </tr>
        </tbody>
    </table>

    <!-- TOTALS -->
    <div class="flex justify-end mb-16">
        <div class="w-1/2 space-y-2 text-sm">
            <div class="flex justify-between text-gray-600">
                <span>Nettobetrag</span>
                <span>{netAmount}</span>
            </div>
            <div class="flex justify-between text-gray-600">
                <span>{taxLabel}</span>
                <span>{taxAmount}</span>
            </div>
            <div class="flex justify-between text-xl font-bold text-slate-900 border-t-2 border-slate-800 pt-2 mt-2">
                <span>Gesamtbetrag</span>
                <span>{grossAmount}</span>
            </div>
        </div>
    </div>

    <!-- TERMS / FOOTER NOTE -->
    <div class="bg-slate-50 border-l-4 border-indigo-500 p-4 rounded-r text-xs text-gray-600 mb-12">
        <p class="font-bold text-indigo-900 mb-1">Zahlungsbedingungen:</p>
        <p>Bitte überweisen Sie den Betrag von <span class="font-bold">{grossAmount}</span> bis zum <span class="font-bold">{dueDate}</span> auf das unten genannte Konto.</p>
        <p class="mt-2 italic">{taxNote}</p>
    </div>

    <!-- FIXED FOOTER -->
    <div class="absolute bottom-10 left-10 right-10 border-t border-gray-200 pt-6 text-[9px] text-gray-500 grid grid-cols-3 gap-8">
        <div>
            <h4 class="font-bold text-gray-700 uppercase mb-1">{companyName}</h4>
            <p>{addressLine1}</p>
            <p>{addressLine2}</p>
            <p>{email}</p>
            <p>{website}</p>
        </div>
        <div>
            <h4 class="font-bold text-gray-700 uppercase mb-1">Bankverbindung</h4>
            <p>{bankName}</p>
            <p>IBAN: {iban}</p>
            <p>BIC: {bic}</p>
        </div>
        <div>
            <h4 class="font-bold text-gray-700 uppercase mb-1">Register & Steuer</h4>
            <p>Steuer-Nr: {taxId}</p>
            <p>Gerichtsstand: Berlin</p>
        </div>
    </div>

</div>
</body>
</html>`;

export const compileInvoiceTemplate = (invoice: Invoice, config: InvoiceConfig) => {
    if (!config.pdfTemplate) return "<h1>Fehler: Keine Vorlage gefunden</h1>";

    const isStorno = invoice.amount < 0;
    const isStandardTax = config.taxRule === 'standard';
    
    // Calculations
    const netAmount = Number(invoice.amount);
    const taxRate = isStandardTax ? 0.19 : 0;
    const taxAmount = netAmount * taxRate;
    const grossAmount = netAmount + taxAmount;

    let template = config.pdfTemplate;

    const replacements: Record<string, string> = {
        '{companyName}': config.companyName || '',
        '{addressLine1}': config.addressLine1 || '',
        '{addressLine2}': config.addressLine2 || '',
        '{email}': config.email || '',
        '{website}': config.website || '',
        '{taxId}': config.taxId || '',
        '{bankName}': config.bankName || '',
        '{iban}': config.iban || '',
        '{bic}': config.bic || '',
        '{footerText}': config.footerText || '',
        
        '{invoiceNumber}': invoice.invoiceNumber,
        '{date}': new Date(invoice.date).toLocaleDateString('de-DE'),
        '{customerId}': invoice.contactId.substring(0,6).toUpperCase(),
        '{contactName}': invoice.contactName,
        '{titlePrefix}': isStorno ? 'Gutschrift' : 'Rechnung',
        '{description}': invoice.description || 'Dienstleistung',
        
        '{netAmount}': netAmount.toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' €',
        '{taxAmount}': taxAmount.toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' €',
        '{grossAmount}': grossAmount.toLocaleString('de-DE', {minimumFractionDigits: 2}) + ' €',
        
        '{taxLabel}': isStandardTax ? 'Umsatzsteuer 19%' : 'Umsatzsteuer 0% (Kleinunternehmer)',
        '{taxNote}': !isStandardTax ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.' : '',
        '{dueDate}': invoice.date ? new Date(new Date(invoice.date).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE') : 'sofort',
        '{logoSection}': config.logoBase64 ? `<img src="${config.logoBase64}" style="max-height: 80px; width: auto;" alt="Logo"/>` : `<h1 style="font-size: 24px; font-weight: bold;">${config.companyName}</h1>`
    };

    // Replace all keys
    for (const [key, value] of Object.entries(replacements)) {
        template = template.replace(new RegExp(key, 'g'), value);
    }

    return template;
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
    saveUserProfile(profile: UserProfile): Promise<UserProfile>;
    getProductPresets(): Promise<ProductPreset[]>;
    saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]>;
    getInvoiceConfig(): Promise<InvoiceConfig>;
    saveInvoiceConfig(config: InvoiceConfig): Promise<InvoiceConfig>;
    getEmailTemplates(): Promise<EmailTemplate[]>;
    saveEmailTemplate(template: EmailTemplate): Promise<EmailTemplate>;
    updateEmailTemplate(template: EmailTemplate): Promise<EmailTemplate>;
    deleteEmailTemplate(id: string): Promise<void>;
    connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean>;
    disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean>;
    getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean>;
    sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean>;
    processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }>;
    checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void, force?: boolean): Promise<boolean>;
    generatePdf(htmlContent: string): Promise<string>;
    wipeAllData(): Promise<void>;
}

class LocalDataService implements IDataService {
    private googleClientId?: string;
    private initialized: boolean = false;
    
    // IMPORTANT: Singleton Cache. Do not reset on constructor.
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
        if (this.initialized && this.cache.contacts !== null) {
            return Promise.resolve();
        }

        // --- SHADOW BACKUP CHECK (EMERGENCY RESTORE) ---
        // If main contacts are empty, but backup exists, restore automatically
        const mainContacts = this.getFromStorage<Contact[]>('contacts', []);
        if (mainContacts.length === 0) {
            const backupContacts = this.getFromStorage<Contact[]>('contacts_mirror', []);
            if (backupContacts.length > 0) {
                console.warn("⚠️ Data Loss Detected! Restoring from Shadow Backup...");
                this.set('contacts', 'contacts', backupContacts);
                alert("WICHTIG: Ihre Kontakte waren verschwunden, wurden aber aus dem Sicherheits-Backup wiederhergestellt.");
            }
        }
        
        // Ensure defaults
        if (!localStorage.getItem('contacts')) localStorage.setItem('contacts', JSON.stringify([]));
        if (!localStorage.getItem('deals')) localStorage.setItem('deals', JSON.stringify([]));
        if (!localStorage.getItem('tasks')) localStorage.setItem('tasks', JSON.stringify([]));
        if (!localStorage.getItem('invoices')) localStorage.setItem('invoices', JSON.stringify([]));
        if (!localStorage.getItem('expenses')) localStorage.setItem('expenses', JSON.stringify([]));
        if (!localStorage.getItem('activities')) localStorage.setItem('activities', JSON.stringify([]));
        if (!localStorage.getItem('emailTemplates')) localStorage.setItem('emailTemplates', JSON.stringify([]));

        this.cache.contacts = this.getFromStorage<Contact[]>('contacts', []);
        this.cache.activities = this.getFromStorage<Activity[]>('activities', []);
        this.cache.deals = this.getFromStorage<Deal[]>('deals', []);
        this.cache.tasks = this.getFromStorage<Task[]>('tasks', []);
        this.cache.invoices = this.getFromStorage<Invoice[]>('invoices', []);
        this.cache.expenses = this.getFromStorage<Expense[]>('expenses', []);
        this.cache.emailTemplates = this.getFromStorage<EmailTemplate[]>('emailTemplates', []);
        this.cache.productPresets = this.getFromStorage<ProductPreset[]>('productPresets', []);
        
        let profile = this.getFromStorage<UserProfile | null>('userProfile', null);
        if (!profile) {
            profile = {
                firstName: "Benutzer",
                lastName: "",
                email: "",
                role: "Admin",
                avatar: "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff"
            };
            this.saveUserProfile(profile);
        }
        this.cache.userProfile = profile;
        
        this.cache.invoiceConfig = this.getFromStorage<InvoiceConfig>('invoiceConfig', {
            companyName: '[Firmenname]',
            addressLine1: '[Straße & Hausnummer]',
            addressLine2: '[PLZ & Ort]',
            taxId: '[Steuernummer]',
            bankName: '[Bankname]',
            iban: '[IBAN]',
            bic: '[BIC]',
            email: '[E-Mail Adresse]',
            website: '[Webseite]',
            footerText: '[Geschäftsführer / HRB / Gerichtsstand]',
            taxRule: 'small_business',
            pdfTemplate: DEFAULT_PDF_TEMPLATE,
            emailSettings: {
                welcome: { subject: '', body: '', attachments: [], enabled: false },
                invoice: { subject: '', body: '', attachments: [] },
                offer: { subject: '', body: '', attachments: [] },
                reminder: { subject: '', body: '', attachments: [] }
            }
        });
        
        if (!this.cache.invoiceConfig.pdfTemplate) {
            this.cache.invoiceConfig.pdfTemplate = DEFAULT_PDF_TEMPLATE;
            this.saveInvoiceConfig(this.cache.invoiceConfig);
        }

        this.initialized = true;
        return Promise.resolve();
    }

    private getFromStorage<T>(key: string, fallback: T): T {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : fallback;
        } catch(e) {
            console.error(`Error loading key ${key} from LS`, e);
            return fallback;
        }
    }

    private set<T>(key: keyof typeof this.cache, storageKey: string, data: T): void {
        this.cache[key] = data as any;
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
            
            // --- SHADOW BACKUP SYSTEM ---
            // If we are saving contacts, and the list is NOT empty, verify it in the mirror
            if (storageKey === 'contacts' && Array.isArray(data) && data.length > 0) {
                localStorage.setItem('contacts_mirror', JSON.stringify(data));
            }
        } catch (error: any) {
             console.error("Storage Error (Quota exceeded?)", error);
        }
    }

    // --- CRUD Contacts ---
    async getContacts(): Promise<Contact[]> { return this.cache.contacts || []; }
    async saveContact(contact: Contact): Promise<Contact> {
        const list = this.cache.contacts || [];
        const newList = [contact, ...list];
        this.set('contacts', 'contacts', newList);
        return contact;
    }
    async updateContact(contact: Contact): Promise<Contact> {
        const list = this.cache.contacts || [];
        const newList = list.map(c => c.id === contact.id ? contact : c);
        this.set('contacts', 'contacts', newList);
        return contact;
    }
    async deleteContact(id: string): Promise<void> {
        // Cascade Delete: Delete related entities
        const deals = this.cache.deals || [];
        const tasks = this.cache.tasks || [];
        const activities = this.cache.activities || [];
        const contacts = this.cache.contacts || [];

        // Filter out items related to this contact
        const newDeals = deals.filter(d => d.contactId !== id);
        const newTasks = tasks.filter(t => t.relatedEntityId !== id);
        const newActivities = activities.filter(a => a.contactId !== id);
        const newContacts = contacts.filter(c => c.id !== id);

        // Update storage
        this.set('deals', 'deals', newDeals);
        this.set('tasks', 'tasks', newTasks);
        this.set('activities', 'activities', newActivities);
        this.set('contacts', 'contacts', newContacts);
    }

    // --- CRUD Activities ---
    async getActivities(): Promise<Activity[]> { return this.cache.activities || []; }
    async saveActivity(a: Activity): Promise<Activity> { 
        const l = this.cache.activities || []; 
        this.set('activities','activities',[a,...l]); 
        return a; 
    }
    async deleteActivity(id: string): Promise<void> {
        const list = this.cache.activities || [];
        const newList = list.filter(a => a.id !== id);
        this.set('activities', 'activities', newList);
    }

    // --- CRUD Deals ---
    async getDeals(): Promise<Deal[]> { return this.cache.deals || []; }
    async saveDeal(deal: Deal): Promise<Deal> {
        const list = this.cache.deals || [];
        this.set('deals', 'deals', [deal, ...list]);
        return deal;
    }
    async updateDeal(deal: Deal): Promise<Deal> {
        const list = this.cache.deals || [];
        const newList = list.map(d => d.id === deal.id ? deal : d);
        this.set('deals', 'deals', newList);
        return deal;
    }
    async deleteDeal(id: string): Promise<void> {
        const list = this.cache.deals || [];
        const newList = list.filter(d => d.id !== id);
        this.set('deals', 'deals', newList);
    }

    // --- CRUD Tasks ---
    async getTasks(): Promise<Task[]> { return this.cache.tasks || []; }
    async saveTask(task: Task): Promise<Task> {
        const list = this.cache.tasks || [];
        this.set('tasks', 'tasks', [task, ...list]);
        return task;
    }
    async updateTask(task: Task): Promise<Task> {
        const list = this.cache.tasks || [];
        const newList = list.map(t => t.id === task.id ? task : t);
        this.set('tasks', 'tasks', newList);
        return task;
    }
    async deleteTask(id: string): Promise<void> {
        const list = this.cache.tasks || [];
        const newList = list.filter(t => t.id !== id);
        this.set('tasks', 'tasks', newList);
    }

    // --- CRUD Invoices ---
    async getInvoices(): Promise<Invoice[]> { return this.cache.invoices || []; }
    async saveInvoice(invoice: Invoice): Promise<Invoice> {
        const list = this.cache.invoices || [];
        this.set('invoices', 'invoices', [invoice, ...list]);
        return invoice;
    }
    async updateInvoice(invoice: Invoice): Promise<Invoice> {
        const list = this.cache.invoices || [];
        const newList = list.map(i => i.id === invoice.id ? invoice : i);
        this.set('invoices', 'invoices', newList);
        return invoice;
    }
    async deleteInvoice(id: string): Promise<void> {
        const list = this.cache.invoices || [];
        const newList = list.filter(i => i.id !== id);
        this.set('invoices', 'invoices', newList);
    }
    async cancelInvoice(id: string): Promise<{ creditNote: Invoice, updatedOriginal: Invoice, activity: Activity }> {
        const invoice = (this.cache.invoices || []).find(i => i.id === id);
        if (!invoice) throw new Error("Rechnung nicht gefunden");

        const creditNote: Invoice = {
            ...invoice,
            id: crypto.randomUUID(),
            invoiceNumber: `STORNO-${invoice.invoiceNumber}`,
            amount: -invoice.amount,
            description: `Storno für ${invoice.invoiceNumber}`,
            date: new Date().toISOString().split('T')[0],
            isCancelled: true,
            relatedInvoiceId: invoice.id
        };

        const updatedOriginal: Invoice = { ...invoice, isCancelled: true, isPaid: true };
        
        await this.updateInvoice(updatedOriginal);
        await this.saveInvoice(creditNote);
        
        const activity: Activity = {
             id: crypto.randomUUID(),
             contactId: invoice.contactId,
             type: 'system_invoice',
             content: `Rechnung ${invoice.invoiceNumber} storniert.`,
             date: new Date().toISOString().split('T')[0],
             timestamp: new Date().toISOString()
        };
        await this.saveActivity(activity);

        return { creditNote, updatedOriginal, activity };
    }

    // --- CRUD Expenses ---
    async getExpenses(): Promise<Expense[]> { return this.cache.expenses || []; }
    async saveExpense(expense: Expense): Promise<Expense> {
        const list = this.cache.expenses || [];
        this.set('expenses', 'expenses', [expense, ...list]);
        return expense;
    }
    async updateExpense(expense: Expense): Promise<Expense> {
        const list = this.cache.expenses || [];
        const newList = list.map(e => e.id === expense.id ? expense : e);
        this.set('expenses', 'expenses', newList);
        return expense;
    }
    async deleteExpense(id: string): Promise<void> {
        const list = this.cache.expenses || [];
        const newList = list.filter(e => e.id !== id);
        this.set('expenses', 'expenses', newList);
    }

    // --- User Profile & Config ---
    async getUserProfile(): Promise<UserProfile | null> { return this.cache.userProfile; }
    async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
        this.set('userProfile', 'userProfile', profile);
        return profile;
    }

    async getProductPresets(): Promise<ProductPreset[]> { return this.cache.productPresets || []; }
    async saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]> {
        this.set('productPresets', 'productPresets', presets);
        return presets;
    }

    async getInvoiceConfig(): Promise<InvoiceConfig> { 
        // Force type assertion as we ensure it's loaded in init()
        return this.cache.invoiceConfig as InvoiceConfig; 
    }
    async saveInvoiceConfig(config: InvoiceConfig): Promise<InvoiceConfig> {
        this.set('invoiceConfig', 'invoiceConfig', config);
        return config;
    }

    // --- Email Templates ---
    async getEmailTemplates(): Promise<EmailTemplate[]> { return this.cache.emailTemplates || []; }
    async saveEmailTemplate(template: EmailTemplate): Promise<EmailTemplate> {
        const list = this.cache.emailTemplates || [];
        this.set('emailTemplates', 'emailTemplates', [template, ...list]);
        return template;
    }
    async updateEmailTemplate(template: EmailTemplate): Promise<EmailTemplate> {
        const list = this.cache.emailTemplates || [];
        const newList = list.map(t => t.id === template.id ? template : t);
        this.set('emailTemplates', 'emailTemplates', newList);
        return template;
    }
    async deleteEmailTemplate(id: string): Promise<void> {
        const list = this.cache.emailTemplates || [];
        const newList = list.filter(t => t.id !== id);
        this.set('emailTemplates', 'emailTemplates', newList);
    }
    
    // --- Backup Restore ---
    async restoreBackup(data: BackupData): Promise<void> {
        // Just overwrite local storage keys directly using the cache setters
        this.set('contacts', 'contacts', data.contacts);
        this.set('deals', 'deals', data.deals);
        this.set('tasks', 'tasks', data.tasks);
        this.set('invoices', 'invoices', data.invoices);
        this.set('expenses', 'expenses', data.expenses);
        this.set('activities', 'activities', data.activities);
        this.set('productPresets', 'productPresets', data.productPresets);
        this.set('emailTemplates', 'emailTemplates', data.emailTemplates || []);
        this.set('userProfile', 'userProfile', data.userProfile);
        this.set('invoiceConfig', 'invoiceConfig', data.invoiceConfig);
    }

    // --- Integration Mocks / Logic ---
    async connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean> {
        localStorage.setItem(`google_${service}_connected`, 'true');
        return true;
    }
    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        localStorage.removeItem(`google_${service}_connected`);
        return false;
    }
    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        return localStorage.getItem(`google_${service}_connected`) === 'true';
    }

    async sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean> {
        const connected = await this.getIntegrationStatus('mail');
        if (connected) {
             console.log(`[Mock Send] Email to ${to} with subject "${subject}" (Attachments: ${attachments?.length || 0})`);
             return true; 
        } else {
             console.warn("Mail not connected, cannot background send.");
             return false;
        }
    }

    async processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }> {
        const contacts = this.cache.contacts || [];
        const updatedContacts: Contact[] = [];
        const newInvoices: Invoice[] = [];
        const newActivities: Activity[] = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Helper to get next date
        const getNextDate = (dateStr: string, interval: 'monthly' | 'quarterly' | 'yearly') => {
            const d = new Date(dateStr);
            if(interval === 'monthly') d.setMonth(d.getMonth() + 1);
            if(interval === 'quarterly') d.setMonth(d.getMonth() + 3);
            if(interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
            return d.toISOString().split('T')[0];
        };

        for (const contact of contacts) {
            if (contact.retainerActive && contact.retainerAmount && contact.retainerNextBilling) {
                if (contact.retainerNextBilling <= todayStr) {
                    // Generate Invoice
                    const inv: Invoice = {
                        id: crypto.randomUUID(),
                        invoiceNumber: `RET-${Date.now()}-${Math.floor(Math.random()*100)}`,
                        description: `Retainer ${contact.retainerInterval} (${contact.retainerNextBilling})`,
                        amount: contact.retainerAmount,
                        date: todayStr,
                        contactId: contact.id,
                        contactName: contact.name,
                        isPaid: false
                    };
                    newInvoices.push(inv);
                    await this.saveInvoice(inv);

                    // Update Contact
                    const updatedContact = { 
                        ...contact, 
                        retainerNextBilling: getNextDate(contact.retainerNextBilling, contact.retainerInterval || 'monthly') 
                    };
                    updatedContacts.push(updatedContact);
                    await this.updateContact(updatedContact);

                    // Activity
                    const act: Activity = {
                        id: crypto.randomUUID(),
                        contactId: contact.id,
                        type: 'system_invoice',
                        content: `Retainer-Rechnung erstellt: ${inv.invoiceNumber}`,
                        date: todayStr,
                        timestamp: new Date().toISOString()
                    };
                    newActivities.push(act);
                    await this.saveActivity(act);
                }
            }
        }
        
        if (updatedContacts.length > 0) {
            const currentC = this.cache.contacts || [];
            this.set('contacts', 'contacts', currentC.map(c => updatedContacts.find(u => u.id === c.id) || c));
        }

        return { updatedContacts, newInvoices, newActivities };
    }

    async checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void, force: boolean = false): Promise<boolean> {
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                
                // 1. Get current version
                const currentVersion = await ipcRenderer.invoke('get-app-version');
                statusCallback?.(`Lokale Version: ${currentVersion}`);
                
                // 2. Clean URL and fetch remote version
                const baseUrl = url.replace(/\/$/, '');
                statusCallback?.(`Prüfe URL: ${baseUrl}/version.json...`);
                
                let remoteVersion = "0.0.0";
                
                if (!force) {
                    try {
                        const versionResponse = await fetch(`${baseUrl}/version.json?t=${Date.now()}`); // CACHE BUSTER
                        if (!versionResponse.ok) throw new Error(`HTTP ${versionResponse.status}`);
                        const remoteData = await versionResponse.json();
                        remoteVersion = remoteData.version;
                        statusCallback?.(`Server Version: ${remoteVersion}`);
                    } catch(e: any) {
                        statusCallback?.(`Versions-Check fehlgeschlagen: ${e.message}`);
                        // If force is not enabled, we stop here on error
                        throw e;
                    }

                    // 3. Compare (Simple Semantic Versioning Check)
                    const v1 = currentVersion.split('.').map(Number);
                    const v2 = remoteVersion.split('.').map(Number);
                    let updateAvailable = false;
                    
                    for(let i=0; i<3; i++) {
                        if ((v2[i] || 0) > (v1[i] || 0)) { updateAvailable = true; break; }
                        if ((v2[i] || 0) < (v1[i] || 0)) { break; }
                    }

                    if (!updateAvailable) {
                        statusCallback?.("System ist aktuell (Kein Update nötig).");
                        return false;
                    }
                } else {
                    statusCallback?.("Erzwinge Update (Überspringe Versionsprüfung)...");
                }

                statusCallback?.(`Lade index.html...`);

                // 4. Download index.html to parse assets
                let indexText = "";
                try {
                    // Aggressive Cache Busting
                    const indexResponse = await fetch(`${baseUrl}/index.html?cb=${Date.now()}`, { cache: 'no-store' });
                    if (!indexResponse.ok) throw new Error("Index.html nicht gefunden");
                    indexText = await indexResponse.text();
                } catch(e: any) {
                    if (force) {
                        throw new Error(`Kritischer Fehler: index.html nicht erreichbar. ${e.message}`);
                    }
                    throw e;
                }

                // 5. Extract Assets (Vite hashed JS and CSS)
                const filesToDownload: { name: string, content: string, type: 'file' | 'asset', encoding?: string }[] = [];
                filesToDownload.push({ name: 'index.html', content: indexText, type: 'file' });

                // RegEx to find /assets/index-....js and .css
                const assetRegex = /["'](?:\.|)\/assets\/([^"']+)["']/g;
                let match;
                const assetsToFetch = new Set<string>();

                while ((match = assetRegex.exec(indexText)) !== null) {
                    assetsToFetch.add(match[1]);
                }
                
                // Also manually add version.json to the list to update local state next time
                filesToDownload.push({ name: 'version.json', content: JSON.stringify({version: remoteVersion || '1.2.1'}), type: 'file' });

                // 6. Download Assets (UPDATED to handle BINARY)
                for (const assetName of assetsToFetch) {
                    statusCallback?.(`Lade Asset: ${assetName}...`);
                    try {
                        const assetRes = await fetch(`${baseUrl}/assets/${assetName}?t=${Date.now()}`, { cache: 'no-store' });
                        if(assetRes.ok) {
                            // Convert Blob to Base64 to safely pass through IPC
                            const blob = await assetRes.blob();
                            const base64 = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(blob);
                            });
                            // Remove data URL prefix (e.g. "data:application/javascript;base64,")
                            const cleanBase64 = base64.split(',')[1];
                            
                            filesToDownload.push({ 
                                name: assetName, 
                                content: cleanBase64, 
                                type: 'asset',
                                encoding: 'base64' // Flag for main process
                            });
                        } else {
                            statusCallback?.(`Warnung: Asset ${assetName} nicht gefunden.`);
                        }
                    } catch (e) {
                        console.warn(`Asset load fail: ${assetName}`, e);
                    }
                }

                // 7. Install
                statusCallback?.("Installiere Update...");
                const result = await ipcRenderer.invoke('install-update', filesToDownload);

                if (result.success) {
                    statusCallback?.("Update erfolgreich. Starte neu...");
                    await new Promise(r => setTimeout(r, 1000));
                    await ipcRenderer.invoke('restart-app');
                    return true;
                } else {
                    throw new Error(result.error);
                }

            } catch (e: any) {
                console.error("Update Error", e);
                statusCallback?.(`Fehler: ${e.message}`);
                throw e;
            }
        }
        return false;
    }

    async generatePdf(htmlContent: string): Promise<string> {
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                const buffer = await ipcRenderer.invoke('generate-pdf', htmlContent);
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                return window.btoa(binary);
            } catch (e) {
                console.error("Electron PDF Gen Error", e);
                throw e;
            }
        } else {
            throw new Error("PDF Generierung nur in der Desktop-App verfügbar.");
        }
    }

    async wipeAllData(): Promise<void> {
        localStorage.clear();
        this.cache = {
            contacts: [], activities: [], deals: [], tasks: [], invoices: [], expenses: [],
            userProfile: null, productPresets: [], invoiceConfig: null, emailTemplates: []
        };
        window.location.reload();
    }
    
    // --- ROBUST CSV PARSING ---
    private parseCSV(text: string): string[][] {
        const arr: string[][] = [];
        let quote = false;
        let col = 0;
        let row = 0;
        let c = "";
        
        arr[row] = [];
        arr[row][col] = "";

        for (let i = 0; i < text.length; i++) {
            c = text[i];
            
            if (c === '"') {
                if (quote && text[i+1] === '"') {
                    arr[row][col] += '"';
                    i++; 
                } else {
                    quote = !quote;
                }
            } 
            else if (c === ',' && !quote) {
                col++;
                arr[row][col] = "";
            } 
            else if ((c === '\r' || c === '\n') && !quote) {
                if (c === '\r' && text[i+1] === '\n') i++;
                
                if (arr[row].some(cell => cell.length > 0) || col > 0) {
                    row++;
                    col = 0;
                    arr[row] = [];
                    arr[row][col] = "";
                }
            } 
            else {
                arr[row][col] += c;
            }
        }
        
        if(arr.length > 0 && arr[arr.length-1].length === 1 && arr[arr.length-1][0] === "") {
            arr.pop();
        }
        
        return arr;
    }

    async importContactsFromCSV(csvText: string): Promise<{ contacts: Contact[], deals: Deal[], activities: Activity[], skippedCount: number }> {
        const rows = this.parseCSV(csvText);
        
        if (rows.length < 2) throw new Error("CSV Datei scheint leer zu sein oder hat keine Daten.");

        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^[\uFEFF\uFFFE]/, ''));
        
        const getVal = (row: string[], headerPatterns: string[]): string => {
            const index = headers.findIndex(h => headerPatterns.some(p => h.includes(p.toLowerCase())));
            return index > -1 && row[index] ? row[index].trim() : '';
        };

        if (!this.cache.contacts) {
             this.cache.contacts = this.getFromStorage<Contact[]>('contacts', []);
        }
        const existingContacts = this.cache.contacts || [];

        const contacts: Contact[] = [];
        const deals: Deal[] = [];
        const activities: Activity[] = [];
        let skippedCount = 0;

        // --- IMPROVED DUPLICATION DETECTION ---
        const signatures = new Set<string>();

        const normalizeLinkedIn = (url: string | undefined) => {
            if (!url) return '';
            let s = url.toLowerCase().trim();
            if(s.length < 5) return '';
            s = s.replace(/^https?:\/\//, '').replace(/^www\./, '');
            const idx = s.indexOf('linkedin.com/');
            if (idx !== -1) s = s.substring(idx + 'linkedin.com/'.length);
            if (s.endsWith('/')) s = s.slice(0, -1);
            s = s.replace(/^(in|pub|profile)\//, '');
            return s.split('?')[0]; 
        };

        const clean = (str: string | undefined | null) => {
            if (!str) return '';
            const s = str.trim().toLowerCase();
            if (['-', 'n/a', 'null', 'undefined', 'false', 'true'].includes(s)) return '';
            // Remove all non-alphanumeric chars for strict comparison
            return s.replace(/[^a-z0-9]/g, '');
        };
        
        const addSignature = (c: Contact) => {
            if (c.email) signatures.add(`em:${clean(c.email)}`);
            const li = normalizeLinkedIn(c.linkedin);
            if (li) signatures.add(`li:${li}`);
            const cName = clean(c.name);
            const cComp = clean(c.company);
            if (cName && cComp) signatures.add(`nc:${cName}|${cComp}`);
            // Backup signature: Just Name, but only if name is long enough to be uniqueish
            else if (cName && cName.length > 5) signatures.add(`n:${cName}`);
        };

        existingContacts.forEach(addSignature);

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length === 0 || (row.length === 1 && !row[0])) continue;

            // Updated Parsing Logic for Split Names
            const firstName = getVal(row, ['vorname', 'firstname', 'first name']);
            const lastName = getVal(row, ['nachname', 'lastname', 'last name']);
            const fullNameHeader = getVal(row, ['name', 'fullname', 'voller name']);

            let name = '';
            if (firstName && lastName) {
                name = `${firstName} ${lastName}`;
            } else if (fullNameHeader) {
                name = fullNameHeader;
            } else if (firstName) {
                name = firstName;
            } else {
                name = 'Unbekannt';
            }

            const company = getVal(row, ['company', 'firma', 'organization', 'companyname']);
            const email = getVal(row, ['email', 'e-mail', 'mail']);
            
            // Map 'Link' specifically to LinkedIn
            const linkedin = getVal(row, ['link', 'linkedin', 'profile', 'url', 'web']);

            if (name === 'Unbekannt' && !company) continue;

            const rowName = clean(name);
            const rowEmail = clean(email);
            const rowLi = normalizeLinkedIn(linkedin);
            const rowComp = clean(company);
            
            let isDuplicate = false;
            let duplicateReason = "";

            if (rowLi && signatures.has(`li:${rowLi}`)) {
                isDuplicate = true;
                duplicateReason = `LinkedIn ID: ${rowLi}`;
            }
            else if (rowEmail && signatures.has(`em:${rowEmail}`)) {
                isDuplicate = true;
                duplicateReason = `Email: ${rowEmail}`;
            }
            else if (rowName && rowComp && signatures.has(`nc:${rowName}|${rowComp}`)) {
                isDuplicate = true;
                duplicateReason = `Name+Firma: ${rowName}|${rowComp}`;
            }
            else if (rowName && rowName.length > 5 && signatures.has(`n:${rowName}`)) {
                if (!rowComp && !rowEmail && !rowLi) {
                    isDuplicate = true;
                    duplicateReason = `Name (Weak): ${rowName}`;
                }
            }

            if (isDuplicate) {
                console.log(`Skipping duplicate: ${name} (${duplicateReason})`);
                skippedCount++;
                continue;
            }

            // Temp contact for signature tracking within same import batch
            const tempContact = { name, email, linkedin, company } as Contact;
            addSignature(tempContact);
            
            // Map Icebreaker to Notes
            const icebreaker = getVal(row, ['icebreaker']);
            const summary = getVal(row, ['summary']);
            const desc = getVal(row, ['description']);
            
            let notesParts = [];
            if (icebreaker) notesParts.push(`Icebreaker: ${icebreaker}`);
            if (summary) notesParts.push(summary);
            if (desc) notesParts.push(desc);

            const newContact: Contact = {
                id: crypto.randomUUID(),
                name: name,
                company: company,
                role: getVal(row, ['role', 'position', 'job', 'title']),
                companyUrl: getVal(row, ['companyurl', 'website']),
                email: email, 
                linkedin: linkedin,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                notes: notesParts.join('\n\n'), 
                lastContact: new Date().toISOString().split('T')[0],
                type: 'lead'
            };

            contacts.push(newContact);
            
            const deal: Deal = {
                id: crypto.randomUUID(),
                title: 'Neuer Lead (Import)',
                value: 0,
                stage: DealStage.LEAD,
                contactId: newContact.id,
                dueDate: new Date().toISOString().split('T')[0],
                stageEnteredDate: new Date().toISOString().split('T')[0],
                isPlaceholder: true
            };
            deals.push(deal);

            activities.push({
                id: crypto.randomUUID(),
                contactId: newContact.id,
                type: 'system_deal',
                content: 'Kontakt importiert (CSV)',
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString()
             });
        }
        
        const finalContacts = [...(this.cache.contacts || []), ...contacts];
        this.set('contacts', 'contacts', finalContacts);
        
        const finalDeals = [...(this.cache.deals || []), ...deals];
        this.set('deals', 'deals', finalDeals);
        
        const finalActivities = [...(this.cache.activities || []), ...activities];
        this.set('activities', 'activities', finalActivities);

        return { contacts, deals, activities, skippedCount };
    }
}

let instance: IDataService | null = null;

export class DataServiceFactory {
    static create(config: BackendConfig): IDataService {
        // If config mode changed, we might need to recreate instance
        // For simplicity in this React usage, we assume simple singleton or hot swap.
        // In a real app we might need to teardown the old connection.
        
        // Simple Logic: if existing instance is Local and requested is Firebase, kill it.
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