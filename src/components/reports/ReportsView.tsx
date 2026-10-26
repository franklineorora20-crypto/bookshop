import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
  UserCheck,
} from 'lucide-react';
import type { Book, Sale, User } from '../../types/index.ts';
import {
  getFinancialSummary,
  getSales,
  getTopSellingBooks,
  voidSale,
  getUsers,
  getCashUpReport,
  type CashUpReport,
} from '../../db/database.ts';
import {
  formatKES,
  formatDateTime,
  formatDate,
  getTodayNairobiDateString,
  getYesterdayNairobiDateString,
  getNairobiDateString,
} from '../../utils/formatters.ts';
import { exportToCSV } from '../../utils/csv.ts';
import { ReceiptModal } from '../pos/ReceiptModal.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Modal } from '../common/Modal.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { EmptyState } from '../common/EmptyState.tsx';
import type { ShopSettings } from '../../types/index.ts';

interface ReportsViewProps {
  books: Book[];
  currentUser: User | null;
  settings?: ShopSettings | null;
  onRefreshData: () => Promise<void>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  books,
  currentUser,
  settings = null,
  onRefreshData,
}) => {
  const today = getTodayNairobiDateString();
  const yesterday = getYesterdayNairobiDateString();

  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [activeReportTab, setActiveReportTab] = useState<'cashup' | 'pnl' | 'sales' | 'bestsellers' | 'voids'>('cashup');

  // General report data
  const [summary, setSummary] = useState<any>(null);
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Z-Report (Cash-up) specific state
  const [cashUpDate, setCashUpDate] = useState(today);
  const [cashUpCashierId, setCashUpCashierId] = useState<number | ''>('');
  const [cashiersList, setCashiersList] = useState<User[]>([]);
  const [cashUpData, setCashUpData] = useState<CashUpReport | null>(null);
  const [cashUpFloat, setCashUpFloat] = useState<string>('0');
  const [cashUpCounted, setCashUpCounted] = useState<string>('');
  const [cashUpNotes, setCashUpNotes] = useState<string>('');

  // Void modal state
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [isVoiding, setIsVoiding] = useState(false);

  // Period change handler
  const handlePeriodChange = (val: 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setPeriod(val);
    if (val === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (val === 'yesterday') {
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (val === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(getNairobiDateString(d));
      setEndDate(today);
    } else if (val === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(getNairobiDateString(d));
      setEndDate(today);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [sum, sales, best, users] = await Promise.all([
        getFinancialSummary(startDate, endDate),
        getSales({ startDate, endDate, limit: 200 }),
        getTopSellingBooks(15, startDate, endDate),
        getUsers(),
      ]);
      setSummary(sum);
      setSalesList(sales);
      setTopSellers(best);
      setCashiersList(users);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load financial reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchCashUp = async () => {
    try {
      const report = await getCashUpReport(
        cashUpDate,
        cashUpCashierId ? Number(cashUpCashierId) : undefined
      );
      setCashUpData(report);
    } catch (e) {
      console.error(e);
      toast.error('Failed to compute cash-up report');
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  useEffect(() => {
    fetchCashUp();
  }, [cashUpDate, cashUpCashierId]);

  const handleVoidSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingSale || !voidReason.trim()) return;

    setIsVoiding(true);
    try {
      await voidSale(
        voidingSale.id,
        voidReason.trim(),
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      toast.success(`Sale #${voidingSale.receipt_number} voided. Stock restored.`);
      setVoidingSale(null);
      setVoidReason('');
      await fetchReports();
      await fetchCashUp();
      await onRefreshData();
    } catch (err: any) {
      toast.error(`Failed to void sale: ${err.message}`);
    } finally {
      setIsVoiding(false);
    }
  };

  const handleExportCSV = () => {
    if (activeReportTab === 'cashup' && cashUpData) {
      const floatVal = parseFloat(cashUpFloat) || 0;
      const countedVal = parseFloat(cashUpCounted) || 0;
      const expectedCash = floatVal + cashUpData.cashSales - cashUpData.cashExpenses;
      const variance = countedVal - expectedCash;

      const headers = ['Z-Report Field', 'Value'];
      const rows = [
        ['Report Date', cashUpData.date],
        ['Cashier', cashUpData.cashierName],
        ['Completed Transactions', cashUpData.totalTransactions],
        ['Opening Cash Float (KES)', floatVal],
        ['Cash Sales (KES)', cashUpData.cashSales],
        ['M-Pesa Sales (KES)', cashUpData.mpesaSales],
        ['Card Sales (KES)', cashUpData.cardSales],
        ['Gross Sales Total (KES)', cashUpData.grossSales],
        ['Cash Expenses / Payouts (KES)', cashUpData.cashExpenses],
        ['Expected Cash In Drawer (KES)', expectedCash],
        ['Actual Counted Cash (KES)', countedVal],
        ['Cash Variance Over/Short (KES)', variance],
        ['Voided Transactions Count', cashUpData.voidedCount],
        ['Voided Amount (KES)', cashUpData.voidedTotal],
      ];
      exportToCSV(`KitabuPOS_ZReport_${cashUpData.date}_${cashUpData.cashierName.replace(/\s+/g, '_')}`, headers, rows);
    } else if (activeReportTab === 'pnl') {
      const headers = ['Financial Metric', 'Amount (KES)'];
      const rows = [
        ['Period Start', startDate],
        ['Period End', endDate],
        ['Gross Sales Revenue', summary?.revenue || 0],
        ['Cost of Goods Sold (COGS)', summary?.cogs || 0],
        ['Estimated Gross Profit', summary?.grossProfit || 0],
        ['Operating Expenses', summary?.totalExpenses || 0],
        ['Net Operating Profit', summary?.netOperatingProfit || 0],
        ['Cash Collected', summary?.cashReceived || 0],
      ];
      exportToCSV(`KitabuPOS_Profit_Loss_${startDate}_to_${endDate}`, headers, rows);
    } else if (activeReportTab === 'bestsellers') {
      const headers = ['Title', 'Author', 'Category', 'Units Sold', 'Revenue (KES)', 'Gross Profit (KES)'];
      const rows = topSellers.map((b) => [
        b.book_title,
        b.author || '',
        b.category || '',
        b.total_units_sold,
        b.total_revenue,
        b.estimated_gross_profit,
      ]);
      exportToCSV(`KitabuPOS_Top_Sellers_${startDate}_to_${endDate}`, headers, rows);
    } else {
      const headers = ['Receipt #', 'Date', 'Customer', 'Cashier', 'Method', 'Total (KES)', 'Status', 'Ref Code'];
      const rows = salesList.map((s) => [
        s.receipt_number,
        s.created_at,
        s.customer_name || 'Walk-in',
        s.cashier_name || 'Cashier',
        s.payment_method,
        s.grand_total,
        s.is_voided ? 'VOIDED' : 'COMPLETED',
        s.payment_reference || '',
      ]);
      exportToCSV(`KitabuPOS_Sales_Ledger_${startDate}_to_${endDate}`, headers, rows);
    }
  };

  // Cash-up variance calculations
  const openingFloatNum = parseFloat(cashUpFloat) || 0;
  const countedCashNum = parseFloat(cashUpCounted) || 0;
  const expectedCashInTill = cashUpData
    ? openingFloatNum + cashUpData.cashSales - cashUpData.cashExpenses
    : 0;
  const cashVariance = cashUpCounted.trim() !== '' ? countedCashNum - expectedCashInTill : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Toolbar: Report Navigation & Global Actions */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Report Category Tabs */}
        <div className="flex rounded-lg bg-neutral-100 p-1 text-sm font-medium overflow-x-auto">
          {[
            { id: 'cashup', label: 'Cash-Up (Z) Report' },
            { id: 'pnl', label: 'Profit & Loss (P&L)' },
            { id: 'sales', label: 'Sales Ledger' },
            { id: 'bestsellers', label: 'Best Selling Books' },
            { id: 'voids', label: 'Void Audits' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`min-h-[40px] px-4 py-2 rounded-md transition-all whitespace-nowrap ${
                activeReportTab === tab.id
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Export & Print Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            onClick={handleExportCSV}
            className="min-h-[40px]"
          >
            <Download className="w-4 h-4 text-neutral-500" />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => window.print()}
            className="min-h-[40px]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Layout</span>
          </Button>
        </div>
      </div>

      {/* Date Filter Bar for P&L, Sales, and Bestsellers */}
      {activeReportTab !== 'cashup' && (
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-neutral-600 mr-2">Preset Range:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week (7d)' },
              { id: 'month', label: 'This Month (30d)' },
              { id: 'custom', label: 'Custom' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => handlePeriodChange(btn.id as any)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === btn.id
                    ? 'bg-neutral-900 text-white font-semibold'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <span className="text-xs uppercase font-bold text-neutral-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod('custom');
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-neutral-200 text-sm font-mono text-neutral-900"
            />
            <span className="text-xs uppercase font-bold text-neutral-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod('custom');
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-neutral-200 text-sm font-mono text-neutral-900"
            />
          </div>
        </div>
      )}

      {/* TAB 1: Cash-Up (Z) End-of-Day Report */}
      {activeReportTab === 'cashup' && (
        <div className="space-y-6">
          {/* Cashier & Date Selection Controls */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Reconciliation Date (Nairobi EAT)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={cashUpDate}
                  onChange={(e) => setCashUpDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm font-mono rounded-lg border border-neutral-200 bg-white"
                />
                <button
                  onClick={() => setCashUpDate(today)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold bg-neutral-50 hover:bg-neutral-100 whitespace-nowrap"
                >
                  Today
                </button>
                <button
                  onClick={() => setCashUpDate(yesterday)}
                  className="min-h-[44px] px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold bg-neutral-50 hover:bg-neutral-100 whitespace-nowrap"
                >
                  Yesterday
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Cashier / Till Operator
              </label>
              <select
                value={cashUpCashierId}
                onChange={(e) => setCashUpCashierId(e.target.value ? Number(e.target.value) : '')}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white"
              >
                <option value="">All Cashiers (Full Shop Shift)</option>
                {cashiersList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Opening Cash Float (KES)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={cashUpFloat}
                onChange={(e) => setCashUpFloat(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm font-mono rounded-lg border border-neutral-200 bg-white"
              />
            </div>
          </div>

          {/* Cash Reconciliation Grid */}
          {cashUpData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: System Expected Figures */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                    <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-neutral-700" />
                      <span>System Recorded Totals — {cashUpData.cashierName}</span>
                    </h3>
                    <span className="text-xs font-mono font-medium text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {cashUpData.date}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                      <span className="text-xs text-neutral-500 font-medium">Completed Sales</span>
                      <p className="text-lg font-bold font-mono text-neutral-900 mt-1 tabular-nums">
                        {cashUpData.totalTransactions}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100">
                      <span className="text-xs text-neutral-500 font-medium">Total Gross Sales</span>
                      <p className="text-lg font-bold font-mono text-neutral-900 mt-1 tabular-nums">
                        {formatKES(cashUpData.grossSales)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <span className="text-xs text-emerald-800 font-medium">Cash Collected</span>
                      <p className="text-lg font-bold font-mono text-emerald-950 mt-1 tabular-nums">
                        {formatKES(cashUpData.cashSales)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                      <span className="text-xs text-emerald-800 font-medium">M-Pesa Collected</span>
                      <p className="text-lg font-bold font-mono text-emerald-950 mt-1 tabular-nums">
                        {formatKES(cashUpData.mpesaSales)}
                      </p>
                    </div>
                  </div>

                  {/* Cash Flow Breakdown Table */}
                  <div className="pt-2">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-neutral-100 font-mono">
                        <tr className="hover:bg-neutral-50/50">
                          <td className="py-2.5 text-neutral-600 font-sans">1. Opening Till Float</td>
                          <td className="py-2.5 text-right font-bold text-neutral-900 tabular-nums">
                            {formatKES(openingFloatNum)}
                          </td>
                        </tr>
                        <tr className="hover:bg-neutral-50/50">
                          <td className="py-2.5 text-neutral-600 font-sans">2. Cash Sales from Orders (+)</td>
                          <td className="py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                            + {formatKES(cashUpData.cashSales)}
                          </td>
                        </tr>
                        <tr className="hover:bg-neutral-50/50">
                          <td className="py-2.5 text-neutral-600 font-sans">3. Cash Paid Out (Expenses) (-)</td>
                          <td className="py-2.5 text-right font-bold text-rose-700 tabular-nums">
                            - {formatKES(cashUpData.cashExpenses)}
                          </td>
                        </tr>
                        <tr className="bg-neutral-50/80 font-bold">
                          <td className="py-3 px-2 text-neutral-900 font-sans text-base">
                            EXPECTED CASH IN DRAWER:
                          </td>
                          <td className="py-3 px-2 text-right text-lg text-neutral-900 tabular-nums">
                            {formatKES(expectedCashInTill)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Voids & Non-Cash breakdown */}
                  <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-2">
                    <div>
                      <span>Card Payments: </span>
                      <strong className="text-neutral-800 font-mono">{formatKES(cashUpData.cardSales)}</strong>
                    </div>
                    <div>
                      <span>Voided Receipts: </span>
                      <strong className="text-neutral-800 font-mono">
                        {cashUpData.voidedCount} ({formatKES(cashUpData.voidedTotal)})
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Physical Cash Counting & Variance */}
              <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-neutral-900 flex items-center gap-2 pb-3 border-b border-neutral-100">
                  <DollarSign className="w-5 h-5 text-neutral-700" />
                  <span>Physical Cash Count</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Total Cash Counted in Drawer (KES) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter physical cash counted..."
                    value={cashUpCounted}
                    onChange={(e) => setCashUpCounted(e.target.value)}
                    className="w-full min-h-[48px] px-3 py-2 text-lg font-mono font-bold rounded-lg border-2 border-neutral-300 focus:border-neutral-900 focus:outline-none"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Count notes and coins physically present in the till drawer.
                  </p>
                </div>

                {/* Variance Display Card */}
                {cashVariance !== null && (
                  <div
                    className={`p-4 rounded-xl border-2 space-y-2 ${
                      Math.abs(cashVariance) < 0.01
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : cashVariance > 0
                        ? 'bg-amber-50 border-amber-300 text-amber-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {Math.abs(cashVariance) < 0.01 ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : cashVariance > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <span className="font-bold text-sm">
                        {Math.abs(cashVariance) < 0.01
                          ? 'Drawer Balanced Exactly'
                          : cashVariance > 0
                          ? 'Cash Over (+ Surplus)'
                          : 'Cash Short (- Shortage)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-xs uppercase font-semibold">Variance:</span>
                      <span className="text-2xl font-bold font-mono tabular-nums">
                        {cashVariance > 0 ? `+${formatKES(cashVariance)}` : formatKES(cashVariance)}
                      </span>
                    </div>

                    <p className="text-xs opacity-80 pt-1">
                      {Math.abs(cashVariance) < 0.01
                        ? 'Physical count matches expected cash.'
                        : cashVariance > 0
                        ? 'You have more cash in the drawer than recorded in system.'
                        : 'You have less cash in drawer than recorded. Check for unrecorded payouts or incorrect change.'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    End-of-Day Shift Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Returned KES 50 change to customer; petty cash voucher #12 attached."
                    value={cashUpNotes}
                    onChange={(e) => setCashUpNotes(e.target.value)}
                    className="w-full p-2.5 text-sm rounded-lg border border-neutral-200"
                  />
                </div>

                <Button
                  variant="primary"
                  className="w-full min-h-[44px]"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Shift Z-Report</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Profit & Loss Statement (P&L) */}
      {activeReportTab === 'pnl' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Sales Revenue
              </span>
              <p className="text-2xl font-bold text-neutral-900 mt-1 tabular-nums font-mono">
                {formatKES(summary.revenue)}
              </p>
              <span className="text-xs text-neutral-500 tabular-nums">
                {summary.totalTransactions} transactions
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Cost of Goods (COGS)
              </span>
              <p className="text-2xl font-bold text-neutral-800 mt-1 tabular-nums font-mono">
                {formatKES(summary.cogs)}
              </p>
              <span className="text-xs text-neutral-500">Inventory cost basis</span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Gross Profit
              </span>
              <p className="text-2xl font-bold text-neutral-900 mt-1 tabular-nums font-mono">
                {formatKES(summary.grossProfit)}
              </p>
              <span className="text-xs text-neutral-500 font-medium">
                Margin: {summary.revenue > 0 ? ((summary.grossProfit / summary.revenue) * 100).toFixed(1) : 0}%
              </span>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Net Operating Profit
              </span>
              <p
                className={`text-2xl font-bold mt-1 tabular-nums font-mono ${
                  summary.netOperatingProfit >= 0 ? 'text-neutral-900' : 'text-rose-600'
                }`}
              >
                {formatKES(summary.netOperatingProfit)}
              </p>
              <span className="text-xs text-neutral-500">
                After {formatKES(summary.totalExpenses)} expenses
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs space-y-6 max-w-3xl">
            <div className="border-b border-neutral-200 pb-3">
              <h3 className="font-bold text-base text-neutral-900">Profit & Loss Statement (P&L)</h3>
              <p className="text-xs text-neutral-500">
                Period: {startDate} to {endDate} (Kenyan Shillings KES)
              </p>
            </div>

            <div className="space-y-4 text-sm font-mono">
              <div className="space-y-2">
                <div className="font-bold font-sans text-neutral-800 text-xs uppercase tracking-wider">
                  Operating Income
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100">
                  <span className="text-neutral-600 font-sans">Gross Sales</span>
                  <span className="font-bold text-neutral-900">{formatKES(summary.revenue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100 text-neutral-600 font-sans">
                  <span>Less: Cost of Goods Sold (COGS)</span>
                  <span className="text-rose-700 font-mono">- {formatKES(summary.cogs)}</span>
                </div>
                <div className="flex justify-between py-2 font-bold bg-neutral-50 px-2 rounded">
                  <span className="text-neutral-900 font-sans">GROSS PROFIT:</span>
                  <span className="text-neutral-900">{formatKES(summary.grossProfit)}</span>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="font-bold font-sans text-neutral-800 text-xs uppercase tracking-wider">
                  Operating Expenses
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-100 text-neutral-600 font-sans">
                  <span>Total Recorded Shop Expenses</span>
                  <span className="text-rose-700 font-mono">- {formatKES(summary.totalExpenses)}</span>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-neutral-900 flex justify-between items-center text-base font-bold">
                <span className="text-neutral-900 font-sans">NET OPERATING PROFIT / (LOSS):</span>
                <span className={summary.netOperatingProfit >= 0 ? 'text-emerald-700 font-mono' : 'text-rose-600 font-mono'}>
                  {formatKES(summary.netOperatingProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Sales Ledger */}
      {activeReportTab === 'sales' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {salesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12">
                      <EmptyState
                        icon={<Receipt className="w-6 h-6" />}
                        title="No sales recorded"
                        description="There are no completed sales transactions in this date range."
                      />
                    </td>
                  </tr>
                ) : (
                  salesList.map((sale) => (
                    <tr key={sale.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        {sale.receipt_number}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 tabular-nums">
                        {formatDateTime(sale.created_at)}
                      </td>
                      <td className="py-3 px-4 text-neutral-800">
                        {sale.customer_name || 'Walk-in'}
                      </td>
                      <td className="py-3 px-4 text-neutral-700">
                        {sale.cashier_name || 'Cashier'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-neutral-100 font-medium">
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {formatKES(sale.grand_total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {sale.is_voided ? (
                          <StatusBadge status="danger" label="Voided" />
                        ) : (
                          <StatusBadge status="success" label="Completed" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReceiptSale(sale)}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {!sale.is_voided && (
                            <button
                              onClick={() => {
                                setVoidingSale(sale);
                                setVoidReason('');
                              }}
                              className="min-h-[36px] px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md font-medium"
                              title="Void Sale & Restock"
                            >
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Best Selling Titles */}
      {activeReportTab === 'bestsellers' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12">
                      <EmptyState
                        icon={<TrendingUp className="w-6 h-6" />}
                        title="No bestselling data"
                        description="No books were sold during this period."
                      />
                    </td>
                  </tr>
                ) : (
                  topSellers.map((item, idx) => (
                    <tr key={item.book_id || idx} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-500">
                        #{idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-neutral-900">
                        {item.book_title}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        {item.author || '—'}
                      </td>
                      <td className="py-3 px-4 text-neutral-600">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-xs">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-neutral-900 tabular-nums">
                        {item.total_units_sold}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {formatKES(item.total_revenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                        {formatKES(item.estimated_gross_profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Void Audits */}
      {activeReportTab === 'voids' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4 text-right">Voided Amount</th>
                  <th className="py-3 px-4">Reason for Void</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {salesList.filter((s) => s.is_voided).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12">
                      <EmptyState
                        icon={<RotateCcw className="w-6 h-6" />}
                        title="No voided transactions"
                        description="There are no voided sales during this period."
                      />
                    </td>
                  </tr>
                ) : (
                  salesList
                    .filter((s) => s.is_voided)
                    .map((sale) => (
                      <tr key={sale.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                          {sale.receipt_number}
                        </td>
                        <td className="py-3 px-4 text-neutral-600 tabular-nums">
                          {formatDateTime(sale.created_at)}
                        </td>
                        <td className="py-3 px-4 text-neutral-800">
                          {sale.cashier_name || 'Cashier'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 tabular-nums">
                          {formatKES(sale.grand_total)}
                        </td>
                        <td className="py-3 px-4 text-neutral-700 italic">
                          "{sale.void_reason || 'No reason specified'}"
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Modal Preview */}
      {selectedReceiptSale && (
        <ReceiptModal
          sale={selectedReceiptSale}
          settings={settings}
          onClose={() => setSelectedReceiptSale(null)}
          onNewSale={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* Void Sale Reason Modal */}
      <Modal
        isOpen={!!voidingSale}
        onClose={() => setVoidingSale(null)}
        title={`Void Sale #${voidingSale?.receipt_number}`}
        maxWidth="md"
      >
        <form onSubmit={handleVoidSale} className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            Warning: Voiding this sale will return all items to inventory stock and mark this receipt
            as VOID in reports. This action cannot be undone.
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Reason for Void *
            </label>
            <textarea
              required
              rows={3}
              autoFocus
              placeholder="e.g. Customer changed mind, wrong book scanned, transaction error..."
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full p-3 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setVoidingSale(null)}
              disabled={isVoiding}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              loading={isVoiding}
            >
              Confirm Void & Restock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
