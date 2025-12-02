
export type ViewState = 'dashboard' | 'contacts' | 'pipeline' | 'settings' | 'tasks' | 'finances';
export type Theme = 'light' | 'dark';

export enum DealStage {
  LEAD = 'Lead',
  CONTACTED = 'Kontaktiert',
  FOLLOW_UP = 'Follow-up',
  PROPOSAL = 'Angebot',
  NEGOTIATION = 'Verhandlung',
  WON = 'Gewonnen',
  LOST = 'Verloren'
}

export type ContactType = 'lead' | 'customer' | 'partner' | 'newsletter';

export type BackendMode = 'local' | 'api';

export interface BackendConfig {
  mode: BackendMode;
  apiUrl?: string;
  apiToken?: string;
  googleClientId?: string;
  apiKey?: string; // Für externen Zugriff auf DIESE App
}

export interface ProductPreset {
  id: string;
  title: string;
  value: number;
  isSubscription?: boolean; // NEU: Abo / Einmalig
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  avatar: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  company: string;
  companyUrl?: string;
  email: string;
  avatar: string;
  lastContact: string;
  linkedin?: string;
  notes?: string;
  tags?: string[];
  type?: ContactType; // NEU: Typisierung für Tabs
  
  // Retainer Details
  retainerActive?: boolean;
  retainerAmount?: number; // Monthly Netto
  retainerStartDate?: string;
  retainerNextBilling?: string;
  retainerInterval?: 'monthly' | 'quarterly' | 'yearly';
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'system_deal' | 'system_invoice';

export interface Activity {
    id: string;
    contactId: string;
    type: ActivityType;
    content: string; // "Hat Rechnung 2025-101 erhalten" oder "Notiz: Kunde will Rabatt"
    date: string; // YYYY-MM-DD
    timestamp: string; // ISO String für Sortierung
    relatedId?: string; // ID von Deal oder Invoice
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  contactId: string;
  dueDate: string;
  lostDate?: string;
  stageEnteredDate?: string;
  isPlaceholder?: boolean;
}

export interface Task {
  id: string;
  title: string;
  type: 'call' | 'email' | 'meeting' | 'todo';
  dueDate: string;
  isCompleted: boolean;
  relatedEntityId?: string;
  priority: 'low' | 'medium' | 'high';
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  googleEventId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  description: string;
  date: string;
  contactId: string;
  contactName: string;
  amount: number;
  sentDate?: string;
  paidDate?: string;
  isPaid: boolean;
  // GoBD Fields
  isCancelled?: boolean;
  relatedInvoiceId?: string; // ID der Stornorechnung oder der Originalrechnung
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: 'office' | 'software' | 'travel' | 'marketing' | 'personnel' | 'other';
  notes?: string;
  attachment?: string;
  attachmentName?: string;
  contactId?: string; // NEU: Zuordnung zu Kunde/Projekt
  contactName?: string; // NEU: Cache Name
}

// NEW: Attachment Structure for Email Settings
export interface EmailAttachment {
    name: string;
    data: string; // Base64
    type: string; // MIME type
    size: number;
}

// NEW: Automation Config Structure per Type
export interface EmailAutomationConfig {
    subject: string;
    body: string;
    attachments: EmailAttachment[];
    enabled?: boolean; // Only relevant for auto-triggers like Welcome
}

export interface EmailSettings {
    welcome: EmailAutomationConfig;
    invoice: EmailAutomationConfig;
    offer: EmailAutomationConfig;
    reminder: EmailAutomationConfig;
}

export interface InvoiceConfig {
  companyName: string;
  addressLine1: string; 
  addressLine2: string; 
  taxId: string;
  bankName: string;
  iban: string;
  bic: string;
  email: string;
  website: string;
  logoBase64?: string;
  footerText?: string;
  taxRule?: 'small_business' | 'standard'; // NEU: Steuermodus
  emailSettings?: EmailSettings; // NEU: Strukturiertes E-Mail Setting
  pdfTemplate?: string; // NEU: HTML Template für PDF Generierung
}

export interface EmailTemplate {
    id: string;
    title: string;
    subject: string;
    body: string;
}

export interface DashboardStats {
  totalRevenue: number;
  activeDeals: number;
  newContacts: number;
  conversionRate: number;
}

export interface BackupData {
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  invoices: Invoice[];
  expenses: Expense[];
  activities: Activity[];
  invoiceConfig: InvoiceConfig;
  userProfile: UserProfile;
  productPresets: ProductPreset[];
  emailTemplates?: EmailTemplate[];
  theme: Theme;
  timestamp: string;
  version: string;
}
