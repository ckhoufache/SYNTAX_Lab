
export type ViewState = 'dashboard' | 'contacts' | 'pipeline' | 'settings' | 'tasks' | 'finances' | 'email';
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

export type ContactType = 'lead' | 'customer' | 'partner' | 'newsletter' | 'sales'; 

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
  firebaseConfig?: FirebaseConfig; 
  
  // Custom IMAP/SMTP Config
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
    id: string; // Message-ID or Sequence Number
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
  isSubscription?: boolean; 
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
  type?: ContactType; 
  
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
