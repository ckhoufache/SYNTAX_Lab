
import { Contact, Deal, Task, UserProfile, ProductPreset, Theme, BackendConfig, BackendMode, BackupData, Invoice, Expense, InvoiceConfig, Activity, EmailTemplate } from '../types';
import { mockContacts, mockDeals, mockTasks, mockInvoices, mockExpenses } from './mockData';

// Declare Google Types globally for TS
declare global {
    interface Window {
        google: any;
        gapi: any;
    }
}

// --- Interfaces ---
export interface IDataService {
    // Initialization
    init(): Promise<void>;
    
    // Contacts
    getContacts(): Promise<Contact[]>;
    saveContact(contact: Contact): Promise<Contact>;
    updateContact(contact: Contact): Promise<Contact>;
    deleteContact(id: string): Promise<void>;

    // Activities (Timeline)
    getActivities(): Promise<Activity[]>;
    saveActivity(activity: Activity): Promise<Activity>;
    deleteActivity(id: string): Promise<void>;

    // Deals
    getDeals(): Promise<Deal[]>;
    saveDeal(deal: Deal): Promise<Deal>;
    updateDeal(deal: Deal): Promise<Deal>;
    deleteDeal(id: string): Promise<void>;

    // Tasks
    getTasks(): Promise<Task[]>;
    saveTask(task: Task): Promise<Task>;
    updateTask(task: Task): Promise<Task>;
    deleteTask(id: string): Promise<void>;

    // Invoices
    getInvoices(): Promise<Invoice[]>;
    saveInvoice(invoice: Invoice): Promise<Invoice>;
    updateInvoice(invoice: Invoice): Promise<Invoice>;
    deleteInvoice(id: string): Promise<void>;

    // Expenses
    getExpenses(): Promise<Expense[]>;
    saveExpense(expense: Expense): Promise<Expense>;
    updateExpense(expense: Expense): Promise<Expense>;
    deleteExpense(id: string): Promise<void>;

    // Settings
    getUserProfile(): Promise<UserProfile>;
    saveUserProfile(profile: UserProfile): Promise<UserProfile>;
    
    getProductPresets(): Promise<ProductPreset[]>;
    saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]>;

    // Invoice Config
    getInvoiceConfig(): Promise<InvoiceConfig>;
    saveInvoiceConfig(config: InvoiceConfig): Promise<InvoiceConfig>;

    // Email Templates
    getEmailTemplates(): Promise<EmailTemplate[]>;
    saveEmailTemplate(template: EmailTemplate): Promise<EmailTemplate>;
    updateEmailTemplate(template: EmailTemplate): Promise<EmailTemplate>;
    deleteEmailTemplate(id: string): Promise<void>;

    // Integrations
    connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean>;
    disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean>;
    getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean>;
    
    // Auth
    loginWithGoogle(): Promise<UserProfile | null>;
    logout(): Promise<void>;
    
    // Actions
    sendMail(to: string, subject: string, body: string): Promise<boolean>;
    
    // Automation
    processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }>;
}

// --- Local Storage Implementation (Cached & Optimized) ---
class LocalDataService implements IDataService {
    private googleClientId?: string;
    private accessToken: string | null = null;
    private isPreviewEnv: boolean = false;
    
    // OPTIMIZATION: In-Memory Cache to avoid JSON.parse on every read
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

    // OPTIMIZATION: Sync Lock to prevent race conditions
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
    
