import React, { useState } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Book } from '../../types/index.ts';
import { adjustStock, updateBook } from '../../db/database.ts';
import { toast } from 'sonner';

interface QuickAdjustModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  userId: number;
  userName: string;
}

export const QuickAdjustModal: React.FC<QuickAdjustModalProps> = ({
  book,
  isOpen,
  onClose,
  onSuccess,
  userId,
  userName,
}) => {
  const [sellingPrice, setSellingPrice] = useState<string>(book?.selling_price.toString() || '0');
  const [purchasePrice, setPurchasePrice] = useState<string>(book?.purchase_price.toString() || '0');
  const [newStockQuantity, setNewStockQuantity] = useState<string>(book?.quantity.toString() || '0');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (book) {
      setSellingPrice(book.selling_price.toString());
      setPurchasePrice(book.purchase_price.toString());
      setNewStockQuantity(book.quantity.toString());
      setReason('');
      setError(null);
    }
  }, [book]);

  if (!book) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(sellingPrice);
    const costNum = parseFloat(purchasePrice);
    const stockNum = parseInt(newStockQuantity, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Selling price must be a valid number.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }
    if (!reason.trim()) {
      setError('An audit note or reason is required for price and stock revisions.');
      return;
    }

    setLoading(true);
    try {
      // 1. Update prices if changed
      const priceChanged = priceNum !== book.selling_price || costNum !== book.purchase_price;
      if (priceChanged) {
        await updateBook(
          book.id,
          {
            selling_price: priceNum,
            purchase_price: costNum,
          },
          userId,
          userName
        );
      }

      // 2. Adjust stock if changed
      const stockDiff = stockNum - book.quantity;
      if (stockDiff !== 0) {
        await adjustStock(
          book.id,
          stockDiff,
          'adjustment',
          `Quick count adjustment: ${reason.trim()}`,
          userId,
          userName,
          costNum
        );
      }

      toast.success(`Updated "${book.title}" successfully`);
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update book.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title={`Adjust Price & Stock: "${book.title}"`}
      description="Record stock take count or price revision with an immutable audit note"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Selling Price (KES)"
            type="number"
            min={0}
            step="any"
            required
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />
          <Input
            label="Purchase Cost / COGS (KES)"
            type="number"
            min={0}
            step="any"
            required
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
          />
        </div>

        <div>
          <Input
            label="Physical Stock Count"
            type="number"
            min={0}
            required
            value={newStockQuantity}
            onChange={(e) => setNewStockQuantity(e.target.value)}
            hint={`Current recorded stock: ${book.quantity} units`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-700 tracking-tight mb-1.5">
            Audit Reason / Note <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Physical stock take count, supplier price change, damaged copies removed..."
            className="w-full text-sm p-3 rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15"
          />
        </div>

        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
          <Button variant="outline" size="md" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="md" type="submit" loading={loading}>
            Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
