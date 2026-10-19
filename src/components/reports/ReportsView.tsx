import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Download,
  Printer,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { Book, Sale, User } from '../../types/index.ts';
import { getFinancialSummary, getSales, getTopSellingBooks, voidSale } from '../../db/database.ts';
import { formatKES, formatDateTime, getTodayNairobiDateString } from '../../utils/formatters.ts';
import { exportToCSV } from '../../utils/csv.ts';
import { ReceiptModal } from '../pos/ReceiptModal.tsx';

interface ReportsViewProps {
  books: Book[];
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  books,
  currentUser,
  onRefreshData,
}) => {
  const today = getTodayNairobiDateString();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'sales' | 'bestsellers' | 'voids'>('pnl');

  const [summary, setSummary] = useState<any>(null);
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Void modal state
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);

  // Period change helper
  const handlePeriodChange = (val: 'today' | 'week' | 'month' | 'custom') => {
    setPeriod(val);
    const now = new Date();
    if (val === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (val === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (val === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [sum, sales, best] = await Promise.all([
        getFinancialSummary(startDate, endDate),
        getSales({ startDate, endDate, limit: 150 }),
        getTopSellingBooks(10, startDate, endDate),
      ]);
      setSummary(sum);
      setSalesList(sales);
      setTopSellers(best);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleVoidSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidingSale || !voidReason.trim()) return;

    try {
      await voidSale(
        voidingSale.id,
        voidReason.trim(),
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      toast.success(`Sale #${voidingSale.receipt_number} voided. Inventory restocked.`);
      setVoidingSale(null);
      setVoidReason('');
      await fetchReports();
      await onRefreshData();
    } catch (err: any) {
      toast.error(`Failed to void sale: ${err.message}`);
    }
  };

  const handleExportCSV = () => {
    if (activeReportTab === 'pnl') {
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Date Range Selector Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Preset Periods Segmented Control */}
        <div className="flex rounded-lg bg-neutral-100 p-1 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: '7 Days' },
            { id: 'month', label: '30 Days' },
            { id: 'custom', label: 'Custom' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handlePeriodChange(btn.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all tactile-btn ${
                period === btn.id
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod('custom');
              }}
              className="px-2 py-1 rounded-lg border border-neutral-200 text-xs font-mono text-neutral-800"
            />
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod('custom');
              }}
              className="px-2 py-1 rounded-lg border border-neutral-200 text-xs font-mono text-neutral-800"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-medium shadow-xs tactile-btn"
          >
            <Download className="w-3.5 h-3.5 text-neutral-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs tactile-btn"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main KPI Profitability Grid */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Sales Revenue
            </span>
            <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums">
              {formatKES(summary.revenue)}
            </p>
            <span className="text-[11px] text-neutral-400 tabular-nums">
              {summary.totalTransactions} transactions
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Cost of Goods (COGS)
            </span>
            <p className="text-xl font-bold tracking-tight text-neutral-800 mt-1 tabular-nums">
              {formatKES(summary.cogs)}
            </p>
            <span className="text-[11px] text-neutral-400">Inventory cost basis</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Gross Profit
            </span>
            <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums">
              {formatKES(summary.grossProfit)}
            </p>
            <span className="text-[11px] text-neutral-500">
              Margin: {summary.revenue > 0 ? ((summary.grossProfit / summary.revenue) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Net Operating Profit
            </span>
            <p className={`text-xl font-bold tracking-tight mt-1 tabular-nums ${summary.netOperatingProfit >= 0 ? 'text-neutral-900' : 'text-rose-600'}`}>
              {formatKES(summary.netOperatingProfit)}
            </p>
            <span className="text-[11px] text-neutral-400">
              After {formatKES(summary.totalExpenses)} expenses
            </span>
          </div>
        </div>
      )}

      {/* Report View Tabs - Segmented Style */}
      <div className="flex rounded-lg bg-neutral-100 p-1 text-xs max-w-2xl">
        {[
          { id: 'pnl', label: 'Profit & Loss Statement' },
          { id: 'sales', label: 'Sales Ledger' },
          { id: 'bestsellers', label: 'Top Selling Titles' },
          { id: 'voids', label: 'Void Audits' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id as any)}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all text-center tactile-btn ${
              activeReportTab === tab.id
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Formal P&L Statement */}
      {activeReportTab === 'pnl' && summary && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="font-semibold text-sm tracking-tight text-neutral-900">Profit & Loss Statement (P&L)</h3>
            <p className="text-xs text-neutral-400">
              Period: {startDate} to {endDate} (Kenyan Shillings KES)
            </p>
          </div>

          <div className="space-y-4 max-w-2xl text-xs font-mono">
            {/* Revenue */}
            <div className="space-y-1">
              <div className="flex justify-between font-semibold text-neutral-900 text-sm">
                <span>1. OPERATING REVENUE</span>
                <span className="tabular-nums">{formatKES(summary.revenue)}</span>
              </div>
              <div className="flex justify-between text-neutral-500 pl-4">
                <span>Collections (Cash, M-Pesa, Card & Split):</span>
                <span className="tabular-nums">{formatKES(summary.cashReceived)}</span>
              </div>
            </div>

            {/* COGS */}
            <div className="space-y-1 pt-2 border-t border-neutral-100">
              <div className="flex justify-between font-semibold text-neutral-800">
                <span>2. COST OF GOODS SOLD (COGS)</span>
                <span className="text-neutral-700 tabular-nums">({formatKES(summary.cogs)})</span>
              </div>
              <p className="text-[11px] text-neutral-400 pl-4 font-sans">
                Acquisition cost of books sold during period.
              </p>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between font-semibold text-neutral-900 text-sm p-3 bg-neutral-50 rounded-lg border border-neutral-200/70">
              <span>GROSS PROFIT (1 − 2):</span>
              <span className="tabular-nums">{formatKES(summary.grossProfit)}</span>
            </div>

            {/* Expenses */}
            <div className="space-y-1 pt-2 border-t border-neutral-100">
              <div className="flex justify-between font-semibold text-neutral-800">
                <span>3. OPERATING EXPENSES</span>
                <span className="text-neutral-700 tabular-nums">({formatKES(summary.totalExpenses)})</span>
              </div>
              <p className="text-[11px] text-neutral-400 pl-4 font-sans">
                Shop premises rent, utilities, packaging, licensing, and casual labor.
              </p>
            </div>

            {/* Net Operating Profit */}
            <div className="flex justify-between font-bold text-sm p-3.5 rounded-lg bg-neutral-900 text-white shadow-xs">
              <span>NET OPERATING PROFIT:</span>
              <span className="tabular-nums">{formatKES(summary.netOperatingProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sales Ledger */}
      {activeReportTab === 'sales' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Date / Time</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Cashier</th>
                  <th className="py-2.5 px-4">Payment</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {salesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      No sales found for selected period.
                    </td>
                  </tr>
                ) : (
                  salesList.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-neutral-900">{s.receipt_number}</td>
                      <td className="py-2.5 px-4 text-neutral-500 tabular-nums">{formatDateTime(s.created_at)}</td>
                      <td className="py-2.5 px-4 text-neutral-700">{s.customer_name || 'Walk-in'}</td>
                      <td className="py-2.5 px-4 text-neutral-400">{s.cashier_name || 'Staff'}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] uppercase text-neutral-600">
                        {s.payment_method}
                        {s.payment_reference ? ` (${s.payment_reference})` : ''}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-neutral-900 tabular-nums">
                        {formatKES(s.grand_total)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`font-mono text-[10px] uppercase font-medium ${s.is_voided ? 'text-rose-600' : 'text-neutral-700'}`}>
                          {s.is_voided ? 'VOIDED' : 'COMPLETED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedReceiptSale(s)}
                            className="px-2 py-0.5 border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded text-[11px] font-medium transition-colors tactile-btn"
                          >
                            Receipt
                          </button>
                          {!s.is_voided && (
                            <button
                              onClick={() => {
                                setVoidingSale(s);
                                setVoidReason('');
                              }}
                              className="px-2 py-0.5 border border-neutral-200 text-rose-600 hover:bg-rose-50 rounded text-[11px] font-medium transition-colors tactile-btn"
                              title="Void transaction and restock inventory"
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

      {/* Tab 3: Best Sellers */}
      {activeReportTab === 'bestsellers' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Rank</th>
                  <th className="py-2.5 px-4">Book Title</th>
                  <th className="py-2.5 px-4">Author</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-center">Units Sold</th>
                  <th className="py-2.5 px-4 text-right">Revenue</th>
                  <th className="py-2.5 px-4 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      No sales data for ranking in this period.
                    </td>
                  </tr>
                ) : (
                  topSellers.map((item, index) => (
                    <tr key={item.book_id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-neutral-400">#{index + 1}</td>
                      <td className="py-2.5 px-4 font-medium text-neutral-900">{item.book_title}</td>
                      <td className="py-2.5 px-4 text-neutral-500">{item.author || '—'}</td>
                      <td className="py-2.5 px-4 text-neutral-600">{item.category || 'General'}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-medium text-neutral-900 tabular-nums">
                        {item.total_units_sold}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium text-neutral-900 tabular-nums">
                        {formatKES(item.total_revenue)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-neutral-700 tabular-nums">
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

      {/* Tab 4: Voids and Refunds Audit */}
      {activeReportTab === 'voids' && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-neutral-50/70 border-b border-neutral-100">
            <h4 className="font-semibold text-xs text-neutral-900">Controlled Void & Refund Audit Log</h4>
            <p className="text-[11px] text-neutral-400">Every voided sale atomically restocks inventory and is recorded here.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Original Date</th>
                  <th className="py-2.5 px-4">Voided At</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4">Void Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {salesList.filter((s) => s.is_voided).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400">
                      Zero voided transactions recorded in this period.
                    </td>
                  </tr>
                ) : (
                  salesList
                    .filter((s) => s.is_voided)
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-rose-600">{s.receipt_number}</td>
                        <td className="py-2.5 px-4 text-neutral-500 tabular-nums">{formatDateTime(s.created_at)}</td>
                        <td className="py-2.5 px-4 text-neutral-500 tabular-nums">{formatDateTime(s.voided_at)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-medium text-rose-600 tabular-nums">
                          {formatKES(s.grand_total)}
                        </td>
                        <td className="py-2.5 px-4 text-neutral-700">{s.void_reason || 'No reason specified'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controlled Void Dialog with spring animations */}
      <AnimatePresence>
        {voidingSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setVoidingSale(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-md w-full overflow-hidden text-neutral-900 z-10"
            >
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="font-semibold text-sm tracking-tight text-neutral-900">
                  Void Sale #{voidingSale.receipt_number}
                </h3>
                <button onClick={() => setVoidingSale(null)} className="p-1 rounded-md text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleVoidSale} className="p-5 space-y-4">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-700 space-y-1">
                  <p className="font-medium text-neutral-900">Controlled Reversal Notice</p>
                  <p className="text-neutral-500">
                    Voiding this sale of <strong>{formatKES(voidingSale.grand_total)}</strong> will atomically return all line items back into book inventory.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Reason for Void / Refund *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    placeholder="e.g. Customer brought wrong syllabus edition / Cashier duplicate billing entry"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                    autoFocus
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setVoidingSale(null)}
                    className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium shadow-xs tactile-btn"
                  >
                    Confirm Void & Restock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Printable Receipt */}
      {selectedReceiptSale && (
        <ReceiptModal
          sale={selectedReceiptSale}
          settings={null}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}
    </div>
  );
};
