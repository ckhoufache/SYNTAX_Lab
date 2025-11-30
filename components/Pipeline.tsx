
import React, { useState, DragEvent } from 'react';
import { Deal, DealStage, Contact } from '../types';
import { Plus, MoreHorizontal, DollarSign, X, Calendar, Trash2, User, Filter, Eye, EyeOff } from 'lucide-react';

interface PipelineProps {
  deals: Deal[];
  contacts: Contact[];
  onAddDeal: (deal: Deal) => void;
  onUpdateDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
}

export const Pipeline: React.FC<PipelineProps> = ({ deals, contacts, onAddDeal, onUpdateDeal, onDeleteDeal }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  
  // Filter State: Standardmäßig alle Stages anzeigen
  const [visibleStages, setVisibleStages] = useState<DealStage[]>(Object.values(DealStage));

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    value: '',
    stage: DealStage.LEAD,
    contactId: '',
    dueDate: ''
  });

  const columns = [
    { id: DealStage.LEAD, title: 'Lead', color: 'bg-slate-500', borderColor: 'border-slate-200' },
    { id: DealStage.CONTACTED, title: 'Kontaktiert', color: 'bg-blue-500', borderColor: 'border-blue-200' },
    { id: DealStage.PROPOSAL, title: 'Angebot', color: 'bg-amber-500', borderColor: 'border-amber-200' },
    { id: DealStage.NEGOTIATION, title: 'Verhandlung', color: 'bg-purple-500', borderColor: 'border-purple-200' },
    { id: DealStage.WON, title: 'Gewonnen', color: 'bg-green-500', borderColor: 'border-green-200' },
  ];

  // Drag and Drop Logic
  const handleDragStart = (e: DragEvent<HTMLDivElement>, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetStage: DealStage) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const deal = deals.find(d => d.id === draggedDealId);
    if (deal && deal.stage !== targetStage) {
      onUpdateDeal({ ...deal, stage: targetStage });
    }
    setDraggedDealId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Stoppt Event-Bubbling
    onDeleteDeal(id);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleStageVisibility = (stage: DealStage) => {
    setVisibleStages(prev => 
      prev.includes(stage) 
        ? prev.filter(s => s !== stage) 
        : [...prev, stage]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.value || !formData.contactId) return;

    const newDeal: Deal = {
      id: Math.random().toString(36).substr(2, 9),
      title: formData.title,
      value: parseFloat(formData.value),
      stage: formData.stage,
      contactId: formData.contactId,
      dueDate: formData.dueDate || new Date().toISOString().split('T')[0]
    };

    onAddDeal(newDeal);
    setIsModalOpen(false);
    setFormData({ title: '', value: '', stage: DealStage.LEAD, contactId: '', dueDate: '' });
  };

  const getDealsForStage = (stage: DealStage) => deals.filter(d => d.stage === stage);

  return (
    <div className="flex-1 bg-slate-50 h-screen flex flex-col overflow-hidden relative">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-xl font-bold text-slate-800">Pipeline</h1>
           <p className="text-xs text-slate-500 mt-0.5">Ziehen Sie Karten, um den Status zu ändern.</p>
        </div>
        <div className="flex gap-2">
            <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
            <Plus className="w-4 h-4" />
            Deal hinzufügen
            </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-3 overflow-x-auto shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-2 border-r border-slate-200 pr-4">
            <Filter className="w-3.5 h-3.5" />
            Ansicht
        </div>
        {columns.map(col => {
            const isVisible = visibleStages.includes(col.id as DealStage);
            return (
                <button
                    key={col.id}
                    onClick={() => toggleStageVisibility(col.id as DealStage)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        isVisible 
                        ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    <span className={`w-2 h-2 rounded-full ${col.color}`}></span>
                    {col.title}
                    {isVisible ? <Eye className="w-3 h-3 ml-1 opacity-70" /> : <EyeOff className="w-3 h-3 ml-1 opacity-50" />}
                </button>
            );
        })}
        {visibleStages.length === 0 && (
            <span className="text-xs text-amber-600 font-medium ml-2 animate-pulse">
                Bitte wählen Sie mindestens eine Phase aus.
            </span>
        )}
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-max">
          {columns
            .filter(col => visibleStages.includes(col.id as DealStage))
            .map((col) => {
             const stageDeals = getDealsForStage(col.id as DealStage);
             const totalValue = stageDeals.reduce((acc, curr) => acc + curr.value, 0);

             return (
              <div 
                key={col.id} 
                className="w-80 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id as DealStage)}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-white border-b-2 ${col.borderColor} shadow-sm`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${col.color}`} />
                    <h3 className="font-semibold text-slate-700 text-sm">{col.title}</h3>
                    <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">
                      {stageDeals.length}
                    </span>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
                </div>
                
                {/* Column Drop Zone */}
                <div className={`flex-1 bg-slate-100/50 rounded-xl p-2 border border-slate-200/60 overflow-y-auto custom-scrollbar transition-colors ${draggedDealId ? 'bg-slate-100/80 border-dashed border-slate-300' : ''}`}>
                  <div className="space-y-3 min-h-[50px]">
                    {stageDeals.map(deal => {
                       const contact = contacts.find(c => c.id === deal.contactId);
                       return (
                        <div 
                          key={deal.id} 
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing group animate-in fade-in zoom-in duration-200 relative"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">
                              {contact?.company || 'N/A'}
                            </span>
                            
                            <button 
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => handleDeleteClick(e, deal.id)}
                                className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 -mt-1 -mr-1 rounded-full hover:bg-red-50 cursor-pointer"
                                title="Deal entfernen"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mb-2 leading-snug">{deal.title}</h4>
                          
                          <div className="flex items-center gap-2 text-slate-500 text-xs mb-3">
                             <Calendar className="w-3 h-3" />
                             <span>{deal.dueDate}</span>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                             <div className="flex items-center text-slate-700 font-bold text-sm">
                                <DollarSign className="w-3 h-3 text-slate-400 mr-0.5" />
                                {deal.value.toLocaleString('de-DE')}
                             </div>
                             {contact && (
                               <div className="flex items-center gap-1.5" title={contact.name}>
                                 <img src={contact.avatar} className="w-6 h-6 rounded-full ring-2 ring-white object-cover" alt="Contact" />
                               </div>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column Footer Summary */}
                <div className="mt-3 px-2 flex justify-between items-center">
                   <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden mr-4">
                      <div className={`h-full ${col.color} opacity-50`} style={{ width: '40%' }}></div>
                   </div>
                   <span className="text-xs font-bold text-slate-600">{totalValue.toLocaleString('de-DE')} €</span>
                </div>
              </div>
             );
          })}
        </div>
      </div>

       {/* Add Deal Modal Overlay */}
       {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">Neuen Deal anlegen</h2>
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Bezeichnung</label>
                        <input 
                            required
                            name="title"
                            value={formData.title}
                            onChange={handleFormChange}
                            type="text" 
                            placeholder="z.B. Jahreslizenz 2024" 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Wert (€)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input 
                                    required
                                    name="value"
                                    value={formData.value}
                                    onChange={handleFormChange}
                                    type="number" 
                                    placeholder="0.00" 
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Fälligkeit</label>
                            <input 
                                required
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleFormChange}
                                type="date" 
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Kontakt</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <select
                                    required
                                    name="contactId"
                                    value={formData.contactId}
                                    onChange={handleFormChange}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none bg-white"
                                >
                                    <option value="">Wählen...</option>
                                    {contacts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.company})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase">Status</label>
                            <select
                                required
                                name="stage"
                                value={formData.stage}
                                onChange={handleFormChange}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                            >
                                {Object.values(DealStage).map((stage) => (
                                    <option key={stage} value={stage}>{stage}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
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
                            Deal speichern
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
