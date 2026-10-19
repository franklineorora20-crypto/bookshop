import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  ReceiptText,
  Plus,
  AlertCircle,
  X,
} from 'lucide-react';
import { Expense, ExpenseCategory, User } from '../../types/index.ts';
import { getExpenses, addExpense } from '../../db/database.ts';
import { formatKES, getTodayNairobiDateString } from '../../utils/formatters.ts';

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

      toast.success(`Expense logged: KES ${numAmount.toLocaleString()} (${category})`);
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
      {/* Top Expense KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Total Logged Expenses
          </span>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums">
            {formatKES(totalExpenses)}
          </p>
          <span className="text-[11px] text-neutral-400 tabular-nums">{expenses.length} operating records</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Accounting Treatment
          </span>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1">100% Deductible</p>
          <span className="text-[11px] text-neutral-400">Subtracted directly in Net Operating Profit</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Audit Trail
          </span>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1">Staff Attributed</p>
          <span className="text-[11px] text-neutral-400">Every expenditure logs cashier and description</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 font-medium">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-neutral-200 bg-white font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
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
          className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors shrink-0 tactile-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Logged By</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    No operating expenses recorded yet. Click "Record Expense" to add rent, utilities, packaging, or licenses.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-neutral-600 tabular-nums">{exp.date}</td>
                    <td className="py-2.5 px-4 text-neutral-800 font-medium">{exp.category}</td>
                    <td className="py-2.5 px-4 text-neutral-700">{exp.description}</td>
                    <td className="py-2.5 px-4 text-neutral-400">{exp.user_name || 'Staff'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-neutral-900 tabular-nums">
                      {formatKES(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal with Emil Kowalski spring animations */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsAddOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-md w-full overflow-hidden text-neutral-900 z-10"
            >
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-4 h-4 text-neutral-600" />
                  <h3 className="font-semibold text-sm tracking-tight text-neutral-900">
                    Record Operating Expense
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="p-5 space-y-3.5">
                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white font-medium focus:outline-none focus:border-neutral-900"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Amount (KES) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-base font-mono font-semibold rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:border-neutral-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Date of Expense
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 font-mono text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Description / Receipt Reference *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Kenya Power token purchase / Paper bags for POS"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-xs tactile-btn"
                  >
                    Save Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
