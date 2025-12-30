
import React, { useState, useMemo } from 'react';
import { Search, Plus, Linkedin, X, Pencil, Trash2, Star, Heart, Target, Filter, History, MessageSquare, Info, Clock, Calendar, Send, User, KanbanSquare, Check } from 'lucide-react';
import { Contact, Activity, EmailTemplate, Invoice, Expense, InvoiceConfig, TargetGroup, Deal, DealStage } from '../types';

interface ContactsProps {
  contacts: Contact[];
  activities: Activity[];
  deals: Deal[];
  onAddContact: (contact: Contact) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onAddActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
  onAddDeal: (deal: Deal) => void;
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

const TARGET_GROUPS: TargetGroup[] = [
    'A - B2B-Entscheider',
    'B - Industrie (Recruiting)',
    'C - High Ticket Berater',
    'D - Tech & Green Startups'
];

const getTargetGroupBadge = (group?: TargetGroup) => {
    if (!group) return <span className="text-slate-300 text-xs italic">Keine</span>;
    
    let colorClass = "bg-slate-100 text-slate-600";
    if (group.startsWith('A')) colorClass = "bg-indigo-100 text-indigo-700 border-indigo-200";
    if (group.startsWith('B')) colorClass = "bg-amber-100 text-amber-700 border-amber-200";
    if (group.startsWith('C')) colorClass = "bg-purple-100 text-purple-700 border-purple-200";
    if (group.startsWith('D')) colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";

    return (
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${colorClass}`}>
            {group.split(' - ')[0]} <span className="font-medium normal-case ml-1 opacity-80">{group.split(' - ')[1]}</span>
        </span>
    );
};

export const Contacts: React.FC<ContactsProps> = ({ 
  contacts,
  activities,
  deals,
  onAddContact, 
  onUpdateContact, 
  onDeleteContact,
  onAddActivity,
  onDeleteActivity,
  onAddDeal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'lead' | 'sales' | 'no_pipeline'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Contact>>({
    name: '', role: '', company: '', email: '', type: 'lead', nps: undefined, linkedin: '', targetGroup: undefined
  });

  const contactsInPipeline = useMemo(() => new Set(deals.map(d => d.contactId)), [deals]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const name = (c.name || '').toLowerCase();
      const company = (c.company || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const group = (c.targetGroup || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = name.includes(search) || company.includes(search) || email.includes(search) || group.includes(search);
      if (!matchesSearch) return false;

      if (activeTab === 'all') return true;
      if (activeTab === 'no_pipeline') return !contactsInPipeline.has(c.id);
      
      const contactType = (c.type || 'lead').toLowerCase();
      return contactType === activeTab;
    });
  }, [contacts, searchTerm, activeTab, contactsInPipeline]);

  const selectedContact = useMemo(() => 
    contacts.find(c => c.id === selectedContactId), 
    [contacts, selectedContactId]
  );

  const contactActivities = useMemo(() => 
    activities
        .filter(a => a.contactId === selectedContactId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [activities, selectedContactId]
  );

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContactId(null);
    setFormData({ name: '', role: '', company: '', email: '', type: 'lead', nps: undefined, linkedin: '', targetGroup: undefined });
  };

  const openEditModal = (contact: Contact) => {
    setEditingContactId(contact.id);
    setFormData({ ...contact });
    setIsModalOpen(true);
  };

  const handleAddNote = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newNote.trim() || !selectedContactId) return;
      
      const activity: Activity = {
          id: crypto.randomUUID(),
          contactId: selectedContactId,
          type: 'note',
          content: newNote.trim(),
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString()
      };
      onAddActivity(activity);
      setNewNote('');
  };

  const handleBatchToPipeline = async () => {
      const targets = filteredContacts.filter(c => !contactsInPipeline.has(c.id));
      if (targets.length === 0) return;
      if (!confirm(`${targets.length} Kontakte als Lead in die Pipeline verschieben?`)) return;

      setIsProcessingBatch(true);
      for (const contact of targets) {
          onAddDeal({
              id: crypto.randomUUID(),
              title: `Anfrage: ${contact.company || contact.name}`,
              value: 0,
              stage: DealStage.LEAD,
              contactId: contact.id,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              stageEnteredDate: new Date().toISOString().split('T')[0]
          });
      }
      setIsProcessingBatch(false);
      alert(`${targets.length} Einträge erstellt.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNps = formData.nps === undefined ? null : formData.nps;
    const finalGroup = formData.targetGroup === undefined ? null : formData.targetGroup;
    const finalEmail = formData.email?.trim() || 'no@email.de';
    
    if (editingContactId) {
      const original = contacts.find(c => c.id === editingContactId);
      if (original) onUpdateContact({ ...original, ...formData as Contact, email: finalEmail, nps: finalNps, targetGroup: finalGroup as any });
    } else {
      const newContactId = crypto.randomUUID();
      onAddContact({
        id: newContactId,
        name: formData.name || '',
        role: formData.role || 'Kontakt',
        company: formData.company || '',
        email: finalEmail,
        type: formData.type || 'lead',
        createdAt: new Date().toISOString(),
        lastContact: new Date().toISOString().split('T')[0],
        avatar: '',
        ...formData as any,
        nps: finalNps,
        targetGroup: finalGroup as any
      });

      // Automatisch Deal erstellen für Leads
      onAddDeal({
          id: crypto.randomUUID(),
          title: `Neuer Lead: ${formData.company || formData.name}`,
          value: 0,
          stage: DealStage.LEAD,
          contactId: newContactId,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          stageEnteredDate: new Date().toISOString().split('T')[0]
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
              placeholder="Suchen nach Name, Firma, Zielgruppe..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-lg text-sm w-80 transition-all outline-none"
            />
          </div>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Kontakt erstellen
          </button>
        </div>
      </header>
      
      <div className="bg-white px-8 border-b border-slate-100 flex justify-between items-center shrink-0">
        <div className="flex gap-1">
          {(['all', 'lead', 'customer', 'sales', 'no_pipeline'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)} 
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab === 'all' ? 'Alle' : tab === 'sales' ? 'Vertrieb' : tab === 'no_pipeline' ? 'Ohne Pipeline' : tab + 's'}
            </button>
          ))}
        </div>
        {activeTab === 'no_pipeline' && filteredContacts.length > 0 && (
            <button 
              onClick={handleBatchToPipeline}
              disabled={isProcessingBatch}
              className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100 hover:bg-emerald-100 flex items-center gap-2 transition-all"
            >
                <KanbanSquare className="w-3.5 h-3.5"/> Pipeline Sync ({filteredContacts.length})
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Name & Firma</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Zielgruppe</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">E-Mail</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Zufriedenheit</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.map(contact => (
                <tr 
                    key={contact.id} 
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`hover:bg-slate-50/50 transition-colors group cursor-pointer ${selectedContactId === contact.id ? 'bg-indigo-50/30' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                        {(contact.name || 'U').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{contact.name}</p>
                        <p className="text-xs text-slate-500 truncate">{contact.company || 'Privat'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        (contact.type || '').toLowerCase() === 'customer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {contact.type || 'Lead'}
                      </span>
                      {contactsInPipeline.has(contact.id) && <KanbanSquare className="w-3 h-3 text-indigo-400" title="In Pipeline" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTargetGroupBadge(contact.targetGroup)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 truncate max-w-[150px]">{contact.email}</td>
                  <td className="px-6 py-4">
                    {contact.nps !== undefined && contact.nps !== null ? (
                      <div className="flex items-center gap-1">
                        <Star className={`w-3 h-3 ${contact.nps >= 8 ? 'text-green-500' : contact.nps >= 5 ? 'text-amber-500' : 'text-red-500'} fill-current`} />
                        <span className="font-bold">{contact.nps}/10</span>
                      </div>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelectedContactId(contact.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Historie"><History className="w-4 h-4"/></button>
                      {contact.linkedin && (
                          <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Linkedin className="w-4 h-4"/></a>
                      )}
                      <button onClick={() => openEditModal(contact)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil className="w-4 h-4"/></button>
                      <button onClick={() => onDeleteContact(contact.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredContacts.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Keine Kontakte gefunden.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTIVITY DRAWER / DETAIL PANEL */}
      {selectedContact && (
          <div className="absolute inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-40 animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                          {selectedContact.name.charAt(0)}
                      </div>
                      <div>
                          <h2 className="font-bold text-slate-800 leading-tight">{selectedContact.name}</h2>
                          <p className="text-xs text-slate-500">{selectedContact.company}</p>
                      </div>
                  </div>
                  <button onClick={() => setSelectedContactId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                      <X className="w-5 h-5"/>
                  </button>
              </div>
              
              <div className="p-6 border-b border-slate-100 shrink-0">
                  <form onSubmit={handleAddNote} className="space-y-3">
                      <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2">
                          <MessageSquare className="w-3 h-3"/> Neue Notiz hinzufügen
                      </label>
                      <textarea 
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Zusammenfassung des Telefonats, Notizen..."
                        className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[100px] bg-slate-50"
                      />
                      <div className="flex justify-end">
                          <button 
                            type="submit" 
                            disabled={!newNote.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                              <Send className="w-3 h-3"/> Speichern
                          </button>
                      </div>
                  </form>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                  <h3 className="text-xs font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                      <History className="w-3 h-3"/> Aktivitäten & Historie
                  </h3>
                  
                  <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                      {contactActivities.map((activity, idx) => (
                          <div key={activity.id} className="relative">
                              <div className={`absolute -left-[21px] top-0 p-1.5 rounded-full border-2 border-white shadow-sm ${
                                  activity.type === 'note' ? 'bg-indigo-100 text-indigo-600' : 
                                  activity.type === 'system_deal' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                              }`}>
                                  {activity.type === 'note' ? <MessageSquare className="w-3 h-3"/> : 
                                   activity.type === 'system_deal' ? <Target className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                              </div>
                              
                              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition-colors">
                                  <div className="flex justify-between items-start mb-2">
                                      <span className="text-[10px] font-bold uppercase text-slate-400">
                                          {activity.type === 'note' ? 'Interne Notiz' : 'Systemereignis'}
                                      </span>
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                          <Calendar className="w-2.5 h-2.5"/> {new Date(activity.timestamp).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                  </div>
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{activity.content}</p>
                                  <div className="mt-3 flex justify-end">
                                      <button onClick={() => onDeleteActivity(activity.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                          <Trash2 className="w-3 h-3"/>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                      {contactActivities.length === 0 && (
                          <div className="text-center py-10 text-slate-300">
                              <Info className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                              <p className="text-xs italic">Noch keine Aktivitäten für diesen Kontakt erfasst.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

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
                  <label className="text-[10px] font-bold uppercase text-slate-500">Status</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                    <option value="lead">Lead</option>
                    <option value="customer">Kunde</option>
                    <option value="sales">Vertrieb</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                    <Target className="w-2.5 h-2.5 text-indigo-500"/> Zielgruppe (A-D)
                </label>
                <select 
                    value={formData.targetGroup || ''} 
                    onChange={e => setFormData({...formData, targetGroup: e.target.value as any})} 
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white mt-1"
                >
                    <option value="">Keine Zuweisung</option>
                    {TARGET_GROUPS.map(group => (
                        <option key={group} value={group}>{group}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">E-Mail</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="no@email.de (Standard)" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Linkedin className="w-2.5 h-2.5 text-blue-600"/> LinkedIn URL</label>
                    <input value={formData.linkedin} onChange={e => setFormData({...formData, linkedin: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><Heart className="w-2.5 h-2.5 text-pink-500"/> NPS (0-10)</label>
                    <input type="number" min="0" max="10" value={formData.nps ?? ''} onChange={e => setFormData({...formData, nps: e.target.value ? Number(e.target.value) : undefined})} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Zahl" />
                  </div>
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
