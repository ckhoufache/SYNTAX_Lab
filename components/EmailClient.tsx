
import React, { useState, useEffect } from 'react';
import { Mail, Send, RefreshCw, Star, Trash2, Reply, Search, AlertCircle, Plus, Eye, EyeOff } from 'lucide-react';
import { EmailMessage, BackendConfig } from '../types';
import { IDataService } from '../services/dataService';

interface EmailClientProps {
    dataService: IDataService;
    config: BackendConfig;
}

export const EmailClient: React.FC<EmailClientProps> = ({ dataService, config }) => {
    const [emails, setEmails] = useState<EmailMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
    const [filterUnread, setFilterUnread] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
    const [isSending, setIsSending] = useState(false);

    // Initial Load
    useEffect(() => {
        if (config.imapHost && config.imapUser) {
            fetchEmails();
        }
    }, [config, filterUnread]);

    const fetchEmails = async () => {
        if (!config.imapHost || !config.imapUser) return;
        
        setIsLoading(true);
        try {
            const imapConfig = {
                user: config.imapUser,
                password: config.imapPassword,
                host: config.imapHost,
                port: config.imapPort,
                tls: config.imapTls
            };
            const msgs = await dataService.fetchEmails(imapConfig, 30, filterUnread);
            setEmails(msgs);
        } catch (e: any) {
            console.error("Fetch Error", e);
            alert("Fehler beim Abrufen der E-Mails: " + e.message);
        } finally {
            setIsLoading(false);
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
            const smtpConfig = {
                user: config.smtpUser || config.imapUser, // Fallback to IMAP user if SMTP user empty
                password: config.smtpPassword || config.imapPassword,
                host: config.smtpHost,
                port: config.smtpPort,
                tls: config.smtpTls,
                senderName: 'CRM User' // Could be dynamic
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
            {/* Sidebar / List */}
            <div className={`w-96 bg-white border-r border-slate-200 flex flex-col ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-lg text-slate-800">Posteingang</h2>
                        <div className="flex gap-2">
                            <button onClick={fetchEmails} disabled={isLoading} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                            <button onClick={() => setIsComposeOpen(true)} className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 shadow-sm">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setFilterUnread(!filterUnread)} 
                            className={`flex-1 text-xs py-1.5 rounded-md border font-medium ${filterUnread ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                        >
                            {filterUnread ? 'Nur Ungelesene' : 'Alle E-Mails'}
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {emails.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-slate-400 text-sm">Keine E-Mails gefunden.</div>
                    )}
                    {emails.map(email => (
                        <div 
                            key={email.id} 
                            onClick={() => setSelectedEmail(email)}
                            className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedEmail?.id === email.id ? 'bg-indigo-50/50' : ''} ${!email.isRead ? 'border-l-4 border-l-indigo-500 pl-3' : 'pl-4'}`}
                        >
                            <div className="flex justify-between mb-1">
                                <span className={`text-sm truncate max-w-[70%] ${!email.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{email.from}</span>
                                <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(email.date).toLocaleDateString()}</span>
                            </div>
                            <div className={`text-sm truncate mb-1 ${!email.isRead ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{email.subject}</div>
                            <div className="text-xs text-slate-400 truncate">{email.bodyText.substring(0, 60)}...</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail View */}
            <div className={`flex-1 flex flex-col bg-slate-50 ${!selectedEmail ? 'hidden md:flex' : 'flex'}`}>
                {selectedEmail ? (
                    <>
                        <div className="bg-white border-b border-slate-200 p-6 shadow-sm shrink-0">
                            <div className="flex justify-between items-start mb-4">
                                <h1 className="text-xl font-bold text-slate-900 leading-tight">{selectedEmail.subject}</h1>
                                <button onClick={() => setSelectedEmail(null)} className="md:hidden text-slate-500">Zurück</button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                    {selectedEmail.from.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-800">{selectedEmail.from}</div>
                                    <div className="text-xs text-slate-500">An: {selectedEmail.to} • {new Date(selectedEmail.date).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm min-h-[50%]">
                                {/* Prefer HTML, fallback to Text */}
                                {selectedEmail.bodyHtml ? (
                                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }} className="prose max-w-none text-sm text-slate-800" />
                                ) : (
                                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-800">{selectedEmail.bodyText}</pre>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => { setIsComposeOpen(true); setComposeData({ to: selectedEmail.from, subject: `Re: ${selectedEmail.subject}`, body: `\n\n--- Ursprüngliche Nachricht ---\nVon: ${selectedEmail.from}\nGesendet: ${selectedEmail.date}\n\n${selectedEmail.bodyText}` }) }} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium text-sm">
                                <Reply className="w-4 h-4" /> Antworten
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Mail className="w-16 h-16 mb-4 opacity-20" />
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
