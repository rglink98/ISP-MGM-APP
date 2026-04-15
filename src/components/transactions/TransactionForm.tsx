import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, where, OperationType, handleFirestoreError, deleteDoc, doc, updateDoc } from '../../firebase';
import { TransactionType, PaymentType, Category, UserProfile, Transaction } from '../../types';
import { Save, Plus, Trash2, FileDown, FileSpreadsheet, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface TransactionFormProps {
  type: TransactionType;
  user: UserProfile;
}

export default function TransactionForm({ type, user }: TransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    paymentType: 'cash' as PaymentType,
    date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    detail: '',
    fromAccount: '',
    toAccount: ''
  });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'categories'), where('type', '==', type === 'transfer' ? 'expense' : type));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const tq = query(collection(db, 'transactions'), where('type', '==', type));
    const tUnsubscribe = onSnapshot(tq, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => {
      unsubscribe();
      tUnsubscribe();
    };
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || (!formData.category && type !== 'transfer')) return;

    setLoading(true);
    try {
      const transactionData = {
        type,
        category: type === 'transfer' ? 'Internal Transfer' : formData.category,
        amount: parseFloat(formData.amount),
        paymentType: formData.paymentType,
        date: new Date(formData.date).toISOString(),
        detail: formData.detail,
        createdBy: user.uid,
        fromAccount: formData.fromAccount,
        toAccount: formData.toAccount
      };

      if (editingId) {
        await updateDoc(doc(db, 'transactions', editingId), transactionData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'transactions'), transactionData);
      }
      
      setFormData({
        category: '',
        amount: '',
        paymentType: 'cash',
        date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        detail: '',
        fromAccount: '',
        toAccount: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`${type.toUpperCase()} Report`, 14, 15);
    const tableData = transactions.map(t => [
      format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
      t.category,
      t.amount,
      t.paymentType,
      t.detail
    ]);
    (doc as any).autoTable({
      head: [['Date', 'Category', 'Amount', 'Payment', 'Detail']],
      body: tableData,
      startY: 20,
    });
    doc.save(`${type}-report.pdf`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      category: t.category,
      amount: t.amount.toString(),
      paymentType: t.paymentType,
      date: format(new Date(t.date), "yyyy-MM-dd'T'HH:mm"),
      detail: t.detail,
      fromAccount: t.fromAccount || '',
      toAccount: t.toAccount || ''
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(transactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `${type}-report.xlsx`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main capitalize">{type} Entry</h1>
          <p className="text-sm text-text-muted">Record and track your business {type}s.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToPDF} className="flex items-center gap-2 bg-white border border-border-main px-4 py-2 rounded-lg text-xs font-bold text-text-main hover:bg-slate-50 transition-colors shadow-sm">
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-white border border-border-main px-4 py-2 rounded-lg text-xs font-bold text-text-main hover:bg-slate-50 transition-colors shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
            EXCEL
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-text-main">{editingId ? 'Edit' : 'New'} {type} Details</h3>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      category: '',
                      amount: '',
                      paymentType: 'cash',
                      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                      detail: '',
                      fromAccount: '',
                      toAccount: ''
                    });
                  }}
                  className="text-text-muted hover:text-danger-main"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {type !== 'transfer' && (
              <div>
                <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="input-field text-sm"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}

            {type === 'transfer' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">From Account</label>
                  <input 
                    type="text"
                    value={formData.fromAccount}
                    onChange={(e) => setFormData({...formData, fromAccount: e.target.value})}
                    className="input-field text-sm"
                    placeholder="e.g. Main Cash"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">To Account</label>
                  <input 
                    type="text"
                    value={formData.toAccount}
                    onChange={(e) => setFormData({...formData, toAccount: e.target.value})}
                    className="input-field text-sm"
                    placeholder="e.g. bKash Merchant"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Amount (৳)</label>
              <input 
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="input-field text-sm font-bold"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Payment Type</label>
              <select 
                value={formData.paymentType}
                onChange={(e) => setFormData({...formData, paymentType: e.target.value as PaymentType})}
                className="input-field text-sm"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="bkash">bKash</option>
                <option value="merchant">Merchant</option>
                <option value="nagad">Nagad</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Date & Time</label>
              <input 
                type="datetime-local"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="input-field text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Details</label>
              <textarea 
                value={formData.detail}
                onChange={(e) => setFormData({...formData, detail: e.target.value})}
                className="input-field text-sm h-20 resize-none"
                placeholder="Enter transaction details..."
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div> : <Save className="w-4 h-4" />}
              {editingId ? 'Update' : 'Save'} {type}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-bold">Recent {type} History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="table-header">Date</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Payment</th>
                    {user.role === 'admin' && <th className="table-header text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell text-text-muted whitespace-nowrap">{format(new Date(t.date), 'MMM d, HH:mm')}</td>
                      <td className="table-cell font-medium text-text-main">
                        {type === 'transfer' ? `${t.fromAccount} → ${t.toAccount}` : t.category}
                      </td>
                      <td className={cn(
                        "table-cell font-bold",
                        type === 'income' ? "text-success-main" : type === 'expense' ? "text-danger-main" : "text-primary-main"
                      )}>
                        ৳{t.amount.toLocaleString()}
                      </td>
                      <td className="table-cell">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-text-muted uppercase tracking-wide">
                          {t.paymentType}
                        </span>
                      </td>
                      {user.role === 'admin' && (
                        <td className="table-cell text-right">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => handleEdit(t)}
                              className="p-1.5 text-primary-main hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(t.id)}
                              className="p-1.5 text-danger-main hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
