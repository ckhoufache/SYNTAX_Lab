
import React, { useState, DragEvent } from 'react';
import { Deal, DealStage, Contact, ProductPreset, Task } from '../types';
import { Plus, MoreHorizontal, DollarSign, X, Calendar, Trash2, User, Filter, Eye, EyeOff, Package, Pencil, Clock, Search } from 'lucide-react';

interface PipelineProps {
  deals: Deal[];
  contacts: Contact[];
  onAddDeal: (deal: Deal) => void;
  onUpdateDeal: (deal: Deal) => void;
  onDeleteDeal: (id: string) => void;
  visibleStages: DealStage[];
  setVisibleStages: (stages: DealStage[]) => void;
  productPresets: ProductPreset[];
  onAddTask: (task: Task) => void;
  tasks: Task[];
  onAutoDeleteTask: (taskId: string) => void;
  focusedDealId: string | null;
  onClearFocus: () => void;
}

export const Pipeline: React.FC<PipelineProps> = ({ 
  deals, 
  contacts, 
  onAddDeal, 
  onUpdateDeal, 
  onDeleteDeal,
  visibleStages,
  setVisibleStages,
  productPresets,
  onAddTask,
  tasks,
  onAutoDeleteTask,
  focusedDealId,
  onClearFocus
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  
  // State für Produktwahl-Modal beim Draggen eines Ghost-Deals
  const [productSelectionDeal, setProductSelectionDeal] = useState<{ deal: Deal, targetStage: DealStage } | null>(null);

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
    { id: DealStage.FOLLOW_UP, title: 'Follow-up', color: 'bg-cyan-500', borderColor: 'border-cyan-200' },
    { id: DealStage.PROPOSAL, title: 'Angebot', color: 'bg-amber-500', borderColor: 'border-amber-200' },
    { id: DealStage.NEGOTIATION, title: 'Verhandlung', color: 'bg-purple-500', borderColor: 'border-purple-200' },
    { id: DealStage.WON, title: 'Gewonnen', color: 'bg-green-500', borderColor: 'border-green-200' },
    { id: DealStage.LOST, title: 'Verloren', color: 'bg-red-900', borderColor: 'border-red-200' },
  ];

  // Helper für "Tage im Status"
  const getDaysInStage = (dateString?: string) => {
      if (!dateString) return 0;
      const start = new Date(dateString);
      const now = new Date();
      // Reset time portion for accurate day calculation
      start.setHours(0,0,0,0);
      now.setHours(0,0,0,0);
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays;
  };

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
    if (!deal) {
        setDraggedDealId(null);
        return;
    }

    // Definiere Stages, die eine Produktwahl auslösen (Angebot, Verhandlung, Gewonnen)
    const triggerProductSelectionStages = [DealStage.PROPOSAL, DealStage.NEGOTIATION, DealStage.WON];

    // Wenn es ein Ghost-Deal ist und er in eine der relevanten Stages gezogen wird
    if (deal.isPlaceholder && triggerProductSelectionStages.includes(targetStage)) {
        setProductSelectionDeal({ deal, targetStage });
        setDraggedDealId(null);
        return;
    }

    // AUTOMATISIERUNG: Task erstellen bei Verschiebung von LEAD zu KONTAKTIERT
    if (deal.stage === DealStage.LEAD && targetStage === DealStage.CONTACTED) {
        // Datum berechnen: Heute + 3 Tage
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);
        
        const year = futureDate.getFullYear();
        const month = String(futureDate.getMonth() + 1).padStart(2, '0');
        const day = String(futureDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Kontakt Name holen für besseren Task Titel
        const contact = contacts.find(c => c.id === deal.contactId);
        const contactName = contact ? contact.name : 'Unbekannt';

        const newTask: Task = {
            id: Math.random().toString(36).substr(2, 9),
            title: `Follow-up: ${contactName}`,
            type: 'todo',
            priority: 'medium',
            dueDate: dateString,
            isAllDay: true,
            isCompleted: false,
            relatedEntityId: deal.contactId
        };
        onAddTask(newTask);
    }

    // AUTOMATISIERUNG: Task LÖSCHEN bei Verschiebung zu ANGEBOT
    if (targetStage === DealStage.PROPOSAL) {
        // Suche nach einer offenen Follow-up Aufgabe für diesen Kontakt
        const taskToDelete = tasks.find(t => 
            t.relatedEntityId === deal.contactId && 
            t.title.includes("Follow-up") && 
            !t.isCompleted
        );
        
        if (taskToDelete) {
            onAutoDeleteTask(taskToDelete.id);
        }
    }

    if (deal.stage !== targetStage) {
      const updatedDeal: Deal = { 
          ...deal, 
          stage: targetStage,
          // Aktualisiere das Datum, wann der Deal in diesen Status kam
          stageEnteredDate: new Date().toISOString().split('T')[0]
      };
      
      // Wenn Deal auf VERLOREN gezogen wird, setze das aktuelle Datum als lostDate
      if (targetStage === DealStage.LOST) {
          updatedDeal.lostDate = new Date().toISOString().split('T')[0];
      }

      onUpdateDeal(updatedDeal);
    }
    setDraggedDealId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation(); // Stoppt Event-Bubbling
    onDeleteDeal(id);
  };

  const openCreateModal = () => {
    setEditingDealId(null);
    setFormData({ title: '', value: '', stage: DealStage.LEAD, contactId: '', dueDate: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, deal: Deal) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingDealId(deal.id);
    setFormData({
        title: deal.title,
        value: deal.value.toString(),
        stage: deal.stage,
        contactId: deal.contactId,
        dueDate: deal.dueDate
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleStageVisibility = (stage: DealStage) => {
    setVisibleStages(
      visibleStages.includes(stage) 
        ? visibleStages.filter(s => s !== stage) 
        : [...visibleStages, stage]
    );
  };

  const toggleAllStages = () => {
    if (visibleStages.length === Object.values(DealStage).length) {
      setVisibleStages([]); 
    } else {
      setVisibleStages(Object.values(DealStage));
    }
  };

  const handleProductSelectForGhostDeal = (product: ProductPreset) => {
      if (!productSelectionDeal) return;

      const { deal, targetStage } = productSelectionDeal;
      const updatedDeal: Deal = {
          ...deal,
          stage: targetStage,
          title: product.title,
          value: product.value,
          isPlaceholder: false, // Deal ist nun aktiv und kein Ghost mehr
          dueDate: new Date().toISOString().split('T')[0], // Aktualisiere Datum auf "Heute"
          stageEnteredDate: new Date().toISOString().split('T')[0] // Status Datum aktualisieren
      };

      onUpdateDeal(updatedDeal);
      setProductSelectionDeal(null);
  };

  const applyProductPresetToForm = (product: ProductPreset) => {
      setFormData(prev => ({
          ...prev,
          title: product.title,
          value: product.value.toString()
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.value || !formData.contactId) return;

    if (editingDealId) {
        // Update existing deal
        const existingDeal = deals.find(d => d.id === editingDealId);
        if (existingDeal) {
            const updatedDeal: Deal = {
                ...existingDeal,
                title: formData.title,
                value: parseFloat(formData.value),
                stage: formData.stage,
                contactId: formData.contactId,
                dueDate: formData.dueDate || existingDeal.dueDate
            };
            onUpdateDeal(updatedDeal);
        }
    } else {
        // Create new deal
        const newDeal: Deal = {
            id: Math.random().toString(36).substr(2, 9),
            title: formData.title,
            value: parseFloat(formData.value),
            stage: formData.stage,
            contactId: formData.contactId,
            dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
            stageEnteredDate: new Date().toISOString().split('T')[0]
        };
        onAddDeal(newDeal);
    }

    setIsModalOpen(false);
    setFormData({ title: '', value: '', stage: DealStage.LEAD, contactId: '', dueDate: '' });
    setEditingDealId(null);
  };

  const getDealsForStage = (stage: DealStage) => {
      // Filter logic: If focusedDealId exists, ONLY show that deal
      if (focusedDealId) {
          return deals.filter(d => d.stage === stage && d.id === focusedDealId);
      }
      return deals.filter(d => d.stage === stage);
  };

  const getFocusedDealTitle = () => {
      if (!focusedDealId) return '';
      const d = deals.find(x => x.id === focusedDealId);
      return d ? d.title : 'Unbekannt';
  };

  return (
    <div className="flex-1 bg-slate-50 h-screen flex flex-col overflow-hidden relative">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
           <h1 className="text-xl font-bold text-slate-800">Pipeline</h1>
           <p className="text-xs text-slate-500 mt-0.5">Ziehen Sie Karten, um den Status zu ändern.</p>
        </div>
        <div className="flex gap-2">
            <button 
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
            <Plus className="w-4 h-4" />
            Deal hinzufügen
            </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-3 overflow-x-auto shrink-0 shadow-sm z-10">
        
        {/* Focused Filter Indicator */}
        {focusedDealId ? (
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-medium border border-indigo-200 animate-in fade-in slide-in-from-left-2 shadow-sm mr-4">
                <Search className="w-3.5 h-3.5" />
                Suchergebnis: {getFocusedDealTitle()}
                <button 
                    onClick={onClearFocus} 
                    className="hover:bg-indigo-100 rounded-full p-0.5 ml-2 transition-colors"
                    title="Alle anzeigen"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        ) : (
            <button 
                onClick={toggleAllStages}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-2 border-r border-slate-200 pr-4 hover:text-indigo-600 transition-colors"
                title="Alle ein-/ausblenden"
            >
                <Filter className="w-3.5 h-3.5" />
                Ansicht
            </button>
        )}

        {/* Stage Toggles */}
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
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-max">
          {columns
            .filter(col => visibleStages.includes(col.id as DealStage))
            .map((col) => {
             const stageDeals = getDealsForStage(col.id as DealStage);
             const totalValue = stageDeals.reduce((acc, curr) => acc + curr.value, 0);
             
             // Define which stages use the minimal card layout
             // Now includes LEAD, CONTACTED, FOLLOW_UP and LOST
             const isMinimalStage = [DealStage.LEAD, DealStage.CONTACTED, DealStage.FOLLOW_UP, DealStage.LOST].includes(col.id as DealStage);
             const isLostStage = col.id === DealStage.LOST;

             // Should we show the "Days in Stage" badge?
             const showDuration = col.id === DealStage.CONTACTED || col.id === DealStage.FOLLOW_UP;

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
                       const daysInStage = getDaysInStage(deal.stageEnteredDate);

                       // Minimal Card Rendering
                       // Used for: LOST, Placeholder Deals, OR Stages defined as minimal (Lead, Contacted, Follow-Up)
                       if (isMinimalStage || deal.isPlaceholder) {
                           return (
                               <div 
                                  key={deal.id} 
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, deal.id)}
                                  className={`rounded-lg border transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden flex items-stretch ${
                                      deal.isPlaceholder 
                                      ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-300' 
                                      : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'
                                  } ${isLostStage ? 'bg-slate-200/50 border-slate-300 opacity-70 hover:opacity-100' : ''}`}
                                >
                                    {/* Linker Teil: Inhalt */}
                                    <div className="p-2.5 flex items-center gap-2 flex-1 min-w-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-500 shrink-0 ${deal.isPlaceholder ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-200'}`}>
                                            {contact?.avatar ? (
                                                <img src={contact.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                                            ) : (
                                                <User className="w-4 h-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-700 truncate">{contact?.name || 'Unbekannt'}</p>
                                            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5" />
                                                {isLostStage ? (deal.lostDate || deal.dueDate) : deal.dueDate}
                                            </p>
                                            {deal.isPlaceholder && (
                                                <span className="inline-block mt-0.5 text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded border border-slate-200">
                                                    Lead
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rechter Teil: Große Tagesanzeige */}
                                    {showDuration && !deal.isPlaceholder && (
                                        <div className={`w-12 flex flex-col items-center justify-center border-l shrink-0 ${daysInStage > 7 ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                            <span className="text-lg font-bold leading-none">{daysInStage}</span>
                                            <span className="text-[9px] uppercase tracking-wider opacity-70">Tage</span>
                                        </div>
                                    )}
                                    
                                    {/* Actions for Minimal Card (Overlay) */}
                                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all bg-white/80 backdrop-blur-sm rounded shadow-sm">
                                        <button 
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => openEditModal(e, deal)}
                                            className="text-slate-400 hover:text-indigo-600 p-1"
                                            title="Deal bearbeiten"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => handleDeleteClick(e, deal.id)}
                                            className="text-slate-400 hover:text-red-500 p-1"
                                            title="Deal löschen"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                           )
                       }

                       // Standard Card Rendering (Proposal, Negotiation, Won)
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
                            
                            {/* Actions for Standard Card */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all -mt-1 -mr-1">
                                <button 
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => openEditModal(e, deal)}
                                    className="text-slate-300 hover:text-indigo-600 p-1 rounded-full hover:bg-indigo-50 cursor-pointer"
                                    title="Bearbeiten"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => handleDeleteClick(e, deal.id)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 cursor-pointer"
                                    title="Entfernen"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
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
                               <div className="flex items-center gap-2" title={contact.name}>
                                 <img src={contact.avatar} className="w-6 h-6 rounded-full ring-2 ring-white object-cover" alt="Contact" />
                                 <span className="text-xs font-medium text-slate-700 truncate max-w-[100px]">{contact.name}</span>
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

       {/* Product Selection Modal (Ghost Deal Transition) */}
       {productSelectionDeal && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                        <h2 className="text-lg font-bold text-slate-800">Produkt wählen</h2>
                        <p className="text-xs text-slate-500">Wählen Sie das Produkt für diesen Deal.</p>
                    </div>
                    <div className="p-6 grid gap-3 overflow-y-auto">
                        {productPresets.map(product => (
                            <button
                                key={product.id}
                                onClick={() => handleProductSelectForGhostDeal(product)}
                                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-800 group-hover:text-indigo-700">{product.title}</h3>
                                </div>
                                <span className="text-sm font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100">
                                    {product.value} €
                                </span>
                            </button>
                        ))}
                        {productPresets.length === 0 && (
                            <div className="text-center py-4">
                                <p className="text-xs text-slate-400">Keine Produkte konfiguriert.</p>
                                <p className="text-[10px] text-slate-300 mt-1">Fügen Sie Produkte in den Einstellungen hinzu.</p>
                            </div>
                        )}
                    </div>
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end shrink-0">
                        <button 
                            onClick={() => {
                                setProductSelectionDeal(null);
                            }}
                            className="text-sm text-slate-500 hover:text-slate-800 font-medium"
                        >
                            Abbrechen
                        </button>
                    </div>
               </div>
           </div>
       )}

       {/* Add/Edit Deal Modal Overlay */}
       {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">
                        {editingDealId ? 'Deal bearbeiten' : 'Neuen Deal anlegen'}
                    </h2>
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    
                    {/* Quick Select Buttons - Only show for new deals or if user wants to override */}
                    <div className="space-y-2 mb-4">
                        <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <Package className="w-3 h-3" /> Schnellauswahl
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {productPresets.map(product => (
                                <button 
                                    key={product.id}
                                    type="button"
                                    onClick={() => applyProductPresetToForm(product)}
                                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left flex justify-between items-center"
                                >
                                    <span>{product.title}</span>
                                    <span className="text-xs font-bold">{product.value} €</span>
                                </button>
                            ))}
                            {productPresets.length === 0 && (
                                <p className="text-xs text-slate-400 col-span-2">Keine Vorlagen verfügbar.</p>
                            )}
                        </div>
                    </div>

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
                            {editingDealId ? 'Änderungen speichern' : 'Deal speichern'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
