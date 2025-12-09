
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc,
    query, where, orderBy, limit, writeBatch, enableIndexedDbPersistence 
} from 'firebase/firestore';
import { 
    Contact, Deal, Task, Invoice, Expense, Activity, 
    UserProfile, ProductPreset, InvoiceConfig, EmailTemplate,
    BackendConfig, EmailAttachment, DealStage, BackupData
} from '../types';
import { IDataService } from './dataService';

export class FirebaseDataService implements IDataService {
    private db: any;
    private initialized = false;

    constructor(config: BackendConfig) {
        if (config.firebaseConfig && config.firebaseConfig.apiKey) {
            try {
                const app = initializeApp(config.firebaseConfig);
                this.db = getFirestore(app);
                this.initialized = true;
                
                // Enable Offline Persistence
                enableIndexedDbPersistence(this.db).catch((err: any) => {
                    if (err.code == 'failed-precondition') {
                        console.warn('Firebase: Multiple tabs open, persistence can only be enabled in one tab at a a time.');
                    } else if (err.code == 'unimplemented') {
                        console.warn('Firebase: Current browser does not support all of the features required to enable persistence');
                    }
                });
                
            } catch (e) {
                console.error("Firebase Init Error:", e);
                alert("Fehler bei der Verbindung zu Firebase. Bitte prüfen Sie die Konfiguration.");
            }
        }
    }

    async init(): Promise<void> {
        if (!this.initialized) throw new Error("Firebase not initialized. Please check settings.");
        return Promise.resolve();
    }

