import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Plus,
  Calendar,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Expense, ExpenseCategory, User } from '../../types/index.ts';
import { getExpenses, addExpense } from '../../db/database.ts';
import { formatKES, formatDateTime, getTodayNairobiDateString } from '../../utils/formatters.ts';

interface ExpensesViewProps {
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currentUser, onRefreshData }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Rent');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayNairobiDateString());
  const [error, setError] = useState<string | null>(null);

  const categories: ExpenseCategory[] = [
    'Rent',
    'Electricity & Water',
    'Salaries & Casuals',
    'Transport & Delivery',
    'Packaging & Bags',
    'Licences & County Council',
    'Internet & Airtime',
    'Maintenance & Repairs',
    'Office & Stationery',
    'Miscellaneous',
  ];

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const data = await getExpenses({
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
      });
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [categoryFilter]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a description.');
      return;
    }

    try {
      await addExpense(
        {
          category,
          amount: numAmount,
          description: description.trim(),
          date,
          user_id: currentUser?.id || 1,
        },
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );

      setAmount('');
      setDescription('');
      setIsAddOpen(false);
      await loadExpenses();
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense.');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Expense KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Logged Expenses
          </span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatKES(totalExpenses)}</p>
          <span className="text-xs text-slate-400">{expenses.length} operating records</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Profit Deductible
          </span>
          <p className="text-2xl font-bold text-slate-800 mt-1">100% Accounted</p>
          <span className="text-xs text-slate-400">Directly subtracted in Net Profit reports</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Audit Assurance
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">Staff Logged</p>
          <span className="text-xs text-slate-400">All expenses require description and staff name</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Category Filter:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No operating expenses recorded. Click "Record Expense" to add premises rent, utilities, packaging, or casual labor.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-700">{exp.date}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-semibold">{exp.description}</td>
                    <td className="py-3 px-4 text-slate-500">{exp.user_name || 'Staff'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {formatKES(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Record Operating Expense</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-3">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount (KES) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-base font-bold rounded-xl border border-slate-300 text-rose-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Expense
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Receipt Ref *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Kenya Power token purchase / Paper bags for POS"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
