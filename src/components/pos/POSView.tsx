import React, { useState, useEffect, useRef } from 'react';
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
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { Book, Customer, Sale, ShopSettings, User } from '../../types/index.ts';
import { calculateCartTotals, calculateChange, canCustomerBorrow } from '../../utils/calculations.ts';
import { formatKES } from '../../utils/formatters.ts';
import { processSale } from '../../db/database.ts';
import { ReceiptModal } from './ReceiptModal.tsx';

interface CartItem {
  book: Book;
  quantity: number;
  discountAmount: number;
}

interface POSViewProps {
  books: Book[];
  customers: Customer[];
  settings: ShopSettings | null;
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const POSView: React.FC<POSViewProps> = ({
  books,
  customers,
  settings,
  currentUser,
  onRefreshData,
}) => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'credit' | 'split' | 'card'>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [mpesaCode, setMpesaCode] = useState<string>('');
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

  // Selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Barcode / Quick search scanner handler
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = searchQuery.trim();
    if (!code) return;

    // Look for exact barcode or ISBN match first
    const matchedBook = books.find(
      (b) =>
        !b.is_archived &&
        ((b.barcode && b.barcode.toLowerCase() === code.toLowerCase()) ||
          (b.isbn && b.isbn.replace(/-/g, '').toLowerCase() === code.replace(/-/g, '').toLowerCase()))
    );

