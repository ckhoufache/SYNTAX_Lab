
import React, { useState, DragEvent, useMemo } from 'react';
import { Deal, DealStage, Contact, ProductPreset, Task, Invoice, Activity, InvoiceConfig, EmailTemplate } from '../types';
import { Plus, X, Calendar, Trash2, Filter, Eye, EyeOff, Package, Pencil, Search, SlidersHorizontal, ArrowDownAZ, Users } from 'lucide-react';
import { DataServiceFactory, compileInvoiceTemplate } from '../services/dataService';

interface PipelineProps {
  deals: Deal[];
  contacts: Contact[];
  onAddDeal: (deal: Deal) => void;
  onUpdateDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
  onUpdateContact: (contact: Contact) => void;
  visibleStages: DealStage[];
  setVisibleStages: (stages: DealStage[]) => void;
  productPresets: ProductPreset[];
  onAddTask: (task: Task) => void;
  tasks: Task[];
  onAutoDeleteTask: (taskId: string) => void;
  focusedDealId: string | null;
  onClearFocus: () => void;
  onAddInvoice: (invoice: Invoice) => void;
  invoices: Invoice[];
  onAddActivity: (activity: Activity) => void;
  onNavigateToContacts: (filter: 'all' | 'recent', focusId?: string) => void;
  invoiceConfig: InvoiceConfig | null;
  emailTemplates: EmailTemplate[];
}

