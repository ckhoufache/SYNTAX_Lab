
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Phone, Plus, Linkedin, X, FileText, Pencil, Trash2, Clock, Check, Send, Briefcase, Calendar, Building, Globe, Upload, Heart, User, Users, Star, MapPin } from 'lucide-react';
import { Contact, Activity, ActivityType, EmailTemplate, Invoice, Expense, ContactType, InvoiceConfig } from '../types';
import { DataServiceFactory } from '../services/dataService'; 

interface ContactsProps {
  contacts: Contact[];
  activities: Activity[];
  onAddContact: (contact: Contact) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onAddActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  initialFilter: 'all' | 'recent';
  onClearFilter: () => void;
  focusedId: string | null;
  onClearFocus: () => void;
  emailTemplates?: EmailTemplate[];
  onImportCSV: (csvText: string) => void;
  onBulkDeleteContacts: (ids: string[]) => void;
  invoices: Invoice[];
  expenses: Expense[];
  invoiceConfig?: InvoiceConfig;
}

export const Contacts: React.FC<ContactsProps> = ({ 
  contacts,
  onAddContact, 
  onUpdateContact, 
  onDeleteContact,
  activeTab: _activeTab, // unused naming conflict
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'lead' | 'sales'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '', role: '', company: '', email: '', type: 'lead', nps: undefined
  });

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const name = (c.name || '').toLowerCase();
      const company = (c.company || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = name.includes(search) || company.includes(search) || email.includes(search);
      if (!matchesSearch) return false;

      if (activeTab === 'all') return true;
      const contactType = c.type || 'lead';
      return contactType === activeTab;
    });
  }, [contacts, searchTerm, activeTab]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContactId(null);
    setFormData({ name: '', role: '', company: '', email: '', type: 'lead', nps: undefined });
  };

  const openEditModal = (contact: Contact) => {
    setEditingContactId(contact.id);
    setFormData({ ...contact });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContactId) {
      const original = contacts.find(c => c.id === editingContactId);
      if (original) onUpdateContact({ ...original, ...formData as Contact });
    } else {
      onAddContact({
        id: crypto.randomUUID(),
        name: formData.name || '',
        role: formData.role || 'Kontakt',
        company: formData.company || '',
        email: formData.email || '',
        type: formData.type || 'lead',
        createdAt: new Date().toISOString(),
        lastContact: new Date().toISOString().split('T')[0],
        avatar: '',
        ...formData as any
      });
    }
    handleCloseModal();
  };

  return (
    <div className="flex-1 bg-slate-50 h-screen overflow-hidden flex flex-col relative">
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kontakte</h1>
          <p className="text-slate-500 text-sm mt-1">Stammdaten & Beziehungsmanagement.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suchen..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-lg text-sm w-64 transition-all outline-none"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Kontakt erstellen
          </button>
        </div>
      </header>
      
      <div className="bg-white px-8 border-b border-slate-100 flex gap-1 shrink-0">
        {(['all', 'lead', 'customer', 'sales'] as const).map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'all' ? 'Alle' : tab === 'sales' ? 'Vertrieb' : tab + 's'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Name & Firma</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">E-Mail</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Zufriedenheit</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.map(contact => (
                <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {(contact.name || 'U').charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{contact.name}</p>
                        <p className="text-xs text-slate-500">{contact.company || 'Privat'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      contact.type === 'customer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {contact.type || 'Lead'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{contact.email}</td>
                  <td className="px-6 py-4">
                    {contact.nps !== undefined ? (
                      <div className="flex items-center gap-1">
                        <Star className={`w-3 h-3 ${contact.nps >= 8 ? 'text-green-500' : contact.nps >= 5 ? 'text-amber-500' : 'text-red-500'} fill-current`} />
                        <span className="font-bold">{contact.nps}/10</span>
                      </div>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(contact)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil className="w-4 h-4"/></button>
                      <button onClick={() => onDeleteContact(contact.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                    Keine Kontakte gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">{editingContactId ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</h2>
              <button onClick={handleCloseModal}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Name</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Firma</label>
                  <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500">Typ</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="lead">Lead</option>
                    <option value="customer">Kunde</option>
                    <option value="sales">Vertrieb</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">E-Mail</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Heart className="w-2.5 h-2.5 text-pink-500"/> Kundenzufriedenheit (NPS 0-10)</label>
                <input type="number" min="0" max="10" value={formData.nps ?? ''} onChange={e => setFormData({...formData, nps: e.target.value ? Number(e.target.value) : undefined})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Zahl von 0 bis 10" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Abbrechen</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                  {editingContactId ? 'Speichern' : 'Anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
