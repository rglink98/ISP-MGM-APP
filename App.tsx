/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  handleFirestoreError,
  OperationType
} from './firebase';
import { UserProfile, UserRole } from './types';
import { 
  LayoutDashboard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  Package, 
  Settings as SettingsIcon, 
  LogOut, 
  User as UserIcon,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Components
import Dashboard from './components/dashboard/Dashboard';
import TransactionList from './components/transactions/TransactionList';
import TransactionForm from './components/transactions/TransactionForm';
import Inventory from './components/inventory/Inventory';
import Settings from './components/admin/Settings';
import MemberProfiles from './components/admin/MemberProfiles';
import MonthlyBudget from './components/admin/MonthlyBudget';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          // New user - default to 'user' role unless it's the admin email
          const isAdmin = firebaseUser.email === 'rglink98@gmail.com';
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            role: isAdmin ? 'admin' : 'user',
            photoURL: firebaseUser.photoURL || undefined,
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
        >
          <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="text-indigo-600 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ISP Manager</h1>
          <p className="text-gray-600 mb-8">Manage your ISP business finances and inventory with ease.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'user'] },
    { id: 'income', label: 'Income', icon: ArrowUpCircle, roles: ['admin', 'user'] },
    { id: 'expense', label: 'Expense', icon: ArrowDownCircle, roles: ['admin', 'user'] },
    { id: 'transfer', label: 'Cash Transfer', icon: RefreshCw, roles: ['admin'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['admin', 'user'] },
    { id: 'members', label: 'Member Profile', icon: UserIcon, roles: ['admin'] },
    { id: 'budget', label: 'Monthly Budget', icon: TrendingUp, roles: ['admin'] },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, roles: ['admin'] },
  ];

  const filteredTabs = tabs.filter(tab => tab.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-xl tracking-tight text-primary-main">BizControl</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-[220px] bg-white border-r border-border-main transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col py-6">
          <div className="px-6 mb-8 hidden md:block">
            <span className="font-extrabold text-xl tracking-tight text-primary-main">BizControl</span>
          </div>

          <nav className="flex-1 px-0 space-y-6 overflow-y-auto">
            <div className="space-y-1">
              <div className="px-6 mb-2 text-[10px] uppercase font-bold tracking-wider text-text-muted">General</div>
              {filteredTabs.slice(0, 4).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-2.5 text-sm transition-all duration-200 border-r-4",
                    activeTab === tab.id 
                      ? "bg-blue-50 text-primary-main font-medium border-primary-main" 
                      : "text-text-main hover:bg-slate-50 border-transparent"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="px-6 mb-2 text-[10px] uppercase font-bold tracking-wider text-text-muted">Assets & Stock</div>
              {filteredTabs.filter(t => t.id === 'inventory').map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-2.5 text-sm transition-all duration-200 border-r-4",
                    activeTab === tab.id 
                      ? "bg-blue-50 text-primary-main font-medium border-primary-main" 
                      : "text-text-main hover:bg-slate-50 border-transparent"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <div className="px-6 mb-2 text-[10px] uppercase font-bold tracking-wider text-text-muted">Administration</div>
              {filteredTabs.filter(t => ['members', 'budget', 'settings'].includes(t.id)).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-6 py-2.5 text-sm transition-all duration-200 border-r-4",
                    activeTab === tab.id 
                      ? "bg-blue-50 text-primary-main font-medium border-primary-main" 
                      : "text-text-main hover:bg-slate-50 border-transparent"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          <div className="px-4 mt-auto">
            <div className="p-4 bg-slate-50 rounded-xl border border-border-main">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-white border border-border-main flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="text-text-muted w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-text-main truncate">{user.displayName}</p>
                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wide">
                    {user.role}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-1.5 text-xs font-semibold text-danger-main hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-border-main hidden md:flex items-center justify-between px-8 shrink-0">
          <div className="text-sm text-text-muted">
            Overview / <strong className="text-text-main capitalize">{activeTab}</strong>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-bold text-text-main">{user.displayName}</div>
              <div className="text-[11px] text-text-muted">{user.designation || 'System User'}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-border-main flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="text-text-muted w-5 h-5" />
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard user={user} />}
              {activeTab === 'income' && <TransactionForm type="income" user={user} />}
              {activeTab === 'expense' && <TransactionForm type="expense" user={user} />}
              {activeTab === 'transfer' && <TransactionForm type="transfer" user={user} />}
              {activeTab === 'inventory' && <Inventory user={user} />}
              {activeTab === 'members' && <MemberProfiles user={user} />}
              {activeTab === 'budget' && <MonthlyBudget user={user} />}
              {activeTab === 'settings' && <Settings user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
