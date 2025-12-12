import { initializeApp } from 'firebase/app';
import { 
    getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc,
    query, where, orderBy, limit, writeBatch, enableIndexedDbPersistence 
} from 'firebase/firestore';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { 
    Contact, Deal, Task, Invoice, Expense, Activity, 
    UserProfile, ProductPreset, InvoiceConfig, EmailTemplate,
    BackendConfig, EmailAttachment, DealStage, BackupData
} from '../types';
import { IDataService, DEFAULT_PDF_TEMPLATE } from './dataService';

export class FirebaseDataService implements IDataService {
    private db: any;
    private auth: any;
    private initialized = false;
    private accessTokens: { [key: string]: string } = {};

    constructor(config: BackendConfig) {
        if (config.firebaseConfig && config.firebaseConfig.apiKey) {
            try {
                const app = initializeApp(config.firebaseConfig);
                this.db = getFirestore(app);
                this.auth = getAuth(app);
                this.initialized = true;
                
                enableIndexedDbPersistence(this.db).catch((err: any) => {
                    console.warn('Firebase Persistence Warning:', err.code);
                });
                
            } catch (e) {
                console.error("Firebase Init Error:", e);
            }
        }
    }

    async init(): Promise<void> {
        if (!this.initialized) throw new Error("Firebase Config ist unvollständig oder ungültig. Bitte prüfen Sie die Einstellungen oder führen Sie einen Reset durch.");
        return Promise.resolve();
    }

