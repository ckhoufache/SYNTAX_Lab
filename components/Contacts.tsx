
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Phone, Plus, Linkedin, X, FileText, Pencil, Trash, Trash2, Clock, Check, Send, Briefcase, Banknote, Calendar, Building, Globe, Upload, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Contact, Activity, ActivityType, EmailTemplate } from '../types';
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
}

type SortKey = keyof Contact;

export const Contacts: React.FC<ContactsProps> = ({ 
  contacts,
  activities,
  onAddContact, 
  onUpdateContact, 
  onDeleteContact,
  onAddActivity,
  onDeleteActivity,
  initialFilter,
  onClearFilter,
  focusedId,
  onClearFocus,
  emailTemplates,
  onImportCSV,
  onBulkDeleteContacts
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
      company: '',
      role: '',
      timeframe: 'all' 
  });

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '', name: '', contactId: '' });
  const [sendingEmail, setSendingEmail] = useState(false);

  const [newActivityType, setNewActivityType] = useState<ActivityType>('note');
  const [newActivityContent, setNewActivityContent] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const availableCompanies = useMemo(() => Array.from(new Set(contacts.map(c => c.company))).sort(), [contacts]);
  const availableRoles = useMemo(() => Array.from(new Set(contacts.map(c => c.role))).sort(), [contacts]);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    companyUrl: '',
    email: '',
    linkedin: '',
    notes: '' 
  });

  // HELPER: Explicitly close and reset form to avoid state ghosting
  const handleCloseModal = () => {
      setIsModalOpen(false);
      setEditingContactId(null);
      // Explicitly wipe state
      setFormData({ name: '', role: '', company: '', companyUrl: '', email: '', linkedin: '', notes: '' });
      setNewActivityContent('');
  };

  const processedContacts = useMemo(() => {
      let result = contacts.filter(c => {
        if (focusedId) {
            return c.id === focusedId;
        }

        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              c.company.toLowerCase().includes(searchTerm.toLowerCase());
        
        let matchesInitialFilter = true;
        if (initialFilter === 'recent') {
           const lastDate = new Date(c.lastContact);
           const sevenDaysAgo = new Date();
           sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
           matchesInitialFilter = lastDate >= sevenDaysAgo;
        }

        let matchesCompany = true;
        if (filters.company) matchesCompany = c.company === filters.company;

        let matchesRole = true;
        if (filters.role) matchesRole = c.role === filters.role;

        let matchesTimeframe = true;
        if (filters.timeframe !== 'all') {
            const lastDate = new Date(c.lastContact);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (filters.timeframe === 'week') matchesTimeframe = diffDays <= 7;
            if (filters.timeframe === 'month') matchesTimeframe = diffDays <= 30;
            if (filters.timeframe === 'older') matchesTimeframe = diffDays > 30;
        }

        return matchesSearch && matchesInitialFilter && matchesCompany && matchesRole && matchesTimeframe;
      });

      if (sortConfig) {
          result.sort((a, b) => {
              const valA = (a[sortConfig.key] || '').toString().toLowerCase();
              const valB = (b[sortConfig.key] || '').toString().toLowerCase();

              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return result;
  }, [contacts, focusedId, searchTerm, initialFilter, filters, sortConfig]);

  useEffect(() => {
      setSelectedIds(new Set());
  }, [searchTerm, initialFilter, filters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId && !(event.target as Element).closest('.row-menu-trigger')) {
         setActiveMenuId(null);
      }
      if (isFilterOpen && filterRef.current && !filterRef.current.contains(event.target as Node)) {
          setIsFilterOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId, isFilterOpen]);

  const handleSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: SortKey) => {
      if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600 ml-1" /> : <ArrowDown className="w-3 h-3 text-indigo-600 ml-1" />;
  };

  const handleSelectAll = () => {
      if (selectedIds.size === processedContacts.length && processedContacts.length > 0) {
          setSelectedIds(new Set()); 
      } else {
          const allIds = new Set(processedContacts.map(c => c.id));
          setSelectedIds(allIds);
      }
  };

  const toggleSelection = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
      if (confirm(`Möchten Sie wirklich ${selectedIds.size} Kontakte löschen?`)) {
          // Use new prop for batch deletion
          onBulkDeleteContacts(Array.from(selectedIds));
          setSelectedIds(new Set());
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) onImportCSV(text);
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const openCreateModal = () => {
    setEditingContactId(null);
    setFormData({ name: '', role: '', company: '', companyUrl: '', email: '', linkedin: '', notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContactId(contact.id);
    setFormData({
      name: contact.name,
      role: contact.role,
      company: contact.company,
      companyUrl: contact.companyUrl || '',
      email: contact.email,
      linkedin: contact.linkedin || '',
      notes: contact.notes || ''
    });
    setNewActivityContent(''); 
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = (id: string) => {
    onDeleteContact(id);
    setActiveMenuId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingContactId) {
      const originalContact = contacts.find(c => c.id === editingContactId);
      if (originalContact) {
        const updatedContact: Contact = {
          ...originalContact,
          name: formData.name,
          role: formData.role || 'Unbekannt',
          company: formData.company,
          companyUrl: formData.companyUrl,
          email: formData.email,
          linkedin: formData.linkedin,
          notes: formData.notes,
        };
        onUpdateContact(updatedContact);
      }
    } else {
      const newContact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        role: formData.role || 'Unbekannt',
        company: formData.company,
        companyUrl: formData.companyUrl,
        email: formData.email,
        linkedin: formData.linkedin,
        notes: formData.notes,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
        lastContact: new Date().toISOString().split('T')[0] 
      };
      onAddContact(newContact);
    }
    handleCloseModal();
  };

  const handleAddManualActivity = () => {
      if (!editingContactId || !newActivityContent.trim()) return;

      onAddActivity({
          id: Math.random().toString(36).substr(2, 9),
          contactId: editingContactId,
          type: newActivityType,
          content: newActivityContent,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString()
      });
      setNewActivityContent('');
  };

  const getContactActivities = () => {
      if (!editingContactId) return [];
      return activities.filter(a => a.contactId === editingContactId).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  };

  const ActivityIcon = ({ type }: { type: ActivityType }) => {
      switch(type) {
          case 'call': return <Phone className="w-4 h-4 text-white" />;
          case 'email': return <Mail className="w-4 h-4 text-white" />;
          case 'meeting': return <Calendar className="w-4 h-4 text-white" />;
          case 'system_deal': return <Briefcase className="w-4 h-4 text-white" />;
          case 'system_invoice': return <Banknote className="w-4 h-4 text-white" />;
          default: return <FileText className="w-4 h-4 text-white" />;
      }
  };
  const ActivityColor = ({ type }: { type: ActivityType }) => {
      switch(type) {
          case 'call': return 'bg-blue-500';
          case 'email': return 'bg-slate-500';
          case 'meeting': return 'bg-purple-500';
          case 'system_deal': return 'bg-amber-500';
          case 'system_invoice': return 'bg-green-500';
          default: return 'bg-indigo-500'; 
      }
  };


  const handleEmailClick = (contact: Contact) => {
      setEmailData({
          to: contact.email,
          name: contact.name,
          subject: '',
          body: `Hallo ${contact.name.split(' ')[0]},\n\n`,
          contactId: contact.id
      });
      setIsEmailModalOpen(true);
  };
  
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const tplId = e.target.value;
      const tpl = emailTemplates?.find(t => t.id === tplId);
      if (tpl) {
          setEmailData(prev => ({ ...prev, subject: tpl.subject, body: tpl.body.replace('{name}', prev.name.split(' ')[0]) }));
      }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const isGoogleMailConnected = localStorage.getItem('google_mail_connected') === 'true';
      const storedConfig = localStorage.getItem('backend_config');
      const config = storedConfig ? JSON.parse(storedConfig) : { mode: 'local' };
      
      let success = false;

      if (isGoogleMailConnected) {
          const service = DataServiceFactory.create(config);
          setSendingEmail(true);
          success = await service.sendMail(emailData.to, emailData.subject, emailData.body);
          setSendingEmail(false);
          
          if (success) {
              alert("E-Mail erfolgreich gesendet.");
              setIsEmailModalOpen(false);
          }
      } else {
          const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`;
          window.location.href = mailtoLink;
          setIsEmailModalOpen(false);
          success = true; 
      }

      if (success && emailData.contactId) {
          onAddActivity({
              id: Math.random().toString(36).substr(2, 9),
              contactId: emailData.contactId,
              type: 'email',
              content: `E-Mail gesendet: ${emailData.subject}`,
              date: new Date().toISOString().split('T')[0],
              timestamp: new Date().toISOString()
          });
      }
  };

  const startEditingNote = (contact: Contact) => { setEditingNoteId(contact.id); setTempNote(contact.notes || ''); };
  const saveNote = (contact: Contact) => { if (tempNote !== contact.notes) onUpdateContact({ ...contact, notes: tempNote }); setEditingNoteId(null); };
  const handleNoteKeyDown = (e: React.KeyboardEvent, contact: Contact) => { 
      if (e.key === 'Enter') {
          e.stopPropagation(); 
          saveNote(contact); 
      }
  };

  const hasActiveFilters = filters.company !== '' || filters.role !== '' || filters.timeframe !== 'all';
  const resetFilters = () => { setFilters({ company: '', role: '', timeframe: 'all' }); setIsFilterOpen(false); };

  return (
    <div className="flex-1 bg-slate-50 h-screen overflow-y-auto flex flex-col relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kontakte</h1>
          <p className="text-slate-500 text-sm mt-1">Verwalten Sie Ihre Kunden und Leads.</p>
        </div>
        <div className="flex gap-3">
             <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileChange} />
             <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                <Upload className="w-4 h-4" /> CSV Import
             </button>
             <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
                <Plus className="w-4 h-4" /> Kontakt hinzufügen
             </button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            {!focusedId && (
                <div className="relative w-96">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Namen oder Firma suchen..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"/>
                </div>
            )}
            {focusedId && (
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-200 animate-in fade-in slide-in-from-left-2 shadow-sm">
                    <Search className="w-4 h-4" /> Suchergebnis: {processedContacts[0]?.name || 'Unbekannt'} <button onClick={onClearFocus} className="hover:bg-indigo-100 rounded-full p-1 ml-2 transition-colors"><X className="w-4 h-4" /></button>
                </div>
            )}
            {!focusedId && initialFilter === 'recent' && (
                <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-medium border border-orange-200 animate-in fade-in slide-in-from-left-2">
                    <Clock className="w-3.5 h-3.5" /> Neue Kontakte (7 Tage) <button onClick={onClearFilter} className="hover:bg-orange-100 rounded-full p-0.5 ml-1"><X className="w-3.5 h-3.5" /></button>
                </div>
            )}
        </div>
        
        {!focusedId && (
            <div className="relative" ref={filterRef}>
                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm shadow-sm transition-colors ${hasActiveFilters || isFilterOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                    <Filter className="w-4 h-4" /> <span>Filter</span> {hasActiveFilters && (<span className="flex h-2 w-2 rounded-full bg-indigo-600 ml-1"></span>)}
                </button>
                {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-30 p-4 animate-in fade-in zoom-in duration-100 origin-top-right">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-50"><h3 className="text-sm font-bold text-slate-800">Filteroptionen</h3>{hasActiveFilters && (<button onClick={resetFilters} className="text-xs text-red-500 hover:underline">Zurücksetzen</button>)}</div>
                            <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Firma</label><select value={filters.company} onChange={(e) => setFilters({...filters, company: e.target.value})} className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 p-2 border"><option value="">Alle Firmen</option>{availableCompanies.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>
                            <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Rolle</label><select value={filters.role} onChange={(e) => setFilters({...filters, role: e.target.value})} className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 p-2 border"><option value="">Alle Rollen</option>{availableRoles.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
                            <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Letzter Kontakt</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setFilters({...filters, timeframe: 'all'})} className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Egal</button><button onClick={() => setFilters({...filters, timeframe: 'week'})} className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'week' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>&lt; 7 Tage</button><button onClick={() => setFilters({...filters, timeframe: 'month'})} className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'month' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>&lt; 30 Tage</button><button onClick={() => setFilters({...filters, timeframe: 'older'})} className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'older' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>&gt; 30 Tage</button></div></div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
          <div className="bg-indigo-50 border-y border-indigo-100 px-8 py-2 flex items-center justify-between text-indigo-800 text-sm animate-in slide-in-from-top-1">
              <span className="font-semibold">{selectedIds.size} Kontakt(e) ausgewählt</span>
              <div className="flex gap-2">
                  <button onClick={handleBulkDelete} className="flex items-center gap-1 hover:text-red-600 hover:underline"><Trash2 className="w-4 h-4" /> Markierte löschen</button>
                  <button onClick={() => setSelectedIds(new Set())} className="ml-4 text-slate-500 hover:text-slate-800">Abbrechen</button>
              </div>
          </div>
      )}

      {/* Table */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200 w-12">
                     <input 
                        type="checkbox" 
                        checked={selectedIds.size === processedContacts.length && processedContacts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                     />
                </th>
                <th 
                    className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 group transition-colors select-none"
                    onClick={() => handleSort('name')}
                >
                    <div className="flex items-center">Name {renderSortIcon('name')}</div>
                </th>
                <th 
                    className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 group transition-colors select-none"
                    onClick={() => handleSort('role')}
                >
                    <div className="flex items-center">Rolle {renderSortIcon('role')}</div>
                </th>
                <th 
                    className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 group transition-colors select-none"
                    onClick={() => handleSort('company')}
                >
                    <div className="flex items-center">Firma {renderSortIcon('company')}</div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Quick-Notiz</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedContacts.length > 0 ? processedContacts.map((contact) => (
                <tr 
                    key={contact.id} 
                    onClick={() => openEditModal(contact)}
                    className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedIds.has(contact.id) ? 'bg-indigo-50/50 hover:bg-indigo-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                       <input 
                            type="checkbox" 
                            checked={selectedIds.has(contact.id)}
                            onChange={() => toggleSelection(contact.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img src={contact.avatar} alt={contact.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white" />
                      <div><p className="text-sm font-semibold text-slate-900">{contact.name}</p><p className="text-xs text-slate-500">{contact.email}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm text-slate-700">{contact.role}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{contact.company}</span>
                          {contact.companyUrl && (
                              <a href={contact.companyUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                  <Globe className="w-3.5 h-3.5" />
                              </a>
                          )}
                      </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingNoteId === contact.id ? (
                      <input 
                        autoFocus 
                        type="text" 
                        value={tempNote} 
                        onChange={(e) => setTempNote(e.target.value)} 
                        onBlur={() => saveNote(contact)} 
                        onKeyDown={(e) => handleNoteKeyDown(e, contact)} 
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm p-1.5 border border-indigo-400 rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    ) : (
                      <div 
                        onClick={(e) => { e.stopPropagation(); startEditingNote(contact); }} 
                        className="max-w-[200px] truncate text-sm text-slate-500 flex items-center gap-1 cursor-text hover:text-slate-700 hover:bg-slate-100/50 p-1.5 -ml-1.5 rounded transition-colors" 
                        title="Klicken zum Bearbeiten"
                      >
                        {contact.notes ? <><FileText className="w-3 h-3 text-slate-400 shrink-0" />{contact.notes}</> : <span className="text-slate-300 italic text-xs flex items-center gap-1"><Pencil className="w-3 h-3" />Notiz hinzufügen...</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right relative">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {contact.linkedin && (<a href={contact.linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded" title="LinkedIn Profil"><Linkedin className="w-4 h-4" /></a>)}
                      <button onClick={(e) => { e.stopPropagation(); handleEmailClick(contact); }} className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded" title="E-Mail senden"><Mail className="w-4 h-4" /></button>
                      <div className="relative row-menu-trigger" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActiveMenuId(activeMenuId === contact.id ? null : contact.id)} className={`p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded ${activeMenuId === contact.id ? 'bg-slate-100 text-slate-600' : ''}`}><MoreHorizontal className="w-4 h-4" /></button>
                        {activeMenuId === contact.id && (
                          <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right">
                            <button onClick={() => openEditModal(contact)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"><Pencil className="w-3 h-3" />Details & Historie</button>
                            <button onClick={() => handleDeleteClick(contact.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"><Trash className="w-3 h-3" />Löschen</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">{focusedId ? "Der gesuchte Kontakt wurde nicht gefunden." : initialFilter === 'recent' ? "Keine neuen Kontakte in den letzten 7 Tagen gefunden." : hasActiveFilters ? "Keine Kontakte für die gewählten Filter gefunden." : "Keine Kontakte gefunden."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT & HISTORY MODAL */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className={`bg-white rounded-xl shadow-2xl w-full ${editingContactId ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden flex flex-col max-h-[90vh]`}>
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        {editingContactId ? <><Briefcase className="w-5 h-5 text-indigo-600"/> Kontaktakte: {formData.name}</> : 'Neuen Kontakt erstellen'}
                    </h2>
                    <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className={`flex-1 overflow-hidden ${editingContactId ? 'grid grid-cols-5' : ''}`}>
                    
                    {/* LEFT COLUMN: FORM */}
                    <div className={`${editingContactId ? 'col-span-2 border-r border-slate-100' : 'w-full'} overflow-y-auto p-6`}>
                         <form id="contactForm" onSubmit={handleSubmit} className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Stammdaten</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Name</label><input required name="name" value={formData.name} onChange={handleInputChange} type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Max Mustermann"/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Firma</label><input required name="company" value={formData.company} onChange={handleInputChange} type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Firma GmbH"/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Globe className="w-3 h-3"/> Firmen-Link</label><input name="companyUrl" value={formData.companyUrl} onChange={handleInputChange} type="url" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://firma.de"/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Rolle</label><input name="role" value={formData.role} onChange={handleInputChange} type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="z.B. CEO"/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">E-Mail</label><input required name="email" value={formData.email} onChange={handleInputChange} type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="max@firma.de"/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Linkedin className="w-3 h-3 text-blue-600" /> LinkedIn Profil</label><input name="linkedin" value={formData.linkedin} onChange={handleInputChange} type="url" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://linkedin.com/in/..."/></div>
                                <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Allgemeine Notiz</label><textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Statische Infos..."/></div>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT COLUMN: TIMELINE (Only when editing) */}
                    {editingContactId && (
                        <div className="col-span-3 bg-slate-50/50 flex flex-col h-full overflow-hidden">
                            <div className="p-4 border-b border-slate-100 bg-white shrink-0">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider">Historie & Aktivitäten</h3>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => setNewActivityType('note')} className={`flex-1 py-1.5 text-xs font-medium rounded border ${newActivityType === 'note' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>Notiz</button>
                                    <button onClick={() => setNewActivityType('call')} className={`flex-1 py-1.5 text-xs font-medium rounded border ${newActivityType === 'call' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}>Anruf</button>
                                    <button onClick={() => setNewActivityType('meeting')} className={`flex-1 py-1.5 text-xs font-medium rounded border ${newActivityType === 'meeting' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600'}`}>Meeting</button>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newActivityContent}
                                        onChange={(e) => setNewActivityContent(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddManualActivity()}
                                        placeholder="Was ist passiert?" 
                                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <button 
                                        onClick={handleAddManualActivity}
                                        disabled={!newActivityContent.trim()}
                                        className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 disabled:opacity-50"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {getContactActivities().length > 0 ? (
                                    getContactActivities().map((activity) => (
                                        <div key={activity.id} className="flex gap-4 group relative">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${ActivityColor({type: activity.type})}`}>
                                                    <ActivityIcon type={activity.type} />
                                                </div>
                                                <div className="w-0.5 flex-1 bg-slate-200 my-1 group-last:hidden"></div>
                                            </div>
                                            <div className="pb-2 flex-1">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{activity.date}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded capitalize">{activity.type.replace('system_', '')}</span>
                                                        <button 
                                                            onClick={() => onDeleteActivity(activity.id)}
                                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-0.5"
                                                            title="Aktivität löschen"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-1 text-sm text-slate-700 leading-relaxed">
                                                    {activity.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-400 text-sm">
                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        Noch keine Aktivitäten.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Abbrechen</button>
                    <button type="submit" form="contactForm" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 transition-colors">
                        {editingContactId ? 'Speichern' : 'Kontakt erstellen'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Send Email Modal */}
      {isEmailModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-600" />E-Mail verfassen</h2>
                    <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSendEmail} className="p-6 space-y-4">
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex justify-between items-center"><div className="text-sm"><span className="text-indigo-600 font-medium">An: </span><span className="text-slate-700">{emailData.name} ({emailData.to})</span></div></div>
                    {emailTemplates && emailTemplates.length > 0 && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Vorlage</label>
                            <select onChange={handleTemplateSelect} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm">
                                <option value="">-- Vorlage wählen --</option>
                                {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Betreff</label><input required autoFocus value={emailData.subject} onChange={(e) => setEmailData({...emailData, subject: e.target.value})} type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"/></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Nachricht</label><textarea required value={emailData.body} onChange={(e) => setEmailData({...emailData, body: e.target.value})} rows={8} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-sans"/></div>
                    <div className="pt-2 flex justify-end gap-3"><button type="button" onClick={() => setIsEmailModalOpen(false)} disabled={sendingEmail} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Abbrechen</button><button type="submit" disabled={sendingEmail} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-md shadow-indigo-200 transition-colors flex items-center gap-2">{sendingEmail ? 'Sende...' : <><Send className="w-4 h-4" />Senden</>}</button></div>
                    <p className="text-xs text-center text-slate-400 mt-2">{localStorage.getItem('google_mail_connected') === 'true' ? "Senden via Google API (Hintergrund)" : "Öffnet Ihr Standard E-Mail Programm"}</p>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
