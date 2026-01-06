
import React, { useState, useMemo } from 'react';
import { 
  GitBranch, Terminal, Users, BookOpen, Wrench, 
  ArrowLeft, Search, Database, ExternalLink,
  Cpu, FileText, Shield, Hash, RefreshCw, 
  ChevronDown, ChevronRight, Eye, Edit, Copy, Plus, X, Save,
  Play, Check, CornerDownRight
} from 'lucide-react';
import { BrainProcessStep, BrainPrompt, BrainSOP, BrainPersona, BrainTool } from '../types';

interface BrainProps {
  process?: BrainProcessStep[];
  prompts?: BrainPrompt[];
  sops?: BrainSOP[];
  personas?: BrainPersona[];
  tools?: BrainTool[];
  onSync?: () => Promise<void>;
  // Optional callback for future backend implementation
  onAddItem?: (type: string, data: any) => Promise<void>;
}

// --- DUMMY TILE COMPONENT ---
const DashboardTile = ({ title, count, icon: Icon, colorClass, onClick, desc }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-start text-left bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all group h-full"
    >
        <div className={`p-3 rounded-xl ${colorClass} text-white mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800">{title}</h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{desc}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 w-full flex justify-between items-center">
            <span className="text-2xl font-black text-slate-800">{count}</span>
            <span className="text-[10px] font-bold uppercase text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                Öffnen <ExternalLink className="w-3 h-3"/>
            </span>
        </div>
    </button>
);

export const Brain: React.FC<BrainProps> = ({ 
    process = [], 
    prompts = [], 
    sops = [], 
    personas = [], 
    tools = [],
    onSync,
    onAddItem
}) => {
  const [view, setView] = useState<'dashboard' | 'process' | 'sops' | 'prompts' | 'personas' | 'tools'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Accordion State: Stores IDs of expanded items
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const toggleExpand = (id: string) => {
      const newSet = new Set(expandedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setExpandedIds(newSet);
  };

  const handleBack = () => {
      setView('dashboard');
      setSearchTerm('');
      setExpandedIds(new Set());
  };

  const jumpToSop = (sopId: string) => {
      setView('sops');
      setSearchTerm(sopId); // Filter for this SOP
      // Optional: Auto-expand logic could go here if we mapped IDs correctly
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text);
      // Could add a toast notification here
  };

  const handleAddItem = () => {
      setFormData({});
      setIsModalOpen(true);
  };

  const handleSaveItem = async () => {
      if (onAddItem) {
          await onAddItem(view, formData);
      } else {
          alert("Speicher-Funktion wird in Kürze aktiviert.");
          console.log("Saving Item:", view, formData);
      }
      setIsModalOpen(false);
  };

  // --- RENDERERS ---

  const renderProcess = () => {
      const items = process.filter(i => !searchTerm || i.title.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return (
          <div className="relative pl-6 border-l-2 border-indigo-100 space-y-10 py-4">
              {items.map((step, idx) => (
                  <div key={idx} className="relative animate-in slide-in-from-left-2 duration-500" style={{animationDelay: `${idx * 50}ms`}}>
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-500 shadow-sm z-10"></div>
                      
                      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                  <span className="font-mono text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">{step.stepId}</span>
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{step.phase}</span>
                              </div>
                              {step.linkedSop && (
                                  <button 
                                    onClick={() => jumpToSop(step.linkedSop!)}
                                    className="flex items-center gap-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                  >
                                      <BookOpen className="w-3 h-3"/>
                                      {step.linkedSop}
                                  </button>
                              )}
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
                          {step.tools && (
                              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                                  <Wrench className="w-3 h-3 text-slate-400"/>
                                  <span className="text-xs text-slate-500 font-medium">Tools: {step.tools}</span>
                              </div>
                          )}
                      </div>
                  </div>
              ))}
              {items.length === 0 && <div className="text-slate-400 text-sm italic pl-4">Keine Prozesse gefunden.</div>}
          </div>
      );
  };

  const renderSops = () => {
      // Sort by SOP ID
      const items = [...sops]
        .filter(i => !searchTerm || i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.sopId.includes(searchTerm))
        .sort((a, b) => a.sopId.localeCompare(b.sopId));

      return (
          <div className="space-y-3">
              {items.map((sop) => {
                  const isExpanded = expandedIds.has(sop.id);
                  return (
                      <div key={sop.id} className={`bg-white rounded-xl border transition-all overflow-hidden ${isExpanded ? 'border-indigo-300 shadow-md' : 'border-slate-200 hover:border-indigo-200'}`}>
                          {/* Accordion Header */}
                          <div 
                            onClick={() => toggleExpand(sop.id)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                          >
                              <div className="flex items-center gap-4 overflow-hidden">
                                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                                      <BookOpen className="w-5 h-5"/>
                                  </div>
                                  <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                          <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{sop.sopId}</span>
                                          <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider border border-emerald-100 px-1.5 py-0.5 rounded bg-emerald-50">{sop.category}</span>
                                      </div>
                                      <h4 className="font-bold text-slate-800 truncate mt-1">{sop.title}</h4>
                                  </div>
                              </div>
                              <div className="text-slate-400">
                                  {isExpanded ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                              </div>
                          </div>

                          {/* Accordion Body */}
                          {isExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                                  <div className="flex justify-end gap-2 mb-4">
                                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                                          <Eye className="w-3.5 h-3.5"/> Vorschau
                                      </button>
                                      <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                                          <Edit className="w-3.5 h-3.5"/> Bearbeiten
                                      </button>
                                  </div>
                                  
                                  <div className="prose prose-sm max-w-none bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-700">
                                      {sop.content.includes('<') 
                                        ? <div dangerouslySetInnerHTML={{__html: sop.content}}/> 
                                        : <p className="whitespace-pre-wrap">{sop.content}</p>
                                      }
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-4 text-right">Zuletzt aktualisiert: {sop.lastUpdate || 'Unbekannt'}</p>
                              </div>
                          )}
                      </div>
                  );
              })}
              {items.length === 0 && <div className="text-center py-10 text-slate-400 italic">Keine Dokumente gefunden.</div>}
          </div>
      );
  };

  const renderPrompts = () => {
      const items = prompts.filter(i => !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase()));

      return (
          <div className="space-y-3">
              {items.map((p) => {
                  const isExpanded = expandedIds.has(p.id);
                  return (
                      <div key={p.id} className={`bg-white rounded-xl border transition-all overflow-hidden ${isExpanded ? 'border-amber-300 shadow-md' : 'border-slate-200 hover:border-amber-200'}`}>
                          <div 
                            onClick={() => toggleExpand(p.id)}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-amber-50/30 transition-colors select-none"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                                      <Terminal className="w-5 h-5"/>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800">{p.name}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-mono text-slate-400">{p.promptId}</span>
                                          <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{p.tool}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <button 
                                    onClick={(e) => handleCopy(p.content, e)}
                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-all" 
                                    title="Prompt kopieren"
                                  >
                                      <Copy className="w-4 h-4"/>
                                  </button>
                                  <div className="text-slate-300">|</div>
                                  <div className="text-slate-400">
                                      {isExpanded ? <ChevronDown className="w-5 h-5"/> : <ChevronRight className="w-5 h-5"/>}
                                  </div>
                              </div>
                          </div>

                          {isExpanded && (
                              <div className="bg-slate-900 p-4 border-t border-slate-200 animate-in slide-in-from-top-1 duration-200">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-[10px] font-bold uppercase text-slate-500">System Prompt Content</span>
                                      <span className="text-[10px] text-slate-600 font-mono">Format: {p.inputFormat || 'Text'}</span>
                                  </div>
                                  <pre className="text-xs text-amber-100 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto custom-scrollbar max-h-[400px]">
                                      {p.content}
                                  </pre>
                              </div>
                          )}
                      </div>
                  );
              })}
              {items.length === 0 && <div className="text-center py-10 text-slate-400 italic">Keine Prompts gefunden.</div>}
          </div>
      );
  };

  const renderPersonas = () => {
      const items = personas.filter(i => !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase()));

      return (
          <div className="space-y-4">
              {items.map((p) => {
                  const isExpanded = expandedIds.has(p.id);
                  return (
                      <div key={p.id} className={`bg-white rounded-xl border transition-all overflow-hidden ${isExpanded ? 'border-purple-300 shadow-lg' : 'border-slate-200 hover:border-purple-200'}`}>
                          <div 
                            onClick={() => toggleExpand(p.id)}
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-purple-50/30 transition-colors select-none"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-black text-xl shrink-0 border-2 border-white shadow-sm">
                                      {p.name.charAt(0)}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 text-lg">{p.name}</h4>
                                      <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">{p.role}</p>
                                  </div>
                              </div>
                              <div className="text-slate-400">
                                  {isExpanded ? <ChevronDown className="w-6 h-6"/> : <ChevronRight className="w-6 h-6"/>}
                              </div>
                          </div>

                          {isExpanded && (
                              <div className="bg-slate-50/50 p-6 border-t border-purple-100 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
                                  <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-xl border border-slate-200 italic text-slate-600 text-sm shadow-sm relative">
                                      <span className="absolute top-2 left-2 text-4xl text-purple-100 font-serif">"</span>
                                      <p className="relative z-10 px-4">{p.summary}</p>
                                  </div>

                                  <div className="space-y-4">
                                      <div><label className="text-[10px] font-black uppercase text-slate-400">Branche</label><p className="text-sm font-bold text-slate-800">{p.industry}</p></div>
                                      <div><label className="text-[10px] font-black uppercase text-slate-400">Zielgruppe</label><p className="text-sm font-bold text-slate-800">{p.targetGroup}</p></div>
                                      <div><label className="text-[10px] font-black uppercase text-slate-400">Archetyp</label><p className="text-sm font-bold text-slate-800">{p.archetype}</p></div>
                                  </div>

                                  <div className="space-y-4">
                                      <div><label className="text-[10px] font-black uppercase text-slate-400">Kommunikations-Stil</label><p className="text-sm text-slate-700">{p.style}</p></div>
                                      <div><label className="text-[10px] font-black uppercase text-slate-400">No-Gos</label><p className="text-sm text-red-600">{p.noGo}</p></div>
                                      <div><label className="text-[10px] font-black uppercase text-slate-400">Syntax & Signatur</label><p className="text-sm text-slate-700 font-mono text-xs">{p.signature}</p></div>
                                  </div>
                              </div>
                          )}
                      </div>
                  );
              })}
              {items.length === 0 && <div className="text-center py-10 text-slate-400 italic">Keine Personas gefunden.</div>}
          </div>
      );
  };

  const renderTools = () => {
      const items = tools.filter(i => !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Add New Card */}
              <button 
                onClick={handleAddItem}
                className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all min-h-[160px] group"
              >
                  <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"/>
                  <span className="text-xs font-black uppercase tracking-widest">Neues Tool</span>
              </button>

              {items.map((t, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800">{t.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${t.status === 'Aktiv' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{t.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3 font-mono">{t.cost}</p>
                      <p className="text-sm text-slate-700 line-clamp-3">{t.purpose}</p>
                  </div>
              ))}
          </div>
      );
  };

  // --- MODAL RENDERER (Placeholder) ---
  const renderAddModal = () => {
      if (!isModalOpen) return null;
      
      const getFields = () => {
          switch(view) {
              case 'process': return (
                  <>
                    <input placeholder="Titel des Schritts" className="w-full p-2 border rounded mb-2" onChange={e => setFormData({...formData, title: e.target.value})}/>
                    <input placeholder="Phase (z.B. Management)" className="w-full p-2 border rounded mb-2" onChange={e => setFormData({...formData, phase: e.target.value})}/>
                    <textarea placeholder="Beschreibung" className="w-full p-2 border rounded mb-2" onChange={e => setFormData({...formData, description: e.target.value})}/>
                  </>
              );
              case 'sops': return (
                  <>
                    <input placeholder="SOP Titel" className="w-full p-2 border rounded mb-2" onChange={e => setFormData({...formData, title: e.target.value})}/>
                    <input placeholder="ID (z.B. SOP-01)" className="w-full p-2 border rounded mb-2" onChange={e => setFormData({...formData, sopId: e.target.value})}/>
                    <textarea placeholder="HTML Inhalt" className="w-full p-2 border rounded mb-2 h-32 font-mono text-xs" onChange={e => setFormData({...formData, content: e.target.value})}/>
                  </>
              );
              // ... add others as needed
              default: return <p className="text-sm text-slate-500">Formular für {view} wird geladen...</p>;
          }
      };

      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
                      <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Neuer Eintrag: {view}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400"/></button>
                  </div>
                  <div className="p-6">
                      {getFields()}
                      <div className="mt-4 flex justify-end">
                          <button onClick={handleSaveItem} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700">Speichern</button>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col overflow-hidden relative">
        
        {/* HEADER BAR */}
        <div className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 flex items-center justify-between z-20 shadow-sm">
            <div className="flex items-center gap-4">
                {view !== 'dashboard' && (
                    <button onClick={handleBack} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors mr-2 group">
                        <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:-translate-x-1 transition-transform"/>
                    </button>
                )}
                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                    <Cpu className="w-6 h-6"/>
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">
                        {view === 'dashboard' ? 'Brain Center' : view === 'sops' ? 'SOPs & Docs' : view.toUpperCase()}
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {view === 'dashboard' ? 'Knowledge Base' : 'Module Detail View'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {view !== 'dashboard' && (
                    <>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Suche..."
                                className="pl-9 pr-4 py-2 bg-slate-100 rounded-lg text-sm border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 w-64 transition-all outline-none"
                            />
                        </div>
                        <button 
                            onClick={handleAddItem}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-md hover:shadow-lg transition-all"
                        >
                            <Plus className="w-4 h-4"/> Neu
                        </button>
                    </>
                )}
                {onSync && (
                    <button onClick={onSync} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg hover:text-indigo-600 transition-colors" title="Daten neu laden">
                        <RefreshCw className="w-5 h-5"/>
                    </button>
                )}
            </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* DASHBOARD GRID VIEW */}
            {view === 'dashboard' && (
                <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* WELCOME BANNER */}
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Willkommen im Brain</h2>
                            <p className="text-slate-300 text-sm max-w-xl">
                                Dies ist die zentrale Datenbank für alle Geschäftsprozesse, Skripte und Zielgruppen-Informationen.
                                Wählen Sie ein Modul, um Details einzusehen.
                            </p>
                        </div>
                        <Database className="w-16 h-16 text-slate-700 opacity-50"/>
                    </div>

                    {/* MODULE GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        <DashboardTile 
                            title="Prozesse (Roadmap)" 
                            count={process.length} 
                            icon={GitBranch} 
                            colorClass="bg-blue-500" 
                            desc="Interaktive Roadmap deiner Workflows."
                            onClick={() => setView('process')}
                        />
                        <DashboardTile 
                            title="SOPs & Docs" 
                            count={sops.length} 
                            icon={BookOpen} 
                            colorClass="bg-emerald-500" 
                            desc="Anleitungen mit Vorschau & Editierfunktion."
                            onClick={() => setView('sops')}
                        />
                        <DashboardTile 
                            title="KI Prompts" 
                            count={prompts.length} 
                            icon={Terminal} 
                            colorClass="bg-amber-500" 
                            desc="System-Prompts für LLMs und Automation."
                            onClick={() => setView('prompts')}
                        />
                        <DashboardTile 
                            title="Personas" 
                            count={personas.length} 
                            icon={Users} 
                            colorClass="bg-purple-500" 
                            desc="Zielgruppen-Profile (Read-Only)."
                            onClick={() => setView('personas')}
                        />
                        <DashboardTile 
                            title="Tools & Stack" 
                            count={tools.length} 
                            icon={Wrench} 
                            colorClass="bg-slate-600" 
                            desc="Software-Stack und Kosten."
                            onClick={() => setView('tools')}
                        />
                    </div>
                </div>
            )}

            {/* DETAIL LIST VIEW */}
            {view !== 'dashboard' && (
                <div className="max-w-5xl mx-auto pb-20">
                    {view === 'process' && renderProcess()}
                    {view === 'sops' && renderSops()}
                    {view === 'prompts' && renderPrompts()}
                    {view === 'personas' && renderPersonas()}
                    {view === 'tools' && renderTools()}
                </div>
            )}

        </div>

        {renderAddModal()}
    </div>
  );
};
