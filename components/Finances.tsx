
import React, { useState, useMemo, useRef } from 'react';
import { Plus, X, Trash2, CheckCircle2, TrendingUp, TrendingDown, PiggyBank, Printer, Pencil, RefreshCw, Ban, Loader2, Repeat, Users, Percent, FileOutput, Upload, Paperclip, FileText, Calendar, Play, Calculator, AlertCircle, Info, ArrowRightLeft, Clock } from 'lucide-react';
import { Invoice, Contact, Expense, InvoiceConfig, Activity } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DataServiceFactory, compileInvoiceTemplate } from '../services/dataService';

interface FinancesProps {
    invoices: Invoice[];
    contacts: Contact[];
    onAddInvoice: (invoice: Invoice) => void;
    onUpdateInvoice: (invoice: Invoice) => void;
    onDeleteInvoice: (id: string) => void;
    
    expenses: Expense[];
    onAddExpense: (expense: Expense) => void;
    onUpdateExpense: (expense: Expense) => void;
    onDeleteExpense: (id: string) => void;
    invoiceConfig: InvoiceConfig;
    onAddActivity: (activity: Activity) => void;
    
    onRunRetainer: () => void;
}

export const Finances: React.FC<FinancesProps> = ({
    invoices,
    contacts,
    onAddInvoice,
    onUpdateInvoice,
    onDeleteInvoice,
    expenses,
    onAddExpense,
    onUpdateExpense,
    onDeleteExpense,
    invoiceConfig,
    onAddActivity,
    onRunRetainer
}) => {
    // TABS
    const [activeTab, setActiveTab] = useState<'income' | 'expenses' | 'commissions'>('income');
    // SUB-TAB for Commissions
    const [commissionView, setCommissionView] = useState<'history' | 'pending'>('history');

    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isCommissionBatchOpen, setIsCommissionBatchOpen] = useState(false); 
    
    // Editing States
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    
    // Printing State
    const [isPrinting, setIsPrinting] = useState<string | null>(null);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);

    // Batch Date
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const [commissionMonth, setCommissionMonth] = useState(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        contactId: '',
        description: '',
        amount: 0,
        isPaid: false,
        type: 'customer'
    });

    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        title: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: 'office',
        contactId: '',
        interval: 'one_time',
        attachment: '',
        attachmentName: ''
    });

    // --- CALCULATIONS ---
    const COMMISSION_RATE = 0.20; // 20% Hardcoded for visualization

    const incomeInvoices = useMemo(() => invoices.filter(i => i.type === 'customer' || !i.type), [invoices]);
    const commissionInvoices = useMemo(() => invoices.filter(i => i.type === 'commission'), [invoices]);
    
    const totalCommissionsPaid = useMemo(() => commissionInvoices.filter(i => i.isPaid).reduce((sum, i) => sum + i.amount, 0), [commissionInvoices]);

    // Berechne "Pending Commissions" (Alle, auch unbezahlte Kundenrechnungen, die noch nicht abgerechnet sind)
    const pendingCommissionItems = useMemo(() => {
        return incomeInvoices.filter(inv => 
            // Entfernt: inv.isPaid check. Wir wollen alle sehen, die potenziell Provision geben.
            !inv.commissionProcessed && 
            inv.salesRepId
        ).map(inv => {
            const rep = contacts.find(c => c.id === inv.salesRepId);
            return {
                sourceInvoice: inv,
                salesRepName: rep ? rep.name : 'Unbekannt',
                commissionAmount: inv.amount * COMMISSION_RATE
            };
        });
    }, [incomeInvoices, contacts]);

    // 1. Echte Einnahmen: NUR Kundenrechnungen
    const totalIncome = incomeInvoices.reduce((sum, i) => sum + i.amount, 0);

    // 2. Kombinierte Ausgaben (Manuell + Provisionsrechnungen)
    const combinedExpenses = useMemo(() => {
        // Normale Ausgaben
        const manualExpenses = expenses.map(e => ({
            ...e,
            _type: 'manual' as const,
            _status: 'paid' as const 
        }));

        // Provisionsrechnungen als Ausgaben
        const commExpenses = commissionInvoices.map(inv => ({
            id: inv.id,
            title: `Provision: ${inv.contactName} (${inv.invoiceNumber})`,
            amount: inv.amount,
            date: inv.date,
            category: 'commission' as any, 
            contactId: inv.contactId,
            contactName: inv.contactName,
            interval: 'one_time' as const,
            _type: 'commission_invoice' as const,
            _status: inv.isPaid ? 'paid' : 'due',
            _originalInvoice: inv
        }));

        return [...manualExpenses, ...commExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, commissionInvoices]);

    // Summe aller "echten" Ausgaben (Inkl. offener Provisionsrechnungen)
    const totalCombinedExpenses = combinedExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Rückstellungen für noch NICHT erstellte Provisionen (auch von unbezahlten Rechnungen)
    const totalPendingCommissions = pendingCommissionItems.reduce((sum, item) => sum + item.commissionAmount, 0);
    
    // Profit = Einnahmen - (Ausgaben + Provisionsrechnungen) - (Alle offenen Provisionen)
    const profit = totalIncome - totalCombinedExpenses - totalPendingCommissions;
    
    // Data for Charts
    const expenseData = useMemo(() => {
        const categories = combinedExpenses.reduce((acc, curr) => {
            const catName = curr.category === 'commission' ? 'Provisionen' : curr.category;
            acc[catName] = (acc[catName] || 0) + curr.amount;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(categories).map(([name, value]) => ({ name, value }));
    }, [combinedExpenses]);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#6366f1']; 

    const getIntervalLabel = (interval?: string) => {
        switch(interval) {
            case 'monthly': return 'mtl.';
            case 'quarterly': return 'alle 3 Mon.';
            case 'half_yearly': return 'alle 6 Mon.';
            case 'yearly': return 'jährl.';
            default: return '';
        }
    };

    const availableContacts = useMemo(() => {
        if (invoiceForm.type === 'commission') {
            return contacts.filter(c => c.type === 'sales');
        }
        return contacts;
    }, [contacts, invoiceForm.type]);

    // Handlers ... (Same as before)
    const handleInvoiceSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const contact = contacts.find(c => c.id === invoiceForm.contactId);
        
        if (editingInvoiceId) {
            const original = invoices.find(i => i.id === editingInvoiceId);
            if(original) {
                onUpdateInvoice({
                    ...original,
                    ...invoiceForm as Invoice,
                    contactName: contact ? contact.name : original.contactName
                });
            }
        } else {
             const newInvoice: Invoice = {
                id: crypto.randomUUID(),
                ...invoiceForm as Invoice,
                type: invoiceForm.type || 'customer', 
                invoiceNumber: invoiceForm.invoiceNumber || `${invoiceForm.type === 'commission' ? 'GUT' : 'Rechnung'}-${Date.now()}`,
                contactName: contact ? contact.name : 'Unbekannt',
            };
            onAddInvoice(newInvoice);
        }
        setIsInvoiceModalOpen(false);
    };
    
    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const contact = contacts.find(c => c.id === expenseForm.contactId);
        
        if (editingExpenseId) {
             const original = expenses.find(e => e.id === editingExpenseId);
             if (original) {
                 onUpdateExpense({
                     ...original,
                     ...expenseForm as Expense,
                     contactName: contact ? contact.name : undefined
                 });
             }
        } else {
            const newExpense: Expense = {
                id: crypto.randomUUID(),
                ...expenseForm as Expense,
                contactName: contact ? contact.name : undefined
            };
            onAddExpense(newExpense);
        }
        setIsExpenseModalOpen(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert("Die Datei ist zu groß (Max. 5MB)."); return; }
        const reader = new FileReader();
        reader.onloadend = () => { setExpenseForm(prev => ({ ...prev, attachment: reader.result as string, attachmentName: file.name })); };
        reader.readAsDataURL(file);
    };

    const removeAttachment = () => { setExpenseForm(prev => ({ ...prev, attachment: undefined, attachmentName: undefined })); if (fileInputRef.current) fileInputRef.current.value = ''; };

    const handleDownloadAttachment = (expense: Expense) => {
        if (!expense.attachment) return;
        const link = document.createElement("a");
        link.href = expense.attachment;
        link.download = expense.attachmentName || `Beleg-${expense.id}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const openInvoiceModal = (invoice?: Invoice) => {
        if (invoice) {
            setEditingInvoiceId(invoice.id);
            setInvoiceForm(invoice);
        } else {
            setEditingInvoiceId(null);
            const type = activeTab === 'commissions' ? 'commission' : 'customer';
            setInvoiceForm({ invoiceNumber: '', date: new Date().toISOString().split('T')[0], contactId: '', description: '', amount: 0, isPaid: false, type: type });
        }
        setIsInvoiceModalOpen(true);
    };

    const openExpenseModal = (expense?: Expense) => {
        if (expense) {
            setEditingExpenseId(expense.id);
            setExpenseForm(expense);
        } else {
            setEditingExpenseId(null);
            setExpenseForm({ title: '', amount: 0, date: new Date().toISOString().split('T')[0], category: 'office', contactId: '', interval: 'one_time', attachment: '', attachmentName: '' });
        }
        setIsExpenseModalOpen(true);
    };

    const handlePrintInvoice = async (invoice: Invoice) => {
        setIsPrinting(invoice.id);
        try {
            const storedConfig = localStorage.getItem('backend_config');
            const config = storedConfig ? JSON.parse(storedConfig) : { mode: 'local' };
            const service = DataServiceFactory.create(config);
            const linkedContact = contacts.find(c => c.id === invoice.contactId);
            const html = compileInvoiceTemplate(invoice, invoiceConfig, linkedContact);
            const base64Pdf = await service.generatePdf(html);
            const byteCharacters = atob(base64Pdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
        } catch (e: any) {
            console.error("Printing failed", e);
            alert("Fehler beim Generieren der PDF: " + e.message);
        } finally {
            setIsPrinting(null);
        }
    };
    
    const togglePaid = (invoice: Invoice) => {
        const isNowPaid = !invoice.isPaid;
        const paidDate = isNowPaid ? new Date().toISOString().split('T')[0] : undefined;
        onUpdateInvoice({ ...invoice, isPaid: isNowPaid, paidDate: paidDate });
    };

    // PROVISIONSLAUF LOGIK
    const handleRunCommissionBatch = async () => {
        if (!commissionMonth) return;
        setIsProcessingBatch(true);
        
        const [yearStr, monthStr] = commissionMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        try {
            const storedConfig = localStorage.getItem('backend_config');
            const config = storedConfig ? JSON.parse(storedConfig) : { mode: 'local' };
            const service = DataServiceFactory.create(config);
            
            const result = await (service as any).runCommissionBatch(year, month);
            
            if (result.createdInvoices.length > 0) {
                result.createdInvoices.forEach((inv: Invoice) => onAddInvoice(inv));
                result.updatedSourceInvoices.forEach((inv: Invoice) => onUpdateInvoice(inv));
                
                alert(`${result.createdInvoices.length} Gutschriften erstellt für ${result.updatedSourceInvoices.length} bezahlte Aufträge.`);
                setIsCommissionBatchOpen(false);
                setCommissionView('history'); 
            } else {
                alert("Keine neuen provisionierbaren Umsätze für diesen Zeitraum gefunden.");
            }

        } catch (e: any) {
            console.error(e);
            alert("Fehler beim Provisionslauf: " + e.message);
        } finally {
            setIsProcessingBatch(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-screen overflow-y-auto flex flex-col relative">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Finanzen</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Übersicht über Einnahmen, Ausgaben und Provisionen.</p>
                </div>
                <div className="flex gap-3">
                     <button onClick={onRunRetainer} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                        <RefreshCw className="w-4 h-4"/> Retainer Lauf
                    </button>
                    {activeTab === 'income' ? (
                        <button onClick={() => openInvoiceModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Rechnung erstellen
                        </button>
                    ) : activeTab === 'expenses' ? (
                        <button onClick={() => openExpenseModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Ausgabe erfassen
                        </button>
                    ) : activeTab === 'commissions' ? (
                        <div className="flex gap-2">
                            <button onClick={() => setIsCommissionBatchOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm shadow-emerald-200">
                                <Play className="w-4 h-4" /> Provisionslauf starten
                            </button>
                            <button onClick={() => openInvoiceModal()} className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Manuell
                            </button>
                        </div>
                    ) : null}
                </div>
            </header>

            <div className="p-8 pb-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                         <div className="flex justify-between items-start">
                             <div>
                                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Einnahmen (Gesamt)</p>
                                 <h3 className="text-2xl font-bold text-green-600 mt-1">{totalIncome.toLocaleString('de-DE')} €</h3>
                             </div>
                             <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                 <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                             </div>
                         </div>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                         <div className="flex justify-between items-start">
                             <div>
                                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ausgaben (Gesamt)</p>
                                 <h3 className="text-2xl font-bold text-red-600 mt-1">{totalCombinedExpenses.toLocaleString('de-DE')} €</h3>
                                 <p className="text-[10px] text-slate-400 mt-1">Inkl. Provisionsrechnungen (Fällig & Bezahlt)</p>
                             </div>
                             <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                 <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                             </div>
                         </div>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                         <div className="flex justify-between items-start">
                             <div>
                                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gewinn (Saldo)</p>
                                 <h3 className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600'}`}>{profit.toLocaleString('de-DE')} €</h3>
                                 {totalPendingCommissions > 0 && (
                                     <p className="text-[10px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                                         <AlertCircle className="w-3 h-3"/> Abzgl. {totalPendingCommissions.toLocaleString('de-DE')}€ offene Prov.
                                     </p>
                                 )}
                             </div>
                             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                 <PiggyBank className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                             </div>
                         </div>
                     </div>
                </div>

                <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 mb-6">
                    <button 
                        onClick={() => setActiveTab('income')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'income' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        Rechnungen & Einnahmen
                    </button>
                    <button 
                        onClick={() => setActiveTab('expenses')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'expenses' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        Ausgaben & Belege
                    </button>
                    <button 
                        onClick={() => setActiveTab('commissions')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'commissions' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                        Provisionen (Vertrieb)
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
                {activeTab === 'income' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Nr.</th>
                                    <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Datum</th>
                                    <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Kunde</th>
                                    <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Betrag</th>
                                    <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                                    <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {incomeInvoices.length > 0 ? incomeInvoices.map(invoice => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium dark:text-slate-200">{invoice.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{invoice.date}</td>
                                        <td className="px-6 py-4 dark:text-slate-300">{invoice.contactName}</td>
                                        <td className={`px-6 py-4 font-bold ${invoice.amount < 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>{invoice.amount.toLocaleString('de-DE')} €</td>
                                        <td className="px-6 py-4">
                                            {invoice.isCancelled ? (
                                                 <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">Storniert</span>
                                            ) : invoice.isPaid ? (
                                                <button onClick={() => togglePaid(invoice)} className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-2 py-1 rounded-full font-medium flex items-center w-fit gap-1"><CheckCircle2 className="w-3 h-3"/> Bezahlt</button>
                                            ) : (
                                                <button onClick={() => togglePaid(invoice)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">Offen</button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button 
                                                onClick={() => handlePrintInvoice(invoice)} 
                                                disabled={!!isPrinting}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" 
                                                title="Drucken / PDF"
                                            >
                                                {isPrinting === invoice.id ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600"/> : <Printer className="w-4 h-4"/>}
                                            </button>
                                            <button onClick={() => openInvoiceModal(invoice)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Bearbeiten"><Pencil className="w-4 h-4"/></button>
                                            <button onClick={() => onDeleteInvoice(invoice.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Löschen / Stornieren"><Ban className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Keine Rechnungen vorhanden.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {/* ... Expenses Tab (UPDATED) ... */}
                {activeTab === 'expenses' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Datum</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Titel</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Kategorie</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Betrag</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Status</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {combinedExpenses.length > 0 ? combinedExpenses.map((expense: any) => (
                                        <tr 
                                            key={expense.id} 
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{expense.date}</td>
                                            <td className="px-6 py-4 font-medium dark:text-slate-200">
                                                <div className="flex items-center gap-2">
                                                    {expense.title} 
                                                    {expense.attachment && <Paperclip className="w-3 h-3 text-slate-400" />}
                                                </div>
                                                {expense.contactName && <span className="text-xs text-slate-400 block">{expense.contactName}</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {expense._type === 'commission_invoice' ? (
                                                    <span className="capitalize bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded text-xs text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">Provision</span>
                                                ) : (
                                                    <span className="capitalize bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-300">{expense.category}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{expense.amount.toLocaleString('de-DE')} €</div>
                                                {expense.interval && expense.interval !== 'one_time' && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                                        <Repeat className="w-3 h-3" />
                                                        {getIntervalLabel(expense.interval)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {expense._type === 'commission_invoice' ? (
                                                    expense._status === 'paid' ? (
                                                        <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Bezahlt</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-amber-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Offen</span>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                {expense.attachment && (
                                                    <button onClick={() => handleDownloadAttachment(expense)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Beleg öffnen/herunterladen">
                                                        <Paperclip className="w-4 h-4"/>
                                                    </button>
                                                )}
                                                
                                                {/* Edit Button Logic: Open Invoice Modal for Commissions, Expense Modal for Manual */}
                                                {expense._type === 'commission_invoice' ? (
                                                    <button onClick={() => openInvoiceModal(expense._originalInvoice)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Provision verwalten"><ArrowRightLeft className="w-4 h-4"/></button>
                                                ) : (
                                                    <button onClick={() => openExpenseModal(expense)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Bearbeiten"><Pencil className="w-4 h-4"/></button>
                                                )}

                                                {/* Delete Logic */}
                                                {expense._type === 'commission_invoice' ? (
                                                    <button onClick={() => onDeleteInvoice(expense.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Gutschrift löschen"><Trash2 className="w-4 h-4"/></button>
                                                ) : (
                                                    <button onClick={() => onDeleteExpense(expense.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Löschen"><Trash2 className="w-4 h-4"/></button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Keine Ausgaben vorhanden.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center">
                            <h3 className="text-lg font-bold mb-4 dark:text-white">Ausgaben nach Kategorie</h3>
                            <div className="w-full h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                            {expenseData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'commissions' && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
                        {/* ... (Commission Content same as previous) ... */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    Provisionsabrechnung (Vertrieb)
                                </h3>
                                <p className="text-sm text-slate-500">Sammelrechnungen und laufende Provisionen.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase text-slate-400 font-bold">Ausbezahlt (Gesamt)</p>
                                <p className="text-xl font-bold text-indigo-600">{totalCommissionsPaid.toLocaleString('de-DE')} €</p>
                            </div>
                        </div>

                        {/* Commission View Toggle */}
                        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
                            <button 
                                onClick={() => setCommissionView('history')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${commissionView === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Verlauf (Rechnungen)
                            </button>
                            <button 
                                onClick={() => setCommissionView('pending')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${commissionView === 'pending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Laufende Berechnung (Live)
                                {totalPendingCommissions > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 rounded-full">{totalPendingCommissions.toLocaleString('de-DE', {maximumFractionDigits:0})}€</span>}
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            {commissionView === 'history' ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-slate-500">Abrechnung Nr.</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500">Datum</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500">Vertriebler</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500">Beschreibung</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500">Betrag</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500">Status</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500 text-right">Aktionen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {commissionInvoices.length > 0 ? commissionInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-slate-600">{inv.invoiceNumber}</td>
                                                <td className="px-6 py-4">{inv.date}</td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{inv.contactName}</td>
                                                <td className="px-6 py-4 text-slate-500 max-w-[250px]">
                                                    <div className="line-clamp-2" title={inv.description} dangerouslySetInnerHTML={{__html: inv.description}}></div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-indigo-600">{inv.amount.toLocaleString('de-DE')} €</td>
                                                <td className="px-6 py-4">
                                                    {inv.isPaid ? (
                                                        <button onClick={() => togglePaid(inv)} className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Ausbezahlt</button>
                                                    ) : (
                                                        <button onClick={() => togglePaid(inv)} className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">Offen</button>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <button onClick={() => handlePrintInvoice(inv)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100" title="Gutschrift PDF drucken"><FileOutput className="w-4 h-4"/></button>
                                                    <button onClick={() => onDeleteInvoice(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100" title="Löschen"><Trash2 className="w-4 h-4"/></button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Keine bereits erstellten Abrechnungen.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                // PENDING VIEW
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                                    <div className="bg-blue-50 p-4 rounded-lg text-blue-800 text-sm flex items-start gap-3 border border-blue-100">
                                        <Info className="w-5 h-5 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold">Live Vorschau</p>
                                            <p className="opacity-80 mt-1">Hier sehen Sie alle provisionsberechtigten Kundenrechnungen (bezahlt und unbezahlt), die beim nächsten Provisionslauf berücksichtigt werden.</p>
                                        </div>
                                    </div>
                                    
                                    <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold text-slate-500">Status</th>
                                                <th className="px-6 py-3 font-semibold text-slate-500">Ursprungs-Rechnung</th>
                                                <th className="px-6 py-3 font-semibold text-slate-500">Kunde</th>
                                                <th className="px-6 py-3 font-semibold text-slate-500">Vertriebler</th>
                                                <th className="px-6 py-3 font-semibold text-slate-500">Rechnungsbetrag</th>
                                                <th className="px-6 py-3 font-semibold text-indigo-600">Provision (20%)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pendingCommissionItems.length > 0 ? pendingCommissionItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4">
                                                        {item.sourceInvoice.isPaid ? (
                                                            <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Bezahlt</span>
                                                        ) : (
                                                            <span className="text-amber-600 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> Warten auf Zhlg.</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-slate-600">{item.sourceInvoice.invoiceNumber}</td>
                                                    <td className="px-6 py-4">{item.sourceInvoice.contactName}</td>
                                                    <td className="px-6 py-4 font-bold text-slate-800">{item.salesRepName}</td>
                                                    <td className="px-6 py-4 text-slate-600">{item.sourceInvoice.amount.toLocaleString('de-DE')} €</td>
                                                    <td className="px-6 py-4 font-bold text-indigo-600 bg-indigo-50/50">+{item.commissionAmount.toLocaleString('de-DE')} €</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Aktuell keine ausstehenden Provisionen.</td></tr>
                                            )}
                                            {pendingCommissionItems.length > 0 && (
                                                <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                                    <td colSpan={5} className="px-6 py-4 text-right text-slate-600 uppercase text-xs tracking-wider">Gesamt offen (Verbindlichkeit):</td>
                                                    <td className="px-6 py-4 text-indigo-700">{totalPendingCommissions.toLocaleString('de-DE')} €</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS REMAIN UNCHANGED (Shortened for brevity as requested by diff logic, 
                but full content included below to ensure file integrity) */}
            
            {/* COMMISSION BATCH MODAL */}
            {isCommissionBatchOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-emerald-50">
                             <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2"><Play className="w-5 h-5"/> Provisionslauf</h2>
                             <button onClick={() => setIsCommissionBatchOpen(false)}><X className="w-5 h-5 text-emerald-600 hover:text-emerald-800"/></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                Dieser Lauf erstellt Sammelgutschriften für alle Vertriebler basierend auf <strong>bezahlten Kundenrechnungen</strong> im gewählten Monat.
                            </p>
                            
                            <div className="space-y-2 mb-6">
                                <label className="text-xs font-bold uppercase text-slate-500">Abrechnungsmonat (Eingang)</label>
                                <input 
                                    type="month" 
                                    value={commissionMonth} 
                                    onChange={(e) => setCommissionMonth(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-800"
                                />
                                <p className="text-[10px] text-slate-400">Es werden nur Rechnungen berücksichtigt, die im gewählten Monat als "Bezahlt" markiert wurden.</p>
                            </div>

                            <button 
                                onClick={handleRunCommissionBatch} 
                                disabled={isProcessingBatch || !commissionMonth}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold shadow-md shadow-emerald-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                            >
                                {isProcessingBatch ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Abrechnung starten'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INVOICE MODAL */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                             <h2 className="text-lg font-bold dark:text-white">
                                {editingInvoiceId ? 'Eintrag bearbeiten' : (invoiceForm.type === 'commission' ? 'Neue Gutschrift (Vertrieb)' : 'Neue Rechnung')}
                             </h2>
                             <button onClick={() => setIsInvoiceModalOpen(false)}><X className="w-5 h-5 dark:text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Nr.</label><input value={invoiceForm.invoiceNumber} onChange={e=>setInvoiceForm({...invoiceForm, invoiceNumber:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Auto" /></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Datum</label><input type="date" value={invoiceForm.date} onChange={e=>setInvoiceForm({...invoiceForm, date:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required /></div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                                    {invoiceForm.type === 'commission' ? 'Empfänger (Vertriebler)' : 'Kunde'}
                                </label>
                                <select value={invoiceForm.contactId} onChange={e => setInvoiceForm({...invoiceForm, contactId: e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required>
                                    <option value="">Wählen...</option>
                                    {availableContacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                                </select>
                            </div>
                            <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Beschreibung</label><input value={invoiceForm.description} onChange={e=>setInvoiceForm({...invoiceForm, description:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Leistung..." required /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Betrag (Netto)</label><input type="number" step="0.01" value={invoiceForm.amount} onChange={e => setInvoiceForm({...invoiceForm, amount: parseFloat(e.target.value)})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required /></div>
                            
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" checked={invoiceForm.isPaid} onChange={e=>setInvoiceForm({...invoiceForm, isPaid:e.target.checked})} id="isPaidInv" className="w-4 h-4 text-indigo-600 rounded" />
                                <label htmlFor="isPaidInv" className="text-sm font-medium dark:text-slate-300">
                                    {invoiceForm.type === 'commission' ? 'Bereits ausbezahlt?' : 'Bereits bezahlt?'}
                                </label>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Abbrechen</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700">Speichern</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EXPENSE MODAL */}
            {isExpenseModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                             <h2 className="text-lg font-bold dark:text-white">{editingExpenseId ? 'Ausgabe bearbeiten' : 'Neue Ausgabe'}</h2>
                             <button onClick={() => setIsExpenseModalOpen(false)}><X className="w-5 h-5 dark:text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Titel</label><input value={expenseForm.title} onChange={e=>setExpenseForm({...expenseForm, title:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required /></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Betrag</label><input type="number" step="0.01" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm, amount:parseFloat(e.target.value)})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Datum</label><input type="date" value={expenseForm.date} onChange={e=>setExpenseForm({...expenseForm, date:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required /></div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Kategorie</label>
                                    <select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm, category:e.target.value as any})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                        <option value="office">Büro</option>
                                        <option value="software">Software</option>
                                        <option value="travel">Reise</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="personnel">Personal</option>
                                        <option value="other">Sonstiges</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Abrechnungs-Intervall</label>
                                <select 
                                    value={expenseForm.interval || 'one_time'} 
                                    onChange={e=>setExpenseForm({...expenseForm, interval:e.target.value as any})} 
                                    className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                >
                                    <option value="one_time">Einmalig</option>
                                    <option value="monthly">Monatlich</option>
                                    <option value="quarterly">Vierteljährlich (alle 3 Mon.)</option>
                                    <option value="half_yearly">Halbjährlich (alle 6 Mon.)</option>
                                    <option value="yearly">Jährlich</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Projekt / Kunde (Optional)</label>
                                <select value={expenseForm.contactId} onChange={e=>setExpenseForm({...expenseForm, contactId:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                    <option value="">-- Kein --</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Beleg / Rechnung (PDF/Bild)</label>
                                <div className="mt-1 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-lg p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*,application/pdf" 
                                        onChange={handleFileChange}
                                    />
                                    {expenseForm.attachment ? (
                                        <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
                                            <FileText className="w-4 h-4" />
                                            <span className="truncate max-w-[200px] font-medium">{expenseForm.attachmentName}</span>
                                            <button 
                                                type="button" 
                                                onClick={(e) => { e.stopPropagation(); removeAttachment(); }}
                                                className="p-1 hover:bg-indigo-100 rounded-full"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                            <Upload className="w-6 h-6 mb-1 opacity-50" />
                                            <span className="text-xs">Klicken zum Upload</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Abbrechen</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700">Speichern</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
