
import React, { useState, DragEvent, useMemo } from 'react';
import { Deal, DealStage, Contact, ProductPreset, Task, Invoice, Activity, InvoiceConfig, EmailTemplate } from '../types';
import { Plus, X, Calendar, Trash2, Filter, Eye, EyeOff, Package, Pencil, Search } from 'lucide-react';
import { DataServiceFactory, compileInvoiceTemplate } from '../services/dataService';

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
  
  const [productSelectionDeal, setProductSelectionDeal] = useState<{ deal: Deal, targetStage: DealStage } | null>(null);

  const [formData, setFormData] = useState({ title: '', value: '', stage: DealStage.LEAD, contactId: '', dueDate: '' });

  const columns = [
    { id: DealStage.LEAD, title: 'Lead', color: 'bg-slate-500', borderColor: 'border-slate-200' },
    { id: DealStage.CONTACTED, title: 'Kontaktiert', color: 'bg-blue-500', borderColor: 'border-blue-200' },
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

  const generateNextInvoiceNumber = () => {
      const customerInvoices = invoices.filter(i => i.type === 'customer');
      if (customerInvoices.length === 0) return '2025-101';
      const maxNum = customerInvoices.reduce((max, inv) => {
          const numPart = parseInt(inv.invoiceNumber.split('-')[1]);
          return isNaN(numPart) ? max : Math.max(max, numPart);
      }, 100);
      return `2025-${maxNum + 1}`;
  };
  
  const generateNextCommissionNumber = () => {
      const commInvoices = invoices.filter(i => i.type === 'commission');
      if (commInvoices.length === 0) return 'PROV-2025-001';
      const maxNum = commInvoices.reduce((max, inv) => {
          const numPart = parseInt(inv.invoiceNumber.split('-')[2]);
          return isNaN(numPart) ? max : Math.max(max, numPart);
      }, 0);
      return `PROV-2025-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
    setDraggedDealId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, targetStage: DealStage) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const deal = deals.find(d => d.id === draggedDealId);
    if (!deal) { setDraggedDealId(null); return; }

    const triggerProductSelectionStages = [DealStage.PROPOSAL, DealStage.NEGOTIATION, DealStage.WON];
    if (deal.isPlaceholder && triggerProductSelectionStages.includes(targetStage)) {
        setProductSelectionDeal({ deal, targetStage });
        setDraggedDealId(null);
        return;
    }

    // AUTO TASK: LEAD -> CONTACTED
    if (deal.stage === DealStage.LEAD && targetStage === DealStage.CONTACTED) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);
        const dateString = futureDate.toISOString().split('T')[0];
        const contact = contacts.find(c => c.id === deal.contactId);
        const contactName = contact ? contact.name : 'Unbekannt';

        onAddTask({
            id: crypto.randomUUID(),
            title: `Follow-up: ${contactName}`,
            type: 'todo',
            priority: 'medium',
            dueDate: dateString,
            isAllDay: true,
            isCompleted: false,
            relatedEntityId: deal.contactId
        });
    }

    // AUTO DELETE TASK: -> PROPOSAL
    if (targetStage === DealStage.PROPOSAL) {
        const taskToDelete = tasks.find(t => t.relatedEntityId === deal.contactId && t.title.includes("Follow-up") && !t.isCompleted);
        if (taskToDelete) onAutoDeleteTask(taskToDelete.id);
    }

    // LOGIC FOR "WON"
    if (targetStage === DealStage.WON && deal.stage !== DealStage.WON) {
        const contact = contacts.find(c => c.id === deal.contactId);
        const contactName = contact ? `${contact.name} (${contact.company})` : 'Unbekannt';
        
        // 1. Create CUSTOMER Invoice (Full Amount)
        const newInvoice: Invoice = {
            id: crypto.randomUUID(),
            type: 'customer',
            invoiceNumber: generateNextInvoiceNumber(),
            date: new Date().toISOString().split('T')[0],
            contactId: deal.contactId,
            contactName: contactName,
            description: deal.title,
            amount: deal.value,
            isPaid: false
        };
        onAddInvoice(newInvoice);

        // 2. Check for Sales Rep & Create COMMISSION Invoice (Separate)
        if (contact && contact.salesRepId) {
             const rep = contacts.find(c => c.id === contact.salesRepId);
             if (rep) {
                 const commission = deal.value * 0.20; // 20% Provision
                 const commInvoice: Invoice = {
                     id: crypto.randomUUID(),
                     type: 'commission',
                     invoiceNumber: generateNextCommissionNumber(),
                     date: new Date().toISOString().split('T')[0],
                     contactId: rep.id, // Assigned to Sales Rep
                     contactName: rep.name,
                     description: `Provision für Auftrag ${newInvoice.invoiceNumber} (${contact.company})`,
                     amount: commission,
                     isPaid: false,
                     relatedInvoiceId: newInvoice.id // Link to original invoice
                 };
                 onAddInvoice(commInvoice);
                 
                 // Log Activity for Sales Rep
                 onAddActivity({
                    id: crypto.randomUUID(),
                    contactId: rep.id,
                    type: 'system_invoice',
                    content: `Provision ${commission.toLocaleString('de-DE')}€ für ${contact.company} vorgemerkt.`,
                    date: new Date().toISOString().split('T')[0],
                    timestamp: new Date().toISOString()
                 });
             }
        }

        // 3. Auto Welcome Email (Only for Customer)
        if (invoiceConfig && invoiceConfig.emailSettings?.welcome?.enabled && contact && contact.email) {
             const welcomeConfig = invoiceConfig.emailSettings.welcome;
             
             if (welcomeConfig.subject && welcomeConfig.body) {
                 const storedConfig = localStorage.getItem('backend_config');
                 const config = storedConfig ? JSON.parse(storedConfig) : { mode: 'local' };
                 const service = DataServiceFactory.create(config);
                 
                 const invoiceHtml = compileInvoiceTemplate(newInvoice, invoiceConfig);
                 let pdfBase64 = '';
                 
                 try {
                     pdfBase64 = await service.generatePdf(invoiceHtml);
                 } catch (e) {
                     console.error("PDF Generation failed", e);
                 }

                 const attachments = [...(welcomeConfig.attachments || [])];
                 if (pdfBase64) {
                     attachments.push({
                         name: `Rechnung_${newInvoice.invoiceNumber}.pdf`,
                         data: pdfBase64,
                         type: 'application/pdf',
                         size: 0 
                     });
                 }

                 const replacements: Record<string, string> = {
                    '{name}': contact.name || '',
                    '{firstName}': contact.name.split(' ')[0] || '',
                    '{lastName}': contact.name.split(' ').slice(1).join(' ') || '',
                    '{company}': contact.company || '',
                    '{invoiceNumber}': newInvoice.invoiceNumber,
                    '{amount}': newInvoice.amount.toLocaleString('de-DE') + ' €',
                    '{date}': new Date().toLocaleDateString('de-DE'),
                    '{myCompany}': invoiceConfig.companyName || ''
                 };

                 let body = welcomeConfig.body;
                 let subject = welcomeConfig.subject;

                 Object.entries(replacements).forEach(([key, value]) => {
                     body = body.split(key).join(value);
                     subject = subject.split(key).join(value);
                 });
                 
                 service.sendMail(contact.email, subject, body, attachments).then(success => {
                     if (success) {
                         onAddActivity({
                            id: crypto.randomUUID(),
                            contactId: contact.id,
                            type: 'email',
                            content: `Automatische Willkommens-Mail gesendet (mit Rechnung PDF)`,
                            date: new Date().toISOString().split('T')[0],
                            timestamp: new Date().toISOString()
                        });
                     } else {
                         console.error("Failed to send automatic email");
                     }
                 });
             }
        }
    }

    if (deal.stage !== targetStage) {
      const updatedDeal: Deal = { 
          ...deal, 
          stage: targetStage,
          stageEnteredDate: new Date().toISOString().split('T')[0]
      };
      if (targetStage === DealStage.LOST) updatedDeal.lostDate = new Date().toISOString().split('T')[0];
      onUpdateDeal(updatedDeal);
    }
    setDraggedDealId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation(); onDeleteDeal(id);
  };

  const openCreateModal = () => {
    setEditingDealId(null);
    setFormData({ title: '', value: '', stage: DealStage.LEAD, contactId: '', dueDate: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, deal: Deal) => {
    e.preventDefault(); e.stopPropagation();
    setEditingDealId(deal.id);
    setFormData({ title: deal.title, value: deal.value.toString(), stage: deal.stage, contactId: deal.contactId, dueDate: deal.dueDate });
    setIsModalOpen(true);
  };

  const handleProductSelectForGhostDeal = (product: ProductPreset) => {
      if (!productSelectionDeal) return;
      const { deal, targetStage } = productSelectionDeal;
      onUpdateDeal({
          ...deal, stage: targetStage, title: product.title, value: product.value, isPlaceholder: false,
          dueDate: new Date().toISOString().split('T')[0], stageEnteredDate: new Date().toISOString().split('T')[0]
      });
      setProductSelectionDeal(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.value || !formData.contactId) return;

    if (editingDealId) {
        const existingDeal = deals.find(d => d.id === editingDealId);
        if (existingDeal) onUpdateDeal({ ...existingDeal, title: formData.title, value: parseFloat(formData.value), stage: formData.stage, contactId: formData.contactId, dueDate: formData.dueDate || existingDeal.dueDate });
    } else {
        onAddDeal({
            id: crypto.randomUUID(),
            title: formData.title, value: parseFloat(formData.value), stage: formData.stage, contactId: formData.contactId,
            dueDate: formData.dueDate || new Date().toISOString().split('T')[0], stageEnteredDate: new Date().toISOString().split('T')[0]
        });
    }
    setIsModalOpen(false);
  };

  const dealsByStage = useMemo(() => {
    const acc: Record<string, Deal[]> = {};
    Object.values(DealStage).forEach(s => acc[s] = []);
    deals.forEach(d => {
        if (acc[d.stage]) acc[d.stage].push(d);
    });
    return acc;
  }, [deals]);

  const getDealsForStage = (stage: DealStage) => {
      if (focusedDealId) {
          return (dealsByStage[stage] || []).filter(d => d.id === focusedDealId);
      }
      return dealsByStage[stage] || [];
  };

  return (
    <div className="flex-1 bg-slate-50 h-screen flex flex-col overflow-hidden relative">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div><h1 className="text-xl font-bold text-slate-800">Pipeline</h1><p className="text-xs text-slate-500 mt-0.5">Ziehen Sie Karten, um den Status zu ändern. Klicken Sie auf eine Karte, um den Kontakt zu öffnen.</p></div>
        <button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 shadow-sm"><Plus className="w-4 h-4" /> Deal hinzufügen</button>
      </header>

      <div className="bg-white border-b border-slate-100 px-6 py-2 flex items-center gap-3 overflow-x-auto shrink-0 shadow-sm z-10">
        {focusedDealId ? (
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-medium border border-indigo-200 mr-4">
                <Search className="w-3.5 h-3.5" /> Suchergebnis <button onClick={onClearFocus} className="hover:bg-indigo-100 rounded-full p-0.5 ml-2"><X className="w-3.5 h-3.5" /></button>
            </div>
        ) : (
            <button onClick={() => setVisibleStages(visibleStages.length === columns.length ? [] : Object.values(DealStage))} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mr-2 border-r border-slate-200 pr-4 hover:text-indigo-600"><Filter className="w-3.5 h-3.5" /> Ansicht</button>
        )}
        {columns.map(col => {
            const isVisible = visibleStages.includes(col.id as DealStage);
            return <button key={col.id} onClick={() => setVisibleStages(isVisible ? visibleStages.filter(s => s !== col.id) : [...visibleStages, col.id as DealStage])} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${isVisible ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}><span className={`w-2 h-2 rounded-full ${col.color}`}></span>{col.title}{isVisible ? <Eye className="w-3 h-3 ml-1 opacity-70" /> : <EyeOff className="w-3 h-3 ml-1 opacity-50" />}</button>;
        })}
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full min-w-max">
          {columns.filter(col => visibleStages.includes(col.id as DealStage)).map((col) => {
             let stageDeals = getDealsForStage(col.id as DealStage);
             
             if (col.id === DealStage.LEAD) {
                 stageDeals = [...stageDeals].sort((a, b) => {
                     const dateA = a.stageEnteredDate ? new Date(a.stageEnteredDate).getTime() : 0;
                     const dateB = b.stageEnteredDate ? new Date(b.stageEnteredDate).getTime() : 0;
                     return dateA - dateB; 
                 });
             }
             
             return (
              <div key={col.id} className="w-80 flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id as DealStage)}>
                <div className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-white border-b-2 ${col.borderColor} shadow-sm`}>
                  <div className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${col.color}`} /><h3 className="font-semibold text-slate-700 text-sm">{col.title}</h3><span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">{stageDeals.length}</span></div>
                </div>
                
                <div className={`flex-1 bg-slate-100/50 rounded-xl p-2 border border-slate-200/60 overflow-y-auto custom-scrollbar transition-colors ${draggedDealId ? 'bg-slate-100/80 border-dashed border-slate-300' : ''}`}>
                  <div className="grid grid-cols-2 gap-2 content-start min-h-[50px]">
                    {stageDeals.map(deal => {
                       const contact = contacts.find(c => c.id === deal.contactId);
                       const daysInStage = getDaysInStage(deal.stageEnteredDate);

                       return (
                        <div 
                            key={deal.id} 
                            draggable 
                            onDragStart={(e) => handleDragStart(e, deal.id)} 
                            onClick={() => onNavigateToContacts('all', deal.contactId)}
                            className="bg-white p-2.5 rounded-lg shadow-sm border border-slate-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer active:cursor-grabbing group relative flex flex-col justify-between h-20"
                            title={`${deal.title} - ${contact?.name}`}
                        >
                            <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 bg-white/90 rounded shadow-sm z-10">
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => openEditModal(e, deal)} className="text-slate-400 hover:text-indigo-600 p-1"><Pencil className="w-3 h-3" /></button>
                                <button onMouseDown={(e) => e.stopPropagation()} onClick={(e) => handleDeleteClick(e, deal.id)} className="text-slate-400 hover:text-red-500 p-1"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">{contact?.name || 'Unbekannt'}</h4>
                                <p className="text-[9px] text-slate-400 truncate mt-0.5">{contact?.company}</p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-auto pt-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${daysInStage > 7 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                    {daysInStage} Tg.
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

       {productSelectionDeal && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0"><h2 className="text-lg font-bold text-slate-800">Produkt wählen</h2></div>
                    <div className="p-6 grid gap-3 overflow-y-auto">{productPresets.map(product => (<button key={product.id} onClick={() => handleProductSelectForGhostDeal(product)} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group text-left"><div><h3 className="font-bold text-slate-800 group-hover:text-indigo-700">{product.title}</h3></div><span className="text-sm font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-100">{product.value} €</span></button>))}</div>
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-end shrink-0"><button onClick={() => setProductSelectionDeal(null)} className="text-sm text-slate-500 hover:text-slate-800 font-medium">Abbrechen</button></div>
               </div>
           </div>
       )}

       {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50"><h2 className="text-lg font-bold text-slate-800">{editingDealId ? 'Deal bearbeiten' : 'Neuen Deal anlegen'}</h2><button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-2 mb-4"><label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Package className="w-3 h-3" /> Schnellauswahl</label><div className="grid grid-cols-2 gap-3">{productPresets.map(product => (<button key={product.id} type="button" onClick={() => setFormData(prev => ({ ...prev, title: product.title, value: product.value.toString() }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left flex justify-between items-center"><span>{product.title}</span><span className="text-xs font-bold">{product.value} €</span></button>))}</div></div>
                    <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Bezeichnung</label><input required name="title" value={formData.title} onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))} type="text" className="w-full px-3 py-2 border rounded-lg" /></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Wert (€)</label><input required name="value" value={formData.value} onChange={(e) => setFormData(prev => ({...prev, value: e.target.value}))} type="number" className="w-full px-3 py-2 border rounded-lg" /></div><div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Fälligkeit</label><input required name="dueDate" value={formData.dueDate} onChange={(e) => setFormData(prev => ({...prev, dueDate: e.target.value}))} type="date" className="w-full px-3 py-2 border rounded-lg" /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Kontakt</label><select required name="contactId" value={formData.contactId} onChange={(e) => setFormData(prev => ({...prev, contactId: e.target.value}))} className="w-full px-3 py-2 border rounded-lg bg-white"><option value="">Wählen...</option>{contacts.map(c => (<option key={c.id} value={c.id}>{c.name} ({c.company})</option>))}</select></div><div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase">Status</label><select required name="stage" value={formData.stage} onChange={(e) => setFormData(prev => ({...prev, stage: e.target.value as DealStage}))} className="w-full px-3 py-2 border rounded-lg bg-white">{Object.values(DealStage).map((stage) => (<option key={stage} value={stage}>{stage}</option>))}</select></div></div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Abbrechen</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">{editingDealId ? 'Änderungen speichern' : 'Deal speichern'}</button></div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};