    //Helper to identify the local browser user uniquely, separating their profile from others
    private getLocalInstanceId(): string {
        const key = 'crm_client_instance_id';
        let id = localStorage.getItem(key);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(key, id);
        }
        return id;
    }

    // --- GENERIC HELPERS ---
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

    // --- CONTACTS ---
    async getContacts(): Promise<Contact[]> { return this.getAll<Contact>('contacts'); }
    async saveContact(contact: Contact): Promise<Contact> { return this.save('contacts', contact); }
    async updateContact(contact: Contact): Promise<Contact> { return this.save('contacts', contact); }
    async deleteContact(id: string): Promise<void> { await this.delete('contacts', id); }

    // --- DEALS ---
    async getDeals(): Promise<Deal[]> { return this.getAll<Deal>('deals'); }
    async saveDeal(deal: Deal): Promise<Deal> { return this.save('deals', deal); }
    async updateDeal(deal: Deal): Promise<Deal> { return this.save('deals', deal); }
    async deleteDeal(id: string): Promise<void> { await this.delete('deals', id); }

    // --- TASKS ---
    async getTasks(): Promise<Task[]> { return this.getAll<Task>('tasks'); }
    async saveTask(task: Task): Promise<Task> { return this.save('tasks', task); }
    async updateTask(task: Task): Promise<Task> { return this.save('tasks', task); }
    async deleteTask(id: string): Promise<void> { await this.delete('tasks', id); }

    // --- INVOICES ---
    async getInvoices(): Promise<Invoice[]> { return this.getAll<Invoice>('invoices'); }
    async saveInvoice(invoice: Invoice): Promise<Invoice> { return this.save('invoices', invoice); }
    async updateInvoice(invoice: Invoice): Promise<Invoice> { return this.save('invoices', invoice); }
    async deleteInvoice(id: string): Promise<void> { await this.delete('invoices', id); }
    
    async cancelInvoice(id: string): Promise<{ creditNote: Invoice, updatedOriginal: Invoice, activity: Activity }> {
        const invoice = (await this.getInvoices()).find(i => i.id === id);
        if (!invoice) throw new Error("Invoice not found");

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

    // --- EXPENSES ---
    async getExpenses(): Promise<Expense[]> { return this.getAll<Expense>('expenses'); }
    async saveExpense(expense: Expense): Promise<Expense> { return this.save('expenses', expense); }
    async updateExpense(expense: Expense): Promise<Expense> { return this.save('expenses', expense); }
    async deleteExpense(id: string): Promise<void> { await this.delete('expenses', id); }

    // --- ACTIVITIES ---
    async getActivities(): Promise<Activity[]> { return this.getAll<Activity>('activities'); }
    async saveActivity(activity: Activity): Promise<Activity> { return this.save('activities', activity); }
    async deleteActivity(id: string): Promise<void> { await this.delete('activities', id); }

    // --- META & CONFIG ---
    async getUserProfile(): Promise<UserProfile | null> { 
        // Modified to fetch specific profile for this browser instance
        const instanceId = this.getLocalInstanceId();
        const docRef = doc(this.db, 'userProfile', instanceId);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
            return snapshot.data() as UserProfile;
        }
        return null;
    }

    async saveUserProfile(profile: UserProfile): Promise<UserProfile> { 
        // Modified to save to specific ID
        const instanceId = this.getLocalInstanceId();
        await setDoc(doc(this.db, 'userProfile', instanceId), profile);
        return profile;
    }

    async getProductPresets(): Promise<ProductPreset[]> { return this.getAll<ProductPreset>('productPresets'); }
    async saveProductPresets(presets: ProductPreset[]): Promise<ProductPreset[]> { 
        // Firebase isn't great at storing arrays directly if we want to query them, 
        // but for presets it's fine to store individual docs or overwrite a config doc.
        // We'll store individual docs for cleaner updates.
        const batch = writeBatch(this.db);
        
        // This is a naive implementation: overwriting all. 
        // A better way for Firestore would be individual CRUD, but to match IDataService interface:
        // 1. Delete all current (expensive) or just upsert.
        // Let's iterate and set.
        for(const p of presets) {
            batch.set(doc(this.db, 'productPresets', p.id), p);
        }
        await batch.commit();
        return presets;
    }

    async getInvoiceConfig(): Promise<InvoiceConfig> {
        const configs = await this.getAll<InvoiceConfig>('invoiceConfig');
        return configs.length > 0 ? configs[0] : {} as any;
    }
    async saveInvoiceConfig(config: InvoiceConfig): Promise<InvoiceConfig> {
        await setDoc(doc(this.db, 'invoiceConfig', 'main'), config);
        return config;
    }

    async getEmailTemplates(): Promise<EmailTemplate[]> { return this.getAll<EmailTemplate>('emailTemplates'); }
    async saveEmailTemplate(template: EmailTemplate): Promise<EmailTemplate> { return this.save('emailTemplates', template); }
    async updateEmailTemplate(template: EmailTemplate): Promise<EmailTemplate> { return this.save('emailTemplates', template); }
    async deleteEmailTemplate(id: string): Promise<void> { await this.delete('emailTemplates', id); }

    // --- Backup Restore (Batched for Firestore) ---
    async restoreBackup(data: BackupData): Promise<void> {
        // We must batch writes, but Firestore limits batches to 500 ops.
        // We'll create a helper to process chunks.
        
        const commitBatch = async (items: any[], collectionName: string) => {
            const chunkSize = 450; // safe buffer below 500
            for (let i = 0; i < items.length; i += chunkSize) {
                const chunk = items.slice(i, i + chunkSize);
                const batch = writeBatch(this.db);
                chunk.forEach(item => {
                    batch.set(doc(this.db, collectionName, item.id), item);
                });
                await batch.commit();
            }
        };

        await commitBatch(data.contacts, 'contacts');
        await commitBatch(data.deals, 'deals');
        await commitBatch(data.tasks, 'tasks');
        await commitBatch(data.invoices, 'invoices');
        await commitBatch(data.expenses, 'expenses');
        await commitBatch(data.activities, 'activities');
        await commitBatch(data.productPresets, 'productPresets');
        await commitBatch(data.emailTemplates || [], 'emailTemplates');
        
        if (data.invoiceConfig) await this.saveInvoiceConfig(data.invoiceConfig);
        // We generally DON'T overwrite the userProfile on restore in Firebase mode to keep multi-user setup intact,
        // unless it's a specific "me" backup. For safety, we skip userProfile restore in Cloud mode.
    }

    // --- MOCKS & HELPERS ---
    async connectGoogle(service: 'calendar' | 'mail', clientId?: string): Promise<boolean> { return true; }
    async disconnectGoogle(service: 'calendar' | 'mail'): Promise<boolean> { return false; }
    async getIntegrationStatus(service: 'calendar' | 'mail'): Promise<boolean> { return false; }
    async sendMail(to: string, subject: string, body: string, attachments?: EmailAttachment[]): Promise<boolean> {
        console.log("Firebase Service: Send Mail Mock", {to, subject});
        return true;
    }
    
    async generatePdf(htmlContent: string): Promise<string> {
        // We reuse the electron bridge if available, otherwise fail
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

    async processDueRetainers(): Promise<{ updatedContacts: Contact[], newInvoices: Invoice[], newActivities: Activity[] }> {
        // Logic similar to LocalService but fetching fresh data
        const contacts = await this.getContacts();
        const updatedContacts: Contact[] = [];
        const newInvoices: Invoice[] = [];
        const newActivities: Activity[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        const getNextDate = (dateStr: string, interval: 'monthly' | 'quarterly' | 'yearly') => {
            const d = new Date(dateStr);
            if(interval === 'monthly') d.setMonth(d.getMonth() + 1);
            if(interval === 'quarterly') d.setMonth(d.getMonth() + 3);
            if(interval === 'yearly') d.setFullYear(d.getFullYear() + 1);
            return d.toISOString().split('T')[0];
        };

        const batch = writeBatch(this.db);

        for (const contact of contacts) {
            if (contact.retainerActive && contact.retainerAmount && contact.retainerNextBilling) {
                if (contact.retainerNextBilling <= todayStr) {
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
                    batch.set(doc(this.db, 'invoices', inv.id), inv);

                    const updatedContact = { 
                        ...contact, 
                        retainerNextBilling: getNextDate(contact.retainerNextBilling, contact.retainerInterval || 'monthly') 
                    };
                    updatedContacts.push(updatedContact);
                    batch.set(doc(this.db, 'contacts', updatedContact.id), updatedContact);

                    const act: Activity = {
                        id: crypto.randomUUID(),
                        contactId: contact.id,
                        type: 'system_invoice',
                        content: `Retainer-Rechnung erstellt: ${inv.invoiceNumber}`,
                        date: todayStr,
                        timestamp: new Date().toISOString()
                    };
                    newActivities.push(act);
                    batch.set(doc(this.db, 'activities', act.id), act);
                }
            }
        }
        
        if (newInvoices.length > 0) {
            await batch.commit();
        }

        return { updatedContacts, newInvoices, newActivities };
    }

    async checkAndInstallUpdate(url: string, statusCallback?: (status: string) => void): Promise<boolean> { return false; }
    
    async wipeAllData(): Promise<void> {
        alert("Wipe not implemented for Cloud Database for safety reasons. Please delete the project in Firebase Console.");
    }
    
    // --- CSV IMPORT (Reused Logic) ---
    // We copy the parsing logic but use firestore batch saves
    async importContactsFromCSV(csvText: string): Promise<{ contacts: Contact[], deals: Deal[], activities: Activity[], skippedCount: number }> {
        // Reuse parser logic by temporarily instantiating a helper or just duplicating code for safety in this strict XML format
        // For brevity and robustness, we duplicate the core parsing logic here but adapted for async batch
        
        const parseCSV = (text: string): string[][] => {
            const arr: string[][] = [];
            let quote = false;
            let col = 0;
            let row = 0;
            let c = "";
            arr[row] = []; arr[row][col] = "";
            for (let i = 0; i < text.length; i++) {
                c = text[i];
                if (c === '"') { if (quote && text[i+1] === '"') { arr[row][col] += '"'; i++; } else { quote = !quote; } } 
                else if (c === ',' && !quote) { col++; arr[row][col] = ""; } 
                else if ((c === '\r' || c === '\n') && !quote) { if (c === '\r' && text[i+1] === '\n') i++; if (arr[row].some(cell => cell.length > 0) || col > 0) { row++; col = 0; arr[row] = []; arr[row][col] = ""; } } 
                else { arr[row][col] += c; }
            }
            if(arr.length > 0 && arr[arr.length-1].length === 1 && arr[arr.length-1][0] === "") arr.pop();
            return arr;
        };
        
        const rows = parseCSV(csvText);
        if (rows.length < 2) throw new Error("CSV Leer");
        
        const headers = rows[0].map(h => h.trim().toLowerCase().replace(/^[\uFEFF\uFFFE]/, ''));
        const getVal = (row: string[], headerPatterns: string[]): string => {
            const index = headers.findIndex(h => headerPatterns.some(p => h.includes(p.toLowerCase())));
            return index > -1 && row[index] ? row[index].trim() : '';
        };

        const contacts: Contact[] = [];
        const deals: Deal[] = [];
        const activities: Activity[] = [];
        let skippedCount = 0;
        
        // Fetch existing for dedupe
        const existingContacts = await this.getContacts();
        const signatures = new Set<string>();
        
        // ... (Same signature logic as LocalDataService) ...
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
            return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        };
        const addSignature = (c: Contact) => {
            if (c.email) signatures.add(`em:${clean(c.email)}`);
            const li = normalizeLinkedIn(c.linkedin);
            if (li) signatures.add(`li:${li}`);
            const cName = clean(c.name);
            const cComp = clean(c.company);
            if (cName && cComp) signatures.add(`nc:${cName}|${cComp}`);
        };
        existingContacts.forEach(addSignature);

        // Parse Rows
        for (let i = 1; i < rows.length; i++) {
             const row = rows[i];
             if (row.length === 0 || (row.length === 1 && !row[0])) continue;
             
             const fullName = getVal(row, ['name', 'fullname']);
             const firstName = getVal(row, ['firstname', 'vorname']);
             const lastName = getVal(row, ['lastname', 'nachname']);
             let name = fullName || (firstName && lastName ? `${firstName} ${lastName}` : firstName || 'Unbekannt');
             
             const company = getVal(row, ['company', 'firma']);
             const email = getVal(row, ['email']);
             const linkedin = getVal(row, ['linkedin']);
             
             if (name === 'Unbekannt' && !company) continue;
             
             // Check Dupe
             let isDuplicate = false;
             const rowLi = normalizeLinkedIn(linkedin);
             const rowEmail = clean(email);
             const rowName = clean(name);
             const rowComp = clean(company);
             
             if (rowLi && signatures.has(`li:${rowLi}`)) isDuplicate = true;
             else if (rowEmail && signatures.has(`em:${rowEmail}`)) isDuplicate = true;
             else if (rowName && rowComp && signatures.has(`nc:${rowName}|${rowComp}`)) isDuplicate = true;
             
             if (isDuplicate) { skippedCount++; continue; }
             
             const newContact: Contact = {
                id: crypto.randomUUID(),
                name, company, email, linkedin,
                role: getVal(row, ['role', 'position']),
                companyUrl: getVal(row, ['url', 'web']),
                notes: getVal(row, ['notes', 'summary']),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                lastContact: new Date().toISOString().split('T')[0],
                type: 'lead'
             };
             
             contacts.push(newContact);
             addSignature(newContact); // Add to temp sigs so we don't import dupe inside same csv
             
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

        // Batch Save
        const batch = writeBatch(this.db);
        contacts.forEach(c => batch.set(doc(this.db, 'contacts', c.id), c));
        deals.forEach(d => batch.set(doc(this.db, 'deals', d.id), d));
        activities.forEach(a => batch.set(doc(this.db, 'activities', a.id), a));
        await batch.commit();

        return { contacts, deals, activities, skippedCount };
    }
}
