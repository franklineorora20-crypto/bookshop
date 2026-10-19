import React from 'react';
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  PackagePlus,
  ReceiptText,
  Eye,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Sale } from '../../types/index.ts';
import { formatKES, formatNumber, formatDateTime } from '../../utils/formatters.ts';

interface DashboardMetrics {
  todaySalesCount: number;
  todayRevenue: number;
  todayProfit: number;
  totalInventoryCount: number;
  totalInventoryCostValue: number;
  totalInventoryRetailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentSales: Sale[];
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
          <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-neutral-400">Loading store metrics from local SQLite...</p>
        </div>
      </div>
    );
  }

  const profitMarginPercent =
    metrics.todayRevenue > 0
      ? Math.round(((metrics.todayProfit / metrics.todayRevenue) * 100) * 10) / 10
      : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-neutral-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              Offline Retail POS
            </span>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 mt-0.5">
            Store Overview & Operations
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Running offline on local SQLite. Real-time sales, inventory, and cost tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs shadow-xs tactile-btn"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>New Sale</span>
            <kbd className="px-1 py-0.2 rounded bg-neutral-800 text-[9px] font-mono text-neutral-300">
              F2
            </kbd>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-medium text-xs shadow-xs tactile-btn"
          >
            <PlusCircle className="w-3.5 h-3.5 text-neutral-500" />
            <span>Add Book</span>
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-medium text-xs shadow-xs tactile-btn"
          >
            <PackagePlus className="w-3.5 h-3.5 text-neutral-500" />
            <span>Receive Stock</span>
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-medium text-xs shadow-xs tactile-btn"
          >
            <ReceiptText className="w-3.5 h-3.5 text-neutral-500" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Today's Sales</span>
              <span className="w-6 h-6 rounded-md bg-neutral-50 border border-neutral-200/60 text-neutral-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
              {formatKES(metrics.todayRevenue)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span className="tabular-nums">{metrics.todaySalesCount} completed sales</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-neutral-900 font-medium hover:underline flex items-center gap-0.5"
            >
              Report <ArrowUpRight className="w-3 h-3 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Gross Profit</span>
              <span className="w-6 h-6 rounded-md bg-neutral-50 border border-neutral-200/60 text-neutral-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
              {formatKES(metrics.todayProfit)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Margin: <strong className="text-neutral-900 font-mono">{profitMarginPercent}%</strong>
            </span>
            <span className="text-[11px] text-neutral-400">Revenue − COGS</span>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Inventory Value</span>
              <span className="w-6 h-6 rounded-md bg-neutral-50 border border-neutral-200/60 text-neutral-600 flex items-center justify-center">
                <Boxes className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
              {formatKES(metrics.totalInventoryRetailValue)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Cost: <strong className="text-neutral-800 font-mono">{formatKES(metrics.totalInventoryCostValue)}</strong>
            </span>
            <span className="tabular-nums font-mono">{formatNumber(metrics.totalInventoryCount)} books</span>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Stock Alerts</span>
              <span className="w-6 h-6 rounded-md bg-neutral-50 border border-neutral-200/60 text-neutral-600 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
                  {metrics.lowStockCount + metrics.outOfStockCount}
                </span>
                <span className="text-xs text-neutral-500 ml-1.5">items to reorder</span>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className="text-xs text-neutral-900 font-medium hover:underline"
              >
                Restock
              </button>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Low: <strong className="text-amber-600 font-mono">{metrics.lowStockCount}</strong>
            </span>
            <span>
              Out: <strong className="text-rose-600 font-mono">{metrics.outOfStockCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Recent Sales Section */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm tracking-tight">Recent Transactions</h3>
            <p className="text-xs text-neutral-400">Recorded transactions in local database</p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {metrics.recentSales.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-200/60 flex items-center justify-center text-neutral-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800">No sales recorded yet</p>
              <p className="text-xs text-neutral-400 max-w-sm mt-0.5">
                Every sale recorded through the Point of Sale will appear here instantly.
              </p>
            </div>
            <button
              onClick={() => onNavigate('pos')}
              className="mt-1 px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs shadow-xs tactile-btn"
            >
              Open POS Register
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Receipt #</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Method</th>
                  <th className="py-2.5 px-4 text-right">Items</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {metrics.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-neutral-900">
                      {sale.receipt_number}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-500 tabular-nums">
                      {formatDateTime(sale.created_at)}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-700">
                      {sale.customer_name || <span className="text-neutral-400">Walk-in</span>}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600 uppercase">
                      {sale.payment_method}
                    </td>
                    <td className="py-2.5 px-4 text-right text-neutral-500 tabular-nums">
                      {sale.items?.length || 1}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-neutral-900 tabular-nums">
                      {formatKES(sale.total_amount)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onViewReceipt(sale)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 text-[11px] font-medium transition-colors tactile-btn"
                        title="View printable receipt"
                      >
                        <Eye className="w-3 h-3 text-neutral-400" />
                        <span>Receipt</span>
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
