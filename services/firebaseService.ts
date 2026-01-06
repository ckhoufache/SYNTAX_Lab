
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
    getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc,
    query, where, orderBy, limit, writeBatch, enableIndexedDbPersistence,
    initializeFirestore, CACHE_SIZE_UNLIMITED 
} from 'firebase/firestore';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { 
    Contact, Deal, Task, Invoice, Expense, Activity, 
    UserProfile, ProductPreset, InvoiceConfig, EmailTemplate,
    BackendConfig, EmailAttachment, DealStage, BackupData, EmailMessage,
    BrainTool, BrainProcessStep, BrainPrompt, BrainSOP, BrainPersona
} from '../types';
import { IDataService, DEFAULT_PDF_TEMPLATE } from './dataService';

/**
 * Utility to recursively remove undefined properties from an object.
 * Firestore does not accept 'undefined', but accepts 'null'.
 */
const sanitizeForFirestore = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => sanitizeForFirestore(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    );
  }
  return obj;
};

export class FirebaseDataService implements IDataService {
    private db: any;
    private auth: any;
    private initialized = false;
    private accessTokens: { [key: string]: string } = {};

    constructor(config: BackendConfig) {
        if (config.firebaseConfig && config.firebaseConfig.apiKey) {
            try {
                // Check if app already initialized to avoid duplicate app errors
                const app = getApps().length === 0 
                    ? initializeApp(config.firebaseConfig) 
                    : getApp();

                // Initialize Firestore
                this.db = getFirestore(app);
                this.auth = getAuth(app);
                this.initialized = true;
                
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
            const credential = GoogleAuthProvider.credential(googleIdToken);
            const result = await signInWithCredential(this.auth, credential);
            const user = result.user;
            
            if (!user.email) throw new Error("No email provided by Google");

            let hasAccess = false;
            try {
                hasAccess = await this.checkUserAccess(user.email);
            } catch (accessError: any) {
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
                role: 'Benutzer' 
            };
        } catch (e: any) {
            console.error("Authentication Error:", e);
            if (e.message && e.message.includes('audience')) throw new Error("Client ID Mismatch.");
            if (e.code === 'auth/configuration-not-found') throw new Error("Fehler: Google Sign-In nicht aktiviert.");
            if (e.code === 'auth/invalid-credential') throw new Error("Fehler: Ungültige Anmeldedaten.");
            throw e;
        }
    }

    async checkUserAccess(emailInput: string): Promise<boolean> {
        if (!this.db) return false;
        const email = emailInput.toLowerCase().trim();

        try {
            const usersRef = collection(this.db, 'allowed_users');
            const snapshot = await getDocs(usersRef);
            
            if (snapshot.empty) {
                await this.inviteUser(email, 'Admin');
                return true;
            }
            
            const userDocRef = doc(this.db, 'allowed_users', email);
            const userDoc = await getDoc(userDocRef);
            
            return userDoc.exists();
        } catch (e: any) {
            console.error("Access Check Error:", e);
            return false;
        }
    }

    async inviteUser(emailInput: string, role: string): Promise<void> {
        if (!this.db) return;
        const email = emailInput.toLowerCase().trim();
        try {
            await setDoc(doc(this.db, 'allowed_users', email), {
                email,
                role,
                addedAt: new Date().toISOString()
            });
        } catch (e: any) {
            throw e;
        }
    }

    // --- OAUTH & GMAIL ---
    async connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (!clientId || !window.google) { resolve(false); return; }
            const scope = service === 'mail' ? 'https://www.googleapis.com/auth/gmail.send' : 'https://www.googleapis.com/auth/calendar';
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,
                scope: scope,
                callback: (response: any) => {
                    if (response.error) resolve(false);
                    else {
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
        if (!this.accessTokens['mail']) { alert("Kein Gmail Access."); return false; }
        const accessToken = this.accessTokens['mail'];
        const makeUrlSafeBase64 = (base64: string) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const boundary = "foo_bar_baz";
        let message = `Content-Type: multipart/mixed; boundary="${boundary}"\r\n` +
                      `MIME-Version: 1.0\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n` +
                      `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${body}\r\n\r\n`;
        if (attachments) {
            for (const att of attachments) {
                message += `--${boundary}\r\nContent-Type: ${att.type}\r\nMIME-Version: 1.0\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${att.name}"\r\n\r\n${att.data.split(',')[1] || att.data}\r\n\r\n`;
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
        } catch (e) { return false; }
    }

    // --- STANDARD CRUD ---
    private async getAll<T>(collectionName: string): Promise<T[]> {
        if (!this.db) return [];
        try {
            const colRef = collection(this.db, collectionName);
            const snapshotPromise = getDocs(colRef);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
            const snapshot = await Promise.race([snapshotPromise, timeoutPromise]) as any;
            
            return snapshot.docs.map((doc: any) => {
                const data = doc.data();
                return { ...data, id: data.id || doc.id, firestoreId: doc.id } as unknown as T;
            });
        } catch (e) {
            console.error(`Error fetching ${collectionName}:`, e);
            return [];
        }
    }
    
    private async save<T extends { id: string }>(collectionName: string, data: T): Promise<T> {
        if (!this.db) return data;
        await setDoc(doc(this.db, collectionName, data.id), sanitizeForFirestore(data));
        return data;
    }
    private async delete(collectionName: string, id: string): Promise<void> {
        if (!this.db) return;
        await deleteDoc(doc(this.db, collectionName, id));
    }

    async getContacts(): Promise<Contact[]> { return this.getAll('contacts'); }
    async saveContact(c: Contact): Promise<Contact> { return this.save('contacts', c); }
    async updateContact(c: Contact): Promise<Contact> { return this.save('contacts', c); }
    async deleteContact(id: string): Promise<void> { await this.delete('contacts', id); }
    async importContactsFromCSV(csvText: string): Promise<any> { return {contacts:[], deals:[], activities:[], skippedCount:0}; }

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
    async cancelInvoice(id: string): Promise<any> { return {}; }

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
        await setDoc(doc(this.db, 'userProfile', id), sanitizeForFirestore(p));
        return p;
    }

    async getProductPresets(): Promise<ProductPreset[]> { return this.getAll('productPresets'); }
    async saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]> { return presets; } 
    async deleteProductPreset(id: string): Promise<void> { await this.delete('productPresets', id); }

    async getInvoiceConfig(): Promise<InvoiceConfig> { 
        const c = await this.getAll<InvoiceConfig>('invoiceConfig');
        return c[0] || { pdfTemplate: DEFAULT_PDF_TEMPLATE } as any; 
    }
    async saveInvoiceConfig(c: InvoiceConfig): Promise<InvoiceConfig> { 
        await setDoc(doc(this.db, 'invoiceConfig', 'main'), sanitizeForFirestore(c));
        return c;
    }

    async getEmailTemplates(): Promise<EmailTemplate[]> { return this.getAll('emailTemplates'); }
    async saveEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { return this.save('emailTemplates', t); }
    async updateEmailTemplate(t: EmailTemplate): Promise<EmailTemplate> { return this.save('emailTemplates', t); }
    async deleteEmailTemplate(id: string): Promise<void> { await this.delete('emailTemplates', id); }

    async restoreBackup(data: BackupData): Promise<void> { }
    async processDueRetainers(): Promise<any> { return {updatedContacts:[], newInvoices:[], newActivities:[]}; }
    async runCommissionBatch(year: number, month: number): Promise<any> { return {createdInvoices:[], updatedSourceInvoices:[]}; }

    async checkAndInstallUpdate(): Promise<boolean> { return false; }
    async getAppVersion(): Promise<string> { return '1.4.0'; }
    async generatePdf(html: string): Promise<string> { return ''; }
    async wipeAllData(): Promise<void> { }

    async fetchEmails(): Promise<EmailMessage[]> { return []; }
    async getEmailFolders(): Promise<any[]> { return []; }
    async createEmailFolder(): Promise<boolean> { return false; }
    async deleteEmailFolder(): Promise<boolean> { return false; }
    async markEmailRead(): Promise<boolean> { return false; }
    async sendSmtpMail(): Promise<boolean> { return false; }
    async moveEmail(): Promise<boolean> { return false; }

    // --- BRAIN MODULE IMPLEMENTATION ---
    async getBrainTools(): Promise<BrainTool[]> { return this.getAll('brain_tools'); }
    async saveBrainTool(t: BrainTool): Promise<BrainTool> { return this.save('brain_tools', t); }
    
    async getBrainProcess(): Promise<BrainProcessStep[]> { return this.getAll('brain_process'); }
    async saveBrainProcess(p: BrainProcessStep): Promise<BrainProcessStep> { return this.save('brain_process', p); }
    
    async getBrainPrompts(): Promise<BrainPrompt[]> { return this.getAll('brain_prompts'); }
    async saveBrainPrompt(p: BrainPrompt): Promise<BrainPrompt> { return this.save('brain_prompts', p); }
    
    async getBrainSOPs(): Promise<BrainSOP[]> { return this.getAll('brain_sops'); }
    async saveBrainSOP(s: BrainSOP): Promise<BrainSOP> { return this.save('brain_sops', s); }
    
    async getBrainPersonas(): Promise<BrainPersona[]> { return this.getAll('brain_personas'); }
    async saveBrainPersona(p: BrainPersona): Promise<BrainPersona> { return this.save('brain_personas', p); }
}
