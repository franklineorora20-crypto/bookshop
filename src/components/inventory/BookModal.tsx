import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  const [isCustomCategory, setIsCustomCategory] = useState(false);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
        className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-lg w-full overflow-hidden text-neutral-900 z-10"
      >
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookPlus className="w-4 h-4 text-neutral-600" />
            <h3 className="font-semibold text-sm tracking-tight text-neutral-900">
              {isEditing ? `Edit: ${book.title}` : 'Add New Book'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
              Book Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fathers of Nations"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Author *
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Paul B. Vitta"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Publisher *
              </label>
              <input
                type="text"
                required
                list="publisher-list"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. Longhorn Publishers"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
              <datalist id="publisher-list">
                <option value="Longhorn Publishers" />
                <option value="Oxford University Press" />
                <option value="East African Educational Publishers" />
                <option value="Kenya Literature Bureau (KLB)" />
                <option value="Moran Publishers" />
                <option value="Spotlight Publishers" />
                <option value="Storymoja" />
                <option value="Mountain Top Publishers" />
                <option value="Kartasi Industries" />
                <option value="Kasuku Paper" />
                <option value="Pelican Publishers" />
                <option value="Penguin Random House" />
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategory(!isCustomCategory)}
                  className="text-[10px] text-neutral-500 hover:text-neutral-900 underline"
                >
                  {isCustomCategory ? 'Select from list' : '+ Custom'}
                </button>
              </div>
              {isCustomCategory ? (
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Type custom category..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 font-medium focus:outline-none focus:border-neutral-900"
                  autoFocus
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                      setCategory('');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900 font-medium"
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
                  <option value="__custom__">＋ Add Custom Category...</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Edition / Notes
              </label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                placeholder="e.g. 1st Edition / 2024"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                ISBN (Optional)
              </label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 978-0195738592"
                className="w-full px-3 py-1.5 font-mono text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Barcode / Code
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 9780195738592"
                className="w-full px-3 py-1.5 font-mono text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Cost Price (KES) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 font-mono font-medium text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Selling Price (KES) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 font-mono font-semibold text-xs rounded-lg border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900 text-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                {isEditing ? 'Current Stock' : 'Initial Stock Quantity'}
              </label>
              <input
                type="number"
                disabled={isEditing}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-3 py-1.5 font-mono text-xs rounded-lg border border-neutral-200 ${
                  isEditing ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed' : 'bg-white'
                }`}
              />
              {isEditing && (
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Use "Stock" adjustment to modify live count.
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                Reorder Alert Level
              </label>
              <input
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="w-full px-3 py-1.5 font-mono text-xs rounded-lg border border-neutral-200 bg-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-xs tactile-btn"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Book' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
