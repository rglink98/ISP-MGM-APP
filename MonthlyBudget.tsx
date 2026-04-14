import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, orderBy, OperationType, handleFirestoreError, deleteDoc, doc, updateDoc } from '../../firebase';
import { MonthlyBudget as BudgetType, UserProfile } from '../../types';
import { Plus, Trash2, Save, Edit2, X, Wallet, Briefcase, Calendar, CheckCircle2, Circle, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface MonthlyBudgetProps {
  user: UserProfile;
}

export default function MonthlyBudget({ user }: MonthlyBudgetProps) {
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [activeType, setActiveType] = useState<'personal' | 'official'>('official');
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);
  const [formData, setFormData] = useState({
    month: format(new Date(), 'yyyy-MM'),
    amount: '',
    detail: '',
    status: 'incomplete' as 'complete' | 'incomplete'
  });

  useEffect(() => {
    const q = query(collection(db, 'budgets'), orderBy('month', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetType)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'budgets'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        type: activeType,
        createdBy: user.uid
      };

      if (editingBudget) {
        await updateDoc(doc(db, 'budgets', editingBudget.id), data);
      } else {
        await addDoc(collection(db, 'budgets'), data);
      }
      
      setFormData({
        month: format(new Date(), 'yyyy-MM'),
        amount: '',
        detail: '',
        status: 'incomplete'
      });
      setShowForm(false);
      setEditingBudget(null);
    } catch (error) {
      handleFirestoreError(error, editingBudget ? OperationType.UPDATE : OperationType.CREATE, 'budgets');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget entry?")) return;
    try {
      await deleteDoc(doc(db, 'budgets', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'budgets');
    }
  };

  const handleEdit = (budget: BudgetType) => {
    setEditingBudget(budget);
    setFormData({
      month: budget.month,
      amount: budget.amount.toString(),
      detail: budget.detail,
      status: budget.status || 'incomplete'
    });
    setShowForm(true);
  };

  const toggleStatus = async (budget: BudgetType) => {
    try {
      const newStatus = budget.status === 'complete' ? 'incomplete' : 'complete';
      await updateDoc(doc(db, 'budgets', budget.id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'budgets');
    }
  };

  const filteredBudgets = budgets.filter(b => b.type === activeType);

  const exportToExcel = () => {
    const data = filteredBudgets.map(b => ({
      Month: format(new Date(b.month + '-01'), 'MMMM yyyy'),
      Detail: b.detail,
      Amount: b.amount,
      Status: b.status.toUpperCase()
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budgets");
    XLSX.writeFile(wb, `Monthly_Budget_${activeType}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`${activeType.toUpperCase()} Monthly Budget Report`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 22);

    const tableData = filteredBudgets.map(b => [
      format(new Date(b.month + '-01'), 'MMMM yyyy'),
      b.detail,
      `Tk ${b.amount.toLocaleString()}`,
      b.status.toUpperCase()
    ]);

    (doc as any).autoTable({
      head: [['Month', 'Detail', 'Amount', 'Status']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Monthly_Budget_${activeType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Monthly Budget</h1>
          <p className="text-sm text-text-muted">Plan and track your estimated expenses.</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingBudget(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Budget'}
        </button>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveType('official')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeType === 'official' ? "bg-white text-primary-main shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Official Budget
          </button>
          <button
            onClick={() => setActiveType('personal')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeType === 'personal' ? "bg-white text-primary-main shadow-sm" : "text-text-muted hover:text-text-main"
            )}
          >
            <Wallet className="w-3.5 h-3.5" />
            Personal Budget
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all border border-rose-200"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Month</label>
              <input 
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({...formData, month: e.target.value})}
                className="input-field text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Budget Amount (৳)</label>
              <input 
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="input-field text-sm font-bold"
                placeholder="0.00"
                required
              />
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Detail / Description</label>
              <input 
                type="text"
                value={formData.detail}
                onChange={(e) => setFormData({...formData, detail: e.target.value})}
                className="input-field text-sm"
                placeholder="e.g. Total estimated cost for April"
                required
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary flex items-center gap-2 w-full md:w-auto">
                <Save className="w-4 h-4" />
                {editingBudget ? 'Update Budget' : 'Save Budget'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="table-header">Month</th>
                <th className="table-header">Detail</th>
                <th className="table-header">Budget Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {filteredBudgets.map((budget) => (
                <tr key={budget.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2 font-bold text-text-main">
                      <Calendar className="w-3.5 h-3.5 text-primary-main" />
                      {format(new Date(budget.month + '-01'), 'MMMM yyyy')}
                    </div>
                  </td>
                  <td className="table-cell text-text-muted text-xs">{budget.detail}</td>
                  <td className="table-cell font-bold text-text-main">৳{budget.amount.toLocaleString()}</td>
                  <td className="table-cell">
                    <button
                      onClick={() => toggleStatus(budget)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all",
                        budget.status === 'complete' 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {budget.status === 'complete' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Complete
                        </>
                      ) : (
                        <>
                          <Circle className="w-3 h-3" />
                          Incomplete
                        </>
                      )}
                    </button>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(budget)}
                        className="p-1.5 text-primary-main hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(budget.id)}
                        className="p-1.5 text-danger-main hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredBudgets.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-text-muted italic text-sm">
                    No budget entries found for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
