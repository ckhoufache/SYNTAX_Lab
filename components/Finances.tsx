
import React, { useState, useMemo } from 'react';
import { Plus, X, Trash2, CheckCircle2, TrendingUp, TrendingDown, PiggyBank, Printer, Pencil, RefreshCw, Ban, Loader2, Repeat } from 'lucide-react';
import { Invoice, Contact, Expense, InvoiceConfig, Activity } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DataServiceFactory, compileInvoiceTemplate } from '../services/dataService';

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
    
    // Editing States
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    
    // Printing State
    const [isPrinting, setIsPrinting] = useState<string | null>(null);

    // Form States
    const [invoiceForm, setInvoiceForm] = useState<Partial<Invoice>>({
        invoiceNumber: '',
        date: new Date().toISOString().split('T')[0],
        contactId: '',
        description: '',
        amount: 0,
        isPaid: false
    });

    const [expenseForm, setExpenseForm] = useState<Partial<Expense>>({
        title: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        category: 'office',
        contactId: '',
        interval: 'one_time'
    });

    // Stats
    const totalIncome = invoices.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalIncome - totalExpenses;
    
    // Data for Charts
    const expenseData = useMemo(() => {
        const categories = expenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(categories).map(([name, value]) => ({ name, value }));
    }, [expenses]);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // Helper: Interval Label
    const getIntervalLabel = (interval?: string) => {
        switch(interval) {
            case 'monthly': return 'mtl.';
            case 'quarterly': return 'alle 3 Mon.';
            case 'half_yearly': return 'alle 6 Mon.';
            case 'yearly': return 'jährl.';
            default: return '';
        }
    };

    // Handlers
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
                invoiceNumber: invoiceForm.invoiceNumber || `Rechnung-${Date.now()}`, // Fallback if user didn't provide number
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

    const openInvoiceModal = (invoice?: Invoice) => {
        if (invoice) {
            setEditingInvoiceId(invoice.id);
            setInvoiceForm(invoice);
        } else {
            setEditingInvoiceId(null);
            // Auto-generate invoice number logic could go here
            setInvoiceForm({
                invoiceNumber: '',
                date: new Date().toISOString().split('T')[0],
                contactId: '',
                description: '',
                amount: 0,
                isPaid: false
            });
        }
        setIsInvoiceModalOpen(true);
    };

    const openExpenseModal = (expense?: Expense) => {
        if (expense) {
            setEditingExpenseId(expense.id);
            setExpenseForm(expense);
        } else {
            setEditingExpenseId(null);
            setExpenseForm({
                title: '',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                category: 'office',
                contactId: '',
                interval: 'one_time'
            });
        }
        setIsExpenseModalOpen(true);
    };

    const handlePrintInvoice = async (invoice: Invoice) => {
        setIsPrinting(invoice.id);
        try {
            // 1. Create Data Service (Local)
            const storedConfig = localStorage.getItem('backend_config');
            const config = storedConfig ? JSON.parse(storedConfig) : { mode: 'local' };
            const service = DataServiceFactory.create(config);

            // 2. Compile Template
            const html = compileInvoiceTemplate(invoice, invoiceConfig);

            // 3. Generate PDF Base64
            const base64Pdf = await service.generatePdf(html);

            // 4. Convert to Blob
            const byteCharacters = atob(base64Pdf);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            // 5. Open in new window
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');

        } catch (e: any) {
            console.error("Printing failed", e);
            alert("Fehler beim Generieren der PDF: " + e.message);
        } finally {
            setIsPrinting(null);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 h-screen overflow-y-auto flex flex-col relative">
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6 shrink-0 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Finanzen</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Übersicht über Einnahmen und Ausgaben.</p>
                </div>
                <div className="flex gap-3">
                     <button onClick={onRunRetainer} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                        <RefreshCw className="w-4 h-4"/> Retainer Lauf
                    </button>
                    {activeTab === 'income' ? (
                        <button onClick={() => openInvoiceModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Rechnung erstellen
                        </button>
                    ) : (
                        <button onClick={() => openExpenseModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Ausgabe erfassen
                        </button>
                    )}
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
                                 <h3 className="text-2xl font-bold text-red-600 mt-1">{totalExpenses.toLocaleString('de-DE')} €</h3>
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
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8">
                {activeTab === 'income' ? (
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
                                {invoices.length > 0 ? invoices.map(invoice => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 font-medium dark:text-slate-200">{invoice.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{invoice.date}</td>
                                        <td className="px-6 py-4 dark:text-slate-300">{invoice.contactName}</td>
                                        <td className={`px-6 py-4 font-bold ${invoice.amount < 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>{invoice.amount.toLocaleString('de-DE')} €</td>
                                        <td className="px-6 py-4">
                                            {invoice.isCancelled ? (
                                                 <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">Storniert</span>
                                            ) : invoice.isPaid ? (
                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium flex items-center w-fit gap-1"><CheckCircle2 className="w-3 h-3"/> Bezahlt</span>
                                            ) : (
                                                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-medium">Offen</span>
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
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                             <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Datum</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Titel</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Kategorie</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Betrag</th>
                                        <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Aktionen</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {expenses.length > 0 ? expenses.map(expense => (
                                        <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{expense.date}</td>
                                            <td className="px-6 py-4 font-medium dark:text-slate-200">
                                                {expense.title} 
                                                {expense.contactName && <span className="text-xs text-slate-400 block">{expense.contactName}</span>}
                                            </td>
                                            <td className="px-6 py-4"><span className="capitalize bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs text-slate-600 dark:text-slate-300">{expense.category}</span></td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-800 dark:text-slate-200">{expense.amount.toLocaleString('de-DE')} €</div>
                                                {expense.interval && expense.interval !== 'one_time' && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                                        <Repeat className="w-3 h-3" />
                                                        {getIntervalLabel(expense.interval)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => openExpenseModal(expense)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Bearbeiten"><Pencil className="w-4 h-4"/></button>
                                                <button onClick={() => onDeleteExpense(expense.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700" title="Löschen"><Trash2 className="w-4 h-4"/></button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Keine Ausgaben vorhanden.</td></tr>
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
            </div>

            {/* INVOICE MODAL */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                             <h2 className="text-lg font-bold dark:text-white">{editingInvoiceId ? 'Rechnung bearbeiten' : 'Neue Rechnung'}</h2>
                             <button onClick={() => setIsInvoiceModalOpen(false)}><X className="w-5 h-5 dark:text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleInvoiceSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Nr.</label><input value={invoiceForm.invoiceNumber} onChange={e=>setInvoiceForm({...invoiceForm, invoiceNumber:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Auto" /></div>
                                <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Datum</label><input type="date" value={invoiceForm.date} onChange={e=>setInvoiceForm({...invoiceForm, date:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required /></div>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Kunde</label>
                                <select value={invoiceForm.contactId} onChange={e=>setInvoiceForm({...invoiceForm, contactId:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required>
                                    <option value="">Wählen...</option>
                                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                                </select>
                            </div>
                            <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Beschreibung</label><input value={invoiceForm.description} onChange={e=>setInvoiceForm({...invoiceForm, description:e.target.value})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="Leistung..." required /></div>
                            <div><label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Betrag (Netto)</label><input type="number" step="0.01" value={invoiceForm.amount} onChange={e=>setInvoiceForm({...invoiceForm, amount:parseFloat(e.target.value)})} className="w-full border p-2 rounded mt-1 dark:bg-slate-700 dark:border-slate-600 dark:text-white" required /></div>
                            
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" checked={invoiceForm.isPaid} onChange={e=>setInvoiceForm({...invoiceForm, isPaid:e.target.checked})} id="isPaidInv" className="w-4 h-4 text-indigo-600 rounded" />
                                <label htmlFor="isPaidInv" className="text-sm font-medium dark:text-slate-300">Bereits bezahlt?</label>
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
                            
                            {/* NEU: Intervall Auswahl */}
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
