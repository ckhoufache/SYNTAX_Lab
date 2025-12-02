
// ... existing imports ...
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
            <!-- Platzhalter für weitere Zeilen -->
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

// ... existing interface ...
export interface IDataService {
    init(): Promise<void>;
    getContacts(): Promise<Contact[]>;
    saveContact(contact: Contact): Promise<Contact>;
    updateContact(contact: Contact): Promise<Contact>;
    deleteContact(id: string): Promise<void>;
    importContactsFromCSV(csvText: string): Promise<{ contacts: Contact[], deals: Deal[], activities: Activity[] }>;
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
    getUserProfile(): Promise<UserProfile>;
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
    loginWithGoogle(): Promise<UserProfile | null>;
    logout(): Promise<void>;
    sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean>;
    processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }>;
    checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void): Promise<boolean>;
    generatePdf(htmlContent: string): Promise<string>;
    wipeAllData(): Promise<void>;
}

// ... LocalDataService implementation ...
class LocalDataService implements IDataService {
    // ... props ...
    private googleClientId?: string;
    private accessToken: string | null = null;
    private isPreviewEnv: boolean = false;
    
    // ... cache ...
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

    private isSyncing: boolean = false;

    constructor(googleClientId?: string) {
        this.googleClientId = googleClientId;
        this.accessToken = localStorage.getItem('google_access_token');
        try {
            if (window.location.protocol === 'blob:' || window.parent !== window) {
                this.isPreviewEnv = true;
            }
        } catch(e) { this.isPreviewEnv = true; }
    }
    
    // ... init method ...
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
        
        this.cache.userProfile = this.getFromStorage<UserProfile>('userProfile', {
            firstName: 'Benutzer',
            lastName: '',
            email: '',
            role: 'Admin',
            avatar: 'https://ui-avatars.com/api/?name=Admin&background=random'
        });
        
