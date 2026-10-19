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
      {/* Top Valuation Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Titles</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{books.filter((b) => !b.is_archived).length} books</p>
          <span className="text-xs text-slate-400">{formatNumber(totalUnits)} physical copies</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Cost Value</span>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatKES(totalCostValue)}</p>
          <span className="text-xs text-slate-400">Total acquisition cost</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retail Sales Value</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatKES(totalRetailValue)}</p>
          <span className="text-xs text-slate-400">Potential retail realization</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Potential Gross Margin</span>
          <p className="text-xl font-bold text-teal-700 mt-1">{potentialMargin}%</p>
          <span className="text-xs text-slate-400">Profit potential: {formatKES(totalRetailValue - totalCostValue)}</span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Title, Author, ISBN, Barcode, Publisher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setHistoryBook({})}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Full Movements Log</span>
            </button>
            <button
              onClick={() => setIsCSVImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import CSV</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                setEditingBook(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Book</span>
            </button>
          </div>
        </div>

        {/* Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-semibold text-slate-500">Filter By:</span>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-hidden"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-slate-300 overflow-hidden bg-slate-50 p-0.5">
            {[
              { id: 'all', label: 'All Stock' },
              { id: 'in_stock', label: 'In Stock' },
              { id: 'low_stock', label: 'Low Stock' },
              { id: 'out_of_stock', label: 'Out of Stock' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStockStatusFilter(tab.id as any)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  stockStatusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="ml-auto text-slate-400 font-mono text-[11px]">
            Showing {filteredBooks.length} of {books.length} titles
          </span>
        </div>
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Author / Publisher</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost (KES)</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No books found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => {
                  const isOut = book.quantity <= 0;
                  const isLow = book.quantity <= book.reorder_level && !isOut;

                  return (
                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{book.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          {book.isbn && <span>ISBN: {book.isbn}</span>}
                          {book.barcode && <span>Code: {book.barcode}</span>}
                          {book.edition && <span className="text-slate-400 font-sans">({book.edition})</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div>{book.author}</div>
                        <div className="text-[11px] text-slate-400">{book.publisher}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {book.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatKES(book.purchase_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-slate-900">
                        {formatKES(book.selling_price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {book.quantity} in stock
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setAdjustingBook(book)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1"
                            title="Adjust in-store stock"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                            <span>Stock</span>
                          </button>
                          <button
                            onClick={() => setHistoryBook({ id: book.id, title: book.title })}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="View stock movement history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBook(book);
                              setIsAddModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Edit book details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(book)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
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
