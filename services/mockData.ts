
import { Contact, Deal, DealStage, Task, Invoice, Expense } from '../types';

export const mockContacts: Contact[] = [
  { 
    id: '1', 
    name: 'Hans Müller', 
    role: 'CEO', 
    company: 'TechSolutions GmbH', 
    email: 'h.mueller@techsolutions.de', 
    avatar: 'https://picsum.photos/id/1005/50/50', 
    lastContact: '2023-10-24',
    linkedin: 'https://linkedin.com/in/hansmueller',
    notes: 'Interessiert an Enterprise Skalierung.'
  },
  { 
    id: '2', 
    name: 'Sabine Schmidt', 
    role: 'CTO', 
    company: 'InnovateX', 
    email: 's.schmidt@innovatex.io', 
    avatar: 'https://picsum.photos/id/1011/50/50', 
    lastContact: '2023-10-22',
    linkedin: 'https://linkedin.com',
    notes: 'Budgetfreigabe im November erwartet.'
  },
  { 
    id: '3', 
    name: 'Michael Weber', 
    role: 'Einkauf', 
    company: 'AutoWerks AG', 
    email: 'm.weber@autowerks.de', 
    avatar: 'https://picsum.photos/id/1025/50/50', 
    lastContact: '2023-10-15',
    notes: 'Sehr preissensibel.'
  },
  { 
    id: '4', 
    name: 'Julia Wagner', 
    role: 'Marketing Lead', 
    company: 'Creative Studio', 
    email: 'j.wagner@creative.com', 
    avatar: 'https://picsum.photos/id/1027/50/50', 
    lastContact: '2023-10-26',
    linkedin: 'https://linkedin.com'
  },
  { 
    id: '5', 
    name: 'Thomas Braun', 
    role: 'GF', 
    company: 'Braun Logistics', 
    email: 't.braun@braun-log.de', 
    avatar: 'https://picsum.photos/id/1012/50/50', 
    lastContact: '2023-10-20' 
  },
];

const today = new Date().toISOString().split('T')[0];
const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const mockDeals: Deal[] = [
  { id: '101', title: 'Enterprise Lizenz Q4', value: 45000, stage: DealStage.NEGOTIATION, contactId: '1', dueDate: '2023-11-15' },
  { id: '102', title: 'Cloud Migration Pilot', value: 12000, stage: DealStage.PROPOSAL, contactId: '2', dueDate: '2023-11-01' },
  { id: '103', title: 'Jahresvertrag Wartung', value: 5000, stage: DealStage.WON, contactId: '3', dueDate: '2023-10-10' },
  { id: '104', title: 'Design Sprint', value: 8500, stage: DealStage.CONTACTED, contactId: '4', dueDate: '2023-11-20', stageEnteredDate: threeDaysAgo },
  { id: '105', title: 'Logistik Software Update', value: 22000, stage: DealStage.LEAD, contactId: '5', dueDate: '2023-12-01' },
  { id: '106', title: 'StartUp Paket', value: 3000, stage: DealStage.LOST, contactId: '2', dueDate: '2023-09-01', lostDate: '2023-09-10' },
  { id: '107', title: 'Follow-up Call', value: 0, stage: DealStage.FOLLOW_UP, contactId: '1', dueDate: '2023-11-01', stageEnteredDate: fiveDaysAgo, isPlaceholder: true },
];

export const mockTasks: Task[] = [
  { 
      id: 't1', 
      title: 'Follow-up Call mit Hans', 
      type: 'call', 
      dueDate: '2023-10-27', 
      isCompleted: false, 
      priority: 'high', 
      relatedEntityId: '1',
      isAllDay: false,
      startTime: '10:00',
      endTime: '10:30'
  },
  { 
      id: 't2', 
      title: 'Angebot an InnovateX senden', 
      type: 'email', 
      dueDate: '2023-10-27', 
      isCompleted: false, 
      priority: 'high', 
      relatedEntityId: '2',
      isAllDay: true
  },
  { 
      id: 't3', 
      title: 'Meeting Vorbereitung AutoWerks', 
      type: 'todo', 
      dueDate: '2023-10-28', 
      isCompleted: false, 
      priority: 'medium', 
      relatedEntityId: '3',
      isAllDay: false,
      startTime: '14:00',
      endTime: '15:00'
  },
  { 
      id: 't4', 
      title: 'Weihnachtsgeschenke planen', 
      type: 'todo', 
      dueDate: '2023-11-01', 
      isCompleted: false, 
      priority: 'low',
      isAllDay: true
  },
];

export const mockInvoices: Invoice[] = [
    {
        id: 'inv1',
        invoiceNumber: '2025-101',
        description: 'Jahresvertrag Wartung 2025',
        date: '2025-01-15',
        contactId: '3',
        contactName: 'Michael Weber (AutoWerks AG)',
        amount: 5000,
        sentDate: '2025-01-16',
        paidDate: '2025-01-20',
        isPaid: true
    },
    {
        id: 'inv2',
        invoiceNumber: '2025-102',
        description: 'Cloud Migration Pilotprojekt',
        date: '2025-02-01',
        contactId: '2',
        contactName: 'Sabine Schmidt (InnovateX)',
        amount: 1500,
        sentDate: '2025-02-02',
        isPaid: false
    }
];

export const mockExpenses: Expense[] = [
    {
        id: 'ex1',
        title: 'Adobe Creative Cloud',
        amount: 65.00,
        date: '2025-01-05',
        category: 'software',
        notes: 'Monatliches Abo'
    },
    {
        id: 'ex2',
        title: 'Büromiete Januar',
        amount: 450.00,
        date: '2025-01-01',
        category: 'office'
    },
    {
        id: 'ex3',
        title: 'Bahncard 50',
        amount: 240.00,
        date: '2025-02-10',
        category: 'travel'
    }
];

// Deprecated static chart data
export const chartData = [];
