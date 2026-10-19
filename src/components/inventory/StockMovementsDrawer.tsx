import React, { useState, useEffect } from 'react';
import { X, History, ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react';
import { StockMovement } from '../../types/index.ts';
import { getStockMovements } from '../../db/database.ts';
import { formatDateTime } from '../../utils/formatters.ts';

interface StockMovementsDrawerProps {
  bookId?: number;
  bookTitle?: string;
  onClose: () => void;
}

export const StockMovementsDrawer: React.FC<StockMovementsDrawerProps> = ({
  bookId,
  bookTitle,
  onClose,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await getStockMovements(bookId);
        setMovements(rows);
      } catch (err) {
        console.error('Failed to load stock movements:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Stock Movement Audit History</h3>
              <p className="text-xs text-slate-400">
                {bookTitle ? `Filtered for "${bookTitle}"` : 'All inventory movements across bookshop'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Loading stock movements ledger...
            </div>
          ) : movements.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No stock movements recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {movements.map((m) => {
                const isPositive = m.quantity_change > 0;
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </span>
                        <span className="font-bold text-xs text-slate-900">
                          {m.book_title || 'Book Item'}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {isPositive ? `+${m.quantity_change}` : m.quantity_change} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div>
                        <span>Previous: <strong>{m.previous_quantity}</strong></span>
                        <span className="mx-1.5">→</span>
                        <span>New: <strong>{m.new_quantity}</strong></span>
                      </div>
                      <span className="font-mono text-slate-400">
                        {formatDateTime(m.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded">
                      <span className="truncate max-w-[320px]">
                        <strong>{m.movement_type.toUpperCase()}:</strong> {m.notes || 'No description'}
                      </span>
                      <span className="text-slate-500 shrink-0">By: {m.user_name || 'System'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
