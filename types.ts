export type ViewState = 'dashboard' | 'contacts' | 'pipeline' | 'settings';
export type Theme = 'light' | 'dark';

export enum DealStage {
  LEAD = 'Lead',
  CONTACTED = 'Kontaktiert',
  PROPOSAL = 'Angebot',
  NEGOTIATION = 'Verhandlung',
  WON = 'Gewonnen'
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
  linkedin?: string; // Neu: LinkedIn Profil URL
  notes?: string;    // Neu: Notizen
}

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  contactId: string;
  dueDate: string;
}

export interface Task {
  id: string;
  title: string;
  type: 'call' | 'email' | 'meeting' | 'todo';
  dueDate: string;
  isCompleted: boolean;
  relatedEntityId?: string; // Could link to a contact or deal
  priority: 'low' | 'medium' | 'high';
}

export interface DashboardStats {
  totalRevenue: number;
  activeDeals: number;
  newContacts: number;
  conversionRate: number;
}