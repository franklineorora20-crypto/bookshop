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
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { Book, User } from '../../types/index.ts';
import { addBook, updateBook, archiveBook } from '../../db/database.ts';
import { formatKES, formatNumber } from '../../utils/formatters.ts';
import { exportToCSV } from '../../utils/csv.ts';
import { BookModal } from './BookModal.tsx';
import { StockAdjustmentModal } from './StockAdjustmentModal.tsx';
import { StockMovementsDrawer } from './StockMovementsDrawer.tsx';
import { CSVImportModal } from './CSVImportModal.tsx';

interface InventoryViewProps {
  books: Book[];
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  books,
  currentUser,
  onRefreshData,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [adjustingBook, setAdjustingBook] = useState<Book | null>(null);
  const [historyBook, setHistoryBook] = useState<{ id?: number; title?: string } | null>(null);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);

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

  // Inventory valuation stats
  const totalCostValue = books.reduce((sum, b) => (!b.is_archived ? sum + b.quantity * b.purchase_price : sum), 0);
  const totalRetailValue = books.reduce((sum, b) => (!b.is_archived ? sum + b.quantity * b.selling_price : sum), 0);
  const totalUnits = books.reduce((sum, b) => (!b.is_archived ? sum + b.quantity : sum), 0);
  const potentialMargin = totalRetailValue > 0 ? Math.round(((totalRetailValue - totalCostValue) / totalRetailValue) * 1000) / 10 : 0;

  // Handlers
  const handleSaveBook = async (data: any) => {
    const uid = currentUser?.id || 1;
    const uname = currentUser?.full_name || 'Admin';
    if (editingBook) {
      await updateBook(editingBook.id, data, uid, uname);
    } else {
      await addBook(data, uid, uname);
    }
    await onRefreshData();
  };

  const handleArchive = async (book: Book) => {
    if (confirm(`Are you sure you want to archive "${book.title}"?`)) {
      await archiveBook(book.id, currentUser?.id || 1, currentUser?.full_name || 'Admin');
      await onRefreshData();
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Title',
      'Author',
      'Publisher',
      'Category',
      'Edition',
      'ISBN',
      'Barcode',
      'PurchasePrice_KES',
      'SellingPrice_KES',
      'CurrentStock',
      'ReorderLevel',
    ];
    const rows = filteredBooks.map((b) => [
      b.title,
      b.author,
      b.publisher,
      b.category,
      b.edition || '',
      b.isbn || '',
      b.barcode || '',
      b.purchase_price,
      b.selling_price,
      b.quantity,
      b.reorder_level,
    ]);
    exportToCSV(`KitabuPOS_Inventory_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Valuation Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Total Titles</span>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums">
            {books.filter((b) => !b.is_archived).length}
          </p>
          <span className="text-[11px] text-neutral-400 tabular-nums">{formatNumber(totalUnits)} physical units</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Inventory Cost</span>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums">{formatKES(totalCostValue)}</p>
          <span className="text-[11px] text-neutral-400">Total acquisition value</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Retail Value</span>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums">{formatKES(totalRetailValue)}</p>
          <span className="text-[11px] text-neutral-400">Potential retail revenue</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Gross Margin</span>
          <p className="text-xl font-bold tracking-tight text-neutral-900 mt-1 tabular-nums">{potentialMargin}%</p>
          <span className="text-[11px] text-neutral-400">Spread: {formatKES(totalRetailValue - totalCostValue)}</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by Title, Author, ISBN, Barcode, Publisher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setHistoryBook({})}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors tactile-btn"
            >
              <History className="w-3.5 h-3.5 text-neutral-400" />
              <span>Movements Log</span>
            </button>
            <button
              onClick={() => setIsCSVImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors tactile-btn"
            >
              <Upload className="w-3.5 h-3.5 text-neutral-400" />
              <span>Import CSV</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium transition-colors tactile-btn"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                setEditingBook(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs transition-colors tactile-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Book</span>
            </button>
          </div>
        </div>

        {/* Filter Selectors & Segmented Control */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 text-xs">
          <span className="text-neutral-500 text-xs">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-xs text-neutral-700 focus:outline-none focus:border-neutral-900"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Segmented Stock Status Filter */}
          <div className="flex rounded-lg bg-neutral-100 p-0.5 text-xs">
            {[
              { id: 'all', label: 'All Stock' },
              { id: 'in_stock', label: 'In Stock' },
              { id: 'low_stock', label: 'Low Stock' },
              { id: 'out_of_stock', label: 'Out of Stock' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStockStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-md text-xs transition-all tactile-btn ${
                  stockStatusFilter === tab.id
                    ? 'bg-white text-neutral-900 font-medium shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-neutral-400 font-mono text-[11px] tabular-nums">
            Showing {filteredBooks.length} of {books.length} titles
          </span>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
              <tr>
                <th className="py-2.5 px-4">Title & Details</th>
                <th className="py-2.5 px-4">Author / Publisher</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Cost</th>
                <th className="py-2.5 px-4 text-right">Price</th>
                <th className="py-2.5 px-4 text-center">Stock</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {books.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-200/70 text-neutral-400 flex items-center justify-center">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <p className="text-neutral-900 font-semibold text-sm">No books added yet</p>
                      <p className="text-neutral-400 text-xs max-w-sm">
                        Enter your genuine titles manually with opening stock quantities, or import your catalog from CSV.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            setEditingBook(null);
                            setIsAddModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors tactile-btn"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add First Book
                        </button>
                        <button
                          onClick={() => setIsCSVImportOpen(true)}
                          className="px-3.5 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors tactile-btn"
                        >
                          <Upload className="w-3.5 h-3.5 text-neutral-500" /> Import CSV
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No books found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => {
                  const isOut = book.quantity <= 0;
                  const isLow = book.quantity <= book.reorder_level && !isOut;

                  return (
                    <tr key={book.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-neutral-900 text-xs">{book.title}</div>
                        <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2 mt-0.5">
                          {book.isbn && <span>ISBN: {book.isbn}</span>}
                          {book.barcode && <span>Code: {book.barcode}</span>}
                          {book.edition && <span>({book.edition})</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-600">
                        <div>{book.author}</div>
                        <div className="text-[11px] text-neutral-400">{book.publisher}</div>
                      </td>
                      <td className="py-2.5 px-4 text-neutral-600">
                        <span>{book.category}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-neutral-600 tabular-nums">
                        {formatKES(book.purchase_price)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold font-mono text-neutral-900 tabular-nums">
                        {formatKES(book.selling_price)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            isOut
                              ? 'text-rose-600 font-semibold'
                              : isLow
                              ? 'text-amber-600 font-semibold'
                              : 'text-neutral-800'
                          }`}
                        >
                          {book.quantity}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setAdjustingBook(book)}
                            className="px-2 py-1 rounded border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 text-[11px] font-medium transition-colors flex items-center gap-1 tactile-btn"
                            title="Adjust in-store stock"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
                            <span>Stock</span>
                          </button>
                          <button
                            onClick={() => setHistoryBook({ id: book.id, title: book.title })}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                            title="View stock movement history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBook(book);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                            title="Edit book details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(book)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 transition-colors"
                            title="Archive book"
                          >
                            <Archive className="w-3.5 h-3.5" />
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
      {isAddModalOpen && (
        <BookModal
          book={editingBook}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingBook(null);
          }}
          onSave={handleSaveBook}
        />
      )}

      {/* Stock Adjustment Modal */}
      {adjustingBook && (
        <StockAdjustmentModal
          book={adjustingBook}
          onClose={() => setAdjustingBook(null)}
          onSuccess={onRefreshData}
          userId={currentUser?.id || 1}
          userName={currentUser?.full_name || 'Admin'}
        />
      )}

      {/* Stock Movements Ledger Drawer */}
      {historyBook && (
        <StockMovementsDrawer
          bookId={historyBook.id}
          bookTitle={historyBook.title}
          onClose={() => setHistoryBook(null)}
        />
      )}

      {/* CSV Bulk Import Modal */}
      {isCSVImportOpen && (
        <CSVImportModal
          onClose={() => setIsCSVImportOpen(false)}
          onSuccess={onRefreshData}
          userId={currentUser?.id || 1}
          userName={currentUser?.full_name || 'Admin'}
        />
      )}
    </div>
  );
};