export const Pipeline: React.FC<PipelineProps> = ({ 
  deals, 
  contacts, 
  onAddDeal, 
  onUpdateDeal, 
  onDeleteDeal,
  onUpdateContact,
  visibleStages,
  setVisibleStages,
  productPresets,
  onAddTask,
  tasks,
  onAutoDeleteTask,
  focusedDealId,
  onClearFocus,
  onAddInvoice,
  invoices,
  onAddActivity,
  onNavigateToContacts,
  invoiceConfig,
  emailTemplates
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', value: '', stage: DealStage.LEAD, contactId: '', dueDate: '' });

  const [searchQuery, setSearchQuery] = useState('');

  const columns = [
    { id: DealStage.LEAD, title: 'Lead', color: 'bg-slate-500', borderColor: 'border-slate-200' },
    { id: DealStage.CONTACTED, title: 'Kontakt', color: 'bg-blue-500', borderColor: 'border-blue-200' },
    { id: DealStage.FOLLOW_UP, title: 'Follow-up', color: 'bg-cyan-500', borderColor: 'border-cyan-200' },
    { id: DealStage.PROPOSAL, title: 'Angebot', color: 'bg-amber-500', borderColor: 'border-amber-200' },
    { id: DealStage.NEGOTIATION, title: 'Verhandlung', color: 'bg-purple-500', borderColor: 'border-purple-200' },
    { id: DealStage.WON, title: 'Gewonnen', color: 'bg-green-500', borderColor: 'border-green-200' },
    { id: DealStage.LOST, title: 'Verloren', color: 'bg-red-900', borderColor: 'border-red-200' },
  ];

  const getDaysInStage = (dateString?: string) => {
      if (!dateString) return 0;
      const start = new Date(dateString);
      const now = new Date();
      start.setHours(0,0,0,0);
      now.setHours(0,0,0,0);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const processedDeals = useMemo(() => {
    return deals.filter(deal => {
        if (focusedDealId && deal.id !== focusedDealId) return false;
        const contact = contacts.find(c => c.id === deal.contactId);
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery || 
            (deal.title || '').toLowerCase().includes(searchLower) ||
            (contact?.name || '').toLowerCase().includes(searchLower) ||
            (contact?.company || '').toLowerCase().includes(searchLower);
        return matchesSearch;
    });
  }, [deals, contacts, focusedDealId, searchQuery]);

  const dealsByStage = useMemo(() => {
    const acc: Record<string, Deal[]> = {};
    Object.values(DealStage).forEach(s => acc[s] = []);
    processedDeals.forEach(d => { if (acc[d.stage]) acc[d.stage].push(d); });
    return acc;
  }, [processedDeals]);

  const handleDragStart = (e: React.DragEvent, id: string) => { setDraggedDealId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    if (!draggedDealId) return;
    const deal = deals.find(d => d.id === draggedDealId);
    if (deal && deal.stage !== targetStage) {
        onUpdateDeal({ ...deal, stage: targetStage, stageEnteredDate: new Date().toISOString().split('T')[0] });
    }
    setDraggedDealId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.value || !formData.contactId) return;
    if (editingDealId) {
        const existingDeal = deals.find(d => d.id === editingDealId);
        if (existingDeal) onUpdateDeal({ ...existingDeal, title: formData.title, value: parseFloat(formData.value), stage: formData.stage, contactId: formData.contactId, dueDate: formData.dueDate || existingDeal.dueDate });
    } else {
        onAddDeal({ id: crypto.randomUUID(), title: formData.title, value: parseFloat(formData.value), stage: formData.stage, contactId: formData.contactId, dueDate: formData.dueDate || new Date().toISOString().split('T')[0], stageEnteredDate: new Date().toISOString().split('T')[0] });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 bg-slate-50 h-screen flex flex-col overflow-hidden relative">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-slate-800">Pipeline</h1>
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1.5 w-4 h-4 text-slate-400" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Suchen..." 
                        className="pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-md text-sm w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
             </div>
             <button onClick={() => { setEditingDealId(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"><Plus className="w-4 h-4" /> Deal</button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-4 custom-scrollbar">
        <div className="flex gap-3 h-full min-w-max">
          {columns.filter(col => visibleStages.includes(col.id as DealStage)).map((col) => {
             const stageDeals = dealsByStage[col.id] || [];
             const columnTotal = stageDeals.reduce((sum, d) => sum + d.value, 0);

             return (
              <div key={col.id} className="w-64 flex flex-col h-full" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id as DealStage)}>
                <div className={`flex flex-col mb-2 px-3 py-2 rounded-lg bg-white border-b-2 ${col.borderColor} shadow-sm shrink-0`}>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${col.color}`} /><h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-wider truncate">{col.title}</h3></div>
                      <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold">{stageDeals.length}</span>
                  </div>
                  <div className="text-right text-[10px] font-bold text-slate-400 mt-0.5">
                      {columnTotal.toLocaleString('de-DE')} €
                  </div>
                </div>
                
                <div className={`flex-1 bg-slate-200/30 rounded-xl p-2 border border-slate-200/60 overflow-y-auto custom-scrollbar transition-colors ${draggedDealId ? 'bg-indigo-50 border-dashed border-indigo-200' : ''}`}>
                  <div className="flex flex-col gap-2">
                    {stageDeals.map(deal => {
                       const contact = contacts.find(c => c.id === deal.contactId);
                       const daysInStage = getDaysInStage(deal.stageEnteredDate);

                       return (
                        <div 
                            key={deal.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, deal.id)} 
                            className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer active:cursor-grabbing group relative"
                        >
                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 bg-white/90 rounded p-0.5 z-10 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setEditingDealId(deal.id); setFormData({ title: deal.title, value: deal.value.toString(), stage: deal.stage, contactId: deal.contactId, dueDate: deal.dueDate }); setIsModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-0.5"><Pencil className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteDeal(deal.id); }} className="text-slate-400 hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            
                            <div onClick={() => onNavigateToContacts('all', deal.contactId)} className="space-y-0.5">
                                <h4 className="text-[11px] font-bold text-slate-900 leading-tight truncate" title={contact?.name}>{contact?.name || 'Unbekannter Kontakt'}</h4>
                                <p className="text-[10px] text-slate-500 truncate">{contact?.company || 'Privat'}</p>
                            </div>
                            
                            <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-50">
                                <span className="text-[10px] font-bold text-indigo-600">{deal.value.toLocaleString('de-DE')} €</span>
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex items-center gap-1 ${daysInStage > 14 ? 'text-red-600' : daysInStage > 7 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    <Calendar className="w-2.5 h-2.5" /> {daysInStage}d
                                </span>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
             );
          })}
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800">{editingDealId ? 'Deal bearbeiten' : 'Neuer Deal'}</h2><button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div><label className="text-[10px] font-bold uppercase text-slate-500">Titel</label><input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="text-[10px] font-bold uppercase text-slate-500">Wert (€)</label><input required type="number" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                      <div><label className="text-[10px] font-bold uppercase text-slate-500">Fälligkeit</label><input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                    </div>
                    <div><label className="text-[10px] font-bold uppercase text-slate-500">Kontakt</label><select required value={formData.contactId} onChange={e => setFormData({...formData, contactId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">{contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company || 'Privat'})</option>)}</select></div>
                    <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Abbrechen</button><button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700">Speichern</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
