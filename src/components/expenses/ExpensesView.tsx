import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  ReceiptText,
  Plus,
  AlertCircle,
  Search,
  DollarSign,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import type { Expense, ExpenseCategory, User } from '../../types/index.ts';
import { getExpenses, addExpense } from '../../db/database.ts';
import { formatKES, getTodayNairobiDateString } from '../../utils/formatters.ts';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Modal } from '../common/Modal.tsx';
import { EmptyState } from '../common/EmptyState.tsx';

interface ExpensesViewProps {
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currentUser, onRefreshData }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Rent');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayNairobiDateString());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      toast.error('Failed to load expenses');
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

    setSubmitting(true);
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

      toast.success(`Expense logged: ${formatKES(numAmount)} (${category})`);
      setAmount('');
      setDescription('');
      setIsAddOpen(false);
      await loadExpenses();
      await onRefreshData();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        exp.description?.toLowerCase().includes(q) ||
        exp.category?.toLowerCase().includes(q) ||
        exp.user_name?.toLowerCase().includes(q)
      );
    });
  }, [expenses, searchQuery]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Expense KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Total Logged Expenses
          </span>
          <p className="text-2xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums font-mono">
            {formatKES(totalExpenses)}
          </p>
          <span className="text-xs text-neutral-500 tabular-nums">
            {filteredExpenses.length} operating records
          </span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Accounting Treatment
          </span>
          <p className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">100% Deductible</p>
          <span className="text-xs text-neutral-500">Subtracted in Net Operating Profit and Cash-Up</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Audit Trail
          </span>
          <p className="text-2xl font-bold tracking-tight text-neutral-900 mt-1">Staff Attributed</p>
          <span className="text-xs text-neutral-500">Every expenditure logs cashier and voucher info</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              Category:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[40px] px-3 py-1.5 text-sm rounded-lg border border-neutral-200 bg-white font-medium text-neutral-800 focus:outline-none focus:border-neutral-900"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search description / payee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setError(null);
            setAmount('');
            setDescription('');
            setIsAddOpen(true);
          }}
          className="min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </Button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description / Reference</th>
                <th className="py-3 px-4">Logged By</th>
                <th className="py-3 px-4 text-right">Amount (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12">
                    <EmptyState
                      icon={<ReceiptText className="w-6 h-6" />}
                      title="No operating expenses recorded"
                      description={
                        searchQuery
                          ? 'No expense vouchers matched your search.'
                          : 'Record cash payouts such as electricity tokens, rent, transport, or packaging bags.'
                      }
                      actionLabel={searchQuery ? undefined : 'Record First Expense'}
                      onAction={searchQuery ? undefined : () => setIsAddOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-neutral-600 tabular-nums">{exp.date}</td>
                    <td className="py-3 px-4 text-neutral-900 font-medium">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-xs font-semibold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-800">{exp.description}</td>
                    <td className="py-3 px-4 text-neutral-500">{exp.user_name || 'Staff'}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
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
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Record Operating Expense / Till Payout"
        maxWidth="md"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Expense Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white font-medium focus:border-neutral-900"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Amount (KES) *"
            type="number"
            step="any"
            required
            autoFocus
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Date of Payout *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 font-mono text-sm rounded-lg border border-neutral-200 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Description / Voucher Reference *
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Kenya Power token purchase / Paper bags for POS"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-sm rounded-lg border border-neutral-200 focus:border-neutral-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setIsAddOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={submitting}
            >
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
