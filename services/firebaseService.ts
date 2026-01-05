import firebase from 'firebase/compat/app';
import { 
    getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc,
    query, where, orderBy, limit, writeBatch, enableIndexedDbPersistence 
} from 'firebase/firestore';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { 
    Contact, Deal, Task, Invoice, Expense, Activity, 
    UserProfile, ProductPreset, InvoiceConfig, EmailTemplate,
    BackendConfig, EmailAttachment, DealStage, BackupData, EmailMessage
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
                // Use compat API for app initialization to handle TS resolution issues with modular firebase/app
                const app = firebase.apps.length === 0 
                    ? firebase.initializeApp(config.firebaseConfig) 
                    : firebase.app();

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
        return snapshot.docs.map(doc => {
            const data = doc.data();
            // CRITICAL FIX: If the stored object does not have an 'id' property (like external/website contacts),
            // use the Firestore Document ID. This ensures every item is deletable/editable.
            // Also inject firestoreId for robust reference.
            return {
                ...data,
                id: data.id || doc.id,
                firestoreId: doc.id
            } as unknown as T;
        });
    }
    private async save<T extends { id: string }>(collectionName: string, data: T): Promise<T> {
        if (!this.db) return data;
        // Strip undefined fields which cause Firestore errors
        const sanitized = sanitizeForFirestore(data);
        await setDoc(doc(this.db, collectionName, data.id), sanitized);
        return sanitized;
    }
    private async delete(collectionName: string, id: string): Promise<void> {
        if (!this.db) return;
        await deleteDoc(doc(this.db, collectionName, id));
    }

    async getContacts(): Promise<Contact[]> { return this.getAll('contacts'); }
    async saveContact(c: Contact): Promise<Contact> { return this.save('contacts', c); }
    async updateContact(c: Contact): Promise<Contact> { return this.save('contacts', c); }
    
    // FIX: Enhanced deleteContact to resolve ID mismatch from external imports
    async deleteContact(id: string): Promise<void> { 
        if (!this.db) return;

        // 1. Try to find the document by direct key first (standard case)
        let docRef = doc(this.db, 'contacts', id);
        const docSnap = await getDoc(docRef);

        // 2. If not found by key, search by 'id' field (imported case)
        if (!docSnap.exists()) {
            const q = query(collection(this.db, 'contacts'), where('id', '==', id));
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
                // If found via query, use THAT document reference
                docRef = querySnap.docs[0].ref;
            } else {
                console.warn(`Cannot delete: Contact with ID ${id} not found in DB.`);
                return;
            }
        }

        const batch = writeBatch(this.db);
        batch.delete(docRef);
        
        // Cascade delete Deals
        const deals = await getDocs(query(collection(this.db, 'deals'), where('contactId', '==', id)));
        deals.forEach(d => batch.delete(d.ref));

        // Cascade delete Activities
        const activities = await getDocs(query(collection(this.db, 'activities'), where('contactId', '==', id)));
        activities.forEach(a => batch.delete(a.ref));

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
                    batch.set(doc(this.db, 'contacts', c.id), sanitizeForFirestore(c));
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
        await setDoc(doc(this.db, 'userProfile', id), sanitizeForFirestore(p));
        return p;
    }

    async getProductPresets(): Promise<ProductPreset[]> { return this.getAll('productPresets'); }
    
    // CRITICAL FIX: Implement Sync Logic for Presets
    // This ensures deleted presets in the UI are also deleted in Firestore
    async saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]> { 
        if (!this.db) return presets;
        
        const batch = writeBatch(this.db);
        
        // 1. Fetch ALL existing presets from DB
        const existingSnapshot = await getDocs(collection(this.db, 'productPresets'));
        const existingIds = new Set(existingSnapshot.docs.map(d => d.id));
        
        // 2. Identify presets to keep/update
        const currentIds = new Set(presets.map(p => p.id));
        
        // 3. Delete presets that are in DB but NOT in the new list
        existingSnapshot.docs.forEach(docSnap => {
            if (!currentIds.has(docSnap.id)) {
                batch.delete(docSnap.ref);
            }
        });
        
        // 4. Set/Update all items in the new list
        presets.forEach(x => {
            // Ensure ID exists
            const docRef = doc(this.db, 'productPresets', x.id);
            batch.set(docRef, sanitizeForFirestore(x));
        });

        await batch.commit();
        return presets;
    }
    
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

    async restoreBackup(data: BackupData): Promise<void> {
        if (!this.db) return;
        const batch = writeBatch(this.db);
        // Simplified restore logic
        data.contacts?.forEach(c => batch.set(doc(this.db, 'contacts', c.id), sanitizeForFirestore(c)));
        data.deals?.forEach(d => batch.set(doc(this.db, 'deals', d.id), sanitizeForFirestore(d)));
        data.tasks?.forEach(t => batch.set(doc(this.db, 'tasks', t.id), sanitizeForFirestore(t)));
        data.invoices?.forEach(i => batch.set(doc(this.db, 'invoices', i.id), sanitizeForFirestore(i)));
        data.expenses?.forEach(e => batch.set(doc(this.db, 'expenses', e.id), sanitizeForFirestore(e)));
        data.activities?.forEach(a => batch.set(doc(this.db, 'activities', a.id), sanitizeForFirestore(a)));
        await batch.commit();
    }

    async processDueRetainers(): Promise<{updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[]}> {
        const contacts = await this.getContacts();
        // Load config to get pilot duration
        const config = await this.getInvoiceConfig();
        const pilotMonths = config.pilotDurationMonths || 3; // Default to 3 months if not set
        
        // Fetch product presets to find the source/target preset if configured
        const presets = await this.getProductPresets();
        
        const targetPresetId = config.pilotTargetPresetId;
        const targetPreset = targetPresetId ? presets.find(p => p.id === targetPresetId) : null;
        
        const sourcePresetId = config.pilotSourcePresetId;
        const sourcePreset = sourcePresetId ? presets.find(p => p.id === sourcePresetId) : null;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const dueContacts = contacts.filter(c => 
            c.retainerActive && 
            c.retainerNextBilling && 
            c.retainerNextBilling <= todayStr
        );

        if (dueContacts.length === 0) {
            return { updatedContacts: [], newInvoices: [], newActivities: [] };
        }

        const batch = writeBatch(this.db);
        const newInvoices: Invoice[] = [];
        const newActivities: Activity[] = [];
        const updatedContacts: Contact[] = [];

        for (const contact of dueContacts) {
            let updatedContact = { ...contact };
            let amount = contact.retainerAmount || 0;
            let logMsg = '';

            // PILOT CHECK: Upgrade to Standard after configurable months
            if (contact.contractStartDate && contact.contractStage === 'pilot') {
                const startDate = new Date(contact.contractStartDate);
                const diffTime = Math.abs(today.getTime() - startDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                
                // Calculate threshold days approx
                const thresholdDays = pilotMonths * 30;

                if (diffDays > thresholdDays) {
                    // Use target preset value if configured, otherwise fallback to 1500
                    amount = targetPreset ? targetPreset.value : 1500;
                    const newStageName = targetPreset ? targetPreset.title : 'Standard';
                    const oldStageName = sourcePreset ? sourcePreset.title : 'Pilot';
                    
                    updatedContact.retainerAmount = amount;
                    updatedContact.contractStage = 'standard';
                    logMsg = `Pilot beendet (${pilotMonths} Monate). Upgrade von ${oldStageName} auf ${newStageName} (${amount.toLocaleString('de-DE')}€).`;
                    
                    const activity: Activity = {
                        id: crypto.randomUUID(),
                        contactId: contact.id,
                        type: 'system_deal',
                        content: logMsg,
                        date: todayStr,
                        timestamp: new Date().toISOString()
                    };
                    newActivities.push(activity);
                    batch.set(doc(this.db, 'activities', activity.id), sanitizeForFirestore(activity));
                }
            }

            // Create Invoice
            const newInvoice: Invoice = {
                id: crypto.randomUUID(),
                type: 'customer',
                invoiceNumber: `RE-${Date.now()}-${Math.floor(Math.random()*1000)}`,
                description: `Retainer / Service Pauschale (${updatedContact.contractStage === 'pilot' && sourcePreset ? sourcePreset.title : (updatedContact.contractStage === 'standard' && targetPreset ? targetPreset.title : updatedContact.contractStage)})`,
                date: todayStr,
                contactId: contact.id,
                contactName: contact.name,
                amount: amount,
                isPaid: false,
                salesRepId: contact.salesRepId // Ensure Sales Rep is linked for commission calculation later
            };
            newInvoices.push(newInvoice);
            batch.set(doc(this.db, 'invoices', newInvoice.id), sanitizeForFirestore(newInvoice));

            // Log Invoice Creation
            const invActivity: Activity = {
                id: crypto.randomUUID(),
                contactId: contact.id,
                type: 'system_invoice',
                content: `Automatische Rechnung erstellt: ${newInvoice.invoiceNumber} (${amount}€)`,
                date: todayStr,
                timestamp: new Date().toISOString()
            };
            newActivities.push(invActivity);
            batch.set(doc(this.db, 'activities', invActivity.id), sanitizeForFirestore(invActivity));

            // Update Next Billing Date (Add 1 Month)
            const nextDate = new Date(today);
            nextDate.setMonth(nextDate.getMonth() + 1);
            updatedContact.retainerNextBilling = nextDate.toISOString().split('T')[0];
            
            updatedContacts.push(updatedContact);
            batch.set(doc(this.db, 'contacts', updatedContact.id), sanitizeForFirestore(updatedContact));
        }

        await batch.commit();
        return { updatedContacts, newInvoices, newActivities };
    }
    
    // --- IMPLEMENTATION OF BATCH RUN ---
    async runCommissionBatch(year: number, month: number): Promise<{ createdInvoices: Invoice[], updatedSourceInvoices: Invoice[] }> {
        const invoices = await this.getInvoices();
        const contacts = await this.getContacts();
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of month
        
        const eligibleInvoices = invoices.filter(inv => {
            if (inv.type === 'commission') return false;
            if (!inv.isPaid) return false;
            if (inv.commissionProcessed) return false;
            if (!inv.salesRepId) return false;
            if (!inv.paidDate) return false;

            const paidDate = new Date(inv.paidDate);
            return paidDate >= startDate && paidDate <= endDate;
        });

        if (eligibleInvoices.length === 0) {
            return { createdInvoices: [], updatedSourceInvoices: [] };
        }

        const repGroups: Record<string, Invoice[]> = {};
        eligibleInvoices.forEach(inv => {
            const repId = inv.salesRepId!;
            if (!repGroups[repId]) repGroups[repId] = [];
            repGroups[repId].push(inv);
        });

        const newCommissionInvoices: Invoice[] = [];
        const updatedSources: Invoice[] = [];

        const monthName = startDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
        const existingCommissions = invoices.filter(i => i.type === 'commission');
        
        let nextNum = 1;
        if (existingCommissions.length > 0) {
             const maxNum = existingCommissions.reduce((max, inv) => {
                const parts = inv.invoiceNumber.split('-');
                const numPart = parseInt(parts[parts.length - 1]);
                return isNaN(numPart) ? max : Math.max(max, numPart);
            }, 0);
            nextNum = maxNum + 1;
        }

        for (const [repId, sourceInvoices] of Object.entries(repGroups)) {
            const rep = contacts.find(c => c.id === repId);
            if (!rep) continue;

            const commissionRate = 0.20; 
            const totalRevenue = sourceInvoices.reduce((sum, inv) => sum + inv.amount, 0);
            const totalCommission = totalRevenue * commissionRate;

            let descriptionHTML = `<strong>Provisionsabrechnung ${monthName}</strong><br><br>`;
            descriptionHTML += `Basis: ${sourceInvoices.length} bezahlte Kundenrechnungen<br>`;
            descriptionHTML += `<ul style="margin-top:5px; padding-left:15px; font-size:11px;">`;
            sourceInvoices.forEach(inv => {
                descriptionHTML += `<li>${inv.invoiceNumber} (${inv.contactName}): ${inv.amount.toLocaleString('de-DE')}€</li>`;
            });
            descriptionHTML += `</ul>`;

            const newInv: Invoice = {
                id: crypto.randomUUID(),
                type: 'commission',
                invoiceNumber: `PROV-${year}-${String(nextNum).padStart(3, '0')}`,
                date: new Date().toISOString().split('T')[0],
                contactId: rep.id,
                contactName: rep.name,
                description: descriptionHTML, 
                amount: totalCommission,
                isPaid: false,
                salesRepId: rep.id
            };
            
            newCommissionInvoices.push(newInv);
            nextNum++;

            sourceInvoices.forEach(inv => {
                const updated = { ...inv, commissionProcessed: true };
                updatedSources.push(updated);
            });
        }

        if (this.db) {
            const batch = writeBatch(this.db);
            
            newCommissionInvoices.forEach(inv => {
                batch.set(doc(this.db, 'invoices', inv.id), sanitizeForFirestore(inv));
            });

            updatedSources.forEach(inv => {
                batch.update(doc(this.db, 'invoices', inv.id), { commissionProcessed: true });
            });

            await batch.commit();
        }

        return { createdInvoices: newCommissionInvoices, updatedSourceInvoices: updatedSources };
    }

    async checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void, force: boolean = false): Promise<boolean> {
        if (!(window as any).require) {
            statusCallback?.("Updates nur in Desktop-App möglich.");
            return false;
        }

        const ipc = (window as any).require('electron').ipcRenderer;

        try {
            statusCallback?.("Suche nach Updates...");
            const result = await ipc.invoke('check-for-update');

            if (result.error) {
                // Ignore dev mode error silently unless forced
                if(result.error.includes('Dev Modus') && !force) {
                    statusCallback?.("Dev Modus (Keine Updates)");
                    return false;
                }
                throw new Error(result.error);
            }

            if (!result.updateAvailable) {
                statusCallback?.("App ist aktuell.");
                return false;
            }

            if (confirm(`Neue Version ${result.version} gefunden! Jetzt herunterladen?`)) {
                statusCallback?.("Lade Update herunter...");
                
                // Listener für Progress
                ipc.on('update-status', (event: any, data: any) => {
                    if (data.status === 'downloading') {
                        const percent = Math.round(data.progress || 0);
                        statusCallback?.(`Lade herunter: ${percent}%`);
                    } else if (data.status === 'downloaded') {
                        statusCallback?.("Download fertig.");
                        if (confirm("Update bereit. Jetzt neu starten und installieren?")) {
                            ipc.invoke('quit-and-install');
                        }
                    } else if (data.status === 'error') {
                        statusCallback?.("Update Fehler: " + data.error);
                    }
                });

                await ipc.invoke('download-update');
                return true;
            }
            
            return false;

        } catch (e: any) {
            console.error("AutoUpdate Error", e);
            statusCallback?.("Update Fehler: " + e.message);
            return false;
        }
    }

    async getAppVersion(): Promise<string> { 
        if ((window as any).require) {
            try { 
                const v = await (window as any).require('electron').ipcRenderer.invoke('get-app-version'); 
                return v || '1.3.38'; 
            } catch(e) {
                console.error("Version Check IPC Failed:", e);
            }
        }
        return '1.3.38'; 
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

    // --- IMAP / SMTP IMPLEMENTATION ---
    async fetchEmails(config: any, limit = 20, onlyUnread = false, boxName = 'INBOX'): Promise<EmailMessage[]> {
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('email-imap-fetch', config, limit, onlyUnread, boxName);
        }
        console.warn("E-Mail Fetching only works in Desktop App (Electron)");
        return [];
    }

    async getEmailFolders(config: any): Promise<{name: string, path: string}[]> {
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('email-imap-get-boxes', config);
        }
        console.warn("E-Mail Folder Fetching only works in Desktop App (Electron)");
        return [];
    }

    async createEmailFolder(config: any, folderName: string): Promise<boolean> {
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('email-imap-create-folder', config, folderName);
        }
        return false;
    }

    async deleteEmailFolder(config: any, folderPath: string): Promise<boolean> {
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('email-imap-delete-folder', config, folderPath);
        }
        return false;
    }

    async markEmailRead(config: any, uid: number, boxName: string): Promise<boolean> {
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('email-mark-read', config, uid, boxName);
        }
        console.warn("E-Mail Marking only works in Desktop App (Electron)");
        return false;
    }

    async sendSmtpMail(config: any, to: string, subject: string, body: string): Promise<boolean> {
        if ((window as any).require) {
            const result = await (window as any).require('electron').ipcRenderer.invoke('email-smtp-send', config, { to, subject, body });
            return result.success;
        }
        console.warn("SMTP sending only works in Desktop App (Electron)");
        return false;
    }

    // Fix: Added missing moveEmail implementation to satisfy IDataService
    async moveEmail(config: any, uid: number, fromBox: string, toBox: string): Promise<boolean> {
        if ((window as any).require) {
            return await (window as any).require('electron').ipcRenderer.invoke('email-imap-move', config, uid, fromBox, toBox);
        }
        return false;
    }
}