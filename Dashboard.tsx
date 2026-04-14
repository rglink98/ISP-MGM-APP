import React, { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, where } from '../../firebase';
import { Transaction, UserProfile, InventoryItem } from '../../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Filter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';

import { cn } from '../../lib/utils';

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    });

    const qInv = query(collection(db, 'inventory'), orderBy('name'));
    const unsubscribeInv = onSnapshot(qInv, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubscribeInv();
    };
  }, []);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const inventoryValue = inventory.reduce((acc, item) => acc + (item.stock * (item.valuePerUnit || 0)), 0);

  // Cash Management Balances
  const getBalanceByPayment = (type: string) => {
    const income = transactions.filter(t => t.type === 'income' && t.paymentType === type).reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense' && t.paymentType === type).reduce((acc, t) => acc + t.amount, 0);
    // For transfers, we need to handle fromAccount and toAccount if they match payment types
    // But for now, let's stick to simple paymentType filtering as per current implementation
    return income - expense;
  };

  // Chart Data: Last 6 Months
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    const monthStr = format(date, 'MMM yyyy');
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return isWithinInterval(tDate, { start: monthStart, end: monthEnd });
    });

    const income = monthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    return { name: monthStr, income, expense };
  }).reverse();

  // Pie Chart Data: Expense Categories
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: any, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  }));

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>)}
    </div>
    <div className="h-96 bg-gray-200 rounded-2xl"></div>
  </div>;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-5">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Total Income (Monthly)</div>
          <div className="text-2xl font-bold text-text-main">৳{totalIncome.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-success-main mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            ↑ 12% vs last month
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Total Expense</div>
          <div className="text-2xl font-bold text-text-main">৳{totalExpense.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-text-muted mt-1">
            ISP Operational Costs
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Net Profit</div>
          <div className="text-2xl font-bold text-text-main">৳{balance.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-primary-main mt-1">
            Current Balance
          </div>
        </div>

        <div className="card p-5">
          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Inventory Value</div>
          <div className="text-2xl font-bold text-text-main">৳{inventoryValue.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-text-muted mt-1">
            Active Stock: {inventory.length} Items
          </div>
        </div>
      </div>

      {/* Charts & Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <section className="card lg:col-span-2">
          <div className="card-header">
            <span className="text-sm font-bold">Recent Transactions</span>
            <button className="text-xs font-bold text-primary-main hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 6).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell text-text-muted">{format(new Date(t.date), 'MMM d, yyyy')}</td>
                    <td className="table-cell font-medium text-text-main">{t.category}</td>
                    <td className="table-cell">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                        t.type === 'income' ? "text-success-main bg-emerald-50" : "text-danger-main bg-red-50"
                      )}>
                        {t.type}
                      </span>
                    </td>
                    <td className={cn(
                      "table-cell font-bold",
                      t.type === 'income' ? "text-success-main" : "text-danger-main"
                    )}>
                      {t.type === 'income' ? '+' : '-'} ৳{t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Column: Cash Management & Stock */}
        <div className="space-y-6">
          <section className="card">
            <div className="card-header">
              <span className="text-sm font-bold">Cash Management</span>
            </div>
            <div className="p-5 space-y-2">
              {[
                { label: 'ক্যাশ', val: `৳ ${getBalanceByPayment('cash').toLocaleString()}` },
                { label: 'বিকাশ', val: `৳ ${getBalanceByPayment('bkash').toLocaleString()}` },
                { label: 'ব্যাংক', val: `৳ ${getBalanceByPayment('bank').toLocaleString()}` },
                { label: 'মার্চেন্ট', val: `৳ ${getBalanceByPayment('merchant').toLocaleString()}` },
                { label: 'নগত', val: `৳ ${getBalanceByPayment('nagad').toLocaleString()}` }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 bg-slate-50 border border-border-main rounded-lg text-xs">
                  <span className="text-text-muted font-medium">{item.label}</span>
                  <strong className="text-text-main">{item.val}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <span className="text-sm font-bold">Stock Monitoring</span>
            </div>
            <div className="p-5 space-y-4">
              {inventory.slice(0, 5).map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-main font-medium">{item.name}</span>
                    <strong className="text-text-main">{item.stock} {item.unit}</strong>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-main rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((item.stock / 100) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {inventory.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-xs text-text-muted italic">No stock data available</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
