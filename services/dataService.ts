
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
    connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean>;
    disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean>;
    getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean>;
    
    // Actions
    sendMail(to: string, subject: string, body: string): Promise<boolean>;
}

// --- Local Storage Implementation (Cached & Optimized) ---
class LocalDataService implements IDataService {
    private googleClientId?: string;
    private accessToken: string | null = null;
    private isPreviewEnv: boolean = false;
    
    // OPTIMIZATION: In-Memory Cache to avoid JSON.parse on every read
    private cache: {
        contacts: Contact[] | null;
        deals: Deal[] | null;
        tasks: Task[] | null;
        userProfile: UserProfile | null;
        productPresets: ProductPreset[] | null;
    } = {
        contacts: null,
        deals: null,
        tasks: null,
        userProfile: null,
        productPresets: null
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

        this.cache.contacts = this.getFromStorage<Contact[]>('contacts', []);
        this.cache.deals = this.getFromStorage<Deal[]>('deals', []);
        this.cache.tasks = this.getFromStorage<Task[]>('tasks', []);
        this.cache.userProfile = this.getFromStorage<UserProfile>('userProfile', {
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@nex-crm.de',
            role: 'Admin',
            avatar: 'https://picsum.photos/id/64/100/100'
        });
        this.cache.productPresets = this.getFromStorage<ProductPreset[]>('productPresets', [
            { id: 'beta', title: 'Beta Version', value: 500 },
            { id: 'release', title: 'Release Version', value: 1500 }
        ]);

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
        localStorage.setItem(storageKey, JSON.stringify(data));
    }

    async getContacts(): Promise<Contact[]> {
        return this.cache.contacts || [];
    }

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

    async getDeals(): Promise<Deal[]> {
        return this.cache.deals || [];
    }

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
        // Sync logic only if connected and not currently syncing
        const isCalConnected = this.getIntegrationStatusSync('calendar');
        
