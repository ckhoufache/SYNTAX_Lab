
import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Send, RefreshCw, Trash2, Reply, ShieldCheck, Plus, Inbox, Send as SendIcon, Archive, Trash, Ban, FileText, Folder, Check, X, ChevronRight, ChevronDown } from 'lucide-react';
import { EmailMessage, BackendConfig, UserProfile } from '../types';
import { IDataService } from '../services/dataService';

interface EmailClientProps {
    dataService: IDataService;
    config: BackendConfig;
    userProfile: UserProfile | null;
}

const getFolderIcon = (path: string) => {
    const lower = path.toLowerCase();
    if (lower.includes('inbox') || lower === 'posteingang') return Inbox;
    if (lower.includes('sent') || lower.includes('gesendet')) return SendIcon;
    if (lower.includes('trash') || lower.includes('bin') || lower.includes('papierkorb') || lower.includes('gelöscht')) return Trash;
    if (lower.includes('junk') || lower.includes('spam')) return Ban;
    if (lower.includes('draft') || lower.includes('entwurf')) return FileText;
    if (lower.includes('archive') || lower.includes('archiv')) return Archive;
    return Folder;
};

export const EmailClient: React.FC<EmailClientProps> = ({ dataService, config, userProfile }) => {
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [currentFolder, setCurrentFolder] = useState('INBOX');
    const [folders, setFolders] = useState<{name: string, path: string, delimiter?: string}[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['INBOX']));
    const [foldersLoading, setFoldersLoading] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (config.imapHost && config.imapUser) {
            fetchFolders();
        }
    }, [config.imapHost, config.imapUser]);

    useEffect(() => {
        if (config.imapHost && config.imapUser) {
            fetchEmails(currentFolder);
        }
    }, [currentFolder, config.imapHost, config.imapUser]);

    const fetchFolders = async () => {
        if (!config.imapHost) return;
        setFoldersLoading(true);
        try {
            const imapConfig = { user: config.imapUser, password: config.imapPassword, host: config.imapHost, port: config.imapPort, tls: config.imapTls };
            const folderList = await dataService.getEmailFolders(imapConfig);
            // Sort: INBOX top, then others
            const sorted = folderList.sort((a, b) => {
                if (a.path.toUpperCase() === 'INBOX') return -1;
                if (b.path.toUpperCase() === 'INBOX') return 1;
                return a.path.localeCompare(b.path);
            });
            setFolders(sorted);
        } catch (e: any) {
            console.error("Folder Fetch Error", e);
        } finally {
            setFoldersLoading(false);
        }
    };

    const fetchEmails = async (boxName: string) => {
        if (!config.imapHost || !config.imapUser) return;
        setIsLoading(true);
        setSelectedEmail(null); 
        try {
            const imapConfig = { user: config.imapUser, password: config.imapPassword, host: config.imapHost, port: config.imapPort, tls: config.imapTls };
            const msgs = await dataService.fetchEmails(imapConfig, 40, false, boxName);
            setEmails(msgs);
        } catch (e: any) {
            console.error("Fetch Error", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSelect = async (email: EmailMessage) => {
        setSelectedEmail(email);
        if (!email.isRead) {
            setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: true } : e));
            try {
                const imapConfig = { user: config.imapUser, password: config.imapPassword, host: config.imapHost, port: config.imapPort, tls: config.imapTls };
                await dataService.markEmailRead(imapConfig, email.uid, currentFolder);
            } catch (e) { console.error(e); }
        }
    };

    const handleDragStart = (e: React.DragEvent, email: EmailMessage) => {
        e.dataTransfer.setData('emailUid', email.uid.toString());
        e.dataTransfer.setData('fromBox', currentFolder);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDropOnFolder = async (e: React.DragEvent, toBox: string) => {
        e.preventDefault();
        const uid = parseInt(e.dataTransfer.getData('emailUid'));
        const fromBox = e.dataTransfer.getData('fromBox');
        
        if (fromBox === toBox) return;

        setIsLoading(true);
        try {
            const imapConfig = { user: config.imapUser, password: config.imapPassword, host: config.imapHost, port: config.imapPort, tls: config.imapTls };
            await dataService.moveEmail(imapConfig, uid, fromBox, toBox);
            setEmails(prev => prev.filter(email => email.uid !== uid));
            if (selectedEmail?.uid === uid) setSelectedEmail(null);
        } catch (err: any) {
            alert("Verschieben fehlgeschlagen: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        try {
            const senderName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'SyntaxLab CRM';
            const smtpConfig = { user: config.smtpUser || config.imapUser, password: config.smtpPassword || config.imapPassword, host: config.smtpHost, port: config.smtpPort, tls: config.smtpTls, senderName };
            const success = await dataService.sendSmtpMail(smtpConfig, composeData.to, composeData.subject, composeData.body);
            if (success) { setIsComposeOpen(false); setComposeData({ to: '', subject: '', body: '' }); alert("Gesendet!"); }
        } catch (e: any) { alert("Fehler: " + e.message); } finally { setIsSending(false); }
    };

    // Robust Folder Tree Construction
    const folderTree = useMemo(() => {
        const tree: any[] = [];
        const folderMap: Record<string, any> = {};

        folders.forEach(f => {
            // Robust Delimiter Detection: Prefer server's delimiter, fallback to common ones based on path
            let delimiter = f.delimiter;
            if (!delimiter) {
                if (f.path.includes('/')) delimiter = '/';
                else if (f.path.includes('.')) delimiter = '.';
                else delimiter = '/';
            }

            // Split path
            const parts = f.path.split(delimiter).filter(Boolean);
            
            let currentPath = '';
            let currentLevel = tree;

            parts.forEach((part, idx) => {
                // Reconstruct full path for this level
                currentPath = currentPath ? `${currentPath}${delimiter}${part}` : part;
                
                // If node doesn't exist, create it
                if (!folderMap[currentPath]) {
                    const node = { 
                        name: part, 
                        path: currentPath, // This MUST match exactly what's used for fetching
                        children: [],
                        isSelectable: false // Will be set to true if this path explicitly exists in 'folders'
                    };
                    folderMap[currentPath] = node;
                    currentLevel.push(node);
                }
                
                // If this is the specific folder from the list, mark it as selectable
                if (currentPath === f.path) {
                    folderMap[currentPath].isSelectable = true;
                }

                // Go deeper
                currentLevel = folderMap[currentPath].children;
            });
        });
        return tree;
    }, [folders]);

    const renderFolder = (node: any) => {
        const Icon = getFolderIcon(node.path);
        const isSelected = currentFolder === node.path;
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedFolders.has(node.path);

        return (
            <div key={node.path} className="flex flex-col">
                <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropOnFolder(e, node.path)}
                    className={`group flex items-center gap-2 py-2 px-2 text-xs font-bold rounded-xl transition-all mx-1 ${
                        isSelected ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                    } ${!node.isSelectable ? 'opacity-70' : 'cursor-pointer'}`}
                >
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleExpand(node.path); }}
                        className={`p-1 hover:bg-slate-200 rounded transition-opacity ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    
                    <div 
                        className="flex items-center gap-2 flex-1 min-w-0" 
                        onClick={() => node.isSelectable && setCurrentFolder(node.path)}
                    >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="truncate">{node.name === 'INBOX' ? 'Posteingang' : node.name}</span>
                    </div>
                </div>
                
                {hasChildren && isExpanded && (
                    <div className="ml-4 border-l border-slate-100 pl-1">
                        {node.children.map((child: any) => renderFolder(child))}
                    </div>
                )}
            </div>
        );
    };

    if (!config.imapHost) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-slate-50 text-slate-500 p-10 text-center">
                <ShieldCheck className="w-16 h-16 mb-6 text-indigo-200"/>
                <h2 className="text-2xl font-black text-slate-800 mb-2">E-Mail Konfiguration</h2>
                <p className="max-w-md mb-8">Hinterlegen Sie Ihre Zugangsdaten in den Einstellungen.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-6">
                    <button onClick={() => setIsComposeOpen(true)} className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-1">
                        <Plus className="w-4 h-4" /> Neue Mail
                    </button>
                </div>
                <div className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                    {foldersLoading ? (
                        <div className="py-10 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse">Synchronisiere...</div>
                    ) : (
                        folderTree.length > 0 ? folderTree.map(node => renderFolder(node)) : <div className="text-center py-4 text-xs text-slate-400">Keine Ordner geladen</div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100">
                    <button onClick={fetchFolders} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2 transition-colors">
                        <RefreshCw className={`w-3 h-3 ${foldersLoading ? 'animate-spin' : ''}`}/> Aktualisieren
                    </button>
                </div>
            </div>

            <div className="w-96 bg-white border-r border-slate-100 flex flex-col shrink-0">
                <div className="px-6 py-6 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="font-black text-slate-800 truncate text-sm uppercase tracking-widest max-w-[200px]" title={currentFolder}>{currentFolder.split(/[./]/).pop()}</h2>
                    <button onClick={() => fetchEmails(currentFolder)} disabled={isLoading} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {emails.length === 0 && !isLoading && <div className="p-12 text-center text-slate-300 italic text-xs font-bold uppercase tracking-widest">Keine Nachrichten</div>}
                    {emails.map(email => (
                        <div 
                            key={email.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, email)}
                            onClick={() => handleEmailSelect(email)} 
                            className={`p-6 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-all relative ${selectedEmail?.id === email.id ? 'bg-indigo-50/20 border-l-4 border-l-indigo-600' : ''}`}
                        >
                            {!email.isRead && <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-500 rounded-full shadow-lg shadow-indigo-200"></div>}
                            <div className="flex justify-between mb-1.5">
                                <span className={`text-[11px] truncate max-w-[70%] ${!email.isRead ? 'font-black text-slate-900' : 'text-slate-500'}`}>{email.from}</span>
                                <span className="text-[9px] text-slate-400 font-bold">{new Date(email.date).toLocaleDateString()}</span>
                            </div>
                            <div className={`text-xs truncate mb-2 ${!email.isRead ? 'font-black text-slate-800' : 'text-slate-600'}`}>{email.subject}</div>
                            <div className="text-[10px] text-slate-400 truncate line-clamp-1">{email.bodyText}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
                {selectedEmail ? (
                    <>
                        <div className="bg-white border-b border-slate-200 p-10 shrink-0">
                            <div className="flex justify-between items-start mb-8">
                                <h1 className="text-2xl font-black text-slate-900 leading-tight flex-1 pr-10">{selectedEmail.subject}</h1>
                                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">{new Date(selectedEmail.date).toLocaleString()}</div>
                            </div>
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white font-black text-xl shadow-2xl shadow-indigo-200">{selectedEmail.from.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div className="text-sm font-black text-slate-800">{selectedEmail.from}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">An: {selectedEmail.to}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 shadow-sm min-h-full">
                                {selectedEmail.bodyHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }} className="prose max-w-none text-sm text-slate-800 leading-relaxed font-medium" />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed font-medium">{selectedEmail.bodyText}</pre>
                                )}
                            </div>
                        </div>
                        <div className="p-8 bg-white border-t border-slate-200 flex justify-end shrink-0">
                            <button onClick={() => { setIsComposeOpen(true); setComposeData({ to: selectedEmail.from, subject: `Re: ${selectedEmail.subject}`, body: `\n\n--- Nachricht ---\nVon: ${selectedEmail.from}\n\n${selectedEmail.bodyText}` }); }} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-3 hover:-translate-y-1 transition-transform">
                                <Reply className="w-4 h-4" /> Antworten
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Mail className="w-12 h-12 mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-[0.4em] text-[10px]">Keine E-Mail ausgewählt</p>
                    </div>
                )}
            </div>

            {isComposeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                        <div className="flex justify-between items-center px-10 py-8 border-b">
                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Neue Nachricht</h3>
                            <button onClick={() => setIsComposeOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSend} className="flex-1 flex flex-col p-10 space-y-8">
                            <input className="w-full border-b-2 border-slate-100 py-3 outline-none text-sm font-black" placeholder="Empfänger" value={composeData.to} onChange={e => setComposeData({...composeData, to: e.target.value})} required />
                            <input className="w-full border-b-2 border-slate-100 py-3 outline-none text-sm font-black" placeholder="Betreff" value={composeData.subject} onChange={e => setComposeData({...composeData, subject: e.target.value})} required />
                            <textarea className="flex-1 w-full p-6 bg-slate-50 rounded-[2rem] resize-none outline-none text-sm" placeholder="Ihre Nachricht..." value={composeData.body} onChange={e => setComposeData({...composeData, body: e.target.value})} required />
                            <div className="flex justify-end pt-4">
                                <button type="submit" disabled={isSending} className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-4">
                                    {isSending ? <RefreshCw className="w-5 h-5 animate-spin"/> : <SendIcon className="w-5 h-5"/>} Senden
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
