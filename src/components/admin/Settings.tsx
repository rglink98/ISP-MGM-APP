import React, { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  OperationType, 
  handleFirestoreError, 
  deleteDoc, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from '../../firebase';
import { Category, UserProfile, UserRole, AppConfig } from '../../types';
import { Plus, Trash2, UserPlus, Shield, User as UserIcon, Check, X, Image as ImageIcon, Loader2, Save } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsProps {
  user: UserProfile;
}

export default function Settings({ user }: SettingsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig>({ appName: 'BizControl' });
  const [newCategory, setNewCategory] = useState({ name: '', type: 'income' as 'income' | 'expense' });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    const qCat = query(collection(db, 'categories'), orderBy('name'));
    const unsubscribeCat = onSnapshot(qCat, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    const qUsers = query(collection(db, 'users'), orderBy('displayName'));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data() } as UserProfile)));
    });

    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'general'), (doc) => {
      if (doc.exists()) {
        setAppConfig(doc.data() as AppConfig);
      }
    });

    return () => {
      unsubscribeCat();
      unsubscribeUsers();
      unsubscribeConfig();
    };
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'categories'), newCategory);
      setNewCategory({ name: '', type: 'income' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'categories');
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      alert("Logo is too large. Please use a file under 500KB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        await setDoc(doc(db, 'config', 'general'), { ...appConfig, logoURL: base64String }, { merge: true });
        setUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Logo upload failed", error);
      alert("Failed to process logo.");
      setUploadingLogo(false);
    }
  };

  const updateAppName = async () => {
    const name = prompt("Enter Application Name:", appConfig.appName || "BizControl");
    if (!name) return;
    try {
      await setDoc(doc(db, 'config', 'general'), { ...appConfig, appName: name }, { merge: true });
    } catch (error) {
      alert("Failed to update app name.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-main">System Settings</h1>
        <p className="text-sm text-text-muted">Manage categories, user roles, and employee profiles.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Identity */}
        <section className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-sm font-bold">App Identity & Logo</h3>
          </div>
          <div className="p-6 flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                {uploadingLogo ? (
                  <Loader2 className="w-8 h-8 text-primary-main animate-spin" />
                ) : appConfig.logoURL ? (
                  <img src={appConfig.logoURL} alt="App Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <label className="absolute -bottom-2 -right-2 bg-white border border-border-main p-2 rounded-lg shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <Plus className="w-4 h-4 text-primary-main" />
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
              </label>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-text-main">{appConfig.appName || 'BizControl'}</h4>
                <p className="text-xs text-text-muted">This name and logo will appear across the application.</p>
              </div>
              <button 
                onClick={updateAppName}
                className="btn-secondary text-xs py-2 px-4"
              >
                Change App Name
              </button>
            </div>
          </div>
        </section>

        {/* Category Management */}
        <section className="card">
          <div className="card-header">
            <h3 className="text-sm font-bold">Category Management</h3>
          </div>
          <div className="p-5 space-y-6">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <div className="flex-1">
                <select 
                  value={newCategory.type}
                  onChange={(e) => setNewCategory({...newCategory, type: e.target.value as 'income' | 'expense'})}
                  className="input-field text-xs mb-2"
                >
                  <option value="income">Income Category</option>
                  <option value="expense">Expense Category</option>
                </select>
                <input 
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="input-field text-sm"
                  placeholder="Category Name"
                  required
                />
              </div>
              <button type="submit" className="btn-primary self-end">
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Income</h4>
                {categories.filter(c => c.type === 'income').map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-border-main text-xs">
                    <span className="text-text-main">{c.name}</span>
                    <button onClick={() => handleDeleteCategory(c.id)} className="text-danger-main hover:text-red-700">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Expense</h4>
                {categories.filter(c => c.type === 'expense').map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-border-main text-xs">
                    <span className="text-text-main">{c.name}</span>
                    <button onClick={() => handleDeleteCategory(c.id)} className="text-danger-main hover:text-red-700">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* User Management */}
        <section className="card">
          <div className="card-header">
            <h3 className="text-sm font-bold">Team Management</h3>
          </div>
          <div className="divide-y divide-border-main">
            {users.map(u => (
              <div key={u.uid} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-border-main flex items-center justify-center overflow-hidden">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="text-text-muted w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-main truncate">{u.displayName}</p>
                  <p className="text-[11px] text-text-muted truncate">{u.email}</p>
                  <p className="text-[10px] font-medium text-primary-main mt-0.5">{u.designation || 'No Designation'}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <select 
                    value={u.role}
                    onChange={(e) => updateUserRole(u.uid, e.target.value as UserRole)}
                    className="text-[10px] font-bold bg-white border border-border-main rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="user">Tech Team</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button 
                    onClick={() => {
                      const des = prompt("Enter designation:", u.designation || "");
                      if (des !== null) updateUserProfile(u.uid, { designation: des });
                    }}
                    className="text-[10px] font-bold text-text-muted hover:text-primary-main text-left px-2"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