        if (isCalConnected && this.accessToken && !this.isPreviewEnv) {
            // Non-blocking sync (fire and forget update)
            this.syncWithGoogleCalendar().catch(console.error);
        }
        return this.cache.tasks || [];
    }

    async saveTask(task: Task): Promise<Task> {
        let taskToSave = { ...task };

        const isCalConnected = this.getIntegrationStatusSync('calendar');
        if (isCalConnected && this.accessToken) {
            if (this.isPreviewEnv) {
                console.log("[MOCK] Created Google Calendar Event for:", task.title);
            } else {
                try {
                    const eventId = await this.createGoogleCalendarEvent(task);
                    if (eventId) {
                        taskToSave.googleEventId = eventId;
                    }
                } catch (err) {
                    console.error("Calendar Sync Error", err);
                }
            }
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
            if (isCalConnected && this.accessToken && !this.isPreviewEnv) {
                try {
                    await this.deleteGoogleCalendarEvent(taskToDelete.googleEventId);
                } catch (e) {
                    console.error("Failed to delete Google Event", e);
                }
            } else if (this.isPreviewEnv) {
                 console.log("[MOCK] Deleted Google Calendar Event ID:", taskToDelete.googleEventId);
            }
        }

        const newList = list.filter(t => t.id !== id);
        this.set('tasks', 'tasks', newList);
    }

    async getUserProfile(): Promise<UserProfile> {
        return this.cache.userProfile!;
    }

    async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
        this.set('userProfile', 'userProfile', profile);
        return profile;
    }

    async getProductPresets(): Promise<ProductPreset[]> {
        return this.cache.productPresets || [];
    }

    async saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]> {
        this.set('productPresets', 'productPresets', presets);
        return presets;
    }

    // --- GOOGLE INTEGRATION ---

    // Helper: Wait for Google Script to load
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

    async connectGoogle(service: 'calendar' | 'mail', clientIdOverride?: string): Promise<boolean> {
        if (this.isPreviewEnv) {
            const mockToken = "mock_token_" + Math.random().toString(36);
            this.accessToken = mockToken;
            localStorage.setItem('google_access_token', mockToken);
            localStorage.setItem(`google_${service}_connected`, 'true'); // Directly set to LS
            // Mock delay
            await new Promise(r => setTimeout(r, 800));
            return true;
        }

        const effectiveClientId = clientIdOverride || this.googleClientId;
        if (!effectiveClientId) {
            alert("Bitte geben Sie zuerst Ihre Google Client ID in den Backend-Konfigurationen ein.");
            return false;
        }

        const scriptsLoaded = await this.waitForGoogleScripts();
        if (!scriptsLoaded) {
            alert("Google API Skripte konnten nicht geladen werden. Bitte prüfen Sie Ihre Internetverbindung oder Ad-Blocker.");
            return false;
        }

        return new Promise((resolve) => {
            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: effectiveClientId,
                    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send',
                    callback: (resp: any) => {
                        if (resp.error) {
                            console.error("OAuth Error:", resp);
                            if (resp.error.includes('origin_mismatch')) {
                                alert(`Google Error 400: Origin Mismatch.\n\nBitte fügen Sie '${window.location.origin}' in der Google Cloud Console zu den 'Authorized JavaScript origins' hinzu.`);
                            } else {
                                alert(`Fehler bei der Google Anmeldung: ${resp.error}`);
                            }
                            resolve(false);
                            return;
                        }

                        if (resp.access_token) {
                            this.accessToken = resp.access_token;
                            localStorage.setItem('google_access_token', resp.access_token);
                            localStorage.setItem(`google_${service}_connected`, 'true');
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
        
        if (this.accessToken && window.google && !this.isPreviewEnv) {
            try {
                window.google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('Access revoked');
                });
            } catch(e) { console.warn("Revoke failed", e); }
        }
        
        const otherService = service === 'calendar' ? 'mail' : 'calendar';
        if (localStorage.getItem(`google_${otherService}_connected`) !== 'true') {
             this.accessToken = null;
             localStorage.removeItem('google_access_token');
        }
        return true;
    }

    // Helper (Sync) for internal use, reads direct from LS or Cache logic
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
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            
            if (response.status === 401) {
                console.warn("Google Token expired. Disconnecting.");
                this.accessToken = null;
                localStorage.removeItem('google_access_token');
                // Force sync state update indirectly by next reload or interaction
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
                
                if (hasChanges) {
                    this.set('tasks', 'tasks', currentTasks);
                }
            }
        } catch (e) {
            console.error("Sync Fetch Error", e);
        } finally {
            this.isSyncing = false;
        }
    }

    private async createGoogleCalendarEvent(task: Task): Promise<string | null> {
        if (!this.accessToken) return null;

        const event = {
            summary: task.title,
            description: `Priorität: ${task.priority}\nTyp: ${task.type}\n(Erstellt via NexCRM)`,
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

            if (!response.ok) return null;
            const data = await response.json();
            return data.id;
        } catch (error) {
            return null;
        }
    }

    private async deleteGoogleCalendarEvent(eventId: string): Promise<void> {
        if (!this.accessToken) return;

        try {
             await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
        } catch (e) { console.error("Delete Request Failed", e); }
    }

    async sendMail(to: string, subject: string, body: string): Promise<boolean> {
        if (this.isPreviewEnv) {
            await new Promise(r => setTimeout(r, 1000));
            return true;
        }

        if (!this.accessToken) {
            alert("Keine Verbindung zu Google. Bitte verbinden Sie Mail in den Einstellungen.");
            return false;
        }

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
                body: JSON.stringify({ raw: encodedMessage })
            });

            if (!response.ok) {
                 const err = await response.json();
                 alert(`Senden fehlgeschlagen: ${err.error?.message || 'Unbekannter Fehler'}`);
                 return false;
            }
            return true;
        } catch (e) {
            alert("Netzwerkfehler beim Senden der E-Mail.");
            return false;
        }
    }
}

// --- API Implementation (Placeholder for robustness) ---
class APIDataService implements IDataService {
    private baseUrl: string;
    private token: string;

    constructor(url: string, token: string) {
        this.baseUrl = url.replace(/\/$/, '');
        this.token = token;
    }

    async init(): Promise<void> { /* ... */ }

    // Minimal implementations to satisfy interface
    getContacts = async () => [];
    saveContact = async (c: Contact) => c;
    updateContact = async (c: Contact) => c;
    deleteContact = async () => {};
    getDeals = async () => [];
    saveDeal = async (d: Deal) => d;
    updateDeal = async (d: Deal) => d;
    deleteDeal = async () => {};
    getTasks = async () => [];
    saveTask = async (t: Task) => t;
    updateTask = async (t: Task) => t;
    deleteTask = async () => {};
    getUserProfile = async () => ({} as UserProfile);
    saveUserProfile = async (p: UserProfile) => p;
    getProductPresets = async () => [];
    saveProductPresets = async (p: ProductPreset[]) => p;
    connectGoogle = async () => false;
    disconnectGoogle = async () => true;
    getIntegrationStatus = async () => false;
    sendMail = async () => false;
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
