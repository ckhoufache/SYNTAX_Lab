
import { Brain, Search, RefreshCw, Send, Sparkles, FileText, Layout, Book, Shield, Zap, ChevronRight, Loader2, Bookmark, Link, X, Eye, ArrowRight, FolderOpen, Globe, Info, LogIn } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { BrainData, BackendConfig, IDataService } from '../types';
import { queryBrain } from '../services/gemini';

interface BrainViewProps {
    dataService: IDataService;
    backendConfig: BackendConfig;
    onUpdateConfig: (config: BackendConfig) => void;
}

export const BrainView: React.FC<BrainViewProps> = ({ dataService, backendConfig, onUpdateConfig }) => {
    const [brainData, setBrainData] = useState<BrainData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeSheet, setActiveSheet] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [chatQuestion, setChatQuestion] = useState('');
    const [chatAnswer, setChatAnswer] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [authRequired, setAuthRequired] = useState(false);

    useEffect(() => {
        if (backendConfig.brainFileId) {
            handleSync();
        } else {
            // Wenn keine ID da ist, Daten zurücksetzen
            setBrainData(null);
        }
    }, [backendConfig.brainFileId, backendConfig.brainSource]);

    const handleSync = async () => {
        if (!backendConfig.brainFileId) return;
        setIsLoading(true);
        setAuthRequired(false);
        try {
            const data = await dataService.getBrainData(backendConfig.brainFileId);
            if (data && data.sheets) {
                setBrainData(data);
                if (data.sheets.length > 0) {
                    // Nur setzen wenn noch kein Tab aktiv oder der aktive Tab nicht mehr existiert
                    const exists = data.sheets.some(s => s.name === activeSheet);
                    if (!activeSheet || !exists) setActiveSheet(data.sheets[0].name);
                }
            }
        } catch (e: any) {
            if (e.message === "GOOGLE_AUTH_REQUIRED") {
                setAuthRequired(true);
            } else {
                console.error("Brain Sync Error", e);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePickFile = async () => {
        try {
            const electron = (window as any).require ? (window as any).require('electron') : null;
            if (!electron) return;
            
            const result = await electron.ipcRenderer.invoke('pick-brain-file');
            if (result) {
                onUpdateConfig({ 
                    ...backendConfig, 
                    brainSource: result.type, 
                    brainFileId: result.id 
                });
            }
        } catch (err) {
            console.error("Pick File Error", err);
        }
    };

    const handleGoogleAuth = async () => {
        const ok = await dataService.connectGoogle('drive', backendConfig.googleClientId);
        if (ok) handleSync();
    };

    const handleAskBrain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatQuestion.trim() || !brainData) return;
        setIsAsking(true);
        setChatAnswer('');
        try {
            const answer = await queryBrain(chatQuestion, brainData);
            setChatAnswer(answer);
        } catch (e) {
            setChatAnswer("Analyse fehlgeschlagen.");
        } finally {
            setIsAsking(false);
        }
    };

    const currentSheetData = useMemo(() => {
        const sheet = brainData?.sheets.find(s => s.name === activeSheet);
        if (!sheet) return [];
        if (!searchQuery) return sheet.data;
        const lower = searchQuery.toLowerCase();
        return sheet.data.filter(row => Object.values(row).some(val => String(val).toLowerCase().includes(lower)));
    }, [brainData, activeSheet, searchQuery]);

    const handleCardClick = (title: string) => {
        if (activeSheet.toUpperCase().includes('MASTER')) {
            const sopSheet = brainData?.sheets.find(s => s.name.toUpperCase().includes('SOP') || s.name.toUpperCase().includes('PROZESS'));
            if (sopSheet) { setActiveSheet(sopSheet.name); setSearchQuery(title); }
        }
    };

    const formatVal = (val: any) => {
        const str = String(val);
        if (str.includes('<html') || str.includes('<!DOCTYPE') || str.includes('<div')) {
            return (
                <button onClick={(e) => { e.stopPropagation(); const w = window.open('', '_blank'); w?.document.write(str); }} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 mt-2 border border-indigo-100 shadow-sm transition-all"><Eye className="w-3.5 h-3.5"/> Interaktive SOP öffnen</button>
            );
        }
        if (str.startsWith('http')) return <a href={str} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1 mt-1 font-bold"><Link className="w-3 h-3"/> Link aufrufen</a>;
        return <span className="text-slate-700 font-medium leading-relaxed">{str}</span>;
    };

    // WICHTIG: Wenn noch keine Datei gewählt wurde, Setup Screen zeigen
    if (!backendConfig.brainFileId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-white p-20 text-center">
                <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] flex items-center justify-center text-indigo-600 mb-10 shadow-inner"><Brain className="w-16 h-16" /></div>
                <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Intelligence Hub konfigurieren</h2>
                <p className="max-w-lg text-slate-500 mb-12 leading-relaxed text-lg font-medium">Wählen Sie Ihre Wissensquelle aus Ihrem Google Drive Ordner. Das CRM unterstützt sowohl <strong>.xlsx</strong> Dateien als auch <strong>.gsheet</strong> Google Sheets Shortcuts.</p>
                <button onClick={handlePickFile} className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all flex items-center gap-4">
                    <FolderOpen className="w-6 h-6"/> Datei auswählen
                </button>
            </div>
        );
    }

    if (authRequired) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full bg-white p-20 text-center">
                <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center text-amber-600 mb-8"><Globe className="w-10 h-10" /></div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Cloud-Zugriff erforderlich</h2>
                <p className="max-w-md text-slate-500 mb-10 font-medium leading-relaxed">Für den Zugriff auf Google Sheets oder Drive-Dateien muss Ihre Sitzung autorisiert werden.</p>
                <button onClick={handleGoogleAuth} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-xl">
                    <LogIn className="w-5 h-5"/> Google Verbindung herstellen
                </button>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50/50 h-screen overflow-hidden flex flex-col">
            <header className="bg-white border-b border-slate-200 px-10 py-8 flex justify-between items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-indigo-600 rounded-[1.5rem] text-white shadow-xl shadow-indigo-100"><Brain className="w-8 h-8" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">The Brain</h1>
                        <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 w-fit">
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Sync Active • {backendConfig.brainSource === 'gsheet' ? 'Google Sheet' : 'Lokale Datei'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Brain durchsuchen..." className="pl-12 pr-6 py-3.5 bg-slate-100 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-50 rounded-2xl text-sm w-96 transition-all outline-none font-bold shadow-sm" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-slate-300 hover:text-slate-500 transition-colors"><X className="w-4 h-4"/></button>}
                    </div>
                    <button onClick={handleSync} disabled={isLoading} className="p-4 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all border border-slate-200 shadow-sm bg-white" title="Neu synchronisieren"><RefreshCw className={`w-6 h-6 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} /></button>
                    <button onClick={handlePickFile} className="p-4 hover:bg-slate-50 rounded-2xl text-slate-400 transition-all border border-slate-200 shadow-sm bg-white" title="Datei wechseln"><FolderOpen className="w-6 h-6" /></button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-80 border-r border-slate-200 bg-white/50 backdrop-blur-md flex flex-col shrink-0 p-6 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-4 mb-6">Wissens-Hierarchie</p>
                    <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2">
                        {brainData?.sheets.map(sheet => {
                            const Icon = sheet.name.toUpperCase().includes('TECH') ? Zap : sheet.name.toUpperCase().includes('SOP') ? Book : Layout;
                            const isActive = activeSheet === sheet.name;
                            return (
                                <button key={sheet.name} onClick={() => { setActiveSheet(sheet.name); setSearchQuery(''); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left group ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}>
                                    <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}><Icon className="w-5 h-5 shrink-0" /></div>
                                    <div className="flex-1 min-w-0"><p className={`text-sm font-black truncate ${isActive ? 'text-white' : 'text-slate-700'}`}>{sheet.name}</p></div>
                                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar bg-slate-50/30">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 animate-pulse"><RefreshCw className="w-16 h-16 mb-4 animate-spin text-indigo-600" /><p className="font-black uppercase tracking-[0.3em] text-xs">Synchronisiere Brain-Datenbank...</p></div>
                        ) : brainData ? (
                            <div className="max-w-6xl mx-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                                    {currentSheetData.map((row, i) => {
                                        const values = Object.entries(row);
                                        const title = String(values[0]?.[1] || 'Eintrag');
                                        const isMaster = activeSheet.toUpperCase().includes('MASTER');

                                        return (
                                            <div key={i} onClick={() => handleCardClick(title)} className={`bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm transition-all group flex flex-col relative overflow-hidden ${isMaster ? 'cursor-pointer hover:border-indigo-400 hover:shadow-2xl hover:-translate-y-1' : 'hover:shadow-lg'}`}>
                                                <div className="flex justify-between items-start mb-8">
                                                    <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shadow-inner"><Bookmark className="w-6 h-6"/></div>
                                                    {isMaster && <div className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-indigo-100">Details anzeigen <ArrowRight className="w-3 h-3"/></div>}
                                                </div>
                                                <h4 className="text-xl font-black text-slate-900 mb-8 leading-tight group-hover:text-indigo-600 transition-colors">{title}</h4>
                                                <div className="space-y-6 border-t border-slate-50 pt-8">
                                                    {values.slice(1).map(([key, val], j) => (
                                                        <div key={j} className="flex flex-col gap-1.5">
                                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">{key}</span>
                                                            <div className="text-sm">{formatVal(val)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <Info className="w-12 h-12 mb-4 opacity-20"/>
                                <p className="font-black uppercase tracking-[0.2em] text-xs">Keine Daten verfügbar.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-10 pt-0 shrink-0">
                        <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12 scale-150"><Sparkles className="w-96 h-96 text-white" /></div>
                             <div className="relative z-10">
                                 {chatAnswer && (
                                     <div className="mb-10 p-10 bg-white/10 rounded-[2.5rem] border border-white/10 text-white animate-in slide-in-from-bottom-4 shadow-inner">
                                         <div className="flex items-center justify-between mb-6">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 flex items-center gap-3"><Sparkles className="w-5 h-5"/> Brain Intelligence</p>
                                            <button onClick={() => setChatAnswer('')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                                         </div>
                                         <p className="text-lg leading-relaxed font-medium text-slate-200">{chatAnswer}</p>
                                     </div>
                                 )}
                                 <form onSubmit={handleAskBrain} className="flex gap-6">
                                     <div className="flex-1 relative">
                                         <Search className="absolute left-6 top-6 w-8 h-8 text-indigo-500/50" />
                                         <input value={chatQuestion} onChange={(e) => setChatQuestion(e.target.value)} placeholder="Fragen Sie das Brain nach Prozessen..." className="w-full bg-white/10 border-white/10 focus:bg-white/15 focus:ring-4 focus:ring-indigo-500/20 px-16 py-6 rounded-[2rem] text-white text-lg outline-none transition-all placeholder:text-slate-600 font-bold" />
                                     </div>
                                     <button type="submit" disabled={isAsking || !chatQuestion.trim() || !brainData} className="bg-indigo-600 text-white px-16 py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50">
                                         {isAsking ? <Loader2 className="w-6 h-6 animate-spin"/> : <Send className="w-6 h-6"/>} {isAsking ? 'KI denkt nach...' : 'Brain fragen'}
                                     </button>
                                 </form>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
