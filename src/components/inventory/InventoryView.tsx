import React, { useState } from 'react';
import {
  Search,
  Plus,
  Upload,
  Download,
  SlidersHorizontal,
  History,
  Archive,
  Edit2,
  AlertTriangle,
  Boxes,
  Barcode,
  FolderSync,
  Trash2,
} from 'lucide-react';
import { Book, User, ShopSettings } from '../../types/index.ts';
import { addBook, updateBook, archiveBook, bulkArchiveBooks, bulkUpdateCategory } from '../../db/database.ts';
import { formatKES, formatNumber } from '../../utils/formatters.ts';
import { exportToCSV } from '../../utils/csv.ts';
import { BookModal } from './BookModal.tsx';
import { StockAdjustmentModal } from './StockAdjustmentModal.tsx';
import { StockMovementsDrawer } from './StockMovementsDrawer.tsx';
import { CSVImportModal } from './CSVImportModal.tsx';
import { QuickAdjustModal } from './QuickAdjustModal.tsx';
import { BarcodeLabelModal } from './BarcodeLabelModal.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { Button } from '../common/Button.tsx';
import { toast } from 'sonner';

interface InventoryViewProps {
  books: Book[];
  currentUser: User | null;
  settings?: ShopSettings | null;
  onRefreshData: () => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  books,
  currentUser,
  settings = null,
  onRefreshData,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Multi-selection state for bulk actions
  const [selectedBookIds, setSelectedBookIds] = useState<number[]>([]);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState<string>('');
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [quickAdjustBook, setQuickAdjustBook] = useState<Book | null>(null);
  const [barcodeLabelBook, setBarcodeLabelBook] = useState<Book | null>(null);
  const [adjustingBook, setAdjustingBook] = useState<Book | null>(null);
  const [historyBook, setHistoryBook] = useState<{ id?: number; title?: string } | null>(null);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);

  // Confirm dialogs state
  const [archivingBook, setArchivingBook] = useState<Book | null>(null);
  const [isBulkArchiveConfirmOpen, setIsBulkArchiveConfirmOpen] = useState(false);

  // Categories
  const categories = ['All', ...Array.from(new Set(books.map((b) => b.category))).filter(Boolean)];

  // Filtered books
  const filteredBooks = books.filter((b) => {
    if (b.is_archived) return false;
    const matchesCategory = categoryFilter === 'All' || b.category === categoryFilter;

    let matchesStock = true;
    if (stockStatusFilter === 'in_stock') matchesStock = b.quantity > b.reorder_level;
    else if (stockStatusFilter === 'low_stock') matchesStock = b.quantity <= b.reorder_level && b.quantity > 0;
    else if (stockStatusFilter === 'out_of_stock') matchesStock = b.quantity <= 0;

    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.toLowerCase().includes(q)) ||
      (b.barcode && b.barcode.toLowerCase().includes(q)) ||
      b.publisher.toLowerCase().includes(q);

    return matchesCategory && matchesStock && matchesSearch;
  });

  // Valuation stats
  const totalCostValue = books.reduce((sum, b) => (!b.is_archived ? sum + b.quantity * b.purchase_price : sum), 0);
  const totalRetailValue = books.reduce((sum, b) => (!b.is_archived ? sum + b.quantity * b.selling_price : sum), 0);
  const totalUnits = books.reduce((sum, b) => (!b.is_archived ? sum + b.quantity : sum), 0);
  const potentialMargin = totalRetailValue > 0 ? Math.round(((totalRetailValue - totalCostValue) / totalRetailValue) * 1000) / 10 : 0;

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedBookIds.length === filteredBooks.length) {
      setSelectedBookIds([]);
    } else {
      setSelectedBookIds(filteredBooks.map((b) => b.id));
    }
  };

  const toggleSelectBook = (id: number) => {
    setSelectedBookIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk actions
  const handleBulkArchiveConfirm = async () => {
    if (selectedBookIds.length === 0) return;
    await bulkArchiveBooks(selectedBookIds, currentUser?.id || 1, currentUser?.full_name || 'Admin');
    toast.success(`Archived ${selectedBookIds.length} titles.`);
    setSelectedBookIds([]);
    await onRefreshData();
  };

  const handleBulkCategoryConfirm = async () => {
    if (selectedBookIds.length === 0 || !bulkCategoryTarget.trim()) return;
    await bulkUpdateCategory(
      selectedBookIds,
      bulkCategoryTarget.trim(),
      currentUser?.id || 1,
      currentUser?.full_name || 'Admin'
    );
    toast.success(`Updated category for ${selectedBookIds.length} titles to "${bulkCategoryTarget.trim()}"`);
    setSelectedBookIds([]);
    setIsBulkCategoryModalOpen(false);
    await onRefreshData();
  };

  // Single book save
  const handleSaveBook = async (data: any) => {
    const uid = currentUser?.id || 1;
    const uname = currentUser?.full_name || 'Admin';
    if (editingBook) {
      await updateBook(editingBook.id, data, uid, uname);
      toast.success(`Updated "${data.title}"`);
    } else {
      await addBook(data, uid, uname);
      toast.success(`Added "${data.title}" to catalog`);
    }
    await onRefreshData();
  };

  // Archive single book
  const handleArchiveConfirm = async () => {
    if (!archivingBook) return;
    await archiveBook(archivingBook.id, currentUser?.id || 1, currentUser?.full_name || 'Admin');
    toast.success(`Archived "${archivingBook.title}"`);
    setArchivingBook(null);
    await onRefreshData();
  };

  // Export CSV (Hides purchase price from cashiers)
  const handleExportCSV = () => {
    const isCashier = currentUser?.role === 'cashier';
    const headers = isCashier
      ? [
          'Title',
          'Author',
          'Publisher',
          'Category',
          'ISBN',
          'Barcode',
          'Selling Price (KES)',
          'Quantity',
          'Reorder Level',
        ]
      : [
          'Title',
          'Author',
          'Publisher',
          'Category',
          'ISBN',
          'Barcode',
          'Purchase Price (KES)',
          'Selling Price (KES)',
          'Quantity',
          'Reorder Level',
        ];
    const rows = filteredBooks.map((b) =>
      isCashier
        ? [
            b.title,
            b.author,
            b.publisher,
            b.category,
            b.isbn || '',
            b.barcode || '',
            b.selling_price,
            b.quantity,
            b.reorder_level,
          ]
        : [
            b.title,
            b.author,
            b.publisher,
            b.category,
            b.isbn || '',
            b.barcode || '',
            b.purchase_price,
            b.selling_price,
            b.quantity,
            b.reorder_level,
          ]
    );
    exportToCSV(`KitabuPOS_Inventory_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    toast.success('Inventory catalog exported to CSV');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Valuation Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Book Inventory & Stock Take
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage textbook catalog, barcode labeling, bulk categories, and physical stock counts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="md"
            onClick={() => setIsCSVImportOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Import CSV
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add New Title
          </Button>
        </div>
      </div>

      {/* Valuation & Metrics Summary */}
      <div className={`grid gap-3 ${currentUser?.role === 'cashier' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500">Total Physical Copies</span>
          <p className="text-xl font-mono font-bold text-neutral-900 mt-1 tabular-nums">
            {formatNumber(totalUnits)}
          </p>
          <span className="text-xs text-neutral-400">{filteredBooks.length} titles in view</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
          <span className="text-xs font-semibold text-neutral-500">Retail Inventory Value</span>
          <p className="text-xl font-mono font-bold text-neutral-900 mt-1 tabular-nums">
            {formatKES(totalRetailValue)}
          </p>
          <span className="text-xs text-neutral-400">at selling price</span>
        </div>

        {currentUser?.role !== 'cashier' && (
          <>
            <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500">Inventory Cost Value</span>
              <p className="text-xl font-mono font-bold text-neutral-900 mt-1 tabular-nums">
                {formatKES(totalCostValue)}
              </p>
              <span className="text-xs text-neutral-400">capital tied in stock</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-neutral-200/90 shadow-xs">
              <span className="text-xs font-semibold text-neutral-500">Potential Gross Margin</span>
              <p className="text-xl font-mono font-bold text-emerald-600 mt-1 tabular-nums">
                {potentialMargin}%
              </p>
              <span className="text-xs text-neutral-400">projected store markup</span>
            </div>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, author, barcode, ISBN, or publisher..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 min-h-[44px]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-neutral-500 whitespace-nowrap">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm px-3 py-2.5 rounded-xl border border-neutral-300 bg-neutral-50 text-neutral-900 focus:outline-none focus:border-neutral-900 min-h-[44px]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stock Status Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: `All Books (${books.length})` },
              { id: 'in_stock', label: 'Adequately Stocked' },
              { id: 'low_stock', label: 'Low Stock Alert' },
              { id: 'out_of_stock', label: 'Out of Stock (0)' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStockStatusFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all tactile-btn touch-target flex items-center justify-center ${
                  stockStatusFilter === f.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Bulk Selection Actions Bar */}
          {selectedBookIds.length > 0 && (
            <div className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-neutral-800">
                {selectedBookIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => setIsBulkCategoryModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 text-neutral-800 tactile-btn"
              >
                Change Category
              </button>
              <button
                type="button"
                onClick={() => setIsBulkArchiveConfirmOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 text-rose-700 tactile-btn"
              >
                Archive Selected
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Inventory Catalog Table */}
      <div className="border border-neutral-200 rounded-2xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-600 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-3 py-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredBooks.length > 0 && selectedBookIds.length === filteredBooks.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-neutral-900 border-neutral-300 focus:ring-0"
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3">Book Details</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Selling Price</th>
                {currentUser?.role !== 'cashier' && (
                  <th className="px-3 py-3 text-right">Cost Price</th>
                )}
                <th className="px-3 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={currentUser?.role === 'cashier' ? 6 : 7} className="px-4 py-16 text-center text-neutral-400">
                    <Boxes className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                    <p className="text-sm font-semibold text-neutral-700">No books found</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Try adjusting your search terms or filter settings
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => {
                  const isSelected = selectedBookIds.includes(book.id);
                  const isLow = book.quantity <= book.reorder_level && book.quantity > 0;
                  const isOut = book.quantity <= 0;

                  return (
                    <tr
                      key={book.id}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        isSelected ? 'bg-neutral-50' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectBook(book.id)}
                          className="w-4 h-4 rounded text-neutral-900 border-neutral-300 focus:ring-0"
                          aria-label={`Select ${book.title}`}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-neutral-900 text-sm leading-snug">
                          {book.title}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{book.author}</span>
                          {book.isbn && (
                            <span className="font-mono text-neutral-400">ISBN: {book.isbn}</span>
                          )}
                          {book.barcode && (
                            <span className="font-mono text-neutral-400">Barcode: {book.barcode}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-neutral-600 font-medium">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-xs">
                          {book.category}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-bold text-neutral-900 tabular-nums">
                        {formatKES(book.selling_price)}
                      </td>

                      {currentUser?.role !== 'cashier' && (
                        <td className="px-3 py-3 text-right font-mono text-neutral-600 tabular-nums">
                          {formatKES(book.purchase_price)}
                        </td>
                      )}

                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md font-mono font-bold text-xs ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {book.quantity} copies
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Adjust Price/Stock with Audit Note */}
                          <button
                            type="button"
                            onClick={() => setQuickAdjustBook(book)}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 tactile-btn"
                            title="Quick Adjust Stock & Price (with audit note)"
                            aria-label="Quick adjust price and stock"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>

                          {/* Print Barcode Label */}
                          <button
                            type="button"
                            onClick={() => setBarcodeLabelBook(book)}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 tactile-btn"
                            title="Print Thermal Barcode Label"
                            aria-label="Print barcode label"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>

                          {/* Stock Movement Ledger */}
                          <button
                            type="button"
                            onClick={() => setHistoryBook({ id: book.id, title: book.title })}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 tactile-btn"
                            title="View Stock Movement Audit History"
                            aria-label="View movement audit history"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Full Edit */}
                          <button
                            type="button"
                            onClick={() => setEditingBook(book)}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 tactile-btn"
                            title="Edit book details"
                            aria-label="Edit book"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Archive */}
                          <button
                            type="button"
                            onClick={() => setArchivingBook(book)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 tactile-btn"
                            title="Archive book from sales catalog"
                            aria-label="Archive book"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Book Modal */}
      {(isAddModalOpen || editingBook) && (
        <BookModal
          book={editingBook}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingBook(null);
          }}
          onSave={handleSaveBook}
        />
      )}

      {/* Quick Adjust Price/Stock Modal */}
      {quickAdjustBook && (
        <QuickAdjustModal
          book={quickAdjustBook}
          isOpen={Boolean(quickAdjustBook)}
          onClose={() => setQuickAdjustBook(null)}
          onSuccess={onRefreshData}
          userId={currentUser?.id || 1}
          userName={currentUser?.full_name || 'Admin'}
        />
      )}

      {/* Barcode Label Modal */}
      {barcodeLabelBook && (
        <BarcodeLabelModal
          book={barcodeLabelBook}
          settings={settings}
          isOpen={Boolean(barcodeLabelBook)}
          onClose={() => setBarcodeLabelBook(null)}
        />
      )}

      {/* Stock Movement Drawer */}
      {historyBook && (
        <StockMovementsDrawer
          bookId={historyBook.id}
          bookTitle={historyBook.title}
          onClose={() => setHistoryBook(null)}
        />
      )}

      {/* CSV Import Modal */}
      {isCSVImportOpen && (
        <CSVImportModal
          onClose={() => setIsCSVImportOpen(false)}
          onSuccess={onRefreshData}
          userId={currentUser?.id || 1}
          userName={currentUser?.full_name || 'Admin'}
        />
      )}

      {/* Bulk Category Change Modal */}
      {isBulkCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-neutral-200">
            <h4 className="font-bold text-sm text-neutral-900">
              Bulk Change Category for {selectedBookIds.length} Books
            </h4>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">New Category:</label>
              <input
                type="text"
                value={bulkCategoryTarget}
                onChange={(e) => setBulkCategoryTarget(e.target.value)}
                placeholder="e.g. KCSE Revision Guides, CBC Grade 5..."
                className="w-full text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-neutral-900 min-h-[44px]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsBulkCategoryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleBulkCategoryConfirm}
                disabled={!bulkCategoryTarget.trim()}
              >
                Apply Category
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Single Archive Dialog (replaces window.confirm) */}
      <ConfirmDialog
        isOpen={Boolean(archivingBook)}
        onClose={() => setArchivingBook(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Book Title"
        message={
          <>
            Are you sure you want to archive <strong>"{archivingBook?.title}"</strong>? It will no
            longer appear in the active POS catalog, but past sales records remain intact.
          </>
        }
        confirmLabel="Archive Book"
        variant="danger"
      />

      {/* Confirm Bulk Archive Dialog */}
      <ConfirmDialog
        isOpen={isBulkArchiveConfirmOpen}
        onClose={() => setIsBulkArchiveConfirmOpen(false)}
        onConfirm={handleBulkArchiveConfirm}
        title={`Archive ${selectedBookIds.length} Books`}
        message={`Are you sure you want to archive ${selectedBookIds.length} selected titles from the active store catalog?`}
        confirmLabel="Archive Selected"
        variant="danger"
      />
    </div>
  );
};
