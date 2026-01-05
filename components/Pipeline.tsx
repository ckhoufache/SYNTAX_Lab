
import React, { useState, DragEvent, useMemo } from 'react';
import { Deal, DealStage, Contact, ProductPreset, Task, Invoice, Activity, InvoiceConfig, EmailTemplate } from '../types';
import { Plus, X, Calendar, Trash2, Pencil, Search, Linkedin, History, MessageSquare, Send, Clock, Target, Info, Package, DollarSign, CheckCircle2 } from 'lucide-react';

interface PipelineProps {
  deals: Deal[];
  contacts: Contact[];
  activities: Activity[];
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
  onDeleteActivity: (id: string) => void;
  onNavigateToContacts: (filter: 'all' | 'recent', focusId?: string) => void;
  invoiceConfig: InvoiceConfig | null;
  emailTemplates: EmailTemplate[];
}

export const Pipeline: React.FC<PipelineProps> = ({ 
  deals, 
  contacts, 
  activities,
  onAddDeal, 
  onUpdateDeal, 
  onDeleteDeal,
  onUpdateContact,
  onAddActivity,
  onDeleteActivity,
  visibleStages,
  setVisibleStages,
  productPresets,
  onAddInvoice,
  focusedDealId,
  onNavigateToContacts,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', value: '', stage: DealStage.LEAD, contactId: '', dueDate: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for Preset Selection Modal
  const [presetDeal, setPresetDeal] = useState<{id: string, stage: DealStage} | null>(null);
  
  // State for Won Action Modal
  const [wonDeal, setWonDeal] = useState<Deal | null>(null);

  // State for Activity Drawer
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  const columns = [
    { id: DealStage.LEAD, title: 'Lead', color: 'bg-slate-500', borderColor: 'border-slate-200' },
    { id: DealStage.CONNECTED, title: 'Vernetzt', color: 'bg-indigo-400', borderColor: 'border-indigo-100' },
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

  // Activity Logic for Drawer
  const selectedDeal = useMemo(() => deals.find(d => d.id === selectedDealId), [deals, selectedDealId]);
  const selectedContact = useMemo(() => 
    selectedDeal ? contacts.find(c => c.id === selectedDeal.contactId) : null, 
    [contacts, selectedDeal]
  );
  
  const dealActivities = useMemo(() => {
    if (!selectedContact) return [];
    return activities
        .filter(a => a.contactId === selectedContact.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities, selectedContact]);

  const handleDragStart = (e: React.DragEvent, id: string) => { 
    setDraggedDealId(id); 
    e.dataTransfer.effectAllowed = 'move'; 
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = async (e: React.DragEvent, targetStage: DealStage) => {
    e.preventDefault();
    if (!draggedDealId) return;
    const deal = deals.find(d => d.id === draggedDealId);
    if (deal && deal.stage !== targetStage) {
        
        if (targetStage === DealStage.PROPOSAL || targetStage === DealStage.NEGOTIATION) {
            setPresetDeal({ id: deal.id, stage: targetStage });
        } else if (targetStage === DealStage.WON) {
            setWonDeal({ ...deal, stage: targetStage });
        } else {
            finalizeStageChange(deal, targetStage);
        }
    }
    setDraggedDealId(null);
  };

  const finalizeStageChange = (deal: Deal, targetStage: DealStage, updatedValue?: number) => {
    onUpdateDeal({ 
        ...deal, 
        stage: targetStage, 
        value: updatedValue !== undefined ? updatedValue : deal.value,
        stageEnteredDate: new Date().toISOString().split('T')[0] 
    });
    
    onAddActivity({
        id: crypto.randomUUID(),
        contactId: deal.contactId,
        type: 'system_deal',
        content: `Phase gewechselt zu: ${targetStage}${updatedValue !== undefined ? ` (Wert aktualisiert auf ${updatedValue}€)` : ''}`,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    });
  };

  const handleSelectPreset = (preset: ProductPreset) => {
      if (!presetDeal) return;
      const deal = deals.find(d => d.id === presetDeal.id);
      if (deal) finalizeStageChange(deal, presetDeal.stage, preset.value);
      setPresetDeal(null);
  };

  const handleWonAction = (createInvoice: boolean) => {
      if (!wonDeal) return;
      const contact = contacts.find(c => c.id === wonDeal.contactId);
      const todayDate = new Date().toISOString().split('T')[0];
      
      finalizeStageChange(wonDeal, DealStage.WON);
      
      // LOGIK FÜR VERTRAGS-SETUP (Pilot vs Standard)
      if (contact) {
          const dealTitle = wonDeal.title.toLowerCase();
          // Prüfung auf "Pilot" oder "Beta" im Titel
          const isPilot = dealTitle.includes('pilot') || dealTitle.includes('beta');
          // Standard-Fall (alles andere ist Standard)
          const contractStage = isPilot ? 'pilot' : 'standard';
          
          const updatedContact: Contact = {
              ...contact,
              type: 'customer',
              contractStartDate: todayDate, // Tag der Unterschrift
              retainerActive: true,
              retainerAmount: wonDeal.value,
              retainerInterval: 'monthly',
              retainerNextBilling: todayDate, // Tag der Rechnung = Tag der Unterschrift
              // Status basierend auf Deal-Namen
              contractStage: contractStage
          };
          
          onUpdateContact(updatedContact);

          onAddActivity({
              id: crypto.randomUUID(),
              contactId: contact.id,
              type: 'system_deal',
              content: `Vertrag gestartet (${contractStage === 'pilot' ? 'Pilot-Phase' : 'Standard'}). Abrechnungstag auf ${todayDate} gesetzt.`,
              date: todayDate,
              timestamp: new Date().toISOString()
          });
      }
      
      if (createInvoice && contact) {
          onAddInvoice({
              id: crypto.randomUUID(),
              type: 'customer',
              invoiceNumber: `RE-${Date.now()}`,
              description: `Abschluss: ${wonDeal.title}`,
              date: todayDate,
              contactId: contact.id,
              contactName: contact.name,
              amount: wonDeal.value,
              isPaid: false
          });
          
          onAddActivity({
              id: crypto.randomUUID(),
              contactId: contact.id,
              type: 'system_invoice',
              content: `Erste Rechnung automatisch erstellt für: ${wonDeal.title}`,
              date: todayDate,
              timestamp: new Date().toISOString()
          });
      }
      setWonDeal(null);
  };

  const handleAddNote = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newNote.trim() || !selectedContact) return;
      
      const activity: Activity = {
          id: crypto.randomUUID(),
          contactId: selectedContact.id,
          type: 'note',
          content: newNote.trim(),
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString()
      };
      onAddActivity(activity);
      setNewNote('');
  };

  const toggleStageVisibility = (stage: DealStage) => {
      if (visibleStages.includes(stage)) {
          if (visibleStages.length > 1) {
              setVisibleStages(visibleStages.filter(s => s !== stage));
          }
      } else {
          setVisibleStages([...visibleStages, stage]);
      }
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
             <div className="hidden lg:flex items-center gap-1 bg-slate-100 rounded-lg p-1 border border-slate-200">
                {Object.values(DealStage).map(stage => {
                    const isVisible = visibleStages.includes(stage);
                    return (
                        <button
                            key={stage}
                            onClick={() => toggleStageVisibility(stage)}
                            className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all whitespace-nowrap ${
                                isVisible 
                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {stage}
                        </button>
                    );
                })}
             </div>

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
                            onClick={() => setSelectedDealId(deal.id)}
                            className={`bg-white p-2.5 rounded-lg shadow-sm border transition-all cursor-pointer active:cursor-grabbing group relative ${selectedDealId === deal.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'}`}
                        >
                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 bg-white/90 rounded p-0.5 z-10 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedDealId(deal.id); }} className="text-slate-400 hover:text-indigo-600 p-0.5" title="Historie"><History className="w-3 h-3"/></button>
                                <button onClick={(e) => { e.stopPropagation(); setEditingDealId(deal.id); setFormData({ title: deal.title, value: deal.value.toString(), stage: deal.stage, contactId: deal.contactId, dueDate: deal.dueDate }); setIsModalOpen(true); }} className="text-slate-400 hover:text-indigo-600 p-0.5"><Pencil className="w-3 h-3" /></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteDeal(deal.id); }} className="text-slate-400 hover:text-red-500 p-0.5"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <h4 
                                        className="text-[11px] font-bold text-slate-900 leading-tight truncate" 
                                        title={contact?.name}
                                    >
                                        {contact?.name || 'Unbekannter Kontakt'}
                                    </h4>
                                    {contact?.linkedin && (
                                        <a 
                                            href={contact.linkedin} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-600 hover:text-blue-800 shrink-0 transition-colors"
                                            onClick={(e) => e.stopPropagation()}
                                            title="LinkedIn Profil öffnen"
                                        >
                                            <Linkedin className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
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

      {/* ACTIVITY DRAWER / DETAIL PANEL */}
      {selectedDeal && selectedContact && (
          <div className="absolute inset-y-0 right-0 w-96 bg-white border-l border-slate-200 shadow-2xl z-40 animate-in slide-in-from-right duration-300 flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                          {selectedContact.name.charAt(0)}
                      </div>
                      <div>
                          <h2 className="font-bold text-slate-800 leading-tight">{selectedDeal.title}</h2>
                          <p className="text-xs text-slate-500">{selectedContact.name} • {selectedContact.company}</p>
                      </div>
                  </div>
                  <button onClick={() => setSelectedDealId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                      <X className="w-5 h-5"/>
                  </button>
              </div>
              
              <div className="p-6 border-b border-slate-100 shrink-0">
                  <form onSubmit={handleAddNote} className="space-y-3">
                      <label className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-2">
                          <MessageSquare className="w-3 h-3"/> Notiz zum Deal hinzufügen
                      </label>
                      <textarea 
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        placeholder="Ergebnis der Verhandlung, Notizen..."
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
                      {dealActivities.map((activity) => (
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
                      {dealActivities.length === 0 && (
                          <div className="text-center py-10 text-slate-300">
                              <Info className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                              <p className="text-xs italic">Noch keine Aktivitäten für diesen Kontakt erfasst.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

       {/* PRESET SELECTION MODAL */}
       {presetDeal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
                   <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                       <h3 className="font-bold text-slate-800">Produkt / Angebot wählen</h3>
                       <button onClick={() => setPresetDeal(null)}><X className="w-5 h-5 text-slate-400"/></button>
                   </div>
                   <div className="p-6 space-y-3">
                       <p className="text-xs text-slate-500 mb-4">Wählen Sie ein Preset, um den Deal-Wert automatisch zu aktualisieren.</p>
                       {productPresets.map(p => (
                           <button 
                             key={p.id} 
                             onClick={() => handleSelectPreset(p)}
                             className="w-full flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-white hover:border-indigo-300 hover:shadow-md transition-all group"
                           >
                               <div className="flex items-center gap-3">
                                   <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors"><Package className="w-4 h-4 text-indigo-600"/></div>
                                   <span className="font-bold text-sm text-slate-700">{p.title}</span>
                               </div>
                               <span className="text-indigo-600 font-black text-sm">{p.value.toLocaleString('de-DE')} €</span>
                           </button>
                       ))}
                       <button onClick={() => {
                           const deal = deals.find(d => d.id === presetDeal.id);
                           if(deal) finalizeStageChange(deal, presetDeal.stage);
                           setPresetDeal(null);
                       }} className="w-full py-3 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Ohne Preisänderung fortfahren</button>
                   </div>
               </div>
           </div>
       )}

       {/* WON MODAL */}
       {wonDeal && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
               <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden p-10 text-center relative">
                   <div className="mb-6 p-4 bg-green-100 rounded-full w-20 h-20 mx-auto flex items-center justify-center animate-bounce">
                       <CheckCircle2 className="w-10 h-10 text-green-600"/>
                   </div>
                   <h2 className="text-2xl font-black text-slate-900 mb-2">Glückwunsch!</h2>
                   <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                       Der Deal <strong>{wonDeal.title}</strong> wurde gewonnen. 
                       <br/><br/>
                       <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                           Automatisch: Status auf Kunde & Rechnungszyklus auf Heute gesetzt.
                           <br/>
                           {(wonDeal.title.toLowerCase().includes('pilot') || wonDeal.title.toLowerCase().includes('beta')) ? "(Pilot-Phase erkannt)" : "(Standard-Vertrag erkannt)"}
                       </span>
                   </p>
                   
                   <div className="space-y-3">
                       <button onClick={() => handleWonAction(true)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:-translate-y-1 transition-all">
                           <DollarSign className="w-4 h-4"/> 1. Rechnung jetzt erstellen
                       </button>
                       <button onClick={() => handleWonAction(false)} className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">
                           Nur Status ändern
                       </button>
                   </div>
               </div>
           </div>
       )}

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-md overflow-hidden">
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
