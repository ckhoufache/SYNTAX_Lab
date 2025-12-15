
import React, { useState, useEffect } from 'react';
import { Mail, Send, RefreshCw, Trash2, Reply, Search, AlertCircle, Plus, Inbox, Send as SendIcon, Archive, Trash, Ban, FileText, Folder, MoreHorizontal, Check, X } from 'lucide-react';
import { EmailMessage, BackendConfig, UserProfile } from '../types';
import { IDataService } from '../services/dataService';

interface EmailClientProps {
    dataService: IDataService;
    config: BackendConfig;
    userProfile: UserProfile | null;
}

// Helper to determine icon based on folder name (path)
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

// Helper to clean display name (e.g. remove "INBOX." prefix for display)
const getDisplayName = (name: string, path: string) => {
    if (name === 'INBOX') return 'Posteingang';
    return name;
};

// Check if folder is a system folder (protected from deletion)
const isSystemFolder = (path: string) => {
    const lower = path.toLowerCase();
    return lower === 'inbox' || lower.includes('inbox') && !lower.includes('.') || lower.includes('trash') || lower.includes('sent') || lower.includes('draft') || lower.includes('junk') || lower.includes('spam');
};

export const EmailClient: React.FC<EmailClientProps> = ({ dataService, config, userProfile }) => {
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [currentFolder, setCurrentFolder] = useState('INBOX');
    
    // Dynamic Folders State
    const [folders, setFolders] = useState<{name: string, path: string}[]>([{name: 'Posteingang', path: 'INBOX'}]);
    const [foldersLoading, setFoldersLoading] = useState(false);

    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
    const [isSending, setIsSending] = useState(false);

    // Folder Creation State
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Initial Load: Fetch Folders first, then Emails
    useEffect(() => {
        if (config.imapHost && config.imapUser) {
            fetchFolders();
        }
    }, [config]);

    // Fetch Emails when folder changes
    useEffect(() => {
        if (config.imapHost && config.imapUser) {
            fetchEmails(currentFolder);
        }
    }, [currentFolder, config]);

    const fetchFolders = async () => {
        setFoldersLoading(true);
        try {
            const imapConfig = {
                user: config.imapUser,
                password: config.imapPassword,
                host: config.imapHost,
                port: config.imapPort,
                tls: config.imapTls
            };
            const folderList = await dataService.getEmailFolders(imapConfig);
            // Ensure INBOX is first if possible, or just sort
            const sortedFolders = folderList.sort((a, b) => {
                if (a.path === 'INBOX') return -1;
                if (b.path === 'INBOX') return 1;
                return a.name.localeCompare(b.name);
            });
            setFolders(sortedFolders);
        } catch (e: any) {
            console.error("Folder Fetch Error", e);
            // Fallback: keep default INBOX
        } finally {
            setFoldersLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        setFoldersLoading(true);
        try {
            const imapConfig = {
                user: config.imapUser,
                password: config.imapPassword,
                host: config.imapHost,
                port: config.imapPort,
                tls: config.imapTls
            };
            const success = await dataService.createEmailFolder(imapConfig, newFolderName.trim());
            if (success) {
                setNewFolderName('');
                setIsCreatingFolder(false);
                await fetchFolders(); // Refresh list
            } else {
                alert("Ordner konnte nicht erstellt werden.");
            }
        } catch (e: any) {
            alert("Fehler: " + e.message);
        } finally {
            setFoldersLoading(false);
        }
    };

    const handleDeleteFolder = async (path: string) => {
        if (!confirm(`Ordner "${path}" und alle E-Mails darin wirklich löschen?`)) return;
        setFoldersLoading(true);
        try {
            const imapConfig = {
                user: config.imapUser,
                password: config.imapPassword,
                host: config.imapHost,
                port: config.imapPort,
                tls: config.imapTls
            };
            const success = await dataService.deleteEmailFolder(imapConfig, path);
            if (success) {
                if (currentFolder === path) setCurrentFolder('INBOX');
                await fetchFolders();
            } else {
                alert("Ordner konnte nicht gelöscht werden.");
            }
        } catch (e: any) {
            alert("Fehler: " + e.message);
        } finally {
            setFoldersLoading(false);
        }
    };

    const fetchEmails = async (boxName: string) => {
        if (!config.imapHost || !config.imapUser) return;
        
        setIsLoading(true);
        setSelectedEmail(null); 
        
        try {
            const imapConfig = {
                user: config.imapUser,
                password: config.imapPassword,
                host: config.imapHost,
                port: config.imapPort,
                tls: config.imapTls
            };
            
            const msgs = await dataService.fetchEmails(imapConfig, 30, false, boxName);
            setEmails(msgs);
        } catch (e: any) {
            console.error("Fetch Error", e);
            alert(`Fehler beim Abrufen von '${boxName}': ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailSelect = async (email: EmailMessage) => {
        setSelectedEmail(email);
        
        if (!email.isRead) {
            setEmails(prev => prev.map(e => e.id === email.id ? { ...e, isRead: true } : e));
            setSelectedEmail(prev => prev ? { ...prev, isRead: true } : null);

            try {
                const imapConfig = {
                    user: config.imapUser,
                    password: config.imapPassword,
                    host: config.imapHost,
                    port: config.imapPort,
                    tls: config.imapTls
                };
                await dataService.markEmailRead(imapConfig, email.uid, currentFolder);
            } catch (e) {
                console.error("Failed to mark as read on server", e);
            }
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config.smtpHost) {
            alert("Bitte SMTP Einstellungen in den Settings konfigurieren.");
            return;
        }

        setIsSending(true);
        try {
            // Determine Sender Name: Combine First and Last Name if available
            const senderName = userProfile 
                ? `${userProfile.firstName} ${userProfile.lastName}`.trim() 
                : 'CRM User';

            const smtpConfig = {
                user: config.smtpUser || config.imapUser, 
                password: config.smtpPassword || config.imapPassword,
                host: config.smtpHost,
                port: config.smtpPort,
                tls: config.smtpTls,
                senderName: senderName || 'CRM User' // Fallback
            };
            
            const success = await dataService.sendSmtpMail(smtpConfig, composeData.to, composeData.subject, composeData.body);
            if (success) {
                alert("E-Mail gesendet!");
                setIsComposeOpen(false);
                setComposeData({ to: '', subject: '', body: '' });
            }
        } catch (e: any) {
            alert("Senden fehlgeschlagen: " + e.message);
        } finally {
            setIsSending(false);
        }
    };

    if (!config.imapHost) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
                <AlertCircle className="w-12 h-12 mb-4 opacity-50"/>
                <h2 className="text-xl font-bold mb-2">Postfach nicht konfiguriert</h2>
                <p>Bitte geben Sie IMAP/SMTP Daten in den Einstellungen an.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            
            {/* 1. Sidebar (Dynamic Folders) - 200px */}
            <div className="w-56 bg-slate-100 border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4">
                    <button onClick={() => setIsComposeOpen(true)} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 shadow-sm flex items-center justify-center gap-2 font-medium text-sm transition-colors">
                        <Plus className="w-4 h-4" /> Neue E-Mail
                    </button>
                </div>
                
                <div className="flex-1 px-2 space-y-1 overflow-y-auto">
                    {foldersLoading && <div className="text-xs text-center text-slate-400 py-4">Lade Ordner...</div>}
                    
                    {folders.map(folder => {
                        const Icon = getFolderIcon(folder.path);
                        const displayName = getDisplayName(folder.name, folder.path);
                        // Simple indentation visual logic based on path delimiter if present (assuming '.' or '/')
                        const depth = Math.max(0, folder.path.split(/[./]/).length - 1);
                        
                        return (
                            <div key={folder.path} className="group relative">
                                <button
                                    onClick={() => setCurrentFolder(folder.path)}
                                    style={{ paddingLeft: `${(depth * 12) + 12}px` }} // Indent nested folders
                                    className={`w-full flex items-center gap-3 py-2 text-sm font-medium rounded-lg transition-colors text-left ${
                                        currentFolder === folder.path 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                                    }`}
                                    title={folder.path}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 ${currentFolder === folder.path ? 'text-indigo-600' : 'text-slate-400'}`} />
                                    <span className="truncate flex-1">{displayName}</span>
                                </button>
                                {/* Delete Button for custom folders */}
                                {!isSystemFolder(folder.path) && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.path); }}
                                        className="absolute right-2 top-2 p-0.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Ordner löschen"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {/* Create Folder Section */}
                <div className="p-4 border-t border-slate-200">
                    {!isCreatingFolder ? (
                        <div className="flex justify-between items-center">
                            <button onClick={() => fetchFolders()} className="text-xs flex items-center gap-2 text-slate-500 hover:text-indigo-600">
                                <RefreshCw className={`w-3 h-3 ${foldersLoading ? 'animate-spin' : ''}`}/> Ordner aktualisieren
                            </button>
                            <button onClick={() => setIsCreatingFolder(true)} className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-200" title="Ordner erstellen">
                                <Plus className="w-4 h-4"/>
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white p-2 rounded-lg border border-slate-300 shadow-sm animate-in slide-in-from-bottom-2">
                            <input 
                                autoFocus
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Ordnername..."
                                className="w-full text-xs p-1 mb-2 border-b border-slate-200 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsCreatingFolder(false)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><X className="w-3 h-3"/></button>
                                <button onClick={handleCreateFolder} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Check className="w-3 h-3"/></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. E-Mail List - 350px */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 truncate" title={currentFolder}>
                        {folders.find(f => f.path === currentFolder)?.name || currentFolder}
                    </h2>
                    <button onClick={() => fetchEmails(currentFolder)} disabled={isLoading} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {emails.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-slate-400 text-xs">Ordner ist leer.</div>
                    )}
                    {emails.map(email => (
                        <div 
                            key={email.id} 
                            onClick={() => handleEmailSelect(email)}
                            className={`p-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors relative ${selectedEmail?.id === email.id ? 'bg-indigo-50/50' : ''}`}
                        >
                            {!email.isRead && <div className="absolute left-1 top-4 w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}
                            
                            <div className={`flex justify-between mb-1 pl-2`}>
                                <span className={`text-sm truncate max-w-[70%] ${!email.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{email.from}</span>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(email.date).toLocaleDateString()}</span>
                            </div>
                            <div className={`text-xs pl-2 truncate mb-1 ${!email.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{email.subject}</div>
                            <div className="text-[10px] pl-2 text-slate-400 truncate">{email.bodyText.substring(0, 50)}...</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Detail View - Rest */}
            <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">
                {selectedEmail ? (
                    <>
                        <div className="bg-white border-b border-slate-200 p-6 shadow-sm shrink-0">
                            <div className="flex justify-between items-start mb-4">
                                <h1 className="text-xl font-bold text-slate-900 leading-tight">{selectedEmail.subject}</h1>
                                <div className="text-xs text-slate-400">{new Date(selectedEmail.date).toLocaleString('de-DE')}</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                    {selectedEmail.from.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800">{selectedEmail.from}</div>
                                    <div className="text-xs text-slate-500">An: {selectedEmail.to}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm min-h-[50%]">
                                {selectedEmail.bodyHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }} className="prose max-w-none text-sm text-slate-800" />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{selectedEmail.bodyText}</pre>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button onClick={() => { setIsComposeOpen(true); setComposeData({ to: selectedEmail.from, subject: `Re: ${selectedEmail.subject}`, body: `\n\n--- Ursprüngliche Nachricht ---\nVon: ${selectedEmail.from}\nGesendet: ${selectedEmail.date}\n\n${selectedEmail.bodyText}` }) }} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm transition-colors">
                                <Reply className="w-4 h-4" /> Antworten
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Mail className="w-16 h-16 mb-4 opacity-10" />
                        <p>Wählen Sie eine E-Mail aus.</p>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
                    <div className="bg-white w-full max-w-2xl h-full sm:h-auto sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">Neue Nachricht</h3>
                            <button onClick={() => setIsComposeOpen(false)}><span className="text-slate-400 hover:text-slate-600">✕</span></button>
                        </div>
                        <form onSubmit={handleSend} className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto">
                            <input 
                                className="w-full border-b border-slate-200 py-2 outline-none text-sm font-medium placeholder:text-slate-400"
                                placeholder="An: empfaenger@beispiel.de"
                                value={composeData.to}
                                onChange={e => setComposeData({...composeData, to: e.target.value})}
                                required
                            />
                            <input 
                                className="w-full border-b border-slate-200 py-2 outline-none text-sm font-bold placeholder:text-slate-400"
                                placeholder="Betreff"
                                value={composeData.subject}
                                onChange={e => setComposeData({...composeData, subject: e.target.value})}
                                required
                            />
                            <textarea 
                                className="flex-1 w-full resize-none outline-none text-sm text-slate-700 min-h-[300px]"
                                placeholder="Ihre Nachricht..."
                                value={composeData.body}
                                onChange={e => setComposeData({...composeData, body: e.target.value})}
                                required
                            />
                            <div className="flex justify-end pt-4">
                                <button type="submit" disabled={isSending} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                                    {isSending ? 'Sendet...' : <><Send className="w-4 h-4"/> Senden</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
