
import { Contact, Deal, Task, UserProfile, ProductPreset, Theme, BackendConfig, BackendMode, BackupData } from '../types';
import { mockContacts, mockDeals, mockTasks } from './mockData';

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

    // User & Settings
    getUserProfile(): Promise<UserProfile>;
    saveUserProfile(profile: UserProfile): Promise<UserProfile>;
    
    getProductPresets(): Promise<ProductPreset[]>;
    saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]>;

    // Integrations
    connectGoogle(service: 'calendar' | 'mail'): Promise<boolean>;
    disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean>;
    getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean>;
    
    // Actions
    sendMail(to: string, subject: string, body: string): Promise<boolean>;
}

// --- Local Storage Implementation (Enhanced with Google APIs) ---
class LocalDataService implements IDataService {
    private googleClientId?: string;
    private accessToken: string | null = null;

    constructor(googleClientId?: string) {
        this.googleClientId = googleClientId;
        // Versuche Token aus Session/Local zu laden (nur für UX, eigentlich laufen die ab)
        this.accessToken = localStorage.getItem('google_access_token');
    }
    
    async init(): Promise<void> {
        // Ensure mock data exists if storage is empty
        if (!localStorage.getItem('contacts')) localStorage.setItem('contacts', JSON.stringify(mockContacts));
        if (!localStorage.getItem('deals')) localStorage.setItem('deals', JSON.stringify(mockDeals));
        if (!localStorage.getItem('tasks')) localStorage.setItem('tasks', JSON.stringify(mockTasks));

        // Wir laden den Client hier noch nicht final, da sich die ClientID ändern kann.
        // Das passiert nun dynamisch in connectGoogle.
        return Promise.resolve();
    }

    // Helper
    private get<T>(key: string, fallback: T): T {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : fallback;
    }

    private set(key: string, data: any): void {
        localStorage.setItem(key, JSON.stringify(data));
    }

    async getContacts(): Promise<Contact[]> {
        return this.get<Contact[]>('contacts', []);
    }

    async saveContact(contact: Contact): Promise<Contact> {
        const list = this.get<Contact[]>('contacts', []);
        this.set('contacts', [contact, ...list]);
        return contact;
    }

    async updateContact(contact: Contact): Promise<Contact> {
        const list = this.get<Contact[]>('contacts', []);
        this.set('contacts', list.map(c => c.id === contact.id ? contact : c));
        return contact;
    }

    async deleteContact(id: string): Promise<void> {
        const list = this.get<Contact[]>('contacts', []);
        this.set('contacts', list.filter(c => c.id !== id));
    }

    async getDeals(): Promise<Deal[]> {
        return this.get<Deal[]>('deals', []);
    }

    async saveDeal(deal: Deal): Promise<Deal> {
        const list = this.get<Deal[]>('deals', []);
        this.set('deals', [deal, ...list]);
        return deal;
    }

    async updateDeal(deal: Deal): Promise<Deal> {
        const list = this.get<Deal[]>('deals', []);
        this.set('deals', list.map(d => d.id === deal.id ? deal : d));
        return deal;
    }

    async deleteDeal(id: string): Promise<void> {
        const list = this.get<Deal[]>('deals', []);
        this.set('deals', list.filter(d => d.id !== id));
    }

    async getTasks(): Promise<Task[]> {
        return this.get<Task[]>('tasks', []);
    }

    async saveTask(task: Task): Promise<Task> {
        const list = this.get<Task[]>('tasks', []);
        this.set('tasks', [task, ...list]);
        
        // --- GOOGLE CALENDAR SYNC ---
        // Wenn verbunden, sende Event an Google
        const isCalConnected = this.get('google_calendar_connected', false);
        if (isCalConnected && this.accessToken) {
            this.createGoogleCalendarEvent(task).catch(err => console.error("Calendar Sync Error", err));
        }

        return task;
    }

