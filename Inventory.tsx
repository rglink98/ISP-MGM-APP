import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, orderBy, OperationType, handleFirestoreError, updateDoc, doc } from '../../firebase';
import { InventoryItem, InventoryLog, UserProfile } from '../../types';
import { Plus, Minus, Package, History, Search, AlertCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface InventoryProps {
  user: UserProfile;
}

export default function Inventory({ user }: InventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', stock: 0, unit: 'pcs', valuePerUnit: 0 });
  const [actionItem, setActionItem] = useState<{ item: InventoryItem, type: 'add' | 'use' } | null>(null);
  const [actionData, setActionData] = useState({ amount: '', detail: '' });

  useEffect(() => {
    const qItems = query(collection(db, 'inventory'), orderBy('name'));
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
      setLoading(false);
    });

    const qLogs = query(collection(db, 'inventoryLogs'), orderBy('date', 'desc'));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryLog)));
    });

    return () => {
      unsubscribeItems();
      unsubscribeLogs();
    };
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventory'), newItem);
      setNewItem({ name: '', stock: 0, unit: 'pcs', valuePerUnit: 0 });
      setShowAddForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'inventory');
    }
  };

  const updateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionItem || !actionData.amount) return;

    const amount = parseInt(actionData.amount);
    const type = actionItem.type;
    const item = actionItem.item;

    const newStock = type === 'add' ? item.stock + amount : item.stock - amount;
    if (newStock < 0) return alert("Insufficient stock!");

    try {
      await updateDoc(doc(db, 'inventory', item.id), { stock: newStock });
      await addDoc(collection(db, 'inventoryLogs'), {
        productId: item.id,
        type,
        quantity: amount,
        date: new Date().toISOString(),
        detail: actionData.detail || `${type === 'add' ? 'Added' : 'Used'} ${amount} ${item.unit} of ${item.name}`,
        createdBy: user.uid
      });
      setActionItem(null);
      setActionData({ amount: '', detail: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inventory');
    }
  };

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Inventory Management</h1>
          <p className="text-sm text-text-muted">Track your products, stock levels, and usage.</p>
        </div>
        {user.role === 'admin' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </header>

      {showAddForm && (
        <form onSubmit={handleAddItem} className="card p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Product Name</label>
            <input 
              type="text"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              className="input-field text-sm"
              placeholder="e.g. ONU - XPON"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Initial Stock</label>
            <input 
              type="number"
              value={newItem.stock}
              onChange={(e) => setNewItem({...newItem, stock: parseInt(e.target.value)})}
              className="input-field text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Unit</label>
            <input 
              type="text"
              value={newItem.unit}
              onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
              className="input-field text-sm"
              placeholder="pcs, m, kg"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Value Per Unit (৳)</label>
            <input 
              type="number"
              value={newItem.valuePerUnit}
              onChange={(e) => setNewItem({...newItem, valuePerUnit: parseFloat(e.target.value)})}
              className="input-field text-sm"
              placeholder="0.00"
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Create Product
          </button>
        </form>
      )}

      {actionItem && (
        <div className="card p-6 bg-blue-50/50 border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-primary-main flex items-center gap-2">
              {actionItem.type === 'add' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              {actionItem.type === 'add' ? 'Add Stock' : 'Use Product'} - {actionItem.item.name}
            </h3>
            <button onClick={() => setActionItem(null)} className="text-text-muted hover:text-danger-main">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={updateStock} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Quantity ({actionItem.item.unit})</label>
              <input 
                type="number"
                value={actionData.amount}
                onChange={(e) => setActionData({...actionData, amount: e.target.value})}
                className="input-field text-sm"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Description / Detail</label>
              <input 
                type="text"
                value={actionData.detail}
                onChange={(e) => setActionData({...actionData, detail: e.target.value})}
                className="input-field text-sm"
                placeholder="e.g. Used for new connection at Sector 7"
              />
            </div>
            <button type="submit" className={cn(
              "btn-primary",
              actionItem.type === 'use' ? "bg-danger-main hover:bg-red-700" : ""
            )}>
              Confirm {actionItem.type === 'add' ? 'Addition' : 'Usage'}
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-border-main rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="table-header">Product Name</th>
                    <th className="table-header">Stock</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell font-medium text-text-main">{item.name}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold",
                            item.stock < 5 ? "text-danger-main" : "text-text-main"
                          )}>
                            {item.stock}
                          </span>
                          <span className="text-[10px] text-text-muted uppercase font-bold">{item.unit}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setActionItem({ item, type: 'add' })}
                            className="p-1.5 text-success-main hover:bg-emerald-50 rounded-md transition-colors"
                            title="Add Stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setActionItem({ item, type: 'use' })}
                            className="p-1.5 text-danger-main hover:bg-red-50 rounded-md transition-colors"
                            title="Use Stock"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Inventory Logs */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-bold">Stock History</h3>
            </div>
            <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="flex gap-3 items-start">
                  <div className={cn(
                    "mt-1 p-1.5 rounded-md",
                    log.type === 'add' ? "bg-emerald-50 text-success-main" : "bg-red-50 text-danger-main"
                  )}>
                    {log.type === 'add' ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-main">{log.detail}</p>
                    <p className="text-[10px] text-text-muted">{format(new Date(log.date), 'MMM d, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
