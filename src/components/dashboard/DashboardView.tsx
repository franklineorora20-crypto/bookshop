import React from 'react';
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  PackagePlus,
  ReceiptText,
  Eye,
  BookOpen,
  Banknote,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  Truck,
  HardDrive,
} from 'lucide-react';
import { Sale } from '../../types/index.ts';
import { formatKES, formatNumber, formatDateTime } from '../../utils/formatters.ts';
import { StatusBadge } from '../common/StatusBadge.tsx';

interface LowStockBook {
  id: number;
  title: string;
  category: string;
  quantity: number;
  reorder_level: number;
  purchase_price: number;
}

interface DashboardMetrics {
  todaySalesCount: number;
  todayRevenue: number;
  todayProfit: number;
  todayCashRevenue: number;
  todayMpesaRevenue: number;
  todayCardRevenue: number;
  totalInventoryCount: number;
  totalInventoryCostValue: number;
  totalInventoryRetailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentSales: Sale[];
  lowStockBooks?: LowStockBook[];
  lastBackupTime?: string | null;
}

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  onNavigate: (tab: any) => void;
  onViewReceipt: (sale: Sale) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  loading,
  onNavigate,
  onViewReceipt,
}) => {
  if (loading || !metrics) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-500">Loading store metrics from local SQLite...</p>
        </div>
      </div>
    );
  }

  // Backup age calculation
  let backupDaysAgo: number | null = null;
  let isBackupOverdue = false;

  if (metrics.lastBackupTime) {
    const backupDate = new Date(metrics.lastBackupTime).getTime();
    if (!isNaN(backupDate)) {
      backupDaysAgo = Math.floor((Date.now() - backupDate) / (1000 * 60 * 60 * 24));
      isBackupOverdue = backupDaysAgo >= 2;
    }
  } else {
    isBackupOverdue = true;
  }

  const cashShare = metrics.todayRevenue > 0 ? (metrics.todayCashRevenue / metrics.todayRevenue) * 100 : 0;
  const mpesaShare = metrics.todayRevenue > 0 ? (metrics.todayMpesaRevenue / metrics.todayRevenue) * 100 : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Backup Freshness Alert Card (Turns RED after 2 days) */}
      {isBackupOverdue ? (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950">
                Database Backup Overdue! (
                {backupDaysAgo === null ? 'Never backed up' : `${backupDaysAgo} days since last backup`})
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                KitabuPOS stores records locally on this laptop. Back up daily to a USB flash drive to prevent data loss.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-xs tactile-btn min-h-[44px] flex items-center justify-center gap-1.5 shrink-0"
          >
            <HardDrive className="w-4 h-4" />
            <span>Download USB Backup Now</span>
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Last SQLite Backup:{' '}
              <strong className="text-neutral-900 font-semibold font-mono">
                {backupDaysAgo === 0 ? 'Today' : `${backupDaysAgo} day(s) ago`} ({formatDateTime(metrics.lastBackupTime)})
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="text-xs text-neutral-700 hover:text-neutral-900 font-semibold underline underline-offset-2"
          >
            Manage Backups
          </button>
        </div>
      )}

      {/* Primary Hero: Today's Sales & Cash vs M-Pesa Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today Total Revenue Card */}
        <div className="p-5 rounded-2xl bg-neutral-900 text-white shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Today's Sales Revenue
              </span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-emerald-400 text-xs font-mono font-medium">
                {metrics.todaySalesCount} receipt(s)
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white tabular-nums">
                {formatKES(metrics.todayRevenue)}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
            <span>Est. Gross Profit:</span>
            <span className="font-mono text-emerald-400 font-bold tabular-nums">
              {formatKES(metrics.todayProfit)}
            </span>
          </div>
        </div>

        {/* Cash vs M-Pesa Split Card */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                Today's Cash vs M-Pesa Tender Split
              </h3>
              <span className="text-xs text-neutral-500 font-mono">
                Total: {formatKES(metrics.todayRevenue)}
              </span>
            </div>

            {/* Split Visual Bar */}
            <div className="w-full h-3 rounded-full bg-neutral-100 overflow-hidden flex mb-4">
              <div
                style={{ width: `${cashShare}%` }}
                className="bg-emerald-600 transition-all duration-300"
                title={`Cash: ${cashShare.toFixed(1)}%`}
              />
              <div
                style={{ width: `${mpesaShare}%` }}
                className="bg-sky-600 transition-all duration-300"
                title={`M-Pesa: ${mpesaShare.toFixed(1)}%`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Cash Card */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold">Cash in Till</span>
                </div>
                <p className="text-lg font-mono font-bold text-neutral-900 tabular-nums">
                  {formatKES(metrics.todayCashRevenue)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">{cashShare.toFixed(0)}% of today's sales</p>
              </div>

              {/* M-Pesa Card */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70">
                <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-semibold">M-Pesa Till</span>
                </div>
                <p className="text-lg font-mono font-bold text-neutral-900 tabular-nums">
                  {formatKES(metrics.todayMpesaRevenue)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">{mpesaShare.toFixed(0)}% of today's sales</p>
              </div>

              {/* Card / External */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-xs text-neutral-600 mb-1">
                  <ReceiptText className="w-3.5 h-3.5 text-neutral-600" />
                  <span className="font-semibold">Card / Other</span>
                </div>
                <p className="text-lg font-mono font-bold text-neutral-900 tabular-nums">
                  {formatKES(metrics.todayCardRevenue)}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">PDQ / Bank swipe</p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100">
            <span>Fast Cashier Action:</span>
            <button
              type="button"
              onClick={() => onNavigate('pos')}
              className="font-bold text-neutral-900 hover:text-neutral-700 flex items-center gap-1 tactile-btn"
            >
              <span>Open POS Register (F2)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row: Inventory Stock Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500">Total Book Units</span>
          <p className="text-xl font-mono font-bold text-neutral-900 mt-1 tabular-nums">
            {formatNumber(metrics.totalInventoryCount)}
          </p>
          <span className="text-xs text-neutral-400">across catalog</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500">Retail Inventory Value</span>
          <p className="text-xl font-mono font-bold text-neutral-900 mt-1 tabular-nums">
            {formatKES(metrics.totalInventoryRetailValue)}
          </p>
          <span className="text-xs text-neutral-400">at selling price</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500">Low Stock Alert</span>
          <p className="text-xl font-mono font-bold text-amber-600 mt-1 tabular-nums">
            {metrics.lowStockCount} titles
          </p>
          <span className="text-xs text-neutral-400">needs reorder</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500">Out of Stock</span>
          <p className="text-xl font-mono font-bold text-rose-600 mt-1 tabular-nums">
            {metrics.outOfStockCount} titles
          </p>
          <span className="text-xs text-neutral-400">0 copies in shop</span>
        </div>
      </div>

      {/* Actionable Low Stock List with "Create Purchase Order" Button */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Low Stock & Out of Stock Titles ({metrics.lowStockCount + metrics.outOfStockCount})
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Titles that have reached or dropped below their reorder threshold.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('purchases')}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs shadow-xs tactile-btn min-h-[44px] flex items-center justify-center gap-1.5 shrink-0"
          >
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>Create Purchase Order (Alt+S)</span>
          </button>
        </div>

        {(!metrics.lowStockBooks || metrics.lowStockBooks.length === 0) ? (
          <div className="py-8 text-center text-neutral-400 text-xs">
            All registered books are currently adequately stocked above their reorder thresholds.
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Book Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Remaining</th>
                  <th className="px-4 py-3 text-center">Reorder Level</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {metrics.lowStockBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-semibold text-neutral-900">{b.title}</td>
                    <td className="px-4 py-3 text-neutral-500">{b.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          b.quantity <= 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.quantity} copies
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-neutral-500">{b.reorder_level}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-800">
                      {formatKES(b.purchase_price)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onNavigate('purchases')}
                        className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs tactile-btn"
                      >
                        Order Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sales Transactions */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">Recent Sales Receipts</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Latest transactions recorded at the counter.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="text-xs font-bold text-neutral-800 hover:text-neutral-900 underline underline-offset-2"
          >
            View Full Sales Ledger
          </button>
        </div>

        {metrics.recentSales.length === 0 ? (
          <div className="py-8 text-center text-neutral-400 text-xs">
            No sales recorded yet. Click 'New Sale' to make your first transaction.
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Receipt No</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {metrics.recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 font-mono font-bold text-neutral-900 select-all">
                      {s.receipt_number}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{s.customer_name || 'Walk-in'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-neutral-100 text-neutral-700 font-mono">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-neutral-900 tabular-nums">
                      {formatKES(s.grand_total)}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 font-mono text-xs">
                      {formatDateTime(s.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onViewReceipt(s)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg tactile-btn"
                        title="View receipt"
                        aria-label="View receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
