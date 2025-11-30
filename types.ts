
export type ViewState = 'dashboard' | 'contacts' | 'pipeline' | 'settings' | 'tasks';
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
  stageEnteredDate?: string; // Wann wurde der aktuelle Status gesetzt?
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
  // New Time Fields
  isAllDay?: boolean;
  startTime?: string; // Format "HH:mm"
  endTime?: string;   // Format "HH:mm"
}

export interface DashboardStats {
  totalRevenue: number;
  activeDeals: number;
  newContacts: number;
  conversionRate: number;
}