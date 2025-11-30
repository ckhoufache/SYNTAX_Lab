import { Contact, Deal, DealStage, Task } from '../types';

export const mockContacts: Contact[] = [
  { id: '1', name: 'Hans Müller', role: 'CEO', company: 'TechSolutions GmbH', email: 'h.mueller@techsolutions.de', avatar: 'https://picsum.photos/id/1005/50/50', lastContact: '2023-10-24' },
  { id: '2', name: 'Sabine Schmidt', role: 'CTO', company: 'InnovateX', email: 's.schmidt@innovatex.io', avatar: 'https://picsum.photos/id/1011/50/50', lastContact: '2023-10-22' },
  { id: '3', name: 'Michael Weber', role: 'Einkauf', company: 'AutoWerks AG', email: 'm.weber@autowerks.de', avatar: 'https://picsum.photos/id/1025/50/50', lastContact: '2023-10-15' },
  { id: '4', name: 'Julia Wagner', role: 'Marketing Lead', company: 'Creative Studio', email: 'j.wagner@creative.com', avatar: 'https://picsum.photos/id/1027/50/50', lastContact: '2023-10-26' },
  { id: '5', name: 'Thomas Braun', role: 'GF', company: 'Braun Logistics', email: 't.braun@braun-log.de', avatar: 'https://picsum.photos/id/1012/50/50', lastContact: '2023-10-20' },
];

export const mockDeals: Deal[] = [
  { id: '101', title: 'Enterprise Lizenz Q4', value: 45000, stage: DealStage.NEGOTIATION, contactId: '1', dueDate: '2023-11-15' },
  { id: '102', title: 'Cloud Migration Pilot', value: 12000, stage: DealStage.PROPOSAL, contactId: '2', dueDate: '2023-11-01' },
  { id: '103', title: 'Jahresvertrag Wartung', value: 5000, stage: DealStage.WON, contactId: '3', dueDate: '2023-10-10' },
  { id: '104', title: 'Design Sprint', value: 8500, stage: DealStage.CONTACTED, contactId: '4', dueDate: '2023-11-20' },
  { id: '105', title: 'Logistik Software Update', value: 22000, stage: DealStage.LEAD, contactId: '5', dueDate: '2023-12-01' },
];

export const mockTasks: Task[] = [
  { id: 't1', title: 'Follow-up Call mit Hans', type: 'call', dueDate: '2023-10-27', isCompleted: false, priority: 'high', relatedEntityId: '1' },
  { id: 't2', title: 'Angebot an InnovateX senden', type: 'email', dueDate: '2023-10-27', isCompleted: false, priority: 'high', relatedEntityId: '2' },
  { id: 't3', title: 'Meeting Vorbereitung AutoWerks', type: 'todo', dueDate: '2023-10-28', isCompleted: false, priority: 'medium', relatedEntityId: '3' },
  { id: 't4', title: 'Weihnachtsgeschenke planen', type: 'todo', dueDate: '2023-11-01', isCompleted: false, priority: 'low' },
];

export const chartData = [
  { name: 'Jan', value: 12000 },
  { name: 'Feb', value: 19000 },
  { name: 'Mär', value: 15000 },
  { name: 'Apr', value: 22000 },
  { name: 'Mai', value: 28000 },
  { name: 'Jun', value: 26000 },
  { name: 'Jul', value: 34000 },
];