    async updateTask(task: Task): Promise<Task> {
        const list = this.get<Task[]>('tasks', []);
        this.set('tasks', list.map(t => t.id === task.id ? task : t));
        return task;
    }

    async deleteTask(id: string): Promise<void> {
        const list = this.get<Task[]>('tasks', []);
        this.set('tasks', list.filter(t => t.id !== id));
    }

    async getUserProfile(): Promise<UserProfile> {
        return this.get<UserProfile>('userProfile', {
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@nex-crm.de',
            role: 'Admin',
            avatar: 'https://picsum.photos/id/64/100/100'
        });
    }

    async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
        this.set('userProfile', profile);
        return profile;
    }

    async getProductPresets(): Promise<ProductPreset[]> {
        return this.get<ProductPreset[]>('productPresets', [
            { id: 'beta', title: 'Beta Version', value: 500 },
            { id: 'release', title: 'Release Version', value: 1500 }
        ]);
    }

    async saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]> {
        this.set('productPresets', presets);
        return presets;
    }

    // --- GOOGLE INTEGRATION IMPLEMENTATION ---

    async connectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        // 1. Check Requirements
        if (!this.googleClientId) {
            alert("Bitte geben Sie zuerst Ihre Google Client ID in den Backend-Konfigurationen ein.");
            return false;
        }

        if (!window.google || !window.google.accounts) {
            alert("Google API Skripte sind nicht geladen. Bitte laden Sie die Seite neu.");
            return false;
        }

        // 2. Initialize Token Client Dynamically (Simulating a fresh request)
        return new Promise((resolve) => {
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: this.googleClientId,
                    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send',
                    callback: (resp: any) => {
                        if (resp.error) {
                            console.error("OAuth Error:", resp);
                            // Detail error handling
                            if (resp.error === 'popup_closed_by_user') {
                                alert("Anmeldung abgebrochen.");
                            } else if (resp.error === 'access_denied') {
                                alert("Zugriff verweigert.");
                            } else {
                                alert(`Fehler bei der Google Anmeldung: ${resp.error}`);
                            }
                            resolve(false);
                            return;
                        }

                        // Success
                        if (resp.access_token) {
                            this.accessToken = resp.access_token;
                            localStorage.setItem('google_access_token', resp.access_token);
                            this.set(`google_${service}_connected`, true);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    },
                });

                // 3. Request Access
                // prompt: 'consent' ensures we get a refresh of permissions and the user sees the account picker
                client.requestAccessToken({ prompt: 'consent' });

            } catch (err) {
                console.error("Initialization Error", err);
                alert("Kritischer Fehler bei der OAuth Initialisierung. Prüfen Sie die Konsole.");
                resolve(false);
            }
        });
    }

    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        this.set(`google_${service}_connected`, false);
        
        // Revoke is cleaner, but optional for UX. 
        if (this.accessToken && window.google) {
            try {
                window.google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('Access revoked');
                });
            } catch(e) {
                console.warn("Revoke failed", e);
            }
        }
        
        // We do NOT clear the access token completely if the other service is still connected
        // But for simplicity in this MVP, we treat them as one auth session:
        const otherService = service === 'calendar' ? 'mail' : 'calendar';
        if (!this.get(`google_${otherService}_connected`, false)) {
             this.accessToken = null;
             localStorage.removeItem('google_access_token');
        }
        
        return true;
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        // Simple check if flag is set AND token exists
        const flag = this.get<boolean>(`google_${service}_connected`, false);
        const hasToken = !!localStorage.getItem('google_access_token');
        return flag && hasToken;
    }

    // --- REAL API CALLS ---

    private async createGoogleCalendarEvent(task: Task) {
        if (!this.accessToken) return;

        const event = {
            summary: task.title,
            description: `Priorität: ${task.priority}\nTyp: ${task.type}`,
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
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(event)
            });

            if (!response.ok) {
                const err = await response.json();
                console.error("Google Calendar API Error:", err);
                // Silent fail or toast notification could go here
            }
        } catch (error) {
            console.error("Network Error Syncing Calendar", error);
        }
    }

    async sendMail(to: string, subject: string, body: string): Promise<boolean> {
        if (!this.accessToken) {
            alert("Keine Verbindung zu Google. Bitte verbinden Sie Mail in den Einstellungen.");
            return false;
        }

        // Construct MIME Message
        const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
        const messageParts = [
            `To: ${to}`,
            `Subject: ${utf8Subject}`,
            "Content-Type: text/plain; charset=utf-8",
            "MIME-Version: 1.0",
            "",
            body
        ];
        const message = messageParts.join('\n');
        
        // Encode to Base64Url (Required by Gmail API)
        const encodedMessage = btoa(unescape(encodeURIComponent(message)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    raw: encodedMessage
                })
            });

            if (!response.ok) {
                 const err = await response.json();
                 console.error("Gmail API Error", err);
                 alert(`Senden fehlgeschlagen: ${err.error?.message || 'Unbekannter Fehler'}`);
                 return false;
            }
            return true;
        } catch (e) {
            console.error("Failed to send mail", e);
            alert("Netzwerkfehler beim Senden der E-Mail.");
            return false;
        }
    }
}

