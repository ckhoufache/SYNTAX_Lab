
export type ViewState = 'dashboard' | 'contacts' | 'pipeline' | 'settings' | 'tasks' | 'finances' | 'email' | 'kpi' | 'brain';
export type Theme = 'light' | 'dark';

export enum DealStage {
  LEAD = 'Lead',
  CONNECTED = 'Vernetzt',
  CONTACTED = 'Kontaktiert',
  FOLLOW_UP = 'Follow-up',
  PROPOSAL = 'Angebot',
  NEGOTIATION = 'Verhandlung',
  WON = 'Gewonnen',
  LOST = 'Verloren'
}

export type ContactType = 'lead' | 'customer' | 'partner' | 'newsletter' | 'sales' | 'request'; 

export type TargetGroup = 
  | 'A - B2B-Entscheider' 
  | 'B - Industrie (Recruiting)' 
  | 'C - High Ticket Berater' 
  | 'D - Tech & Green Startups';

export type BackendMode = 'local' | 'firebase';

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}

export interface BackendConfig {
  mode: BackendMode;
  apiUrl?: string;
  apiToken?: string;
  googleClientId?: string;
  apiKey?: string; 
  geminiApiKey?: string;
  firebaseConfig?: FirebaseConfig; 
  
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  imapTls?: boolean;
  
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpTls?: boolean;
}

export interface EmailMessage {
    id: string; 
    uid: number;
    from: string;
    to: string;
    subject: string;
    date: string;
    bodyText: string;
    bodyHtml?: string;
    isRead: boolean;
}

export interface ProductPreset {
  id: string;
  title: string;
  value: number;
  isRetainer?: boolean;    
  retainerInterval?: 'monthly' | 'quarterly' | 'yearly';
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
  firestoreId?: string; // Hidden field for real DB reference
  name: string;
  role: string;
  company: string;
  companyUrl?: string;
  email: string;
  avatar: string;
  lastContact: string;
  createdAt?: string;
  linkedin?: string;
  notes?: string;
  tags?: string[];
  type?: ContactType; 
  targetGroup?: TargetGroup;
  nps?: number;
  
  // Neue Felder für Landingpage-Anfragen
  message?: string;
  source?: string;

  // Lieferform für Kunden
  deliveryMethod?: 'email_attachment' | 'doc_share';

  // Vertragsmanagement
  contractStartDate?: string; // Tag der Unterschrift
  contractStage?: 'pilot' | 'standard'; // Automatische Hochstufung

  street?: string;
  zip?: string;
  city?: string;
  taxId?: string;
  taxStatus?: 'standard' | 'small_business';
  
  salesRepId?: string; 

  retainerActive?: boolean;
  retainerAmount?: number; 
  retainerStartDate?: string;
  retainerNextBilling?: string;
  retainerInterval?: 'monthly' | 'quarterly' | 'yearly';
}

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'system_deal' | 'system_invoice';

export interface Activity {
    id: string;
    contactId: string;
    type: ActivityType;
    content: string; 
    date: string; 
    timestamp: string; 
    relatedId?: string; 
    isRead?: boolean;
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
  type: 'call' | 'email' | 'meeting' | 'todo' | 'post';
  dueDate: string;
  createdAt?: string;
  completedAt?: string;
  isCompleted: boolean;
  relatedEntityId?: string;
  priority: 'low' | 'medium' | 'high';
  isAllDay?: boolean;
  startTime?: string;
  endTime?: string;
  googleEventId?: string;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
  assignedToEmail?: string; 
}

export interface Invoice {
  id: string;
  type: 'customer' | 'commission'; 
  invoiceNumber: string;
  description: string;
  date: string;
  contactId: string; 
  contactName: string;
  amount: number;
  sentDate?: string;
  paidDate?: string;
  isPaid: boolean;
  isCancelled?: boolean;
  relatedInvoiceId?: string; 
  
  salesRepId?: string;     
  salesRepName?: string;   
  commissionAmount?: number; 
  commissionProcessed?: boolean; 
  commissionRate?: number;
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
  contactId?: string; 
  contactName?: string; 
  interval?: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  
  taxRate?: number; 
  taxMethod?: 'gross' | 'net';
  originalInputAmount?: number;
}

export interface EmailAttachment {
    name: string;
    data: string; 
    type: string; 
    size: number;
}

export interface EmailAutomationConfig {
    subject: string;
    body: string;
    attachments: EmailAttachment[];
    enabled?: boolean; 
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
  taxRule?: 'small_business' | 'standard'; 
  emailSettings?: EmailSettings; 
  pdfTemplate?: string; 
  pilotDurationMonths?: number; 
  pilotSourcePresetId?: string; // NEU: Von welchem Paket gestartet wird
  pilotTargetPresetId?: string; // Zu welchem Paket gewechselt wird
}

export interface EmailTemplate {
    id: string;
    title: string;
    subject: string;
    body: string;
}

// --- BRAIN MODULE TYPES ---

export interface BrainTool {
    id: string;
    name: string;
    type: string;
    status: 'Aktiv' | 'Inaktiv';
    cost: string;
    purpose: string;
    linkedSop?: string;
}

export interface BrainProcessStep {
    id: string;
    phase: string;
    stepId: string; // e.g. "1.1"
    title: string;
    description: string;
    tools?: string;
    linkedSop?: string;
}

export interface BrainPrompt {
    id: string;
    promptId: string; // e.g. "PMT-SALES-01"
    name: string;
    tool: string;
    inputFormat: string;
    content: string; // System Prompt
}

export interface BrainSOP {
    id: string;
    sopId: string; // e.g. "SOP-01-01" or "LEG-01"
    title: string;
    path: string; // e.g. "01_Management"
    content: string; // HTML Content
    lastUpdate: string;
    category: 'sop' | 'legal';
}

export interface BrainPersona {
    id: string;
    telegramId: string;
    name: string;
    role: string;
    industry: string;
    archetype: string;
    directness: string;
    targetGroup: string;
    noGo: string;
    style: string;
    level: string;
    signature: string;
    emotion: string;
    syntax: string;
    dos: string;
    donts: string;
    summary: string;
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
  brainTools?: BrainTool[];
  brainProcess?: BrainProcessStep[];
  brainPrompts?: BrainPrompt[];
  brainSOPs?: BrainSOP[];
  brainPersonas?: BrainPersona[];
  theme: Theme;
  timestamp: string;
  version: string;
  backendConfig?: BackendConfig;
}