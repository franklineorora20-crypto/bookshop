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
  CheckCircle2,
  XCircle,
  CreditCard,
  Users,
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
  totalCustomerDebt: number;
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
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Loading bookshop metrics from SQLite database...</p>
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
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Retail Operations Overview
          </span>
          <h2 className="text-xl font-bold mt-0.5">Welcome back, Bookshop Staff</h2>
          <p className="text-xs text-slate-400 mt-1">
            Running 100% offline with local SQLite storage. All sales and inventory are synchronized.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <TrendingUp className="w-4 h-4" />
            <span>New Sale (F2)</span>
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Add Book</span>
          </button>
          <button
            onClick={() => onNavigate('purchases')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs transition-colors"
          >
            <PackagePlus className="w-4 h-4 text-teal-400" />
            <span>Receive Stock</span>
          </button>
          <button
            onClick={() => onNavigate('expenses')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-xs transition-colors"
          >
            <ReceiptText className="w-4 h-4 text-amber-400" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatKES(metrics.todayRevenue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{metrics.todaySalesCount} completed sales</span>
            <button
              onClick={() => onNavigate('reports')}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-0.5"
            >
              Report <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-teal-700">
            {formatKES(metrics.todayProfit)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Margin: <strong className="text-slate-700">{profitMarginPercent}%</strong></span>
            <span className="text-[11px] text-slate-400">Revenue − COGS</span>
          </div>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Inventory Value</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {formatKES(metrics.totalInventoryRetailValue)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Cost: <strong>{formatKES(metrics.totalInventoryCostValue)}</strong></span>
            <span>{formatNumber(metrics.totalInventoryCount)} books</span>
          </div>
        </div>

        {/* Stock Alerts & Customer Debt */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alerts & Receivables</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-amber-600">
                {metrics.lowStockCount + metrics.outOfStockCount}
              </span>
              <span className="text-xs text-slate-500 ml-1">low/out stock</span>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs text-amber-700 font-semibold hover:underline"
            >
              Restock
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Customer Debt:
            </span>
            <span className="font-semibold text-rose-600">{formatKES(metrics.totalCustomerDebt)}</span>
          </div>
        </div>
      </div>

      {/* Recent Sales Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Recent Transactions</h3>
            <p className="text-xs text-slate-500">Live sales recorded to local SQLite database</p>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            View All Sales History
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.recentSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No transactions recorded yet today. Click "New Sale (F2)" to begin checkout!
                  </td>
                </tr>
              ) : (
                metrics.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {sale.receipt_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {formatDateTime(sale.created_at)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {sale.customer_name || 'Walk-in Customer'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {sale.cashier_name || 'Cashier'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                          sale.payment_method === 'mpesa'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sale.payment_method === 'cash'
                            ? 'bg-blue-100 text-blue-800'
                            : sale.payment_method === 'credit'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatKES(sale.grand_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sale.is_voided ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          <XCircle className="w-3 h-3" /> Voided
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onViewReceipt(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                        title="View printable receipt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
