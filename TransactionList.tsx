import React from 'react';
import { Transaction } from '../../types';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Category</th>
              <th className="px-6 py-4 font-semibold">Type</th>
              <th className="px-6 py-4 font-semibold">Amount</th>
              <th className="px-6 py-4 font-semibold">Payment</th>
              <th className="px-6 py-4 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{format(new Date(t.date), 'MMM d, yyyy HH:mm')}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {t.type === 'transfer' ? `${t.fromAccount} → ${t.toAccount}` : t.category}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-xs font-bold px-2 py-1 rounded-full capitalize",
                    t.type === 'income' ? "text-emerald-600 bg-emerald-50" : 
                    t.type === 'expense' ? "text-red-600 bg-red-50" : "text-indigo-600 bg-indigo-50"
                  )}>
                    {t.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">৳{t.amount.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{t.paymentType}</td>
                <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{t.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