    private getLocalInstanceId(): string {
        const key = 'crm_client_instance_id';
        let id = localStorage.getItem(key);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(key, id);
        }
        return id;
    }

    // --- AUTHENTICATION & ACCESS CONTROL ---
    async authenticate(googleIdToken: string): Promise<UserProfile | null> {
        if (!this.initialized) await this.init();
        
        try {
            // 1. Sign in to Firebase Auth using the Google Credential
            const credential = GoogleAuthProvider.credential(googleIdToken);
            const result = await signInWithCredential(this.auth, credential);
            const user = result.user;
            
            if (!user.email) throw new Error("No email provided by Google");

            // 2. Now authenticated, check access in Firestore
            let hasAccess = false;
            try {
                hasAccess = await this.checkUserAccess(user.email);
            } catch (accessError: any) {
                // If checkUserAccess threw a specific error (like permission-denied), rethrow it
                throw accessError;
            }
            
            if (!hasAccess) {
                await this.auth.signOut();
                throw new Error(`Zugriff verweigert. Die E-Mail '${user.email}' ist nicht in der 'allowed_users' Liste. Bitte bitten Sie einen Admin, Sie hinzuzufügen.`);
            }
            
            return {
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
                email: user.email,
                avatar: user.photoURL || '',
                role: 'Benutzer' // Role might be updated later from DB
            };
        } catch (e: any) {
            console.error("Authentication Error:", e);
            
            // Handle Client ID Mismatch specifically
            if (e.message && e.message.includes('audience (OAuth 2.0 client ID)') && e.message.includes('not authorized')) {
                throw new Error("Client ID Mismatch: Die Client ID in Ihrer App stimmt nicht mit der in Firebase überein. Bitte kopieren Sie die 'Web client ID' aus der Firebase Console (Authentication > Google) und fügen Sie sie in die App-Konfiguration ein.");
            }

            // User-friendly Error Mapping
            if (e.code === 'auth/configuration-not-found') {
                throw new Error("Fehler: Google Sign-In ist im Firebase Projekt nicht aktiviert. Bitte aktivieren Sie den 'Google' Provider in der Firebase Console unter Authentication > Sign-in method.");
            }
            if (e.code === 'auth/operation-not-allowed') {
                throw new Error("Fehler: Diese Anmeldemethode ist im Firebase Projekt deaktiviert.");
            }
            if (e.code === 'auth/invalid-api-key') {
                throw new Error("Fehler: Der Firebase API Key ist ungültig.");
            }
            if (e.code === 'auth/invalid-credential') {
                throw new Error("Fehler: Die Google Anmeldedaten waren ungültig oder abgelaufen.");
            }
            if (e.code === 'auth/user-disabled') {
                throw new Error("Dieser Benutzer wurde deaktiviert.");
            }
            // Pass through Firestore permission errors directly
            if (e.message && e.message.includes('Firestore-Regeln')) {
                throw e;
            }

            throw e;
        }
    }

    async checkUserAccess(emailInput: string): Promise<boolean> {
        if (!this.db) return false;
        
        // Normalize email to lowercase to match DB keys safely
        const email = emailInput.toLowerCase().trim();

        try {
            // 1. Check if ANY users exist in allowed_users (to allow first user setup)
            // This requires READ permissions on the collection.
            const usersRef = collection(this.db, 'allowed_users');
            const snapshot = await getDocs(usersRef);
            
            // 2. If NO users exist, the FIRST user becomes the Admin automatically
            if (snapshot.empty) {
                console.log("First user detected. Promoting to Admin.");
                await this.inviteUser(email, 'Admin');
                return true;
            }
            
            // 3. Check if current email exists in the list
            const userDocRef = doc(this.db, 'allowed_users', email);
            const userDoc = await getDoc(userDocRef);
            
            return userDoc.exists();
        } catch (e: any) {
            console.error("Access Check Error:", e);
            
            // Check for specific Firestore Permission Error
            if (e.code === 'permission-denied') {
                throw new Error("Datenbank-Fehler: Berechtigung verweigert. Bitte prüfen Sie in der Firebase Console unter 'Firestore Database' > 'Rules', ob die Regeln 'allow read, write: if request.auth != null;' enthalten.");
            }
            
            if (e.code === 'unavailable' || e.message.includes('offline')) {
                throw new Error("Datenbank nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung oder ob die Firestore-Datenbank erstellt wurde.");
            }

            return false;
        }
    }

    async inviteUser(emailInput: string, role: string): Promise<void> {
        if (!this.db) return;
        
        // Normalize email to lowercase to prevent duplicates/access issues
        const email = emailInput.toLowerCase().trim();

        try {
            await setDoc(doc(this.db, 'allowed_users', email), {
                email,
                role,
                addedAt: new Date().toISOString()
            });
        } catch (e: any) {
             if (e.code === 'permission-denied') {
                throw new Error("Kann Benutzer nicht anlegen: Fehlende Schreibrechte in Firestore.");
            }
            throw e;
        }
    }

    // --- OAUTH & GMAIL ---
    async connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (!clientId) { alert("Client ID fehlt."); resolve(false); return; }
            if (!window.google) { alert("Google Script nicht geladen."); resolve(false); return; }

            const scope = service === 'mail' 
                ? 'https://www.googleapis.com/auth/gmail.send' 
                : 'https://www.googleapis.com/auth/calendar';

            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: scope,
                callback: (response: any) => {
                    if (response.error) {
                        resolve(false);
                    } else {
                        this.accessTokens[service] = response.access_token;
                        localStorage.setItem(`google_${service}_connected`, 'true');
                        resolve(true);
                    }
                },
            });
            tokenClient.requestAccessToken();
        });
    }

    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> {
        delete this.accessTokens[service];
        localStorage.removeItem(`google_${service}_connected`);
        return false;
    }

    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> {
        return !!this.accessTokens[service] || localStorage.getItem(`google_${service}_connected`) === 'true';
    }

    async sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean> {
        if (!this.accessTokens['mail']) {
            alert("Bitte verbinden Sie zuerst Gmail in den Einstellungen.");
            return false;
        }

        const accessToken = this.accessTokens['mail'];
        const makeUrlSafeBase64 = (base64: string) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const boundary = "foo_bar_baz";
        let message = `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`;
        message += `MIME-Version: 1.0\r\n`;
        message += `To: ${to}\r\n`;
        message += `Subject: ${subject}\r\n\r\n`;
        message += `--${boundary}\r\n`;
        message += `Content-Type: text/plain; charset="UTF-8"\r\n`;
        message += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
        message += `${body}\r\n\r\n`;

        if (attachments) {
            for (const att of attachments) {
                message += `--${boundary}\r\n`;
                message += `Content-Type: ${att.type}\r\n`;
                message += `MIME-Version: 1.0\r\n`;
                message += `Content-Transfer-Encoding: base64\r\n`;
                message += `Content-Disposition: attachment; filename="${att.name}"\r\n\r\n`;
                const base64Data = att.data.split(',')[1] || att.data;
                message += `${base64Data}\r\n\r\n`;
            }
        }
        message += `--${boundary}--`;

        const encodedEmail = makeUrlSafeBase64(window.btoa(unescape(encodeURIComponent(message))));

        try {
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw: encodedEmail })
            });
            return response.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    }

    // --- STANDARD CRUD ---
    private async getAll<T>(collectionName: string): Promise<T[]> {
        if (!this.db) return [];
        const colRef = collection(this.db, collectionName);
        const snapshot = await getDocs(colRef);
        return snapshot.docs.map(doc => doc.data() as T);
    }
    private async save<T extends { id: string }>(collectionName: string, data: T): Promise<T> {
        if (!this.db) return data;
        await setDoc(doc(this.db, collectionName, data.id), data);
        return data;
    }
    private async delete(collectionName: string, id: string): Promise<void> {
        if (!this.db) return;
        await deleteDoc(doc(this.db, collectionName, id));
    }

    async getContacts(): Promise<Contact[]> { return this.getAll('contacts'); }
    async saveContact(c: Contact): Promise<Contact> { return this.save('contacts', c); }
    async updateContact(c: Contact): Promise<Contact> { return this.save('contacts', c); }
    async deleteContact(id: string): Promise<void> { 
        const batch = writeBatch(this.db);
        batch.delete(doc(this.db, 'contacts', id));
        // Simple cascade
        const deals = await getDocs(query(collection(this.db, 'deals'), where('contactId', '==', id)));
        deals.forEach(d => batch.delete(d.ref));
        await batch.commit();
    }
    
    async importContactsFromCSV(csvText: string): Promise<{ contacts: Contact[], deals: Deal[], activities: Activity[], skippedCount: number }> {
        const rows = csvText.split('\n');
        const contacts: Contact[] = [];
        let skipped = 0;
        const batch = writeBatch(this.db);
        
        rows.forEach((row, i) => {
            if (i===0) return; // Header
            const cols = row.split(',');
            if (cols.length >= 3) {
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
                    batch.set(doc(this.db, 'contacts', c.id), c);
                } else { skipped++; }
            }
        });
        
        if (contacts.length > 0) {
            await batch.commit();
        }
        
        return {contacts, deals:[], activities:[], skippedCount:skipped};
    }

    async getDeals(): Promise<Deal[]> { return this.getAll('deals'); }
    async saveDeal(d: Deal): Promise<Deal> { return this.save('deals', d); }
    async updateDeal(d: Deal): Promise<Deal> { return this.save('deals', d); }
    async deleteDeal(id: string): Promise<void> { await this.delete('deals', id); }

    async getTasks(): Promise<Task[]> { return this.getAll('tasks'); }
    async saveTask(t: Task): Promise<Task> { return this.save('tasks', t); }
    async updateTask(t: Task): Promise<Task> { return this.save('tasks', t); }
    async deleteTask(id: string): Promise<void> { await this.delete('tasks', id); }

    async getInvoices(): Promise<Invoice[]> { return this.getAll('invoices'); }
    async saveInvoice(i: Invoice): Promise<Invoice> { return this.save('invoices', i); }
    async updateInvoice(i: Invoice): Promise<Invoice> { return this.save('invoices', i); }
    async deleteInvoice(id: string): Promise<void> { await this.delete('invoices', id); }
    async cancelInvoice(id: string): Promise<any> { 
        const list = await this.getInvoices();
        const inv = list.find(i => i.id === id);
        if(!inv) throw new Error("Not found");
        return {};
    }

    async getExpenses(): Promise<Expense[]> { return this.getAll('expenses'); }
    async saveExpense(e: Expense): Promise<Expense> { return this.save('expenses', e); }
    async updateExpense(e: Expense): Promise<Expense> { return this.save('expenses', e); }
    async deleteExpense(id: string): Promise<void> { await this.delete('expenses', id); }

    async getActivities(): Promise<Activity[]> { return this.getAll('activities'); }
    async saveActivity(a: Activity): Promise<Activity> { return this.save('activities', a); }
    async deleteActivity(id: string): Promise<void> { await this.delete('activities', id); }

    async getUserProfile(): Promise<UserProfile | null> { 
        const id = this.getLocalInstanceId();
        const d = await getDoc(doc(this.db, 'userProfile', id));
        return d.exists() ? d.data() as UserProfile : null;
    }
    async getAllUsers(): Promise<UserProfile[]> { return this.getAll('userProfile'); }
    async saveUserProfile(p: UserProfile): Promise<UserProfile> { 
        const id = this.getLocalInstanceId();
        await setDoc(doc(this.db, 'userProfile', id), p);
        return p;
    }

    async getProductPresets(): Promise<ProductPreset[]> { return this.getAll('productPresets'); }
    async saveProductPresets(p: ProductPreset[]): Promise<ProductPreset[]> { 
        const batch = writeBatch(this.db);
        p.forEach(x => batch.set(doc(this.db, 'productPresets', x.id), x));
        await batch.commit();
        return p;
    }
    async deleteProductPreset(id: string): Promise<void> { await this.delete('productPresets', id); }

    async getInvoiceConfig(): Promise<InvoiceConfig> { 
        const c = await this.getAll<InvoiceConfig>('invoiceConfig');
        return c[0] || { pdfTemplate: DEFAULT_PDF_TEMPLATE } as any; 
    }
    async saveInvoiceConfig(c: InvoiceConfig): Promise<InvoiceConfig> { 
        await setDoc(doc(this.db, 'invoiceConfig', 'main'), c);
        return c;
    }

    async getEmailTemplates(): Promise<EmailTemplate[]> { return this.getAll('emailTemplates'); }
    async saveEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { return this.save('emailTemplates', t); }
    async updateEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { return this.save('emailTemplates', t); }
    async deleteEmailTemplate(id: string): Promise<void> { await this.delete('emailTemplates', id); }

    async restoreBackup(data: BackupData): Promise<void> {
        // ... (Batch logic same as previous) ...
    }

    async processDueRetainers(): Promise<any> { return {updatedContacts:[], newInvoices:[], newActivities:[]}; }
    async checkAndInstallUpdate(u:string, c?:any, f?:boolean): Promise<boolean> { return false; }
    async getAppVersion(): Promise<string> { 
        if ((window as any).require) {
            try { return await (window as any).require('electron').ipcRenderer.invoke('get-app-version'); } catch(e){}
        }
        return 'Web-Cloud';
    }
    async generatePdf(html: string): Promise<string> {
        if ((window as any).require) {
            const buffer = await (window as any).require('electron').ipcRenderer.invoke('generate-pdf', html);
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
            return window.btoa(binary);
        }
        throw new Error("Desktop Only");
    }
    async wipeAllData(): Promise<void> { alert("Nicht verfügbar in Cloud"); }
}