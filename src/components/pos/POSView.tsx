import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
  Boxes,
  X,
  ArrowRight,
} from 'lucide-react';
import { Book, Sale, ShopSettings, User } from '../../types/index.ts';
import { calculateCartTotals, calculateChange } from '../../utils/calculations.ts';
import { formatKES } from '../../utils/formatters.ts';
import { processSale, getSaleById } from '../../db/database.ts';
import { ReceiptModal } from './ReceiptModal.tsx';

interface CartItem {
  book: Book;
  quantity: number;
  discountAmount: number;
}

interface POSViewProps {
  books: Book[];
  settings: ShopSettings | null;
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
  onNavigateInventory?: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  books,
  settings,
  currentUser,
  onRefreshData,
  onNavigateInventory,
}) => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'split'>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [cardReference, setCardReference] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitMpesaAmount, setSplitMpesaAmount] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed sale receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(books.map((b) => b.category))).filter(Boolean)];

  // Filtered books
  const filteredBooks = books.filter((b) => {
    if (b.is_archived) return false;
    const matchesCategory = selectedCategory === 'All' || b.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.isbn && b.isbn.toLowerCase().includes(q)) ||
      (b.barcode && b.barcode.toLowerCase().includes(q)) ||
      b.publisher.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Calculate cart financial totals
  const cartInputItems = cart.map((c) => ({
    book_id: c.book.id,
    quantity: c.quantity,
    unit_selling_price: c.book.selling_price,
    unit_purchase_price: c.book.purchase_price,
    discount_amount: c.discountAmount,
  }));

  const totals = calculateCartTotals(cartInputItems, cartDiscount, settings?.tax_rate || 0);

  // Barcode / Quick search scanner handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchQuery.trim();
    if (!code) return;

    const matchedBook = books.find(
      (b) =>
        !b.is_archived &&
        (b.barcode?.toLowerCase() === code.toLowerCase() ||
          b.isbn?.toLowerCase() === code.toLowerCase())
    );

    if (matchedBook) {
      addToCart(matchedBook);
      setSearchQuery('');
      toast.success(`Added "${matchedBook.title}" to cart`);
    } else {
      toast.error(`No book found matching barcode: ${code}`);
    }
  };

  const addToCart = (book: Book) => {
    const existingIndex = cart.findIndex((item) => item.book.id === book.id);
    const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;

    if (currentQtyInCart + 1 > book.quantity) {
      toast.error(`Only ${book.quantity} copies of "${book.title}" in stock.`);
      return;
    }

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { book, quantity: 1, discountAmount: 0 }]);
    }
  };

  const updateQuantity = (bookId: number, delta: number) => {
    const item = cart.find((c) => c.book.id === bookId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(bookId);
      return;
    }

    if (newQty > item.book.quantity) {
      toast.error(`Only ${item.book.quantity} copies available.`);
      return;
    }

    setCart(cart.map((c) => (c.book.id === bookId ? { ...c, quantity: newQty } : c)));
  };

  const removeFromCart = (bookId: number) => {
    setCart(cart.filter((c) => c.book.id !== bookId));
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
    setCustomerName('');
  };

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentError(null);
    setAmountTendered(totals.grandTotal.toString());
    setSplitCashAmount('');
    setSplitMpesaAmount('');
    setMpesaCode('');
    setCardReference('');
    setIsCheckoutOpen(true);
  };

  // Quick tender button click
  const handleQuickTender = (val: number) => {
    setAmountTendered(val.toString());
  };

  // Calculate change for cash sale
  const tenderNum = parseFloat(amountTendered) || 0;
  const changeDue = calculateChange(totals.grandTotal, tenderNum);

  // Complete Sale execution
  const handleCompleteSale = async () => {
    setPaymentError(null);

    if (paymentMethod === 'cash') {
      if (tenderNum < totals.grandTotal) {
        setPaymentError(`Cash tendered (KES ${tenderNum}) is less than total KES ${totals.grandTotal}`);
        return;
      }
    } else if (paymentMethod === 'mpesa') {
      if (!mpesaCode.trim()) {
        setPaymentError('M-Pesa confirmation code or reference is required.');
        return;
      }
    } else if (paymentMethod === 'card') {
      // Optional card approval code or reference
    } else if (paymentMethod === 'split') {
      const c = parseFloat(splitCashAmount) || 0;
      const m = parseFloat(splitMpesaAmount) || 0;
      if (Math.round((c + m) * 100) / 100 < totals.grandTotal) {
        setPaymentError(`Split sum (KES ${c + m}) does not cover total KES ${totals.grandTotal}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((c) => ({
        bookId: c.book.id,
        bookTitle: c.book.title,
        isbn: c.book.isbn,
        quantity: c.quantity,
        unitPurchasePrice: c.book.purchase_price,
        unitSellingPrice: c.book.selling_price,
        discountAmount: c.discountAmount,
        totalPrice: c.book.selling_price * c.quantity - c.discountAmount,
      }));

      let refString = '';
      if (paymentMethod === 'mpesa') {
        refString = `MPESA:${mpesaCode.trim().toUpperCase()}`;
      } else if (paymentMethod === 'card') {
        refString = cardReference ? `CARD:${cardReference.trim()}` : 'CARD:POS';
      } else if (paymentMethod === 'split') {
        refString = `SPLIT: Cash KES ${splitCashAmount} / M-Pesa KES ${splitMpesaAmount}${
          mpesaCode ? ` (${mpesaCode.trim().toUpperCase()})` : ''
        }`;
      }

      const totalPaid =
        paymentMethod === 'cash'
          ? tenderNum
          : paymentMethod === 'split'
          ? (parseFloat(splitCashAmount) || 0) + (parseFloat(splitMpesaAmount) || 0)
          : totals.grandTotal;

      const changeAmount = paymentMethod === 'cash' ? changeDue : 0;

      const salePayload = {
        cashierName: currentUser?.full_name || 'Cashier',
        customerName: customerName.trim() || undefined,
        subtotal: totals.subtotal,
        discountTotal: totals.totalDiscount,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        totalPaid,
        changeAmount,
        paymentMethod,
        paymentReference: refString || undefined,
      };

      const { saleId, receiptNumber } = await processSale(
        salePayload,
        itemsPayload,
        currentUser?.id || 1,
        currentUser?.full_name || 'Cashier'
      );

      // Micro-confetti burst!
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#0f172a', '#38bdf8'],
      });

      toast.success(`Sale #${receiptNumber} completed • ${formatKES(totals.grandTotal)}`);

      const fullSale = await getSaleById(saleId);
      if (fullSale) {
        setCompletedSale(fullSale);
      }
      setIsCheckoutOpen(false);
      clearCart();
      await onRefreshData();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to finalize sale in database.');
      toast.error('Sale failed: ' + (err.message || 'Database error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden select-none bg-neutral-50/60">
      {/* Mobile Top Segmented Tab Switcher */}
      <div className="lg:hidden flex items-center bg-white border-b border-neutral-200 px-3 py-2 shrink-0">
        <div className="grid grid-cols-2 w-full p-1 bg-neutral-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setMobileTab('catalog')}
            className={`py-1.5 rounded-md transition-all text-center ${
              mobileTab === 'catalog'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Catalog ({filteredBooks.length})
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`py-1.5 rounded-md transition-all text-center flex items-center justify-center gap-1.5 ${
              mobileTab === 'cart'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
            {cart.length > 0 && (
              <span className="font-mono text-[10px] text-emerald-600 font-semibold">
                {formatKES(totals.grandTotal)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Left Area: Catalog & Filters */}
      <div
        className={`flex-1 flex flex-col min-w-0 border-r border-neutral-200/80 bg-white ${
          mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search & Barcode Header */}
        <div className="p-3 sm:p-4 border-b border-neutral-100 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, author, barcode, or ISBN..."
              className="w-full pl-9 pr-14 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all shadow-xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-neutral-400" />
            </div>
          </form>

          {/* Category Chips / Segmented Control */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all tactile-btn ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {books.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-400">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Inventory is Empty</h3>
                <p className="text-xs text-neutral-400 max-w-sm mt-1">
                  No books added to your store yet. Enter your first book or import your stock via CSV.
                </p>
              </div>
              {onNavigateInventory && (
                <button
                  onClick={onNavigateInventory}
                  className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs shadow-xs tactile-btn"
                >
                  Go to Book Inventory
                </button>
              )}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              No titles match your search or filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredBooks.map((book) => {
                const inCart = cart.find((c) => c.book.id === book.id);
                const isOutOfStock = book.quantity <= 0;

                return (
                  <button
                    key={book.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(book)}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between tactile-btn group relative ${
                      isOutOfStock
                        ? 'opacity-40 bg-neutral-50 border-neutral-200 cursor-not-allowed'
                        : inCart
                        ? 'bg-white border-neutral-900 shadow-xs ring-1 ring-neutral-900/10'
                        : 'bg-white border-neutral-200/80 hover:border-neutral-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-[10px] text-neutral-400 truncate uppercase font-medium">
                          {book.category}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                            book.quantity <= book.reorder_level
                              ? 'bg-amber-50 text-amber-700'
                              : 'text-neutral-400'
                          }`}
                        >
                          {book.quantity} left
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:text-neutral-950">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">{book.author}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-neutral-900 tabular-nums">
                        {formatKES(book.selling_price)}
                      </span>
                      {inCart && (
                        <span className="text-[10px] font-mono font-bold bg-neutral-900 text-white w-5 h-5 rounded-md flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile floating bottom cart preview bar */}
        {cart.length > 0 && mobileTab === 'catalog' && (
          <div className="lg:hidden sticky bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-lg flex items-center justify-between z-10">
            <div>
              <p className="text-xs text-neutral-500 font-medium">
                {cart.reduce((sum, i) => sum + i.quantity, 0)} items in cart
              </p>
              <p className="text-sm font-bold font-mono text-neutral-900 tabular-nums">
                {formatKES(totals.grandTotal)}
              </p>
            </div>
            <button
              onClick={() => setMobileTab('cart')}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-xs tactile-btn"
            >
              <span>Review & Pay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Right Area: Cart & Checkout Column */}
      <div
        className={`w-full lg:w-96 flex flex-col bg-white border-l border-neutral-200/80 shrink-0 ${
          mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Cart Header */}
        <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileTab('catalog')}
              className="lg:hidden p-1 -ml-1 text-neutral-600 hover:text-neutral-900 text-xs font-semibold"
              title="Back to Catalog"
            >
              ←
            </button>
            <ShoppingCart className="w-4 h-4 text-neutral-700" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800">
              Current Sale ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-neutral-400 hover:text-rose-600 transition-colors"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Customer input for receipt */}
        <div className="px-3.5 py-2 border-b border-neutral-100 bg-neutral-50/50">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional, for receipt)..."
            className="w-full text-xs px-2.5 py-1.5 rounded-md bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900"
          />
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-neutral-400">
              <ShoppingCart className="w-8 h-8 text-neutral-300 stroke-[1.5]" />
              <p className="text-xs">Cart is empty. Tap any title or scan a barcode to add.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.book.id}
                className="p-2.5 rounded-lg border border-neutral-200/80 bg-neutral-50/40 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-semibold text-neutral-900 truncate leading-tight">
                    {item.book.title}
                  </h5>
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5 tabular-nums font-mono">
                    <span>{formatKES(item.book.selling_price)}</span>
                    <span>×</span>
                    <span>{item.quantity}</span>
                    <span>=</span>
                    <span className="font-semibold text-neutral-900">
                      {formatKES(item.book.selling_price * item.quantity)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.book.id, -1)}
                    className="w-6 h-6 rounded border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-600 tactile-btn"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-mono font-semibold text-neutral-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.book.id, 1)}
                    className="w-6 h-6 rounded border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-600 tactile-btn"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.book.id)}
                    className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Financial Summary & Checkout Trigger */}
        <div className="p-3.5 border-t border-neutral-200 bg-neutral-50/70 space-y-2">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums text-neutral-800">{formatKES(totals.subtotal)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span className="font-mono tabular-nums">−{formatKES(totals.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-semibold text-neutral-900 pt-1 border-t border-neutral-200">
              <span>Total Payable:</span>
              <span className="font-mono text-base tabular-nums">{formatKES(totals.grandTotal)}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className={`w-full py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition-all tactile-btn ${
              cart.length === 0
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            }`}
          >
            <span>Proceed to Payment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Checkout Modal - Emil Kowalski style dialog */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsCheckoutOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden text-neutral-900"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
                    Record Payment
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Total Due: <span className="font-mono font-medium text-neutral-900">{formatKES(totals.grandTotal)}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsCheckoutOpen(false)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Payment Tabs */}
              <div className="p-5 space-y-4">
                <div className="p-1 rounded-lg bg-neutral-100 grid grid-cols-4 gap-1 text-xs">
                  <button
                    onClick={() => {
                      setPaymentMethod('cash');
                      setPaymentError(null);
                    }}
                    className={`py-1.5 rounded-md font-medium transition-all tactile-btn flex items-center justify-center gap-1 ${
                      paymentMethod === 'cash'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('mpesa');
                      setPaymentError(null);
                    }}
                    className={`py-1.5 rounded-md font-medium transition-all tactile-btn flex items-center justify-center gap-1 ${
                      paymentMethod === 'mpesa'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>M-Pesa</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('card');
                      setPaymentError(null);
                    }}
                    className={`py-1.5 rounded-md font-medium transition-all tactile-btn flex items-center justify-center gap-1 ${
                      paymentMethod === 'card'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Card</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('split');
                      setPaymentError(null);
                    }}
                    className={`py-1.5 rounded-md font-medium transition-all tactile-btn flex items-center justify-center gap-1 ${
                      paymentMethod === 'split'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Split</span>
                  </button>
                </div>

                {paymentError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Cash Method Form */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                        Cash Tendered (KES)
                      </label>
                      <input
                        type="number"
                        value={amountTendered}
                        onChange={(e) => setAmountTendered(e.target.value)}
                        className="w-full text-base font-mono font-medium px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                        placeholder="Enter amount given by customer..."
                      />
                    </div>

                    {/* Quick Tender Chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickTender(totals.grandTotal)}
                        className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-mono tactile-btn"
                      >
                        Exact ({formatKES(totals.grandTotal)})
                      </button>
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickTender(amt)}
                          className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-mono tactile-btn"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>

                    {/* Change Breakdown */}
                    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
                      <span className="text-neutral-500">Change Due:</span>
                      <span className="text-base font-mono font-bold text-neutral-900 tabular-nums">
                        {formatKES(changeDue)}
                      </span>
                    </div>
                  </div>
                )}

                {/* M-Pesa Method Form */}
                {paymentMethod === 'mpesa' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                        M-Pesa Confirmation Code
                      </label>
                      <input
                        type="text"
                        value={mpesaCode}
                        onChange={(e) => setMpesaCode(e.target.value)}
                        placeholder="e.g. QKH789XYZ1"
                        className="w-full text-sm font-mono uppercase px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Manually verify that the customer payment arrived on your till or phone before completing.
                    </p>
                  </div>
                )}

                {/* Card Method Form */}
                {paymentMethod === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                        Card Approval / Slip Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={cardReference}
                        onChange={(e) => setCardReference(e.target.value)}
                        placeholder="e.g. AUTH-482910"
                        className="w-full text-sm font-mono px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Swipe or tap card on your external PDQ/POS terminal, then record the slip number here.
                    </p>
                  </div>
                )}

                {/* Split Method Form */}
                {paymentMethod === 'split' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                          Cash Portion (KES)
                        </label>
                        <input
                          type="number"
                          value={splitCashAmount}
                          onChange={(e) => setSplitCashAmount(e.target.value)}
                          placeholder="0"
                          className="w-full text-sm font-mono px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                          M-Pesa Portion (KES)
                        </label>
                        <input
                          type="number"
                          value={splitMpesaAmount}
                          onChange={(e) => setSplitMpesaAmount(e.target.value)}
                          placeholder="0"
                          className="w-full text-sm font-mono px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                        M-Pesa Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={mpesaCode}
                        onChange={(e) => setMpesaCode(e.target.value)}
                        placeholder="e.g. QKH..."
                        className="w-full text-xs font-mono uppercase px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 py-3.5 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCompleteSale}
                  className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs shadow-xs tactile-btn flex items-center gap-1.5"
                >
                  <span>{isSubmitting ? 'Recording...' : 'Confirm & Complete'}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Printable Receipt Preview Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          settings={settings}
          onClose={() => setCompletedSale(null)}
          onNewSale={() => {
            setCompletedSale(null);
            clearCart();
          }}
        />
      )}
    </div>
  );
};