// --- API Implementation (For Future Backend) ---
class APIDataService implements IDataService {
    private baseUrl: string;
    private token: string;

    constructor(url: string, token: string) {
        this.baseUrl = url.replace(/\/$/, '');
        this.token = token;
    }

    async init(): Promise<void> {
        try {
            const res = await fetch(`${this.baseUrl}/health`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (!res.ok) throw new Error('API connection failed');
        } catch (e) {
            console.warn("API Init failed", e);
            throw e;
        }
    }

    private async request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: body ? JSON.stringify(body) : undefined
        });
        if (!res.ok) throw new Error(`API Error: ${res.statusText}`);
        return res.json();
    }

    getContacts = () => this.request<Contact[]>('/contacts');
    saveContact = (c: Contact) => this.request<Contact>('/contacts', 'POST', c);
    updateContact = (c: Contact) => this.request<Contact>(`/contacts/${c.id}`, 'PUT', c);
    deleteContact = (id: string) => this.request<void>(`/contacts/${id}`, 'DELETE');

    getDeals = () => this.request<Deal[]>('/deals');
    saveDeal = (d: Deal) => this.request<Deal>('/deals', 'POST', d);
    updateDeal = (d: Deal) => this.request<Deal>(`/deals/${d.id}`, 'PUT', d);
    deleteDeal = (id: string) => this.request<void>(`/deals/${id}`, 'DELETE');

    getTasks = () => this.request<Task[]>('/tasks');
    saveTask = (t: Task) => this.request<Task>('/tasks', 'POST', t);
    updateTask = (t: Task) => this.request<Task>(`/tasks/${t.id}`, 'PUT', t);
    deleteTask = (id: string) => this.request<void>(`/tasks/${id}`, 'DELETE');

    getUserProfile = () => this.request<UserProfile>('/profile');
    saveUserProfile = (p: UserProfile) => this.request<UserProfile>('/profile', 'PUT', p);

    getProductPresets = () => this.request<ProductPreset[]>('/settings/presets');
    saveProductPresets = (p: ProductPreset[]) => this.request<ProductPreset[]>('/settings/presets', 'PUT', p);

    async connectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        const res = await this.request<{ url: string }>(`/integrations/google/${service}/connect`, 'POST');
        if (res.url) {
            window.location.href = res.url;
            return false;
        }
        return true;
    }

    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        await this.request(`/integrations/google/${service}/disconnect`, 'POST');
        return true;
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        const res = await this.request<{ connected: boolean }>(`/integrations/google/${service}/status`);
        return res.connected;
    }

    async sendMail(to: string, subject: string, body: string): Promise<boolean> {
         await this.request('/integrations/google/mail/send', 'POST', { to, subject, body });
         return true;
    }
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
