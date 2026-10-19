import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  Receipt,
  RotateCcw,
  AlertCircle,
  FileText,
  DollarSign,
  PieChart,
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
      setVoidingSale(null);
      setVoidReason('');
      await fetchReports();
      await onRefreshData();
      alert(`Sale #${voidingSale.receipt_number} has been voided. Stock has been restored.`);
    } catch (err: any) {
      alert(`Failed to void sale: ${err.message}`);
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
        ['Credit Sales (Uncollected)', summary?.creditSalesTotal || 0],
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Preset Periods */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Past 7 Days' },
            { id: 'month', label: 'Past 30 Days' },
            { id: 'custom', label: 'Custom Period' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handlePeriodChange(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === btn.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Date Inputs & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriod('custom');
              }}
              className="px-2 py-1 rounded border border-slate-300 text-xs font-mono"
            />
            <span className="text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriod('custom');
              }}
              className="px-2 py-1 rounded border border-slate-300 text-xs font-mono"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main KPI Profitability Grid */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sales Revenue
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatKES(summary.revenue)}</p>
            <span className="text-xs text-slate-400">
              {summary.totalTransactions} non-voided transactions
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cost of Goods (COGS)
            </span>
            <p className="text-xl font-bold text-slate-700 mt-1">{formatKES(summary.cogs)}</p>
            <span className="text-xs text-slate-400">Inventory cost basis</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-teal-800 uppercase tracking-wider">
              Gross Profit
            </span>
            <p className="text-xl font-bold text-teal-700 mt-1">{formatKES(summary.grossProfit)}</p>
            <span className="text-xs text-slate-500">
              Margin: {summary.revenue > 0 ? ((summary.grossProfit / summary.revenue) * 100).toFixed(1) : 0}%
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Net Operating Profit
            </span>
            <p className={`text-xl font-bold mt-1 ${summary.netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {formatKES(summary.netOperatingProfit)}
            </p>
            <span className="text-xs text-slate-500">
              After {formatKES(summary.totalExpenses)} expenses
            </span>
          </div>
        </div>
      )}

      {/* Report View Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        {[
          { id: 'pnl', label: 'Profit & Loss Statement' },
          { id: 'sales', label: 'Detailed Sales Ledger' },
          { id: 'bestsellers', label: 'Top Selling Books' },
          { id: 'voids', label: 'Voided & Refund Audits' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id as any)}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeReportTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Formal P&L Statement */}
      {activeReportTab === 'pnl' && summary && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="font-bold text-base text-slate-900">Profit & Loss Statement (P&L)</h3>
            <p className="text-xs text-slate-500">
              Period: {startDate} to {endDate} (Kenyan Shillings KES)
            </p>
          </div>

          <div className="space-y-4 max-w-2xl font-mono text-xs">
            {/* Revenue */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>1. OPERATING REVENUE</span>
                <span>{formatKES(summary.revenue)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>Cash & M-Pesa Sales Collected:</span>
                <span>{formatKES(summary.cashReceived)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pl-4">
                <span>Credit Sales (Receivable Debt):</span>
                <span>{formatKES(summary.creditSalesTotal)}</span>
              </div>
            </div>

            {/* COGS */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between font-bold text-slate-800">
                <span>2. COST OF GOODS SOLD (COGS)</span>
                <span className="text-slate-700">({formatKES(summary.cogs)})</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-4 font-sans">
                Acquisition cost of books sold during period (preserves historical purchase cost).
              </p>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between font-bold text-teal-800 text-sm p-3 bg-teal-50/70 rounded-lg border border-teal-200">
              <span>GROSS PROFIT (1 − 2):</span>
              <span>{formatKES(summary.grossProfit)}</span>
            </div>

            {/* Expenses */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex justify-between font-bold text-slate-800">
                <span>3. OPERATING EXPENSES</span>
                <span className="text-rose-600">({formatKES(summary.totalExpenses)})</span>
              </div>
              <p className="text-[11px] text-slate-400 pl-4 font-sans">
                Shop premises rent, utility tokens, casual labor, licensing, and carrier bags.
              </p>
            </div>

            {/* Net Operating Profit */}
            <div className={`flex justify-between font-extrabold text-base p-4 rounded-xl border ${
              summary.netOperatingProfit >= 0
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}>
              <span>NET OPERATING PROFIT:</span>
              <span>{formatKES(summary.netOperatingProfit)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sales Ledger */}
      {activeReportTab === 'sales' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount (KES)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {salesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No sales found for selected period.
                    </td>
                  </tr>
                ) : (
                  salesList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.receipt_number}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDateTime(s.created_at)}</td>
                      <td className="py-3 px-4 text-slate-800">{s.customer_name || 'Walk-in'}</td>
                      <td className="py-3 px-4 text-slate-500">{s.cashier_name || 'Staff'}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {s.payment_method}
                          {s.payment_reference ? ` (${s.payment_reference})` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                        {formatKES(s.grand_total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {s.is_voided ? (
                          <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded">
                            VOIDED
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded">
                            COMPLETED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReceiptSale(s)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                          >
                            Receipt
                          </button>
                          {!s.is_voided && (
                            <button
                              onClick={() => {
                                setVoidingSale(s);
                                setVoidReason('');
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] font-semibold"
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Book Title</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Revenue (KES)</th>
                  <th className="py-3 px-4 text-right">Gross Profit (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No sales data for ranking in this period.
                    </td>
                  </tr>
                ) : (
                  topSellers.map((item, index) => (
                    <tr key={item.book_id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-400">#{index + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.book_title}</td>
                      <td className="py-3 px-4 text-slate-500">{item.author || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{item.category || 'General'}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-800">
                        {item.total_units_sold} copies
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatKES(item.total_revenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h4 className="font-bold text-xs text-slate-800">Controlled Void & Refund Audit Log</h4>
            <p className="text-[11px] text-slate-500">Every voided sale atomically restocks inventory and is logged here.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Original Date</th>
                  <th className="py-3 px-4">Voided At</th>
                  <th className="py-3 px-4 text-right">Amount (KES)</th>
                  <th className="py-3 px-4">Void Reason / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {salesList.filter((s) => s.is_voided).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Zero voided transactions recorded in this period.
                    </td>
                  </tr>
                ) : (
                  salesList
                    .filter((s) => s.is_voided)
                    .map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 bg-rose-50/20">
                        <td className="py-3 px-4 font-mono font-bold text-rose-700">{s.receipt_number}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDateTime(s.created_at)}</td>
                        <td className="py-3 px-4 text-slate-500">{formatDateTime(s.voided_at)}</td>
                        <td className="py-3 px-4 text-right font-bold text-rose-700">
                          {formatKES(s.grand_total)}
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-semibold">{s.void_reason || 'No reason specified'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controlled Void Dialog */}
      {voidingSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 bg-rose-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Void Sale #{voidingSale.receipt_number}</h3>
              <button onClick={() => setVoidingSale(null)} className="text-rose-300 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleVoidSale} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-1">
                <p className="font-bold">Warning: Controlled Reversal</p>
                <p>
                  Voiding this sale of <strong>{formatKES(voidingSale.grand_total)}</strong> will atomically restore all sold items back into in-store inventory and record an audit log.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Void / Refund *
                </label>
                <textarea
                  required
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Customer brought wrong syllabus edition / Cashier duplicate billing entry"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setVoidingSale(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
                >
                  Confirm Void & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
