
import { Contact, Deal, Task, UserProfile, ProductPreset, Theme, BackendConfig, BackendMode, BackupData, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate, EmailAttachment, DealStage } from '../types';

// Declare Google Types globally for TS
declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

const DEFAULT_PDF_TEMPLATE = `<!DOCTYPE html>
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
    checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void): Promise<boolean>;
    generatePdf(htmlContent: string): Promise<string>;
    wipeAllData(): Promise<void>;
}

class LocalDataService implements IDataService {
    private googleClientId?: string;
    private accessToken: string | null = null;
    
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
        this.accessToken = localStorage.getItem('google_access_token');
    }
    
    async init(): Promise<void> {
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

        return Promise.resolve();
    }

    private getFromStorage<T>(key: string, fallback: T): T {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    }

    private set<T>(key: keyof typeof this.cache, storageKey: string, data: T): void {
        this.cache[key] = data as any;
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error: any) {
             console.error("Storage Error", error);
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
        const list = this.cache.contacts || [];
        const newList = list.filter(c => c.id !== id);
        this.set('contacts', 'contacts', newList);
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

    // --- Integration Mocks / Logic ---
    async connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean> {
        // In a real app, you would handle OAuth flow here.
        // For local simulation, we just store a flag.
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
             // Here we would call the Google Gmail API
             return true; 
        } else {
             // If not connected, we can't send via API.
             // But UI handles mailto: links for user interaction.
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
        
        // Refresh cache references for mass updates handled above
        if (updatedContacts.length > 0) {
            const currentC = this.cache.contacts || [];
            this.set('contacts', 'contacts', currentC.map(c => updatedContacts.find(u => u.id === c.id) || c));
        }

        return { updatedContacts, newInvoices, newActivities };
    }

    async checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void): Promise<boolean> {
        // Mock Implementation for Electron Update check
        if (window.require) {
             statusCallback?.("Verbinde mit Update-Server...");
             // Simulate network delay
             await new Promise(r => setTimeout(r, 1000));
             statusCallback?.("Prüfe Version...");
             return false; // No update in mock
        }
        return false;
    }

    async generatePdf(htmlContent: string): Promise<string> {
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                const buffer = await ipcRenderer.invoke('generate-pdf', htmlContent);
                // Convert buffer to base64
                // Electron returns Uint8Array/Buffer
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
            // Browser Fallback (not possible to generate real PDF securely in client without libraries like jsPDF)
            // We throw error or return empty to handle in UI
            throw new Error("PDF Generierung nur in der Desktop-App verfügbar.");
        }
    }

    async wipeAllData(): Promise<void> {
        localStorage.clear();
        window.location.reload();
    }
    
    // --- ROBUST CSV PARSING ---
    private parseCSV(text: string): string[][] {
        const arr: string[][] = [];
        let quote = false;  // 'true' means we're inside a quoted field
        let col = 0;
        let row = 0;
        let c = "";
        
        // Initialize 2D array
        arr[row] = [];
        arr[row][col] = "";

        for (let i = 0; i < text.length; i++) {
            c = text[i];
            
            // Handle Quote
            if (c === '"') {
                if (quote && text[i+1] === '"') {
                    // Double quote inside quote = escaped quote
                    arr[row][col] += '"';
                    i++; 
                } else {
                    // Toggle quote status
                    quote = !quote;
                }
            } 
            // Handle Comma (only if not in quote)
            else if (c === ',' && !quote) {
                col++;
                arr[row][col] = "";
            } 
            // Handle Newline (only if not in quote)
            else if ((c === '\r' || c === '\n') && !quote) {
                // Handle Windows line ending \r\n
                if (c === '\r' && text[i+1] === '\n') i++;
                
                // Only move to next row if current row is not empty (ignoring trailing newlines)
                if (arr[row].some(cell => cell.length > 0) || col > 0) {
                    row++;
                    col = 0;
                    arr[row] = [];
                    arr[row][col] = "";
                }
            } 
            // Normal character
            else {
                arr[row][col] += c;
            }
        }
        
        // Clean up empty trailing row if present
        if(arr.length > 0 && arr[arr.length-1].length === 1 && arr[arr.length-1][0] === "") {
            arr.pop();
        }
        
        return arr;
    }

    async importContactsFromCSV(csvText: string): Promise<{ contacts: Contact[], deals: Deal[], activities: Activity[], skippedCount: number }> {
        // 1. Parse CSV correctly handling quotes and newlines
        const rows = this.parseCSV(csvText);
        
        if (rows.length < 2) throw new Error("CSV Datei scheint leer zu sein oder hat keine Daten.");

        // 2. Identify Headers (Normalize keys to handle slight variations and case insensitivity)
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        // Helper to get value by header name safely
        const getValue = (row: string[], headerName: string): string => {
            const index = headers.indexOf(headerName.toLowerCase());
            if (index === -1) return '';
            return row[index] ? row[index].trim() : '';
        };

        const contacts: Contact[] = [];
        const deals: Deal[] = [];
        const activities: Activity[] = [];
        let skippedCount = 0;

        const existingContacts = this.cache.contacts || [];

        // 3. Process Rows
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length === 0 || (row.length === 1 && !row[0])) continue;

            // Mapping Logic supporting both English and German headers
            const fullName = getValue(row, 'Name') || getValue(row, 'fullName');
            const firstName = getValue(row, 'First Name') || getValue(row, 'firstName') || getValue(row, 'Vorname');
            const lastName = getValue(row, 'Last Name') || getValue(row, 'lastName') || getValue(row, 'Nachname');
            
            // Name Fallback Logic
            let name = fullName;
            if (!name && firstName && lastName) name = `${firstName} ${lastName}`;
            if (!name && firstName) name = firstName;
            if (!name) name = 'Unbekannt';

            const company = getValue(row, 'Company') || getValue(row, 'companyName') || getValue(row, 'Firma');
            const email = getValue(row, 'Email Address') || getValue(row, 'Email');
            const linkedin = getValue(row, 'Profile URL') || getValue(row, 'linkedInProfileUrl') || getValue(row, 'Link');

            // Filter out junk rows (sometimes export tools add empty or meta rows)
            if (name === 'Unbekannt' && !company) continue;

            // --- DUPLICATE CHECK ---
            const isDuplicate = existingContacts.some(c => {
                const sameEmail = email && c.email && email.toLowerCase() === c.email.toLowerCase();
                const sameLinkedin = linkedin && c.linkedin && linkedin.toLowerCase() === c.linkedin.toLowerCase();
                const sameNameAndCompany = name && company && c.name.toLowerCase() === name.toLowerCase() && c.company.toLowerCase() === company.toLowerCase();
                return sameEmail || sameLinkedin || sameNameAndCompany;
            });

            const isDuplicateInBatch = contacts.some(c => {
                const sameEmail = email && c.email && email.toLowerCase() === c.email.toLowerCase();
                const sameLinkedin = linkedin && c.linkedin && linkedin.toLowerCase() === c.linkedin.toLowerCase();
                const sameNameAndCompany = name && company && c.name.toLowerCase() === name.toLowerCase() && c.company.toLowerCase() === company.toLowerCase();
                return sameEmail || sameLinkedin || sameNameAndCompany;
            });

            if (isDuplicate || isDuplicateInBatch) {
                skippedCount++;
                continue;
            }
            // --- END DUPLICATE CHECK ---

            // Notes aggregation
            const summary = getValue(row, 'summary');
            const desc = getValue(row, 'Description');
            const subTitle = getValue(row, 'Sub Title');
            const location = getValue(row, 'Location');
            const icebreaker = getValue(row, 'Icebreaker');
            
            let notesParts = [];
            if (summary) notesParts.push(summary);
            if (desc) notesParts.push(desc);
            if (icebreaker) notesParts.push(`Icebreaker: ${icebreaker}`);
            if (subTitle) notesParts.push(`Sub-Title: ${subTitle}`);
            if (location) notesParts.push(`Standort: ${location}`);

            const newContact: Contact = {
                id: crypto.randomUUID(),
                name: name,
                company: company,
                role: getValue(row, 'Job Title') || getValue(row, 'title') || getValue(row, 'Position'),
                companyUrl: getValue(row, 'regularCompanyUrl') || getValue(row, 'companyUrl'),
                email: email, 
                linkedin: linkedin,
                avatar: getValue(row, 'profileImageUrl'),
                notes: notesParts.join('\n\n'), 
                lastContact: new Date().toISOString().split('T')[0],
                type: 'lead'
            };

            // Avatar Fallback if empty or broken URL
            if (!newContact.avatar || newContact.avatar.length < 10) {
                 newContact.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
            }

            contacts.push(newContact);
            
            // Create Ghost Deal
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
        
        this.set('contacts', 'contacts', [...contacts, ...(this.cache.contacts || [])]);
        this.set('deals', 'deals', [...deals, ...(this.cache.deals || [])]);
        this.set('activities', 'activities', [...activities, ...(this.cache.activities || [])]);

        return { contacts, deals, activities, skippedCount };
    }
}

export class DataServiceFactory {
    static create(config: BackendConfig): IDataService {
        return new LocalDataService(config.googleClientId);
    }
}
