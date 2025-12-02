
import React, { useState, useRef } from 'react';
import { Plus, X, Trash2, CheckCircle2, AlertTriangle, Info, Calendar, Download, Upload, Filter, PieChart as PieChartIcon, Clock, TrendingUp, TrendingDown, PiggyBank, Printer, Paperclip, Pencil, RefreshCw, User, Ban } from 'lucide-react';
import { Invoice, Contact, Expense, InvoiceConfig, Activity } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FinancesProps {
    invoices: Invoice[];
    contacts: Contact[];
    onAddInvoice: (invoice: Invoice) => void;
    onUpdateInvoice: (invoice: Invoice) => void;
    onDeleteInvoice: (id: string) => void;
    
    // NEU: Ausgaben & Config Props
    expenses: Expense[];
    onAddExpense: (expense: Expense) => void;
    onUpdateExpense: (expense: Expense) => void;
    onDeleteExpense: (id: string) => void;
    invoiceConfig: InvoiceConfig;
    onAddActivity: (activity: Activity) => void;
    
    // NEU: Retainer Automation
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
    const [activeTab, setActiveTab] = useState<'income' | 'expenses'>('income');

    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const expenseFileRef = useRef<HTMLInputElement>(null);
    
    // Filter State
    const [filter, setFilter] = useState<'all' | 'paid' | 'open' | 'cancelled'>('all');

    // Forms
    const [invoiceForm, setInvoiceForm] = useState<{
        invoiceNumber: string; date: string; contactId: string; amount: string; sentDate: string; isPaid: boolean; paidDate: string; description: string;
    }>({ invoiceNumber: '', date: new Date().toISOString().split('T')[0], contactId: '', amount: '', sentDate: '', isPaid: false, paidDate: '', description: '' });

    const [expenseForm, setExpenseForm] = useState<{
        title: string; amount: string; date: string; category: Expense['category']; notes: string; attachment?: string; attachmentName?: string; contactId: string;
    }>({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'office', notes: '', attachment: '', attachmentName: '', contactId: '' });

    // --- FINANCIAL CALCULATIONS ---
    const LIMIT = 22000;
    // Exclude cancelled invoices from Revenue calculation
    // Include credit notes (negative amounts) to balance out
    const validInvoices = invoices.filter(inv => !inv.isCancelled);
    const totalRevenue = validInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalExpenses = expenses.reduce((sum, ex) => sum + ex.amount, 0);
    const profit = totalRevenue - totalExpenses;
    const taxReserve = Math.max(0, profit * 0.30); // 30% Steuerrücklage

    // Ampel-Status (Kleinunternehmer)
    const percentage = Math.min((totalRevenue / LIMIT) * 100, 100);
    let statusColor = 'bg-green-500';
    let statusText = 'Kleinunternehmer i.O.';
    if (totalRevenue > 18000) { statusColor = 'bg-yellow-500'; statusText = 'Limit nähert sich'; }
    if (totalRevenue >= LIMIT) { statusColor = 'bg-red-500'; statusText = 'USt-Pflichtig!'; }

    // --- PIE CHART DATA ---
    const pieData = [
        { name: 'Einnahmen', value: Math.max(0, totalRevenue), color: '#10b981' }, // emerald-500
        { name: 'Ausgaben', value: totalExpenses, color: '#ef4444' }, // red-500
    ];

    // Filter leere Werte raus, damit das Diagramm nicht komisch aussieht wenn alles 0 ist
    const activePieData = pieData.filter(d => d.value > 0);

    // --- CHART INTERACTION ---
    const handlePieClick = (data: any) => {
        if (data.name === 'Einnahmen') setActiveTab('income');
        if (data.name === 'Ausgaben') setActiveTab('expenses');
    };

    // --- INVOICE HANDLERS ---
    const generateNextInvoiceNumber = () => {
        if (invoices.length === 0) return '2025-101';
        const maxNum = invoices.reduce((max, inv) => {
            const numPart = parseInt(inv.invoiceNumber.split('-')[1]);
            return isNaN(numPart) ? max : Math.max(max, numPart);
        }, 100);
        return `2025-${maxNum + 1}`;
    };

    const handleOpenCreateInvoice = () => {
        setEditingInvoiceId(null);
        setInvoiceForm({ invoiceNumber: generateNextInvoiceNumber(), date: new Date().toISOString().split('T')[0], contactId: '', amount: '', sentDate: '', isPaid: false, paidDate: '', description: '' });
        setIsInvoiceModalOpen(true);
    };

    const handleOpenEditInvoice = (invoice: Invoice) => {
        if (invoice.isCancelled) return; // Cannot edit cancelled
        if (invoice.amount < 0) return; // Cannot edit Storno (simplify)
        setEditingInvoiceId(invoice.id);
        setInvoiceForm({
            invoiceNumber: invoice.invoiceNumber, date: invoice.date, contactId: invoice.contactId, amount: invoice.amount.toString(),
            sentDate: invoice.sentDate || '', isPaid: invoice.isPaid, paidDate: invoice.paidDate || '', description: invoice.description || ''
        });
        setIsInvoiceModalOpen(true);
    };

    const handleSubmitInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceForm.amount || !invoiceForm.contactId) return;
        const selectedContact = contacts.find(c => c.id === invoiceForm.contactId);
        const contactName = selectedContact ? `${selectedContact.name} (${selectedContact.company})` : 'Unbekannt';

        const invoiceData: Invoice = {
            id: editingInvoiceId || Math.random().toString(36).substr(2, 9),
            invoiceNumber: invoiceForm.invoiceNumber,
            date: invoiceForm.date,
            contactId: invoiceForm.contactId,
            contactName: contactName,
            description: invoiceForm.description,
            amount: parseFloat(invoiceForm.amount),
            sentDate: invoiceForm.sentDate || undefined,
            isPaid: invoiceForm.isPaid,
            paidDate: invoiceForm.isPaid ? (invoiceForm.paidDate || invoiceForm.date) : undefined
        };
        editingInvoiceId ? onUpdateInvoice(invoiceData) : onAddInvoice(invoiceData);
        setIsInvoiceModalOpen(false);
    };

    const togglePaidStatus = (e: React.MouseEvent, invoice: Invoice) => {
        e.stopPropagation();
        if (invoice.isCancelled) return;
        onUpdateInvoice({ ...invoice, isPaid: !invoice.isPaid, paidDate: !invoice.isPaid ? new Date().toISOString().split('T')[0] : undefined });
    };

    // --- EXPENSE HANDLERS ---
    const handleOpenCreateExpense = () => {
        setEditingExpenseId(null);
        setExpenseForm({ title: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'office', notes: '', attachment: '', attachmentName: '', contactId: '' });
        setIsExpenseModalOpen(true);
    };

    const handleOpenEditExpense = (ex: Expense) => {
        setEditingExpenseId(ex.id);
        setExpenseForm({ title: ex.title, amount: ex.amount.toString(), date: ex.date, category: ex.category, notes: ex.notes || '', attachment: ex.attachment || '', attachmentName: ex.attachmentName || '', contactId: ex.contactId || '' });
        setIsExpenseModalOpen(true);
    };

    const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) { // Limit 2MB
            alert("Der Beleg darf maximal 2MB groß sein (Browser-Limit).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setExpenseForm(prev => ({ 
                ...prev, 
                attachment: event.target?.result as string,
                attachmentName: file.name
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmitExpense = (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.title || !expenseForm.amount) return;
        
        const selectedContact = contacts.find(c => c.id === expenseForm.contactId);
        
        const expenseData: Expense = {
            id: editingExpenseId || Math.random().toString(36).substr(2, 9),
            title: expenseForm.title,
            amount: parseFloat(expenseForm.amount),
            date: expenseForm.date,
            category: expenseForm.category,
            notes: expenseForm.notes,
            attachment: expenseForm.attachment,
            attachmentName: expenseForm.attachmentName,
            contactId: expenseForm.contactId || undefined,
            contactName: selectedContact ? selectedContact.name : undefined
        };
        editingExpenseId ? onUpdateExpense(expenseData) : onAddExpense(expenseData);
        setIsExpenseModalOpen(false);
    };

    const viewAttachment = (ex: Expense) => {
        if (!ex.attachment) return;
        // Open Base64 in new tab
        const win = window.open();
        if (win) {
            win.document.write(`<iframe src="${ex.attachment}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
    };

    // --- PRINT ---
    const handleDirectDownload = (e: React.MouseEvent, invoice: Invoice) => {
        e.stopPropagation();
        setPrintInvoice(invoice);
        // Wait for state update then trigger print logic
        setTimeout(() => executePrint(true), 100);
    };

    const executePrint = (autoPrint = false) => {
        // We use the hidden preview logic but just for this action
        if (!printInvoice && !autoPrint) return; 
        
        // Temporarily render content hidden to grab HTML
        setPrintInvoice(prev => prev || printInvoice); 
        setIsPrintModalOpen(true);
    };

    // Use effect to auto print once modal opens if triggered by download button
    React.useEffect(() => {
        if (isPrintModalOpen && printInvoice) {
            // Optional: Auto trigger print dialog if desired flow, 
            // but opening the modal with the big button is often better UX.
            // keeping it as modal preview to ensure user sees what they download.
        }
    }, [isPrintModalOpen, printInvoice]);


    const triggerBrowserPrint = () => {
        const content = document.getElementById('printable-invoice');
        if (!content) return;
        
        const pri = window.open('', '', 'height=800,width=800');
        if (pri) {
            pri.document.write('<html><head><title>Rechnung</title>');
            pri.document.write('<script src="https://cdn.tailwindcss.com"></script>'); 
            pri.document.write('</head><body >');
            pri.document.write(content.innerHTML);
            pri.document.write('</body></html>');
            pri.document.close();
            pri.focus();
            setTimeout(() => { pri.print(); pri.close(); }, 500); 
        }
    };

    // --- CALCULATE TAXES FOR PRINTING ---
    const getInvoiceCalculations = (inv: Invoice) => {
        const isStandardTax = invoiceConfig.taxRule === 'standard';
        // Annahme: Der erfasste Betrag ist Netto
        const netAmount = inv.amount;
        const taxRate = isStandardTax ? 0.19 : 0;
        const taxAmount = netAmount * taxRate;
        const grossAmount = netAmount + taxAmount;
        
        return { netAmount, taxAmount, grossAmount, isStandardTax };
    };

    // --- RENDER HELPERS ---
    const filteredInvoices = invoices.filter(inv => {
        if (filter === 'paid') return inv.isPaid && !inv.isCancelled;
        if (filter === 'open') return !inv.isPaid && !inv.isCancelled;
        if (filter === 'cancelled') return inv.isCancelled;
        return true;
    });

    const categoryLabel = {
        office: 'Büro', software: 'Software', travel: 'Reise', marketing: 'Marketing', personnel: 'Personal', other: 'Sonstiges'
    };

    return (
        <div className="flex-1 bg-slate-50 h-screen overflow-y-auto flex flex-col relative">
            <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Finanzen</h1>
                    <p className="text-slate-500 text-sm mt-1">Einnahmen, Ausgaben & Profitabilität</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                         onClick={onRunRetainer}
                         className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
                         title="Prüft auf fällige Retainer-Verträge und erstellt automatisch Rechnungen."
                    >
                         <RefreshCw className="w-4 h-4" /> Retainer-Lauf starten
                    </button>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('income')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'income' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >Einnahmen</button>
                        <button 
                            onClick={() => setActiveTab('expenses')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'expenses' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >Ausgaben</button>
                    </div>
                </div>
            </header>

            <main className="p-8 space-y-8 pb-20">
                {/* FINANCIAL OVERVIEW WIDGETS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Revenue */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Einnahmen</p>
                                <h3 className="text-2xl font-bold text-slate-900">{totalRevenue.toLocaleString('de-DE')} €</h3>
                            </div>
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
                        </div>
                        <div className="mt-3 text-xs flex justify-between items-center">
                            <span className={`${statusColor} text-white px-2 py-0.5 rounded-full`}>{statusText}</span>
                            <span className="text-slate-400">{percentage.toFixed(0)}% von 22k</span>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Ausgaben</p>
                                <h3 className="text-2xl font-bold text-slate-900">{totalExpenses.toLocaleString('de-DE')} €</h3>
                            </div>
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><TrendingDown className="w-5 h-5"/></div>
                        </div>
                         <p className="text-xs text-slate-400 mt-3">{expenses.length} Einträge verbucht</p>
                    </div>

                    {/* Profit */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Gewinn (Vor Steuer)</p>
                                <h3 className={`text-2xl font-bold ${profit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                                    {profit.toLocaleString('de-DE')} €
                                </h3>
                            </div>
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><PieChartIcon className="w-5 h-5"/></div>
                        </div>
                         <p className="text-xs text-slate-400 mt-3">Marge: {totalRevenue ? ((profit/totalRevenue)*100).toFixed(1) : 0}%</p>
                    </div>

                     {/* Tax Reserve */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">Steuerrücklage (~30%)</p>
                                <h3 className="text-2xl font-bold text-slate-700">{taxReserve.toLocaleString('de-DE')} €</h3>
                            </div>
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><PiggyBank className="w-5 h-5"/></div>
                        </div>
                         <p className="text-xs text-slate-400 mt-3">Empfohlene Rückstellung</p>
                    </div>
                </div>

                {/* PIE CHART (Verhältnis Einnahmen vs Ausgaben) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Verhältnis Einnahmen / Ausgaben</h3>
                    <div className="flex-1 w-full min-h-0">
                        {activePieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                                    <Pie
                                        data={activePieData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                        onClick={handlePieClick}
                                        cursor="pointer"
                                    >
                                        {activePieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => [`${value.toLocaleString('de-DE')} €`, '']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                             <div className="h-full flex items-center justify-center text-slate-400">
                                 Keine Finanzdaten vorhanden
                             </div>
                        )}
                    </div>
                </div>

                {activeTab === 'income' ? (
                    // --- INCOME VIEW ---
                    <>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                                <button onClick={() => setFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600'}`}>Alle</button>
                                <button onClick={() => setFilter('paid')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'paid' ? 'bg-green-600 text-white' : 'bg-white border text-slate-600'}`}>Bezahlt</button>
                                <button onClick={() => setFilter('open')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'open' ? 'bg-amber-500 text-white' : 'bg-white border text-slate-600'}`}>Offen</button>
                                <button onClick={() => setFilter('cancelled')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === 'cancelled' ? 'bg-slate-200 text-slate-600' : 'bg-white border text-slate-600'}`}>Storniert</button>
                            </div>
                            <button onClick={handleOpenCreateInvoice} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
                                <Plus className="w-4 h-4" /> Rechnung erstellen
                            </button>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Nr.</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Datum</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Kunde / Beschreibung</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Betrag (Netto)</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredInvoices.map(inv => {
                                        const isCancelled = inv.isCancelled;
                                        const isStorno = inv.amount < 0;
                                        
                                        return (
                                        <tr 
                                            key={inv.id} 
                                            className={`hover:bg-slate-50 group cursor-pointer ${isCancelled ? 'bg-slate-50/50' : ''}`}
                                            onClick={() => {
                                                setPrintInvoice(inv);
                                                setIsPrintModalOpen(true);
                                            }}
                                        >
                                            <td className={`px-6 py-4 text-sm font-medium text-slate-900 ${isCancelled ? 'line-through text-slate-400' : ''}`}>{inv.invoiceNumber}</td>
                                            <td className={`px-6 py-4 text-sm text-slate-700 ${isCancelled ? 'text-slate-400' : ''}`}>{inv.date}</td>
                                            <td className={`px-6 py-4 text-sm text-slate-700 ${isCancelled ? 'text-slate-400' : ''}`}>
                                                <div className="font-medium">{inv.contactName}</div>
                                                <div className="text-xs text-slate-500">{inv.description || "Keine Beschreibung"}</div>
                                            </td>
                                            <td className={`px-6 py-4 text-sm font-bold ${isStorno ? 'text-slate-800' : isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                {inv.amount.toLocaleString('de-DE')} €
                                            </td>
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                {isCancelled ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                                        <Ban className="w-3.5 h-3.5" /> Storniert
                                                    </span>
                                                ) : isStorno ? (
                                                     <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Gutschrift
                                                    </span>
                                                ) : (
                                                    <button onClick={(e) => togglePaidStatus(e, inv)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${inv.isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                                                        {inv.isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300"></div>}
                                                        {inv.isPaid ? 'Bezahlt' : 'Offen'}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleDirectDownload(e, inv)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Als PDF speichern"><Download className="w-4 h-4"/></button>
                                                    {!isCancelled && !isStorno && (
                                                        <>
                                                            <button onClick={() => handleOpenEditInvoice(inv)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Bearbeiten"><Pencil className="w-4 h-4"/></button>
                                                            <button onClick={() => onDeleteInvoice(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Stornieren"><Trash2 className="w-4 h-4"/></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    // --- EXPENSES VIEW ---
                    <>
                        <div className="flex justify-end items-center">
                            <button onClick={handleOpenCreateExpense} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm">
                                <Plus className="w-4 h-4" /> Ausgabe erfassen
                            </button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                             <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Datum</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Bezeichnung</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Kategorie</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Betrag</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {expenses.map(ex => (
                                        <tr key={ex.id} className="hover:bg-slate-50 group">
                                            <td className="px-6 py-4 text-sm text-slate-700">{ex.date}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    {ex.title}
                                                    {ex.attachment && (
                                                        <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                                                    )}
                                                </div>
                                                {ex.contactName && <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><User className="w-3 h-3"/> {ex.contactName}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{categoryLabel[ex.category]}</span></td>
                                            <td className="px-6 py-4 text-sm font-bold text-red-600">-{ex.amount.toLocaleString('de-DE')} €</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100">
                                                    {ex.attachment && (
                                                        <button onClick={() => viewAttachment(ex)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Beleg ansehen">
                                                            <Paperclip className="w-4 h-4"/>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenEditExpense(ex)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Info className="w-4 h-4"/></button>
                                                    <button onClick={() => onDeleteExpense(ex.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {expenses.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-8 text-slate-400">Keine Ausgaben erfasst.</td></tr>
                                    )}
                                </tbody>
                             </table>
                        </div>
                    </>
                )}
            </main>

            {/* INVOICE MODAL */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between"><h2 className="font-bold">Rechnung</h2><button onClick={()=>setIsInvoiceModalOpen(false)}><X className="w-5"/></button></div>
                        <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Nr" value={invoiceForm.invoiceNumber} onChange={e=>setInvoiceForm({...invoiceForm, invoiceNumber:e.target.value})} className="border p-2 rounded" />
                                <input type="date" value={invoiceForm.date} onChange={e=>setInvoiceForm({...invoiceForm, date:e.target.value})} className="border p-2 rounded" />
                            </div>
                            <select value={invoiceForm.contactId} onChange={e=>setInvoiceForm({...invoiceForm, contactId:e.target.value})} className="w-full border p-2 rounded bg-white">
                                <option value="">Kunde wählen...</option>
                                {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input type="text" placeholder="Beschreibung (z.B. Projektname)" value={invoiceForm.description} onChange={e=>setInvoiceForm({...invoiceForm, description:e.target.value})} className="w-full border p-2 rounded" />
                            <input type="number" placeholder="Betrag (Netto) €" value={invoiceForm.amount} onChange={e=>setInvoiceForm({...invoiceForm, amount:e.target.value})} className="w-full border p-2 rounded" />
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded text-sm font-medium transition-colors">Abbrechen</button>
                                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700 transition-colors">Speichern</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EXPENSE MODAL */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                         <div className="px-6 py-4 border-b bg-slate-50 flex justify-between"><h2 className="font-bold">Ausgabe</h2><button onClick={()=>setIsExpenseModalOpen(false)}><X className="w-5"/></button></div>
                         <form onSubmit={handleSubmitExpense} className="p-6 space-y-4">
                            <input placeholder="Bezeichnung (z.B. Software Abo)" value={expenseForm.title} onChange={e=>setExpenseForm({...expenseForm, title:e.target.value})} className="w-full border p-2 rounded" autoFocus />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" placeholder="Betrag €" value={expenseForm.amount} onChange={e=>setExpenseForm({...expenseForm, amount:e.target.value})} className="border p-2 rounded" />
                                <input type="date" value={expenseForm.date} onChange={e=>setExpenseForm({...expenseForm, date:e.target.value})} className="border p-2 rounded" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select value={expenseForm.category} onChange={e=>setExpenseForm({...expenseForm, category:e.target.value as any})} className="w-full border p-2 rounded bg-white">
                                    {Object.entries(categoryLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                                <select value={expenseForm.contactId} onChange={e=>setExpenseForm({...expenseForm, contactId:e.target.value})} className="w-full border p-2 rounded bg-white">
                                    <option value="">Projekt/Kunde zuordnen (Optional)</option>
                                    {contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            
                            {/* File Upload for Attachment */}
                            <div className="border border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => expenseFileRef.current?.click()}>
                                <input type="file" ref={expenseFileRef} onChange={handleAttachmentUpload} className="hidden" accept="image/*,application/pdf" />
                                {expenseForm.attachmentName ? (
                                    <div className="flex items-center gap-2 text-indigo-600 font-medium">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <span className="truncate max-w-[200px]">{expenseForm.attachmentName}</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                        <span className="text-sm text-slate-500">Beleg hochladen (max. 2MB)</span>
                                    </>
                                )}
                            </div>

                            <textarea placeholder="Notizen" value={expenseForm.notes} onChange={e=>setExpenseForm({...expenseForm, notes:e.target.value})} className="w-full border p-2 rounded" rows={3}></textarea>
                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="text-slate-500 hover:bg-slate-100 px-4 py-2 rounded text-sm font-medium transition-colors">Abbrechen</button>
                                <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors">Speichern</button>
                            </div>
                         </form>
                    </div>
                </div>
            )}

            {/* PRINT MODAL (A4 PREVIEW) */}
            {isPrintModalOpen && printInvoice && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-200 w-full h-full max-w-4xl rounded-xl flex flex-col overflow-hidden">
                        <div className="bg-white p-4 border-b flex justify-between items-center">
                            <h2 className="font-bold text-slate-800">Rechnungsvorschau</h2>
                            <div className="flex gap-2">
                                <button onClick={triggerBrowserPrint} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium hover:bg-indigo-700">
                                    <Printer className="w-4 h-4" /> PDF / Drucken
                                </button>
                                <button onClick={()=>setIsPrintModalOpen(false)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded text-sm font-medium hover:bg-slate-200">Schließen</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-500/10">
                            {/* A4 PAPER SIMULATION */}
                            <div id="printable-invoice" className="bg-white shadow-2xl p-[10mm] w-[210mm] min-h-[297mm] text-slate-800 relative">
                                {(() => {
                                    const calc = getInvoiceCalculations(printInvoice);
                                    const isStorno = printInvoice.amount < 0;
                                    const titlePrefix = isStorno ? "Gutschrift / Stornorechnung" : "Rechnung";

                                    return (
                                        <>
                                            {/* HEADER */}
                                            <div className="flex justify-between items-start mb-12">
                                                <div>
                                                    {invoiceConfig.logoBase64 ? (
                                                        <img src={invoiceConfig.logoBase64} alt="Logo" className="max-h-32 w-auto object-contain mb-4 -mt-6" />
                                                    ) : (
                                                        <h1 className="text-3xl font-bold text-slate-800 mb-2">{invoiceConfig.companyName}</h1>
                                                    )}
                                                    <p className="text-xs text-slate-500">
                                                        {invoiceConfig.addressLine1} • {invoiceConfig.addressLine2}
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm text-slate-600">
                                                    <p>Datum: {new Date(printInvoice.date).toLocaleDateString('de-DE')}</p>
                                                    <p>Nr.: {printInvoice.invoiceNumber}</p>
                                                    {printInvoice.sentDate && !isStorno && <p>Leistungsdatum: {new Date(printInvoice.sentDate).toLocaleDateString('de-DE')}</p>}
                                                    {printInvoice.relatedInvoiceId && <p className="text-xs mt-1">Ref: {invoices.find(i => i.id === printInvoice.relatedInvoiceId)?.invoiceNumber}</p>}
                                                </div>
                                            </div>

                                            {/* RECIPIENT */}
                                            <div className="mb-16 text-sm">
                                                <p className="font-bold text-slate-900">{printInvoice.contactName}</p>
                                                {/* Mock address for contact as we don't have it in schema yet */}
                                                <p className="text-slate-600">Musterstraße 1</p>
                                                <p className="text-slate-600">12345 Musterstadt</p>
                                            </div>

                                            {/* TITLE */}
                                            <h2 className="text-xl font-bold mb-6">{titlePrefix} {printInvoice.invoiceNumber}</h2>
                                            <p className="text-sm text-slate-600 mb-8">
                                                Sehr geehrte Damen und Herren,<br/>
                                                {isStorno 
                                                    ? 'hiermit korrigieren wir die ursprüngliche Rechnung wie folgt:' 
                                                    : 'vielen Dank für Ihren Auftrag. Wir stellen Ihnen folgende Leistungen in Rechnung:'
                                                }
                                            </p>

                                            {/* TABLE */}
                                            <table className="w-full text-left text-sm mb-8">
                                                <thead>
                                                    <tr className="border-b-2 border-slate-800">
                                                        <th className="py-2">Beschreibung</th>
                                                        <th className="py-2 text-right">Menge</th>
                                                        <th className="py-2 text-right">Einzelpreis</th>
                                                        <th className="py-2 text-right">Gesamt</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="border-b border-slate-200">
                                                    <tr>
                                                        <td className="py-4">{printInvoice.description || "Dienstleistung / Produkt laut Auftrag"}</td>
                                                        <td className="py-4 text-right">1,00</td>
                                                        <td className="py-4 text-right">{calc.netAmount.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
                                                        <td className="py-4 text-right">{calc.netAmount.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
                                                    </tr>
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td colSpan={3} className="py-2 text-right font-medium">Nettobetrag</td>
                                                        <td className="py-2 text-right">{calc.netAmount.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
                                                    </tr>
                                                    <tr>
                                                        <td colSpan={3} className="py-2 text-right font-medium">
                                                            {calc.isStandardTax ? 'Umsatzsteuer 19%' : 'Umsatzsteuer 0% (Kleinunternehmer)'}
                                                        </td>
                                                        <td className="py-2 text-right">{calc.taxAmount.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
                                                    </tr>
                                                    <tr className="text-lg font-bold">
                                                        <td colSpan={3} className="py-4 text-right">Gesamtbetrag</td>
                                                        <td className="py-4 text-right">{calc.grossAmount.toLocaleString('de-DE', {minimumFractionDigits: 2})} €</td>
                                                    </tr>
                                                </tfoot>
                                            </table>

                                            <p className="text-sm text-slate-600 mb-8">
                                                {isStorno 
                                                    ? 'Der Betrag wird Ihrem Konto gutgeschrieben bzw. mit offenen Forderungen verrechnet.' 
                                                    : 'Bitte überweisen Sie den Betrag innerhalb von 14 Tagen auf das unten genannte Konto.'
                                                }
                                                <br/>
                                                {!calc.isStandardTax && 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'}
                                            </p>

                                            {/* FOOTER */}
                                            <div className="absolute bottom-[15mm] left-[10mm] right-[10mm] text-[10px] text-slate-500 border-t border-slate-200 pt-4 flex justify-between">
                                                <div>
                                                    <p className="font-bold">{invoiceConfig.companyName}</p>
                                                    <p>{invoiceConfig.addressLine1}</p>
                                                    <p>{invoiceConfig.addressLine2}</p>
                                                    <p>{invoiceConfig.email}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold">Bankverbindung</p>
                                                    <p>{invoiceConfig.bankName}</p>
                                                    <p>IBAN: {invoiceConfig.iban}</p>
                                                    <p>BIC: {invoiceConfig.bic}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold">Steuernummer</p>
                                                    <p>{invoiceConfig.taxId}</p>
                                                    <p>{invoiceConfig.footerText}</p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};