    async init(): Promise<void> {
        // Load everything into cache at startup
        // Ensure mock data exists if storage is empty
        if (!localStorage.getItem('contacts')) localStorage.setItem('contacts', JSON.stringify(mockContacts));
        if (!localStorage.getItem('deals')) localStorage.setItem('deals', JSON.stringify(mockDeals));
        if (!localStorage.getItem('tasks')) localStorage.setItem('tasks', JSON.stringify(mockTasks));
        if (!localStorage.getItem('invoices')) localStorage.setItem('invoices', JSON.stringify(mockInvoices));
        if (!localStorage.getItem('expenses')) localStorage.setItem('expenses', JSON.stringify(mockExpenses));
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
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@syntaxlab.de',
            role: 'Admin',
            avatar: 'https://ui-avatars.com/api/?name=Max+Mustermann&background=random'
        });
        this.cache.productPresets = this.getFromStorage<ProductPreset[]>('productPresets', [
            { id: 'beta', title: 'Beta Version', value: 500 },
            { id: 'release', title: 'Release Version', value: 1500 }
        ]);
        this.cache.invoiceConfig = this.getFromStorage<InvoiceConfig>('invoiceConfig', {
            companyName: 'Meine Firma',
            addressLine1: 'Musterstraße 123',
            addressLine2: '12345 Musterstadt',
            taxId: '123/456/7890',
            bankName: 'Musterbank',
            iban: 'DE12 3456 7890 1234 5678 90',
            bic: 'MUSTERBIC',
            email: 'info@meinefirma.de',
            website: 'www.meinefirma.de',
            footerText: 'Vielen Dank für Ihren Auftrag.',
            taxRule: 'small_business' // DEFAULT Migration
        });

        return Promise.resolve();
    }

    // Helper: Read from LS (only used during init or specific cases)
    private getFromStorage<T>(key: string, fallback: T): T {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    }

    // Helper: Write to Cache AND LS
    private set<T>(key: keyof typeof this.cache, storageKey: string, data: T): void {
        this.cache[key] = data as any;
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error: any) {
            // Check for QuotaExceededError
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                 alert("Speicherlimit erreicht! Das Bild ist zu groß für den lokalen Browserspeicher. Änderungen konnten nicht permanent gespeichert werden.");
            } else {
                console.error("Storage Error", error);
            }
        }
    }

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

    // --- ACTIVITIES ---
    async getActivities(): Promise<Activity[]> { return this.cache.activities || []; }
    async saveActivity(activity: Activity): Promise<Activity> {
        const list = this.cache.activities || [];
        const newList = [activity, ...list];
        this.set('activities', 'activities', newList);
        return activity;
    }
    async deleteActivity(id: string): Promise<void> {
        const list = this.cache.activities || [];
        const newList = list.filter(a => a.id !== id);
        this.set('activities', 'activities', newList);
    }

    async getDeals(): Promise<Deal[]> { return this.cache.deals || []; }
    async saveDeal(deal: Deal): Promise<Deal> {
        const list = this.cache.deals || [];
        const newList = [deal, ...list];
        this.set('deals', 'deals', newList);
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

    async getTasks(): Promise<Task[]> {
        const isCalConnected = this.getIntegrationStatusSync('calendar');
        if (isCalConnected && this.accessToken) {
            this.syncWithGoogleCalendar().catch(console.error);
        }
        return this.cache.tasks || [];
    }
    async saveTask(task: Task): Promise<Task> {
        let taskToSave = { ...task };
        const isCalConnected = this.getIntegrationStatusSync('calendar');
        if (isCalConnected && this.accessToken) {
            try {
                const eventId = await this.createGoogleCalendarEvent(task);
                if (eventId) taskToSave.googleEventId = eventId;
            } catch (err) { console.error("Calendar Sync Error", err); }
        }
        const list = this.cache.tasks || [];
        const newList = [taskToSave, ...list];
        this.set('tasks', 'tasks', newList);
        return taskToSave;
    }
    async updateTask(task: Task): Promise<Task> {
        const list = this.cache.tasks || [];
        const newList = list.map(t => t.id === task.id ? task : t);
        this.set('tasks', 'tasks', newList);
        return task;
    }
    async deleteTask(id: string): Promise<void> {
        const list = this.cache.tasks || [];
        const taskToDelete = list.find(t => t.id === id);
        if (taskToDelete && taskToDelete.googleEventId) {
            const isCalConnected = this.getIntegrationStatusSync('calendar');
            if (isCalConnected && this.accessToken) {
                try { await this.deleteGoogleCalendarEvent(taskToDelete.googleEventId); } catch (e) { console.error(e); }
            }
        }
        const newList = list.filter(t => t.id !== id);
        this.set('tasks', 'tasks', newList);
    }

    // --- INVOICES ---
    async getInvoices(): Promise<Invoice[]> { return this.cache.invoices || []; }
    async saveInvoice(invoice: Invoice): Promise<Invoice> {
        const list = this.cache.invoices || [];
        const newList = [invoice, ...list];
        this.set('invoices', 'invoices', newList);
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

    // --- EXPENSES ---
    async getExpenses(): Promise<Expense[]> { return this.cache.expenses || []; }
    async saveExpense(expense: Expense): Promise<Expense> {
        const list = this.cache.expenses || [];
        const newList = [expense, ...list];
        this.set('expenses', 'expenses', newList);
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

    // --- EMAIL TEMPLATES ---
    async getEmailTemplates(): Promise<EmailTemplate[]> { return this.cache.emailTemplates || []; }
    async saveEmailTemplate(template: EmailTemplate): Promise<EmailTemplate> {
        const list = this.cache.emailTemplates || [];
        const newList = [template, ...list];
        this.set('emailTemplates', 'emailTemplates', newList);
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

    // --- SETTINGS ---
    async getUserProfile(): Promise<UserProfile> { return this.cache.userProfile!; }
    async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
        this.set('userProfile', 'userProfile', profile);
        return profile;
    }
    async getProductPresets(): Promise<ProductPreset[]> { return this.cache.productPresets || []; }
    async saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]> {
        this.set('productPresets', 'productPresets', presets);
        return presets;
    }

    // --- INVOICE CONFIG ---
    async getInvoiceConfig(): Promise<InvoiceConfig> { return this.cache.invoiceConfig!; }
    async saveInvoiceConfig(config: InvoiceConfig): Promise<InvoiceConfig> {
        this.set('invoiceConfig', 'invoiceConfig', config);
        return config;
    }

    // --- GOOGLE INTEGRATION ---
    private async waitForGoogleScripts(timeout = 5000): Promise<boolean> {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                return true;
            }
            await new Promise(r => setTimeout(r, 100));
        }
        return false;
    }

    // Generische Funktion für OAuth Request
    async connectGoogle(service: 'calendar' | 'mail', clientIdOverride?: string): Promise<boolean> {
        // Wenn bereits ein globaler Token existiert (durch Login), nutzen wir diesen
        if (this.accessToken) {
             localStorage.setItem(`google_${service}_connected`, 'true');
             return true;
        }
        return this.requestGoogleScopes(service === 'calendar' ? 'https://www.googleapis.com/auth/calendar.events' : 'https://www.googleapis.com/auth/gmail.send', clientIdOverride);
    }
    
    // Globale Login Funktion (Holt alle Rechte auf einmal)
    async loginWithGoogle(): Promise<UserProfile | null> {
        // Force Real Login - NO MOCK
        // Request ALL scopes at once for full login
        const scopes = [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.send'
        ].join(' ');

        const success = await this.requestGoogleScopes(scopes);
        if (success && this.accessToken) {
            // Fetch User Info
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    // Mark everything as connected
                    localStorage.setItem('google_calendar_connected', 'true');
                    localStorage.setItem('google_mail_connected', 'true');
                    
                    const profile: UserProfile = {
                        firstName: data.given_name || 'User',
                        lastName: data.family_name || '',
                        email: data.email,
                        role: 'Admin',
                        avatar: data.picture || ''
                    };
                    await this.saveUserProfile(profile);
                    return profile;
                }
            } catch (e) { console.error("UserInfo Fetch Error", e); }
        }
        return null;
    }

    async logout(): Promise<void> {
        if (this.accessToken && window.google) {
            try {
                window.google.accounts.oauth2.revoke(this.accessToken, () => {});
            } catch(e) {}
        }
        this.accessToken = null;
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_calendar_connected');
        localStorage.removeItem('google_mail_connected');
    }

    private async requestGoogleScopes(scope: string, clientIdOverride?: string): Promise<boolean> {
        const effectiveClientId = clientIdOverride || this.googleClientId;
        if (!effectiveClientId) {
            alert("Bitte geben Sie zuerst Ihre Google Client ID in den Einstellungen ein.");
            return false;
        }

        const scriptsLoaded = await this.waitForGoogleScripts();
        if (!scriptsLoaded) {
            alert("Google API Skripte konnten nicht geladen werden.");
            return false;
        }

        return new Promise((resolve) => {
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: effectiveClientId,
                    scope: scope,
                    callback: (resp: any) => {
                        if (resp.error) {
                            console.error("OAuth Error:", resp);
                            if (resp.error.includes('origin_mismatch')) {
                                alert(`Google Error 400: Origin Mismatch.\n\nBitte stellen Sie sicher, dass Sie die Desktop-App über 'npm run electron' starten, damit der interne Server auf http://localhost:3000 läuft.`);
                            } else {
                                alert(`Fehler bei der Google Anmeldung: ${resp.error}`);
                            }
                            resolve(false);
                            return;
                        }
                        if (resp.access_token) {
                            this.accessToken = resp.access_token;
                            localStorage.setItem('google_access_token', resp.access_token);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    },
                });
                client.requestAccessToken({ prompt: 'consent' });
            } catch (err) {
                console.error("Initialization Error", err);
                resolve(false);
            }
        });
    }

    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        localStorage.setItem(`google_${service}_connected`, 'false');
        // We do NOT revoke token here immediately if other service is still connected
        // But for simplicity in this single-user app, logout handles full revocation
        return true;
    }

    private getIntegrationStatusSync(service: 'calendar' | 'mail'): boolean {
        return localStorage.getItem(`google_${service}_connected`) === 'true' && !!localStorage.getItem('google_access_token');
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        return this.getIntegrationStatusSync(service);
    }

    // --- REAL API CALLS ---
    private async syncWithGoogleCalendar() {
        if (this.isSyncing || !this.accessToken) return;
        this.isSyncing = true;
        try {
            const now = new Date();
            const minDate = new Date();
            minDate.setMonth(now.getMonth() - 1);
            const maxDate = new Date();
            maxDate.setMonth(now.getMonth() + 3);
            const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${minDate.toISOString()}&timeMax=${maxDate.toISOString()}&singleEvents=true&maxResults=100`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${this.accessToken}` } });
            
            if (response.status === 401) {
                // Token Expired
                this.accessToken = null;
                localStorage.removeItem('google_access_token');
                localStorage.setItem('google_calendar_connected', 'false');
                localStorage.setItem('google_mail_connected', 'false');
                return;
            }
            if (!response.ok) return;
            const data = await response.json();
            
            if (data.items) {
                const currentTasks = [...(this.cache.tasks || [])];
                let hasChanges = false;
                data.items.forEach((event: any) => {
                    const existingTaskIndex = currentTasks.findIndex(t => t.googleEventId === event.id);
                    const eventDate = event.start.date || event.start.dateTime.split('T')[0];
                    const isAllDay = !!event.start.date;
                    let startTime, endTime;
                    if (!isAllDay && event.start.dateTime) {
                        const startDt = new Date(event.start.dateTime);
                        const endDt = new Date(event.end.dateTime);
                        const formatTime = (date: Date) => {
                            const h = String(date.getHours()).padStart(2, '0');
                            const m = String(date.getMinutes()).padStart(2, '0');
                            return `${h}:${m}`;
                        };
                        startTime = formatTime(startDt);
                        endTime = formatTime(endDt);
                    }
                    if (existingTaskIndex === -1) {
                        const newTask: Task = {
                            id: Math.random().toString(36).substr(2, 9),
                            title: event.summary || 'Unbenannter Termin',
                            type: 'meeting',
                            priority: 'medium',
                            dueDate: eventDate,
                            isCompleted: false,
                            isAllDay: isAllDay,
                            startTime,
                            endTime,
                            googleEventId: event.id
                        };
                        currentTasks.push(newTask);
                        hasChanges = true;
                    } else {
                        const task = currentTasks[existingTaskIndex];
                        if (task.dueDate !== eventDate || task.title !== event.summary || task.startTime !== startTime) {
                             currentTasks[existingTaskIndex] = {
                                 ...task,
                                 title: event.summary || task.title,
                                 dueDate: eventDate,
                                 isAllDay,
                                 startTime: startTime || task.startTime,
                                 endTime: endTime || task.endTime
                             };
                             hasChanges = true;
                        }
                    }
                });
                if (hasChanges) this.set('tasks', 'tasks', currentTasks);
            }
        } catch (e) { console.error("Sync Fetch Error", e); } finally { this.isSyncing = false; }
    }

    private async createGoogleCalendarEvent(task: Task): Promise<string | null> {
        if (!this.accessToken) return null;
        const event = {
            summary: task.title,
            description: `Priorität: ${task.priority}\nTyp: ${task.type}\n(Erstellt via SyntaxLabCRM)`,
            start: {
                date: task.isAllDay ? task.dueDate : undefined,
                dateTime: !task.isAllDay ? `${task.dueDate}T${task.startTime}:00` : undefined,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                 date: task.isAllDay ? task.dueDate : undefined, 
                 dateTime: !task.isAllDay ? `${task.dueDate}T${task.endTime}:00` : undefined,
                 timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };
        try {
            const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.id;
        } catch (error) { return null; }
    }

    private async deleteGoogleCalendarEvent(eventId: string): Promise<void> {
        if (!this.accessToken) return;
        try {
             await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
        } catch (e) { console.error(e); }
    }

    async sendMail(to: string, subject: string, body: string): Promise<boolean> {
        if (!this.accessToken) { alert("Keine Verbindung zu Google."); return false; }
        const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
        const messageParts = [ `To: ${to}`, `Subject: ${utf8Subject}`, "Content-Type: text/plain; charset=utf-8", "MIME-Version: 1.0", "", body ];
        const message = messageParts.join('\n');
        const encodedMessage = btoa(unescape(encodeURIComponent(message))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw: encodedMessage })
            });
            if (!response.ok) { const err = await response.json(); alert(`Fehler: ${err.error?.message}`); return false; }
            return true;
        } catch (e) { alert("Netzwerkfehler."); return false; }
    }

    // --- AUTOMATION: RETAINER CHECK ---
    async processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }> {
        // 1. Get Data
        const contacts = await this.getContacts();
        const invoices = await this.getInvoices();
        
        // 2. Identify due retainers
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dueContacts = contacts.filter(c => 
            c.retainerActive && 
            c.retainerNextBilling && 
            new Date(c.retainerNextBilling) <= today &&
            (c.retainerAmount || 0) > 0
        );

        const newInvoices: Invoice[] = [];
        const updatedContacts: Contact[] = [];
        const newActivities: Activity[] = [];

        if (dueContacts.length === 0) {
            return { updatedContacts, newInvoices, newActivities };
        }

        // Helper to find max invoice number
        let maxNum = 100;
        invoices.forEach(i => {
             const parts = i.invoiceNumber.split('-');
             if (parts.length > 1) {
                 const n = parseInt(parts[1]);
                 if (!isNaN(n) && n > maxNum) maxNum = n;
             }
        });
        
        // 3. Process each contact
        for (const contact of dueContacts) {
            maxNum++;
            const invoiceNum = `2025-${maxNum}`;
            const invAmount = contact.retainerAmount!;
            
            // Create Invoice
            const inv: Invoice = {
                id: Math.random().toString(36).substr(2, 9),
                invoiceNumber: invoiceNum,
                date: new Date().toISOString().split('T')[0],
                contactId: contact.id,
                contactName: `${contact.name} (${contact.company})`,
                description: `Retainer-Service (${contact.retainerInterval === 'monthly' ? 'Monatlich' : contact.retainerInterval})`,
                amount: invAmount,
                isPaid: false
            };
            newInvoices.push(inv);
            await this.saveInvoice(inv); // Save immediately

            // Calculate Next Billing Date
            let nextDate = new Date(contact.retainerNextBilling!);
            if (contact.retainerInterval === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
            else if (contact.retainerInterval === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
            else nextDate.setMonth(nextDate.getMonth() + 1); // monthly default

            const updatedContact = { 
                ...contact, 
                retainerNextBilling: nextDate.toISOString().split('T')[0] 
            };
            updatedContacts.push(updatedContact);
            await this.updateContact(updatedContact);

            // Log Activity
            const act: Activity = {
                id: Math.random().toString(36).substr(2, 9),
                contactId: contact.id,
                type: 'system_invoice',
                content: `Automatische Retainer-Rechnung erstellt: ${invoiceNum} (${invAmount} €)`,
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString(),
                relatedId: inv.id
            };
            newActivities.push(act);
            await this.saveActivity(act);
        }

        return { updatedContacts, newInvoices, newActivities };
    }
}

// --- API Implementation (Placeholder) ---
class APIDataService implements IDataService {
    private baseUrl: string;
    private token: string;
    constructor(url: string, token: string) { this.baseUrl = url.replace(/\/$/, ''); this.token = token; }
    async init(): Promise<void> {}
    getContacts = async () => [];
    saveContact = async (c: Contact) => c;
    updateContact = async (c: Contact) => c;
    deleteContact = async () => {};
    getActivities = async () => [];
    saveActivity = async (a: Activity) => a;
    deleteActivity = async () => {};
    getDeals = async () => [];
    saveDeal = async (d: Deal) => d;
    updateDeal = async (d: Deal) => d;
    deleteDeal = async () => {};
    getTasks = async () => [];
    saveTask = async (t: Task) => t;
    updateTask = async (t: Task) => t;
    deleteTask = async () => {};
    getInvoices = async () => [];
    saveInvoice = async (i: Invoice) => i;
    updateInvoice = async (i: Invoice) => i;
    deleteInvoice = async () => {};
    getExpenses = async () => [];
    saveExpense = async (e: Expense) => e;
    updateExpense = async (e: Expense) => e;
    deleteExpense = async () => {};
    getUserProfile = async () => ({} as UserProfile);
    saveUserProfile = async (p: UserProfile) => p;
    getProductPresets = async () => [];
    saveProductPresets = async (p: ProductPreset[]) => p;
    getInvoiceConfig = async () => ({} as InvoiceConfig);
    saveInvoiceConfig = async (c: InvoiceConfig) => c;
    getEmailTemplates = async () => [];
    saveEmailTemplate = async (t: EmailTemplate) => t;
    updateEmailTemplate = async (t: EmailTemplate) => t;
    deleteEmailTemplate = async () => {};
    connectGoogle = async () => false;
    disconnectGoogle = async () => true;
    getIntegrationStatus = async () => false;
    sendMail = async () => false;
    loginWithGoogle = async () => null;
    logout = async () => {};
    processDueRetainers = async () => ({ updatedContacts: [], newInvoices: [], newActivities: [] });
}

// --- Factory ---
export const DataServiceFactory = {
    create: (config: BackendConfig): IDataService => {
        if (config.mode === 'api' && config.apiUrl) {
            return new APIDataService(config.apiUrl, config.apiToken || '');
        }
        return new LocalDataService(config.googleClientId);
    }
};