    if (matchedBook) {
      addToCart(matchedBook);
      setSearchQuery('');
    }
  };

  // Add to cart
  const addToCart = (book: Book) => {
    if (book.quantity <= 0) {
      alert(`"${book.title}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.book.id === book.id);
      if (existing) {
        if (existing.quantity >= book.quantity) {
          alert(`Cannot add more. In-store stock limit reached (${book.quantity} available).`);
          return prev;
        }
        return prev.map((item) =>
          item.book.id === book.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { book, quantity: 1, discountAmount: 0 }];
    });
  };

  // Update quantity
  const updateQuantity = (bookId: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.book.id === bookId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.book.quantity) {
              alert(`Cannot exceed available stock (${item.book.quantity} copies in store).`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (bookId: number) => {
    setCart((prev) => prev.filter((item) => item.book.id !== bookId));
  };

  const clearCart = () => {
    if (cart.length > 0 && confirm('Clear current cart?')) {
      setCart([]);
      setCartDiscount(0);
      setSelectedCustomerId('');
    }
  };

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setAmountTendered(totals.grandTotal.toString());
    setSplitCashAmount(Math.round(totals.grandTotal / 2).toString());
    setSplitMpesaAmount((totals.grandTotal - Math.round(totals.grandTotal / 2)).toString());
    setPaymentError(null);
    setIsCheckoutOpen(true);
  };

  // Process and finalize sale
  const handleCompleteSale = async () => {
    setPaymentError(null);
    const tendered = parseFloat(amountTendered) || 0;

    // Validation per payment method
    if (paymentMethod === 'cash') {
      if (tendered < totals.grandTotal) {
        setPaymentError(`Cash tendered (KES ${tendered}) is less than total amount (KES ${totals.grandTotal}).`);
        return;
      }
    } else if (paymentMethod === 'mpesa') {
      if (!mpesaCode.trim() || mpesaCode.trim().length < 6) {
        setPaymentError('Please enter a valid M-Pesa transaction confirmation code (e.g., QKD982JFL1).');
        return;
      }
    } else if (paymentMethod === 'credit') {
      if (!selectedCustomer) {
        setPaymentError('Credit sale requires selecting a registered customer.');
        return;
      }
      const creditCheck = canCustomerBorrow(
        selectedCustomer.credit_limit,
        selectedCustomer.current_balance,
        totals.grandTotal
      );
      if (!creditCheck.allowed) {
        setPaymentError(creditCheck.reason || 'Customer credit limit exceeded.');
        return;
      }
    } else if (paymentMethod === 'split') {
      const cashVal = parseFloat(splitCashAmount) || 0;
      const mpesaVal = parseFloat(splitMpesaAmount) || 0;
      if (Math.round((cashVal + mpesaVal) * 100) !== Math.round(totals.grandTotal * 100)) {
        setPaymentError(
          `Split amounts (KES ${cashVal} + KES ${mpesaVal} = KES ${cashVal + mpesaVal}) must exactly equal grand total KES ${totals.grandTotal}.`
        );
        return;
      }
      if (mpesaVal > 0 && (!mpesaCode.trim() || mpesaCode.trim().length < 6)) {
        setPaymentError('Please record the M-Pesa transaction code for the M-Pesa portion.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const cashierName = currentUser?.full_name || 'Cashier';
      const change = paymentMethod === 'cash' ? calculateChange(totals.grandTotal, tendered) : 0;
      const totalPaid = paymentMethod === 'credit' ? 0 : paymentMethod === 'cash' ? tendered : totals.grandTotal;

      const salePayload = {
        cashierName,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        subtotal: totals.subtotal,
        discountTotal: totals.totalDiscount,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        totalPaid,
        changeAmount: change,
        paymentMethod,
        paymentReference:
          paymentMethod === 'mpesa'
            ? mpesaCode.trim().toUpperCase()
            : paymentMethod === 'split'
            ? `Cash: ${splitCashAmount}, M-Pesa: ${splitMpesaAmount} (Code: ${mpesaCode.trim().toUpperCase()})`
            : undefined,
        isCredit: paymentMethod === 'credit',
      };

      const saleItems = cart.map((c) => ({
        bookId: c.book.id,
        bookTitle: c.book.title,
        isbn: c.book.isbn,
        quantity: c.quantity,
        unitPurchasePrice: c.book.purchase_price,
        unitSellingPrice: c.book.selling_price,
        discountAmount: c.discountAmount,
        totalPrice: c.quantity * c.book.selling_price - c.discountAmount,
      }));

      const result = await processSale(
        salePayload,
        saleItems,
        currentUser?.id || 1,
        currentUser?.full_name || 'Cashier'
      );

      // Create local Sale object for immediate receipt rendering
      const createdSale: Sale = {
        id: result.saleId,
        receipt_number: result.receiptNumber,
        user_id: currentUser?.id || 1,
        cashier_name: cashierName,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || 'Walk-in Customer',
        subtotal: totals.subtotal,
        discount_total: totals.totalDiscount,
        tax_total: totals.taxTotal,
        grand_total: totals.grandTotal,
        total_paid: totalPaid,
        change_amount: change,
        payment_method: paymentMethod,
        payment_reference: salePayload.paymentReference,
        is_credit: paymentMethod === 'credit' ? 1 : 0,
        is_voided: 0,
        created_at: new Date().toISOString(),
        items: saleItems.map((si) => ({
          book_id: si.bookId,
          book_title: si.bookTitle,
          quantity: si.quantity,
          unit_purchase_price: si.unitPurchasePrice,
          unit_selling_price: si.unitSellingPrice,
          discount_amount: si.discountAmount,
          total_price: si.totalPrice,
        })),
      };

      setCompletedSale(createdSale);
      setIsCheckoutOpen(false);
      setCart([]);
      setCartDiscount(0);
      setSelectedCustomerId('');
      setMpesaCode('');

      // Refresh database records
      await onRefreshData();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to complete transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 select-none">
      {/* Left Column: Catalog & Search */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-slate-200">
        {/* Search & Barcode Bar */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Search by Title, Author, ISBN, or scan Barcode (Enter)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs font-medium"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Barcode className="w-5 h-5" />
            </div>
          </div>
        </form>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Book Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1">
          {filteredBooks.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400">
              <p className="font-semibold text-sm">No books found matching criteria</p>
              <p className="text-xs mt-1">Try another search term or clear filters</p>
            </div>
          ) : (
            filteredBooks.map((book) => {
              const isOut = book.quantity <= 0;
              const isLow = book.quantity <= book.reorder_level && !isOut;

              return (
                <div
                  key={book.id}
                  onClick={() => !isOut && addToCart(book)}
                  className={`bg-white rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                    isOut
                      ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50'
                      : 'border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                        {book.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          isOut
                            ? 'bg-rose-100 text-rose-800'
                            : isLow
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isOut ? 'Out of Stock' : `${book.quantity} in stock`}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2 mt-1">
                      {book.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{book.author}</p>
                    <p className="text-[10px] text-slate-400 truncate">{book.publisher}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">
                      {formatKES(book.selling_price)}
                    </span>
                    <button
                      disabled={isOut}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isOut
                          ? 'bg-slate-200 text-slate-400'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                      }`}
                      title={isOut ? 'Out of stock' : 'Add to Cart'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Checkout Cart Panel */}
      <div className="w-96 bg-white flex flex-col border-l border-slate-200 shadow-xs">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-sm text-slate-900">Shopping Cart</h3>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-slate-400 hover:text-rose-600 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="p-3 border-b border-slate-200 bg-white">
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Customer Account (Optional for Credit):
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Walk-in Customer (Cash / M-Pesa)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.current_balance > 0 ? `(Debt: KES ${c.current_balance})` : ''}
              </option>
            ))}
          </select>
          {selectedCustomer && (
            <div className="mt-1.5 p-2 rounded bg-slate-50 border border-slate-200 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Credit Limit:</span>
                <span className="font-semibold text-slate-800">
                  {formatKES(selectedCustomer.credit_limit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Balance:</span>
                <span className="font-semibold text-rose-600">
                  {formatKES(selectedCustomer.current_balance)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShoppingCart className="w-12 h-12 stroke-[1.2]" />
              <p className="text-sm font-semibold">Cart is currently empty</p>
              <p className="text-xs text-center max-w-[200px]">
                Click any book in the catalog or scan a barcode to add it to the cart
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.book.id}
                className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-slate-300 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-slate-900 leading-tight truncate">
                      {item.book.title}
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatKES(item.book.selling_price)} each
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.book.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-100">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      onClick={() => updateQuantity(item.book.id, -1)}
                      className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.book.id, 1)}
                      className="w-6 h-6 rounded bg-white text-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-xs shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <span className="font-bold text-xs text-slate-900">
                    {formatKES(item.quantity * item.book.selling_price - item.discountAmount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals & Checkout Button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-800">{formatKES(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Cart Discount (KES):</span>
              <input
                type="number"
                min="0"
                max={totals.subtotal}
                value={cartDiscount || ''}
                placeholder="0"
                onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-0.5 text-right rounded border border-slate-300 bg-white text-xs font-semibold focus:outline-hidden"
              />
            </div>
            {totals.taxTotal > 0 && (
              <div className="flex justify-between">
                <span>VAT ({settings?.tax_rate}%):</span>
                <span>{formatKES(totals.taxTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>TOTAL DUE:</span>
              <span className="text-emerald-700">{formatKES(totals.grandTotal)}</span>
            </div>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              cart.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/20 active:scale-[0.99]'
            }`}
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Checkout Payment Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Payment & Checkout</h3>
                <p className="text-xs text-slate-400">Total payable: {formatKES(totals.grandTotal)}</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'mpesa'
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>M-Pesa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'credit'
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <span>On Credit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('split')}
                  className={`py-2 px-1 rounded-lg text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'split'
                      ? 'bg-white text-blue-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Split Pay</span>
                </button>
              </div>

              {/* Error Notice */}
              {paymentError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Cash Panel */}
              {paymentMethod === 'cash' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cash Tendered (KES):
                    </label>
                    <input
                      type="number"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      className="w-full px-3 py-2 text-lg font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>

                  {/* Fast Denomination Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[100, 200, 500, 1000, 2000].map((denom) => (
                      <button
                        key={denom}
                        type="button"
                        onClick={() =>
                          setAmountTendered(
                            (parseFloat(amountTendered || '0') + denom).toString()
                          )
                        }
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        +{denom}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setAmountTendered(totals.grandTotal.toString())}
                      className="px-2.5 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs"
                    >
                      Exact (KES {totals.grandTotal})
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Change Due:</span>
                    <span className="text-lg font-extrabold text-emerald-700">
                      {formatKES(
                        calculateChange(totals.grandTotal, parseFloat(amountTendered) || 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* M-Pesa Panel */}
              {paymentMethod === 'mpesa' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <p className="font-bold text-emerald-900">
                      M-Pesa Buy Goods Till: {settings?.till_number || '849201'}
                    </p>
                    <p className="text-emerald-700">
                      Ask customer to send exactly <strong>KES {totals.grandTotal}</strong> to Till.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      M-Pesa Transaction Code:
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                      placeholder="e.g. QKD982JFL1"
                      className="w-full px-3 py-2 font-mono uppercase font-bold text-slate-900 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Enter the 10-character reference from customer's M-Pesa SMS.
                    </p>
                  </div>
                </div>
              )}

              {/* Credit Panel */}
              {paymentMethod === 'credit' && (
                <div className="space-y-3">
                  {!selectedCustomer ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      Please select a customer on the cart panel first to charge this sale to their credit account.
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Credit Limit:</span>
                        <span className="font-semibold">{formatKES(selectedCustomer.credit_limit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Balance:</span>
                        <span className="font-semibold text-rose-600">
                          {formatKES(selectedCustomer.current_balance)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1">
                        <span className="text-slate-500">After This Sale:</span>
                        <span className="font-bold text-slate-900">
                          {formatKES(selectedCustomer.current_balance + totals.grandTotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Split Payment Panel */}
              {paymentMethod === 'split' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cash Amount:
                      </label>
                      <input
                        type="number"
                        value={splitCashAmount}
                        onChange={(e) => setSplitCashAmount(e.target.value)}
                        className="w-full px-3 py-2 font-bold rounded-xl border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        M-Pesa Amount:
                      </label>
                      <input
                        type="number"
                        value={splitMpesaAmount}
                        onChange={(e) => setSplitMpesaAmount(e.target.value)}
                        className="w-full px-3 py-2 font-bold rounded-xl border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      M-Pesa Code for M-Pesa Portion:
                    </label>
                    <input
                      type="text"
                      value={mpesaCode}
                      onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                      placeholder="e.g. QKD982JFL1"
                      className="w-full px-3 py-2 font-mono uppercase font-bold rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCompleteSale}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                {isSubmitting ? (
                  <span>Processing SQLite Transaction...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Sale & Print Receipt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal upon completion */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          settings={settings}
          onClose={() => setCompletedSale(null)}
          onNewSale={() => {
            setCompletedSale(null);
            barcodeInputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
};
