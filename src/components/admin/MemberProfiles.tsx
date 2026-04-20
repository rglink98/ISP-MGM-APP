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
  ref,
  uploadBytes,
  getDownloadURL,
  storage
} from '../../firebase';
import { MemberProfile, UserProfile } from '../../types';
import { Plus, Trash2, User as UserIcon, Save, Phone, Mail, Calendar, Edit2, X, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface MemberProfilesProps {
  user: UserProfile;
}

export default function MemberProfiles({ user }: MemberProfilesProps) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberProfile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    photoURL: '',
    joinDate: new Date().toISOString().split('T')[0],
    status: 'active' as 'active' | 'inactive',
    salary: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberProfile)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'members'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await updateDoc(doc(db, 'members', editingMember.id), formData);
      } else {
        await addDoc(collection(db, 'members'), formData);
      }
      setFormData({
        name: '',
        designation: '',
        phone: '',
        email: '',
        photoURL: '',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active',
        salary: ''
      });
      setShowForm(false);
      setEditingMember(null);
    } catch (error) {
      handleFirestoreError(error, editingMember ? OperationType.UPDATE : OperationType.CREATE, 'members');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this member profile?")) return;
    try {
      await deleteDoc(doc(db, 'members', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'members');
    }
  };

  const handleEdit = (member: MemberProfile) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      designation: member.designation,
      phone: member.phone,
      email: member.email,
      photoURL: member.photoURL || '',
      joinDate: member.joinDate,
      status: member.status,
      salary: member.salary?.toString() || ''
    });
    setShowForm(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Max size is 2MB.");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `member-photos/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setFormData({ ...formData, photoURL: downloadURL });
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Member Profiles</h1>
          <p className="text-sm text-text-muted">Manage office member information and profiles.</p>
        </div>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) setEditingMember(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Member'}
        </button>
      </header>

      {showForm && (
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Full Name</label>
              <input 
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="input-field text-sm"
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Designation</label>
              <input 
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({...formData, designation: e.target.value})}
                className="input-field text-sm"
                placeholder="Manager"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Phone Number</label>
              <input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="input-field text-sm"
                placeholder="017XXXXXXXX"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="input-field text-sm"
                placeholder="john@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Member Photo</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                  ) : formData.photoURL ? (
                    <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 border-dashed rounded-lg py-2 px-3 hover:bg-slate-100 transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">
                      {uploading ? 'Uploading...' : 'Choose File'}
                    </span>
                  </div>
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Join Date</label>
              <input 
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                className="input-field text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Monthly Salary (৳)</label>
              <input 
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({...formData, salary: e.target.value})}
                className="input-field text-sm font-bold"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                className="input-field text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {editingMember ? 'Update Profile' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map((member) => (
          <div key={member.id} className="card group hover:border-primary-main transition-all duration-300">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-border-main overflow-hidden shadow-sm">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon className="w-8 h-8 text-text-muted" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(member)}
                    className="p-2 text-primary-main hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(member.id)}
                    className="p-2 text-danger-main hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-bold text-text-main">{member.name}</h3>
                <p className="text-xs font-bold text-primary-main uppercase tracking-wider">{member.designation}</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-border-main">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Phone className="w-3.5 h-3.5" />
                  {member.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Mail className="w-3.5 h-3.5" />
                  {member.email}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined: {format(new Date(member.joinDate), 'MMM d, yyyy')}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm font-bold text-text-main">
                  ৳{(Number(member.salary) || 0).toLocaleString()}
                  <span className="text-[10px] text-text-muted font-normal ml-1">/month</span>
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide",
                  member.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                )}>
                  {member.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
