import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Phone, Plus } from 'lucide-react';
import { Contact } from '../types';

interface ContactsProps {
  contacts: Contact[];
}

export const Contacts: React.FC<ContactsProps> = ({ contacts }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-slate-50 h-screen overflow-y-auto flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kontakte</h1>
          <p className="text-slate-500 text-sm mt-1">Verwalten Sie Ihre Kunden und Leads.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Kontakt hinzufügen
        </button>
      </header>

      {/* Toolbar */}
      <div className="px-8 py-4 flex items-center justify-between shrink-0">
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
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 shadow-sm">
          <Filter className="w-4 h-4" />
          <span>Filter</span>
        </button>
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
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContacts.map((contact) => (
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                      Aktiv
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};