
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
  email: string;
  avatar: string;
  lastContact: string;
  linkedin?: string;
  notes?: string;
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
  invoiceConfig: InvoiceConfig;
  userProfile: UserProfile;
  productPresets: ProductPreset[];
  theme: Theme;
  timestamp: string;
  version: string;
}
