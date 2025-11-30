
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

// --- Local Storage Implementation (Enhanced with Google APIs) ---
class LocalDataService implements IDataService {
    private googleClientId?: string;
    private accessToken: string | null = null;
    private isPreviewEnv: boolean = false;
    private lastSyncTime: number = 0;

    constructor(googleClientId?: string) {
        this.googleClientId = googleClientId;
        // Versuche Token aus Session/Local zu laden
        this.accessToken = localStorage.getItem('google_access_token');
        
        // Detect Preview Environment (Blob/Iframe) to avoid OAuth errors
        try {
            if (window.location.protocol === 'blob:' || window.parent !== window) {
                this.isPreviewEnv = true;
            }
        } catch(e) { this.isPreviewEnv = true; }
    }
    
    async init(): Promise<void> {
        // Ensure mock data exists if storage is empty
        if (!localStorage.getItem('contacts')) localStorage.setItem('contacts', JSON.stringify(mockContacts));
        if (!localStorage.getItem('deals')) localStorage.setItem('deals', JSON.stringify(mockDeals));
        if (!localStorage.getItem('tasks')) localStorage.setItem('tasks', JSON.stringify(mockTasks));

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
        // Trigger Sync if connected and enough time passed (e.g., every 5 minutes or on reload)
        const isCalConnected = this.get('google_calendar_connected', false);
        const now = Date.now();
        if (isCalConnected && this.accessToken && !this.isPreviewEnv && (now - this.lastSyncTime > 1000 * 60)) {
            await this.syncWithGoogleCalendar();
            this.lastSyncTime = now;
        }
        return this.get<Task[]>('tasks', []);
    }

    async saveTask(task: Task): Promise<Task> {
        let taskToSave = { ...task };

        // --- GOOGLE CALENDAR SYNC (Create) ---
        const isCalConnected = this.get('google_calendar_connected', false);
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

        const list = this.get<Task[]>('tasks', []);
        this.set('tasks', [taskToSave, ...list]);
        return taskToSave;
    }

    async updateTask(task: Task): Promise<Task> {
        // --- GOOGLE CALENDAR SYNC (Update not implemented fully, but we keep the ID) ---
        // For a full update sync, we'd need a PATCH endpoint here too.
        
        const list = this.get<Task[]>('tasks', []);
        this.set('tasks', list.map(t => t.id === task.id ? task : t));
        return task;
    }

    async deleteTask(id: string): Promise<void> {
        const list = this.get<Task[]>('tasks', []);
        const taskToDelete = list.find(t => t.id === id);

        // --- GOOGLE CALENDAR SYNC (Delete) ---
        if (taskToDelete && taskToDelete.googleEventId) {
            const isCalConnected = this.get('google_calendar_connected', false);
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

    async connectGoogle(service: 'calendar' | 'mail', clientIdOverride?: string): Promise<boolean> {
        // MOCK MODE FOR PREVIEWS
        if (this.isPreviewEnv) {
            const mockToken = "mock_token_" + Math.random().toString(36);
            this.accessToken = mockToken;
            localStorage.setItem('google_access_token', mockToken);
            this.set(`google_${service}_connected`, true);
            
            // Mock delay to simulate network
            await new Promise(r => setTimeout(r, 800));
            return true;
        }

        // 1. Check Requirements
        const effectiveClientId = clientIdOverride || this.googleClientId;
        
        if (!effectiveClientId) {
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
        
        if (this.accessToken && window.google && !this.isPreviewEnv) {
            try {
                window.google.accounts.oauth2.revoke(this.accessToken, () => {
                    console.log('Access revoked');
                });
            } catch(e) {
                console.warn("Revoke failed", e);
            }
        }
        
        const otherService = service === 'calendar' ? 'mail' : 'calendar';
        if (!this.get(`google_${otherService}_connected`, false)) {
             this.accessToken = null;
             localStorage.removeItem('google_access_token');
        }
        
        return true;
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        const flag = this.get<boolean>(`google_${service}_connected`, false);
        const hasToken = !!localStorage.getItem('google_access_token');
        return flag && hasToken;
    }

    // --- REAL API CALLS ---

    // 1. IMPORT from Google (Sync)
    private async syncWithGoogleCalendar() {
        if (!this.accessToken) return;
        
        try {
            // Fetch events: 1 month back to 3 months future
            const now = new Date();
            const minDate = new Date();
            minDate.setMonth(now.getMonth() - 1);
            const maxDate = new Date();
            maxDate.setMonth(now.getMonth() + 3);

            const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${minDate.toISOString()}&timeMax=${maxDate.toISOString()}&singleEvents=true&maxResults=100`;
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            
            if (!response.ok) return;
            const data = await response.json();
            
            if (data.items) {
                const currentTasks = this.get<Task[]>('tasks', []);
                let hasChanges = false;
                
                data.items.forEach((event: any) => {
                    // Check if we already have this event
                    const existingTaskIndex = currentTasks.findIndex(t => t.googleEventId === event.id);
                    
                    const eventDate = event.start.date || event.start.dateTime.split('T')[0];
                    const isAllDay = !!event.start.date;
                    let startTime, endTime;
                    
                    if (!isAllDay && event.start.dateTime) {
                        const startDt = new Date(event.start.dateTime);
                        const endDt = new Date(event.end.dateTime);
                        startTime = `${String(startDt.getHours()).padStart(2,'0')}:${String(startDt.getMinutes()).padStart(2,'0')}`;
                        endTime = `${String(endDt.getHours()).padStart(2,'0')}:${String(endDt.getMinutes()).padStart(2,'0')}`;
                    }

                    if (existingTaskIndex === -1) {
                        // Import New
                        const newTask: Task = {
                            id: Math.random().toString(36).substr(2, 9),
                            title: event.summary || 'Unbenannter Termin',
                            type: 'meeting', // Default to meeting for imports
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
                        // Update Existing? Optional.
                        // For MVP, we respect Google as source of truth for time/date if synced
                        const task = currentTasks[existingTaskIndex];
                        if (task.dueDate !== eventDate || task.title !== event.summary) {
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
                    this.set('tasks', currentTasks);
                }
            }
        } catch (e) {
            console.error("Sync Fetch Error", e);
        }
    }

    // 2. CREATE on Google
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

            if (!response.ok) {
                console.error("Google Calendar API Error");
                return null;
            }
            const data = await response.json();
            return data.id; // Return the Google Event ID
        } catch (error) {
            console.error("Network Error Syncing Calendar", error);
            return null;
        }
    }

    // 3. DELETE on Google
    private async deleteGoogleCalendarEvent(eventId: string): Promise<void> {
        if (!this.accessToken) return;

        try {
             const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            
            if (!response.ok) {
                console.warn("Could not delete remote event", response.status);
            }
        } catch (e) {
            console.error("Delete Request Failed", e);
        }
    }

    async sendMail(to: string, subject: string, body: string): Promise<boolean> {
        if (this.isPreviewEnv) {
            console.log(`[MOCK] Sending Mail to ${to}: ${subject}`);
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
                body: JSON.stringify({
                    raw: encodedMessage
                })
            });

            if (!response.ok) {
                 const err = await response.json();
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
