import React, { useState } from 'react';
import { X, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { Book } from '../../types/index.ts';
import { adjustStock } from '../../db/database.ts';

interface StockAdjustmentModalProps {
  book: Book;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  userId: number;
  userName: string;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  book,
  onClose,
  onSuccess,
  userId,
  userName,
}) => {
  const [movementType, setMovementType] = useState<
    'purchase' | 'damage' | 'adjustment' | 'customer_return' | 'purchase_return'
  >('purchase');
  const [quantity, setQuantity] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>(book.purchase_price.toString());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedQty = parseInt(quantity, 10) || 0;

  // Compute direction: purchase or customer_return increases stock (+), damage or purchase_return decreases stock (-)
  let sign = 1;
  if (movementType === 'damage' || movementType === 'purchase_return') {
    sign = -1;
  }
  const changeValue = sign * Math.abs(parsedQty);
  const projectedQuantity = book.quantity + changeValue;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (parsedQty <= 0) {
      setError('Please specify a quantity greater than zero.');
      return;
    }

    if (projectedQuantity < 0) {
      setError(`Cannot deduct ${parsedQty} units. Current stock is only ${book.quantity}.`);
      return;
    }

    if (!notes.trim()) {
      setError('Please provide a reason or reference note for this stock adjustment.');
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustStock(
        book.id,
        changeValue,
        movementType,
        notes.trim(),
        userId,
        userName,
        parseFloat(unitCost) || book.purchase_price
      );
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Adjust Stock: {book.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <p className="font-bold text-slate-800">{book.title}</p>
            <p className="text-slate-500">Author: {book.author} | Publisher: {book.publisher}</p>
            <div className="flex justify-between pt-1 border-t border-slate-200 font-semibold">
              <span>Current In-Store Stock:</span>
              <span className="text-slate-900">{book.quantity} units</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Type</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-emerald-500"
            >
              <option value="purchase">Receive Stock / New Delivery (+)</option>
              <option value="customer_return">Customer Return (+)</option>
              <option value="damage">Damaged / Torn / Water Spoiled (−)</option>
              <option value="purchase_return">Return to Supplier / Publisher (−)</option>
              <option value="adjustment">Stocktake Audit Count Correction</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Units
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Cost (KES)
              </label>
              <input
                type="number"
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Notes / Supplier Invoice Ref *
            </label>
            <input
              type="text"
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received from Longhorn Invoice #8920"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
            <span className="text-emerald-900 font-medium">Projected New Stock Level:</span>
            <span className="font-extrabold text-sm text-emerald-800">
              {projectedQuantity} units
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
            >
              {isSubmitting ? 'Updating...' : 'Commit Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
