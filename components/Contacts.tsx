
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Phone, Plus, Linkedin, X, FileText, Pencil, Trash, Clock, Check } from 'lucide-react';
import { Contact } from '../types';

interface ContactsProps {
  contacts: Contact[];
  onAddContact: (contact: Contact) => void;
  onUpdateContact: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  initialFilter: 'all' | 'recent';
  onClearFilter: () => void;
}

export const Contacts: React.FC<ContactsProps> = ({ 
  contacts, 
  onAddContact, 
  onUpdateContact, 
  onDeleteContact,
  initialFilter,
  onClearFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  
  // State für Inline-Note Editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState('');
  
  // State für Dropdown Menü
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // State für Filter Menü
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState({
      company: '',
      role: '',
      timeframe: 'all' // 'all', 'week', 'month', 'older'
  });

  // Extract unique values for filter dropdowns
  const availableCompanies = Array.from(new Set(contacts.map(c => c.company))).sort();
  const availableRoles = Array.from(new Set(contacts.map(c => c.role))).sort();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    company: '',
    email: '',
    linkedin: '',
    notes: ''
  });

  const filteredContacts = contacts.filter(c => {
    // 1. Search Term
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.company.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Dashboard Filter (passed via props)
    let matchesInitialFilter = true;
    if (initialFilter === 'recent') {
       const lastDate = new Date(c.lastContact);
       const sevenDaysAgo = new Date();
       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
       matchesInitialFilter = lastDate >= sevenDaysAgo;
    }

    // 3. Manual Filters
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

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Logic for row menu
      if (activeMenuId && !(event.target as Element).closest('.row-menu-trigger')) {
         setActiveMenuId(null);
      }
      // Logic for filter menu
      if (isFilterOpen && filterRef.current && !filterRef.current.contains(event.target as Node)) {
          setIsFilterOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId, isFilterOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditingContactId(null);
    setFormData({ name: '', role: '', company: '', email: '', linkedin: '', notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (contact: Contact) => {
    setEditingContactId(contact.id);
    setFormData({
      name: contact.name,
      role: contact.role,
      company: contact.company,
      email: contact.email,
      linkedin: contact.linkedin || '',
      notes: contact.notes || ''
    });
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
      // Update existing
      const originalContact = contacts.find(c => c.id === editingContactId);
      if (originalContact) {
        const updatedContact: Contact = {
          ...originalContact,
          name: formData.name,
          role: formData.role || 'Unbekannt',
          company: formData.company,
          email: formData.email,
          linkedin: formData.linkedin,
          notes: formData.notes,
        };
        onUpdateContact(updatedContact);
      }
    } else {
      // Create new
      const newContact: Contact = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        role: formData.role || 'Unbekannt',
        company: formData.company,
        email: formData.email,
        linkedin: formData.linkedin,
        notes: formData.notes,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
        lastContact: new Date().toISOString().split('T')[0] // Setzt Datum auf Heute für Filter
      };
      onAddContact(newContact);
    }

    setIsModalOpen(false);
    setFormData({ name: '', role: '', company: '', email: '', linkedin: '', notes: '' });
    setEditingContactId(null);
  };

  // Inline Note Logic
  const startEditingNote = (contact: Contact) => {
    setEditingNoteId(contact.id);
    setTempNote(contact.notes || '');
  };

  const saveNote = (contact: Contact) => {
    if (tempNote !== contact.notes) {
      onUpdateContact({ ...contact, notes: tempNote });
    }
    setEditingNoteId(null);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent, contact: Contact) => {
    if (e.key === 'Enter') {
      saveNote(contact);
    }
  };

  const hasActiveFilters = filters.company !== '' || filters.role !== '' || filters.timeframe !== 'all';

  const resetFilters = () => {
      setFilters({ company: '', role: '', timeframe: 'all' });
      setIsFilterOpen(false);
  };

  return (
    <div className="flex-1 bg-slate-50 h-screen overflow-y-auto flex flex-col relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kontakte</h1>
          <p className="text-slate-500 text-sm mt-1">Verwalten Sie Ihre Kunden und Leads.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Kontakt hinzufügen
        </button>
      </header>

      {/* Toolbar */}
      <div className="px-8 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
            <div className="relative w-96">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Namen oder Firma suchen..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
            </div>
            {/* Active Filter Indicator */}
            {initialFilter === 'recent' && (
                <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-medium border border-orange-200 animate-in fade-in slide-in-from-left-2">
                    <Clock className="w-3.5 h-3.5" />
                    Neue Kontakte (7 Tage)
                    <button onClick={onClearFilter} className="hover:bg-orange-100 rounded-full p-0.5 ml-1">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
        
        {/* Filter Button & Dropdown */}
        <div className="relative" ref={filterRef}>
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm shadow-sm transition-colors ${
                    hasActiveFilters || isFilterOpen
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
                {hasActiveFilters && (
                    <span className="flex h-2 w-2 rounded-full bg-indigo-600 ml-1"></span>
                )}
            </button>

            {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 z-30 p-4 animate-in fade-in zoom-in duration-100 origin-top-right">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                            <h3 className="text-sm font-bold text-slate-800">Filteroptionen</h3>
                            {hasActiveFilters && (
                                <button onClick={resetFilters} className="text-xs text-red-500 hover:underline">
                                    Zurücksetzen
                                </button>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Firma</label>
                            <select 
                                value={filters.company}
                                onChange={(e) => setFilters({...filters, company: e.target.value})}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 p-2 border"
                            >
                                <option value="">Alle Firmen</option>
                                {availableCompanies.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Rolle</label>
                            <select 
                                value={filters.role}
                                onChange={(e) => setFilters({...filters, role: e.target.value})}
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 p-2 border"
                            >
                                <option value="">Alle Rollen</option>
                                {availableRoles.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Letzter Kontakt</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button 
                                    onClick={() => setFilters({...filters, timeframe: 'all'})}
                                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    Egal
                                </button>
                                <button 
                                    onClick={() => setFilters({...filters, timeframe: 'week'})}
                                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'week' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    &lt; 7 Tage
                                </button>
                                <button 
                                    onClick={() => setFilters({...filters, timeframe: 'month'})}
                                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'month' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    &lt; 30 Tage
                                </button>
                                <button 
                                    onClick={() => setFilters({...filters, timeframe: 'older'})}
                                    className={`px-2 py-1.5 text-xs rounded border transition-colors ${filters.timeframe === 'older' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    &gt; 30 Tage
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 px-8 pb-8 overflow-hidden">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Rolle</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Firma</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Notizen (Klick zum Ändern)</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.length > 0 ? filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img src={contact.avatar} alt={contact.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                        <p className="text-xs text-slate-500">{contact.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-700">{contact.role}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-800">{contact.company}</span>
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
                        className="w-full text-sm p-1.5 border border-indigo-400 rounded focus:ring-2 focus:ring-indigo-200 outline-none"
                      />
                    ) : (
                      <div 
                        onClick={() => startEditingNote(contact)}
                        className="max-w-[200px] truncate text-sm text-slate-500 flex items-center gap-1 cursor-text hover:text-slate-700 hover:bg-slate-100/50 p-1.5 -ml-1.5 rounded transition-colors"
                        title="Klicken zum Bearbeiten"
                      >
                        {contact.notes ? (
                            <>
                             <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                             {contact.notes}
                            </>
                        ) : (
                            <span className="text-slate-300 italic text-xs flex items-center gap-1">
                                <Pencil className="w-3 h-3" />
                                Notiz hinzufügen...
                            </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right relative">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {contact.linkedin && (
                          <a 
                            href={contact.linkedin} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded"
                            title="LinkedIn Profil"
                          >
                            <Linkedin className="w-4 h-4" />
                          </a>
                      )}
                      <button className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded">
                        <Mail className="w-4 h-4" />
                      </button>
                      
                      {/* Dropdown Menu Trigger */}
                      <div className="relative row-menu-trigger" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setActiveMenuId(activeMenuId === contact.id ? null : contact.id)}
                            className={`p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded ${activeMenuId === contact.id ? 'bg-slate-100 text-slate-600' : ''}`}
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeMenuId === contact.id && (
                          <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right">
                            <button 
                                onClick={() => openEditModal(contact)}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                            >
                                <Pencil className="w-3 h-3" />
                                Bearbeiten
                            </button>
                            <button 
                                onClick={() => handleDeleteClick(contact.id)}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50"
                            >
                                <Trash className="w-3 h-3" />
                                Löschen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                  <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                          {initialFilter === 'recent' 
                            ? "Keine neuen Kontakte in den letzten 7 Tagen gefunden." 
                            : hasActiveFilters 
                                ? "Keine Kontakte für die gewählten Filter gefunden."
                                : "Keine Kontakte gefunden."}
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Contact Modal Overlay */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">
                        {editingContactId ? 'Kontakt bearbeiten' : 'Neuen Kontakt erstellen'}
                    </h2>
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Name</label>
                            <input 
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                type="text" 
                                placeholder="Max Mustermann" 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Firma</label>
                            <input 
                                required
                                name="company"
                                value={formData.company}
                                onChange={handleInputChange}
                                type="text" 
                                placeholder="Firma GmbH" 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Rolle</label>
                            <input 
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                type="text" 
                                placeholder="z.B. CEO" 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">E-Mail</label>
                            <input 
                                required
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                type="email" 
                                placeholder="max@firma.de" 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <Linkedin className="w-3 h-3 text-blue-600" /> LinkedIn Profil
                        </label>
                        <input 
                            name="linkedin"
                            value={formData.linkedin}
                            onChange={handleInputChange}
                            type="url" 
                            placeholder="https://linkedin.com/in/..." 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Notizen</label>
                        <textarea 
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Wichtige Infos zur Akquise..." 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md shadow-indigo-200 transition-colors"
                        >
                            {editingContactId ? 'Änderungen speichern' : 'Kontakt speichern'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
