import React, { useState } from 'react';
import { X, BookPlus, AlertCircle } from 'lucide-react';
import { Book } from '../../types/index.ts';

interface BookModalProps {
  book?: Book | null;
  onClose: () => void;
  onSave: (bookData: {
    title: string;
    isbn?: string;
    barcode?: string;
    author: string;
    publisher: string;
    category: string;
    edition?: string;
    purchase_price: number;
    selling_price: number;
    quantity: number;
    reorder_level: number;
  }) => Promise<void>;
}

export const BookModal: React.FC<BookModalProps> = ({ book, onClose, onSave }) => {
  const isEditing = !!book;

  const [title, setTitle] = useState(book?.title || '');
  const [isbn, setIsbn] = useState(book?.isbn || '');
  const [barcode, setBarcode] = useState(book?.barcode || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [publisher, setPublisher] = useState(book?.publisher || '');
  const [category, setCategory] = useState(book?.category || 'KCSE Set Books');
  const [edition, setEdition] = useState(book?.edition || '');
  const [purchasePrice, setPurchasePrice] = useState(book?.purchase_price?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(book?.selling_price?.toString() || '');
  const [quantity, setQuantity] = useState(book?.quantity?.toString() || '0');
  const [reorderLevel, setReorderLevel] = useState(book?.reorder_level?.toString() || '5');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Book title is required.');
      return;
    }
    if (!author.trim()) {
      setError('Author is required.');
      return;
    }
    if (!publisher.trim()) {
      setError('Publisher is required.');
      return;
    }

    const buyPrice = parseFloat(purchasePrice) || 0;
    const sellPrice = parseFloat(sellingPrice) || 0;
    const qty = parseInt(quantity, 10) || 0;
    const reorder = parseInt(reorderLevel, 10) || 5;

    if (sellPrice <= 0) {
      setError('Selling price must be greater than zero.');
      return;
    }
    if (buyPrice < 0) {
      setError('Purchase price cannot be negative.');
      return;
    }
    if (qty < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        isbn: isbn.trim() || undefined,
        barcode: barcode.trim() || undefined,
        author: author.trim(),
        publisher: publisher.trim(),
        category: category.trim(),
        edition: edition.trim() || undefined,
        purchase_price: buyPrice,
        selling_price: sellPrice,
        quantity: qty,
        reorder_level: reorder,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save book.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookPlus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              {isEditing ? `Edit Book: ${book.title}` : 'Add New Book to Inventory'}
            </h3>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Book Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fathers of Nations"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Author *</label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Paul B. Vitta"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Publisher *</label>
              <input
                type="text"
                required
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. Oxford University Press"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="KCSE Set Books">KCSE Set Books</option>
                <option value="CBC Junior School">CBC Junior School</option>
                <option value="CBC Primary">CBC Primary</option>
                <option value="Revision Guides">Revision Guides</option>
                <option value="Dictionaries">Dictionaries</option>
                <option value="Reference & Atlas">Reference & Atlas</option>
                <option value="Stationery">Stationery</option>
                <option value="Stationery & Electronics">Stationery & Electronics</option>
                <option value="Religious & Fiction">Religious & Fiction</option>
                <option value="General Reading">General Reading</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Edition / Notes</label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="e.g. 1st Edition / 2024"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ISBN (Optional)</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 978-0195738592"
                className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode / Code</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 9780195738592"
                className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Purchase / Cost Price (KES) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 font-bold text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling / Retail Price (KES) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 font-bold text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isEditing ? 'Current Stock Count' : 'Initial Stock Quantity'}
              </label>
              <input
                type="number"
                disabled={isEditing}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border border-slate-300 ${
                  isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                }`}
              />
              {isEditing && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Use "Adjust Stock" on inventory row to modify live stock.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reorder Alert Level
              </label>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
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
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Book' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
