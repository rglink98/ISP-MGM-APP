export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  designation?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type PaymentType = 'cash' | 'bank' | 'bkash' | 'merchant' | 'nagad' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: number;
  paymentType: PaymentType;
  date: string;
  detail: string;
  createdBy: string;
  fromAccount?: string;
  toAccount?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  valuePerUnit: number;
}

export interface InventoryLog {
  id: string;
  productId: string;
  type: 'add' | 'use';
  quantity: number;
  date: string;
  detail: string;
  createdBy: string;
}

export interface MemberProfile {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
  photoURL?: string;
  joinDate: string;
  status: 'active' | 'inactive';
  salary: number;
}

export interface MonthlyBudget {
  id: string;
  month: string;
  type: 'personal' | 'official';
  amount: number;
  detail: string;
  status: 'complete' | 'incomplete';
  createdBy: string;
}