        this.cache.productPresets = this.getFromStorage<ProductPreset[]>('productPresets', []);
        
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
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                 alert("Speicherlimit erreicht! Das Bild ist zu groß für den lokalen Browserspeicher. Änderungen konnten nicht permanent gespeichert werden.");
            } else {
                console.error("Storage Error", error);
            }
        }
    }

    // ... CRUD Methods (Keep existing) ...
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
    
    // ... (All other simple CRUD methods for deals, tasks, activities, etc. remain the same as previous) ...
    async importContactsFromCSV(csvText: string): Promise<{ contacts: Contact[], deals: Deal[], activities: Activity[] }> {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const contacts: Contact[] = [];
        const deals: Deal[] = [];
        const activities: Activity[] = [];

        // Helper to find index
        const idx = (name: string) => headers.findIndex(h => h.includes(name));

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            
            const name = cols[idx('name')] || cols[idx('vorname')] || 'Unbekannt';
            const email = cols[idx('email')] || '';
            const company = cols[idx('firma')] || cols[idx('company')] || '';
            
            if (name === 'Unbekannt' && !email && !company) continue;

            const newContact: Contact = {
                id: crypto.randomUUID(),
                name,
                email,
                company,
                role: cols[idx('role')] || cols[idx('position')] || '',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                lastContact: new Date().toISOString().split('T')[0],
                notes: 'Importiert aus CSV',
                type: 'lead'
            };
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

            // Log Activity
            activities.push({
                id: crypto.randomUUID(),
                contactId: newContact.id,
                type: 'system_deal',
                content: 'Kontakt importiert (CSV)',
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString()
            });
        }
        
        // Save to cache
        this.set('contacts', 'contacts', [...contacts, ...(this.cache.contacts || [])]);
        this.set('deals', 'deals', [...deals, ...(this.cache.deals || [])]);
        this.set('activities', 'activities', [...activities, ...(this.cache.activities || [])]);

        return { contacts, deals, activities };
    }
    
    // ... Implement missing CRUDs for compilation ...
    async getActivities() { return this.cache.activities || []; }
    async saveActivity(a: any) { const l = this.cache.activities||[]; this.set('activities','activities',[a,...l]); return a; }
    async deleteActivity(id: any) { const l = this.cache.activities||[]; this.set('activities','activities',l.filter(x=>x.id!==id)); }
    async getDeals() { return this.cache.deals || []; }
    async saveDeal(d: any) { const l = this.cache.deals||[]; this.set('deals','deals',[d,...l]); return d; }
    async updateDeal(d: any) { const l = this.cache.deals||[]; this.set('deals','deals',l.map(x=>x.id===d.id?d:x)); return d; }
    async deleteDeal(id: any) { const l = this.cache.deals||[]; this.set('deals','deals',l.filter(x=>x.id!==id)); }
    async getTasks() { return this.cache.tasks || []; }
    async saveTask(t: any) { const l = this.cache.tasks||[]; this.set('tasks','tasks',[t,...l]); return t; }
    async updateTask(t: any) { const l = this.cache.tasks||[]; this.set('tasks','tasks',l.map(x=>x.id===t.id?t:x)); return t; }
    async deleteTask(id: any) { const l = this.cache.tasks||[]; this.set('tasks','tasks',l.filter(x=>x.id!==id)); }
    async getInvoices() { return this.cache.invoices || []; }
    async saveInvoice(i: any) { const l = this.cache.invoices||[]; this.set('invoices','invoices',[i,...l]); return i; }
    async updateInvoice(i: any) { const l = this.cache.invoices||[]; this.set('invoices','invoices',l.map(x=>x.id===i.id?i:x)); return i; }
    async deleteInvoice(id: any) { const l = this.cache.invoices||[]; this.set('invoices','invoices',l.filter(x=>x.id!==id)); }
    
    async cancelInvoice(id: string): Promise<{ creditNote: Invoice, updatedOriginal: Invoice, activity: Activity }> {
        const invoices = await this.getInvoices();
        const original = invoices.find(i => i.id === id);
        if (!original) throw new Error("Rechnung nicht gefunden");
        if (original.isCancelled) throw new Error("Bereits storniert");
        
        let maxNum = 100;
        invoices.forEach(i => {
             const parts = i.invoiceNumber.split('-');
             if (parts.length > 1) {
                 const n = parseInt(parts[1]);
                 if (!isNaN(n) && n > maxNum) maxNum = n;
             }
        });
        const nextNum = `2025-${maxNum + 1}`;

        const creditNote: Invoice = {
            id: crypto.randomUUID(),
            invoiceNumber: nextNum,
            description: `Storno zu Rechnung ${original.invoiceNumber}`,
            date: new Date().toISOString().split('T')[0],
            contactId: original.contactId,
            contactName: original.contactName,
            amount: -Math.abs(Number(original.amount)),
            isPaid: true,
            paidDate: new Date().toISOString().split('T')[0],
            relatedInvoiceId: original.id
        };

        const updatedOriginal = { ...original, isCancelled: true, relatedInvoiceId: creditNote.id };
        
        await this.saveInvoice(creditNote);
        await this.updateInvoice(updatedOriginal);
        
        const activity: Activity = {
            id: crypto.randomUUID(),
            contactId: original.contactId,
            type: 'system_invoice',
            content: `Rechnung ${original.invoiceNumber} storniert durch Stornorechnung ${creditNote.invoiceNumber}`,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            relatedId: creditNote.id
        };
        await this.saveActivity(activity);

        return { creditNote, updatedOriginal, activity };
    }

    async getExpenses() { return this.cache.expenses || []; }
    async saveExpense(e: any) { const l = this.cache.expenses||[]; this.set('expenses','expenses',[e,...l]); return e; }
    async updateExpense(e: any) { const l = this.cache.expenses||[]; this.set('expenses','expenses',l.map(x=>x.id===e.id?e:x)); return e; }
    async deleteExpense(id: any) { const l = this.cache.expenses||[]; this.set('expenses','expenses',l.filter(x=>x.id!==id)); }
    async getUserProfile() { return this.cache.userProfile!; }
    async saveUserProfile(p: any) { this.set('userProfile','userProfile',p); return p; }
    async getProductPresets() { return this.cache.productPresets || []; }
    async saveProductPresets(p: any) { this.set('productPresets','productPresets',p); return p; }
    async getInvoiceConfig() { return this.cache.invoiceConfig!; }
    async saveInvoiceConfig(c: any) { this.set('invoiceConfig','invoiceConfig',c); return c; }
    async getEmailTemplates() { return this.cache.emailTemplates || []; }
    async saveEmailTemplate(t: any) { const l = this.cache.emailTemplates||[]; this.set('emailTemplates','emailTemplates',[t,...l]); return t; }
    async updateEmailTemplate(t: any) { const l = this.cache.emailTemplates||[]; this.set('emailTemplates','emailTemplates',l.map(x=>x.id===t.id?t:x)); return t; }
    async deleteEmailTemplate(id: any) { const l = this.cache.emailTemplates||[]; this.set('emailTemplates','emailTemplates',l.filter(x=>x.id!==id)); }

    // --- GOOGLE AUTH & INTEGRATION RESTORED & HARDENED ---
    
    private async ensureGoogleScriptLoaded(): Promise<boolean> {
        // Prüfe ob das OAuth2 Objekt bereits existiert
        if (window.google && window.google.accounts && window.google.accounts.oauth2) return true;

        // Falls ein altes Skript existiert aber nicht funktioniert hat, entfernen
        const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
            existingScript.remove();
        }

        // Skript neu injizieren
        const script = document.createElement('script');
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        // Aktives Polling bis zu 10 Sekunden
        let attempts = 0;
        while (attempts < 20) {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) return true;
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }
        return false;
    }

    async connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean> {
        if (!clientId) {
            alert("Bitte geben Sie zuerst eine Google Client ID in den Einstellungen ein.");
            return false;
        }
        
        const ready = await this.ensureGoogleScriptLoaded();
        if (!ready) {
            alert("Google Dienste sind momentan nicht erreichbar. Prüfen Sie Ihre Internetverbindung.");
            return false;
        }
        
        return new Promise((resolve) => {
            try {
                // Initialize Token Client for Incremental Authorization
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: clientId,
                    scope: service === 'calendar' ? 'https://www.googleapis.com/auth/calendar.events' : 'https://www.googleapis.com/auth/gmail.send',
                    callback: (tokenResponse: any) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            // Merge scopes
                            const currentToken = localStorage.getItem('google_access_token');
                            this.accessToken = tokenResponse.access_token;
                            localStorage.setItem('google_access_token', tokenResponse.access_token);
                            localStorage.setItem(`google_${service}_connected`, 'true');
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    },
                });
                client.requestAccessToken();
            } catch (e) {
                console.error("Google Connect Error", e);
                alert("Verbindung fehlgeschlagen. Popup blockiert?");
                resolve(false);
            }
        });
    }

    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        localStorage.removeItem(`google_${service}_connected`);
        if (!localStorage.getItem('google_calendar_connected') && !localStorage.getItem('google_mail_connected')) {
            const token = localStorage.getItem('google_access_token');
            if (token && window.google) {
                window.google.accounts.oauth2.revoke(token, () => {
                    console.log('Token revoked');
                });
            }
            localStorage.removeItem('google_access_token');
            this.accessToken = null;
        }
        return true;
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        return localStorage.getItem(`google_${service}_connected`) === 'true';
    }

    async loginWithGoogle(): Promise<UserProfile | null> {
        if (!this.googleClientId) {
            alert("Google Client ID fehlt in den Einstellungen (Backend Config).");
            return null;
        }

        if (!navigator.onLine) {
            alert("Keine Internetverbindung. Login nicht möglich.");
            return null;
        }

        const ready = await this.ensureGoogleScriptLoaded();
        if (!ready) {
            alert("Google Sign-In Skript konnte nicht geladen werden. Bitte prüfen Sie Ihre Verbindung oder Firewall.");
            return null;
        }

        return new Promise((resolve) => {
            // Timeout-Schutz gegen hängenden Lade-Status (60 Sekunden)
            const timeoutId = setTimeout(() => {
                console.warn("Google Login timed out.");
                alert("Anmeldung abgebrochen: Zeitüberschreitung. Wurde das Popup geschlossen oder blockiert?");
                resolve(null);
            }, 60000);

            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: this.googleClientId,
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    callback: async (tokenResponse: any) => {
                        clearTimeout(timeoutId); // Erfolg, Timeout löschen
                        if (tokenResponse && tokenResponse.access_token) {
                            this.accessToken = tokenResponse.access_token;
                            localStorage.setItem('google_access_token', tokenResponse.access_token);
                            
                            // Fetch User Info
                            try {
                                const res = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                                });
                                if (!res.ok) throw new Error("UserInfo Request Failed");
                                const data = await res.json();
                                
                                const profile: UserProfile = {
                                    firstName: data.given_name || 'User',
                                    lastName: data.family_name || '',
                                    email: data.email,
                                    role: 'Admin',
                                    avatar: data.picture || ''
                                };
                                
                                this.saveUserProfile(profile);
                                resolve(profile);
                            } catch (e) {
                                console.error("Error fetching user info", e);
                                alert("Fehler beim Abrufen der Profildaten.");
                                resolve(null);
                            }
                        } else {
                            resolve(null);
                        }
                    },
                });
                client.requestAccessToken();
            } catch (e) {
                clearTimeout(timeoutId);
                console.error("Google Auth Error", e);
                alert("Google Auth konnte nicht initialisiert werden. Bitte Popup-Blocker prüfen.");
                resolve(null);
            }
        });
    }

    async logout(): Promise<void> {
        this.accessToken = null;
        localStorage.removeItem('google_access_token');
        // We keep local data, just remove auth token
    }

    async sendMail(to: string, subject: string, body: string, attachments: EmailAttachment[] = []): Promise<boolean> {
        const token = localStorage.getItem('google_access_token');
        if (!token) {
            alert("Nicht mit Google verbunden. Bitte in den Einstellungen verbinden.");
            return false;
        }

        try {
            // MIME Message Construction
            const boundary = "foo_bar_baz";
            const nl = "\r\n";
            
            // Helper for UTF-8 Base64 Encoding
            const encodeUTF8Base64 = (str: string) => {
                return btoa(unescape(encodeURIComponent(str)));
            };
            
            let message = "";
            
            // Headers
            message += `To: ${to}${nl}`;
            // Correct encoding for UTF-8 Subject (Umlaute/Emojis)
            message += `Subject: =?utf-8?B?${encodeUTF8Base64(subject)}?=${nl}`;
            message += `MIME-Version: 1.0${nl}`;
            message += `Content-Type: multipart/mixed; boundary="${boundary}"${nl}${nl}`;
            
            // Body Part
            message += `--${boundary}${nl}`;
            message += `Content-Type: text/plain; charset="UTF-8"${nl}`;
            message += `Content-Transfer-Encoding: base64${nl}${nl}`;
            // Encode body to Base64 to ensure all characters are preserved safely
            message += `${encodeUTF8Base64(body)}${nl}${nl}`;
            
            // Attachments Parts
            for (const att of attachments) {
                const base64Data = att.data.split(',')[1]; // Remove data URL prefix
                message += `--${boundary}${nl}`;
                message += `Content-Type: ${att.type}; name="${att.name}"${nl}`;
                message += `Content-Disposition: attachment; filename="${att.name}"${nl}`;
                message += `Content-Transfer-Encoding: base64${nl}${nl}`;
                message += `${base64Data}${nl}${nl}`;
            }
            
            message += `--${boundary}--`;

            const raw = btoa(unescape(encodeURIComponent(message)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw })
            });
            return true;
        } catch (e) {
            console.error("Mail Send Error", e);
            alert("Fehler beim Senden der E-Mail via Google API.");
            return false;
        }
    }

    // ... Automation ...
    async processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }> {
        const contacts = await this.getContacts();
        const invoices = await this.getInvoices();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueContacts = contacts.filter(c => c.retainerActive && c.retainerNextBilling && new Date(c.retainerNextBilling) <= today && (c.retainerAmount || 0) > 0);
        const newInvoices: Invoice[] = [];
        const updatedContacts: Contact[] = [];
        const newActivities: Activity[] = [];

        if (dueContacts.length === 0) return { updatedContacts, newInvoices, newActivities };

        let maxNum = 100;
        invoices.forEach(i => {
             const parts = i.invoiceNumber.split('-');
             if (parts.length > 1) {
                 const n = parseInt(parts[1]);
                 if (!isNaN(n) && n > maxNum) maxNum = n;
             }
        });
        
        for (const contact of dueContacts) {
            const alreadyExists = invoices.some(inv => inv.contactId === contact.id && inv.amount === contact.retainerAmount && inv.date === new Date().toISOString().split('T')[0]);
            if (alreadyExists) continue;

            maxNum++;
            const invoiceNum = `2025-${maxNum}`;
            const invAmount = contact.retainerAmount!;
            
            const inv: Invoice = {
                id: crypto.randomUUID(),
                invoiceNumber: invoiceNum,
                date: new Date().toISOString().split('T')[0],
                contactId: contact.id,
                contactName: `${contact.name} (${contact.company})`,
                description: `Retainer-Service (${contact.retainerInterval})`,
                amount: invAmount,
                isPaid: false
            };
            newInvoices.push(inv);
            await this.saveInvoice(inv);

            let nextDate = new Date(contact.retainerNextBilling!);
            nextDate.setMonth(nextDate.getMonth() + 1); // Simplification for brevity

            const updatedContact = { ...contact, retainerNextBilling: nextDate.toISOString().split('T')[0] };
            updatedContacts.push(updatedContact);
            await this.updateContact(updatedContact);

            const act: Activity = {
                id: crypto.randomUUID(),
                contactId: contact.id,
                type: 'system_invoice',
                content: `Retainer-Rechnung: ${invoiceNum}`,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                relatedId: inv.id
            };
            newActivities.push(act);
            await this.saveActivity(act);
        }
        return { updatedContacts, newInvoices, newActivities };
    }

    // --- UPDATED: SYSTEM UPDATE LOGIC ---
    async checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void): Promise<boolean> {
        try {
            if (statusCallback) statusCallback("Prüfe Version...");
            
            // 1. Fetch Remote
            const response = await fetch(`${url}/index.html?t=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error("Update-Server nicht erreichbar");
            const remoteHtml = await response.text();

            // 2. Fetch Local
            const localResponse = await fetch('/index.html');
            const localHtml = await localResponse.text();

            // 3. STRICT Equality Check (First Line of Defense)
            if (remoteHtml.trim() === localHtml.trim()) {
                console.log("Update check: Exact match found. No update.");
                return false;
            }

            // 4. Asset Hash Comparison (Secondary Check)
            const extractAssets = (html: string) => {
                const scriptMatch = html.match(/index-([a-zA-Z0-9]+)\.js/);
                const cssMatch = html.match(/index-([a-zA-Z0-9]+)\.css/);
                return {
                    jsHash: scriptMatch ? scriptMatch[1] : null,
                    cssHash: cssMatch ? cssMatch[1] : null
                };
            };
            const localAssets = extractAssets(localHtml);
            const remoteAssets = extractAssets(remoteHtml);

            if (localAssets.jsHash && remoteAssets.jsHash && 
                localAssets.jsHash === remoteAssets.jsHash && 
                localAssets.cssHash === remoteAssets.cssHash) {
                console.log("Update check: Hashes match. No update.");
                return false;
            }

            if (statusCallback) statusCallback("Neue Version gefunden. Lade herunter...");

             // 5. Parse Assets from Remote HTML
            const assetFiles: string[] = [];
            const assetRegex = /["'](?:[^"']+\/)?assets\/([^"']+)["']/g;
            let match;
            while ((match = assetRegex.exec(remoteHtml)) !== null) {
                if (!assetFiles.includes(match[1])) assetFiles.push(match[1]);
            }

            // 6. Download Assets
            const downloadedFiles = [];
            downloadedFiles.push({ name: 'index.html', content: remoteHtml, type: 'root' });

            for (const fileName of assetFiles) {
                if (statusCallback) statusCallback(`Lade ${fileName}...`);
                const fileRes = await fetch(`${url}/assets/${fileName}?t=${Date.now()}`);
                if (!fileRes.ok) throw new Error(`Fehler beim Laden von ${fileName}`);
                const content = await fileRes.text();
                downloadedFiles.push({ name: fileName, content: content, type: 'asset' });
            }

            // 7. Install via Electron IPC
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                if (statusCallback) statusCallback("Installiere...");
                const result = await ipcRenderer.invoke('install-update', downloadedFiles);
                if (result.success) {
                    if (statusCallback) statusCallback("Neustart...");
                    setTimeout(() => {
                        ipcRenderer.invoke('restart-app');
                    }, 1000);
                    return true;
                } else {
                    throw new Error(result.error);
                }
            } else {
                 throw new Error("Update nur in Desktop-App möglich.");
            }
        } catch (e: any) {
            console.error("Update Error", e);
            throw e;
        }
    }
    
    async generatePdf(htmlContent: string): Promise<string> {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            const buffer = await ipcRenderer.invoke('generate-pdf', htmlContent);
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }
        throw new Error("PDF Generierung ist nur in der Desktop-App verfügbar.");
    }
    
    async wipeAllData(): Promise<void> {
        localStorage.clear();
        this.cache = {
            contacts: null, activities: null, deals: null, tasks: null, 
            invoices: null, expenses: null, userProfile: null, 
            productPresets: null, invoiceConfig: null, emailTemplates: null
        };
        window.location.reload();
    }
}

export const DataServiceFactory = {
    create: (config: BackendConfig): IDataService => {
        return new LocalDataService(config.googleClientId);
    }
};
