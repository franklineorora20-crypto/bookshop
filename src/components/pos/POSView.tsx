import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  HelpCircle,
  PauseCircle,
  PlayCircle,
  Tag,
  Undo2,
} from 'lucide-react';
import { Book, Sale, ShopSettings, User } from '../../types/index.ts';
import { calculateCartTotals, calculateChange } from '../../utils/calculations.ts';
import { formatKES } from '../../utils/formatters.ts';
import { processSale, getSaleById, checkMpesaReferenceUsed } from '../../db/database.ts';
import { ReceiptModal } from './ReceiptModal.tsx';
import { ShortcutCheatSheetModal } from './ShortcutCheatSheetModal.tsx';
import { playScannerSuccessBeep, playScannerErrorBeep } from '../../utils/audio.ts';
import { STRINGS } from '../../i18n/strings.ts';

export interface CartItem {
  book: Book;
  quantity: number;
  discountAmount: number; // total discount on this line
}

export interface ParkedCart {
  id: string;
  label: string;
  items: CartItem[];
  customerName: string;
  cartDiscount: number;
  createdAt: string;
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

  // Scanner feedback state
  const [scannerFlash, setScannerFlash] = useState<'success' | 'error' | null>(null);

  // Parked / Held Carts
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>(() => {
    try {
      const stored = localStorage.getItem('kitabupos_parked_carts');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'split'>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [mpesaCode, setMpesaCode] = useState<string>('');
  const [mpesaDuplicateWarning, setMpesaDuplicateWarning] = useState<string | null>(null);
  const [cardReference, setCardReference] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitMpesaAmount, setSplitMpesaAmount] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt modal state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Shortcuts cheat-sheet modal
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);

  // Focus ref
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tenderInputRef = useRef<HTMLInputElement>(null);

  // Refocus search helper
  const focusSearchInput = useCallback(() => {
    if (!isCheckoutOpen && !completedSale && !isCheatSheetOpen && !isResumeModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isCheckoutOpen, completedSale, isCheatSheetOpen, isResumeModalOpen]);

  // Keep search focused on initial mount and when modals close
  useEffect(() => {
    focusSearchInput();
  }, [focusSearchInput]);

  // Save parked carts to storage
  useEffect(() => {
    try {
      localStorage.setItem('kitabupos_parked_carts', JSON.stringify(parkedCarts));
    } catch {}
  }, [parkedCarts]);

  // Unique categories list (ALL categories included)
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

  // Add book to cart helper
  const addToCart = useCallback(
    (book: Book, quantityToAdd = 1) => {
      const existingIndex = cart.findIndex((item) => item.book.id === book.id);
      const currentQtyInCart = existingIndex > -1 ? cart[existingIndex].quantity : 0;

      if (currentQtyInCart + quantityToAdd > book.quantity) {
        playScannerErrorBeep();
        toast.error(`Only ${book.quantity} copies of "${book.title}" in stock.`);
        return;
      }

      if (existingIndex > -1) {
        const updated = [...cart];
        updated[existingIndex].quantity += quantityToAdd;
        setCart(updated);
      } else {
        setCart([...cart, { book, quantity: quantityToAdd, discountAmount: 0 }]);
      }

      focusSearchInput();
    },
    [cart, focusSearchInput]
  );

  // Direct exact barcode/ISBN scanner listener on input change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const trimmed = val.trim();
    if (!trimmed) return;

    // Check if trimmed value matches any book's exact barcode or ISBN
    const exactMatch = books.find(
      (b) =>
        !b.is_archived &&
        ((b.barcode && b.barcode.toLowerCase() === trimmed.toLowerCase()) ||
          (b.isbn && b.isbn.replace(/-/g, '').toLowerCase() === trimmed.replace(/-/g, '').toLowerCase()))
    );

    if (exactMatch) {
      addToCart(exactMatch);
      setSearchQuery('');
      playScannerSuccessBeep();
      setScannerFlash('success');
      setTimeout(() => setScannerFlash(null), 400);
      toast.success(`Scanned: ${exactMatch.title}`);
    }
  };

  // Barcode / Enter key submit handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    const matchedBook = books.find(
      (b) =>
        !b.is_archived &&
        ((b.barcode && b.barcode.toLowerCase() === query.toLowerCase()) ||
          (b.isbn && b.isbn.toLowerCase() === query.toLowerCase()) ||
          b.title.toLowerCase() === query.toLowerCase())
    );

    if (matchedBook) {
      addToCart(matchedBook);
      setSearchQuery('');
      playScannerSuccessBeep();
      setScannerFlash('success');
      setTimeout(() => setScannerFlash(null), 400);
      toast.success(`Added "${matchedBook.title}" to cart`);
    } else {
      playScannerErrorBeep();
      setScannerFlash('error');
      setTimeout(() => setScannerFlash(null), 450);
      toast.error(`No book found matching: "${query}"`);
    }
  };

  // Quantity updates
  const updateQuantity = (bookId: number, delta: number) => {
    const item = cart.find((c) => c.book.id === bookId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(bookId);
      return;
    }

    if (newQty > item.book.quantity) {
      toast.error(`Only ${item.book.quantity} copies in stock.`);
      return;
    }

    setCart(cart.map((c) => (c.book.id === bookId ? { ...c, quantity: newQty } : c)));
    focusSearchInput();
  };

  const setItemDirectQuantity = (bookId: number, targetQty: number) => {
    const item = cart.find((c) => c.book.id === bookId);
    if (!item) return;

    if (targetQty <= 0) {
      removeFromCart(bookId);
      return;
    }

    if (targetQty > item.book.quantity) {
      toast.error(`Only ${item.book.quantity} copies in stock.`);
      setCart(cart.map((c) => (c.book.id === bookId ? { ...c, quantity: item.book.quantity } : c)));
      return;
    }

    setCart(cart.map((c) => (c.book.id === bookId ? { ...c, quantity: targetQty } : c)));
  };

  const updateItemDiscount = (bookId: number, discount: number) => {
    setCart(
      cart.map((c) =>
        c.book.id === bookId ? { ...c, discountAmount: Math.max(0, discount) } : c
      )
    );
  };

  const removeFromCart = (bookId: number) => {
    const itemToRemove = cart.find((c) => c.book.id === bookId);
    setCart(cart.filter((c) => c.book.id !== bookId));

    if (itemToRemove) {
      toast(`Removed "${itemToRemove.book.title}"`, {
        action: {
          label: 'Undo',
          onClick: () => {
            setCart((current) => [...current, itemToRemove]);
            focusSearchInput();
          },
        },
        duration: 4000,
      });
    }
    focusSearchInput();
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setCartDiscount(0);
    setCustomerName('');
    focusSearchInput();
  };

  // Park / Hold Cart
  const handleHoldCart = () => {
    if (cart.length === 0) {
      toast.error('Cannot hold an empty cart');
      return;
    }

    const defaultLabel = customerName.trim()
      ? `Customer: ${customerName.trim()}`
      : `Cart #${parkedCarts.length + 1} (${new Date().toLocaleTimeString('en-KE', {
          hour: '2-digit',
          minute: '2-digit',
        })})`;

    const customLabel = window.prompt(STRINGS.pos.holdCartPrompt, defaultLabel);
    if (customLabel === null) return; // User canceled

    const newParked: ParkedCart = {
      id: `parked_${Date.now()}`,
      label: customLabel.trim() || defaultLabel,
      items: [...cart],
      customerName,
      cartDiscount,
      createdAt: new Date().toISOString(),
    };

    setParkedCarts([newParked, ...parkedCarts]);
    clearCart();
    toast.success(`Cart "${newParked.label}" parked.`);
  };

  // Resume Parked Cart
  const handleResumeCart = (parked: ParkedCart) => {
    if (cart.length > 0) {
      const confirmSwitch = window.confirm(
        'Current active cart will be replaced by the parked cart. Do you want to proceed?'
      );
      if (!confirmSwitch) return;
    }

    setCart(parked.items);
    setCustomerName(parked.customerName);
    setCartDiscount(parked.cartDiscount);
    setParkedCarts(parkedCarts.filter((p) => p.id !== parked.id));
    setIsResumeModalOpen(false);
    toast.success(`Resumed cart "${parked.label}"`);
    focusSearchInput();
  };

  // Open checkout modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentError(null);
    setMpesaDuplicateWarning(null);
    setAmountTendered(totals.grandTotal.toString());
    setSplitCashAmount('');
    setSplitMpesaAmount('');
    setMpesaCode('');
    setCardReference('');
    setIsCheckoutOpen(true);
    setTimeout(() => {
      tenderInputRef.current?.focus();
      tenderInputRef.current?.select();
    }, 100);
  };

  // Quick tender button click
  const handleQuickTender = (val: number) => {
    setAmountTendered(val.toString());
  };

  // Calculate change for cash sale
  const tenderNum = parseFloat(amountTendered) || 0;
  const changeDue = calculateChange(totals.grandTotal, tenderNum);

  // Split payment handler: auto-fill remainder
  const handleSplitCashChange = (cashVal: string) => {
    setSplitCashAmount(cashVal);
    const cashNum = parseFloat(cashVal) || 0;
    const remainder = Math.max(0, totals.grandTotal - cashNum);
    setSplitMpesaAmount(remainder > 0 ? remainder.toFixed(2) : '');
  };

  // Validate M-Pesa Code for 10-char & duplicate
  const handleMpesaCodeChange = async (code: string) => {
    const uppercaseCode = code.toUpperCase().trim();
    setMpesaCode(uppercaseCode);
    setMpesaDuplicateWarning(null);

    if (uppercaseCode.length === 10) {
      try {
        const isUsed = await checkMpesaReferenceUsed(uppercaseCode);
        if (isUsed) {
          setMpesaDuplicateWarning(STRINGS.pos.mpesaDuplicate);
        }
      } catch {}
    }
  };

  // Complete Sale execution
  const handleCompleteSale = async () => {
    setPaymentError(null);

    if (paymentMethod === 'cash') {
      if (tenderNum < totals.grandTotal) {
        setPaymentError(`Cash tendered (${formatKES(tenderNum)}) is less than total ${formatKES(totals.grandTotal)}`);
        return;
      }
    } else if (paymentMethod === 'mpesa') {
      const trimmed = mpesaCode.trim();
      if (!trimmed) {
        setPaymentError('M-Pesa confirmation code is required.');
        return;
      }
      if (!/^[A-Za-z0-9]{10}$/.test(trimmed)) {
        setPaymentError(STRINGS.pos.mpesaInvalidLength);
        return;
      }
    } else if (paymentMethod === 'split') {
      const c = parseFloat(splitCashAmount) || 0;
      const m = parseFloat(splitMpesaAmount) || 0;
      if (Math.round((c + m) * 100) / 100 < totals.grandTotal) {
        setPaymentError(`Combined payments (${formatKES(c + m)}) do not cover total ${formatKES(totals.grandTotal)}`);
        return;
      }
      if (m > 0 && mpesaCode.trim() && !/^[A-Za-z0-9]{10}$/.test(mpesaCode.trim())) {
        setPaymentError(STRINGS.pos.mpesaInvalidLength);
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

      // Brief inline feedback (no confetti delays)
      toast.success(`Sale #${receiptNumber} finalized • ${formatKES(totals.grandTotal)}`);

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

  // Keyboard Navigation & Shortcuts in POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing inside an input other than the search bar, don't hijack global shortcuts unless F2 or Esc
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';

      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsCheatSheetOpen((prev) => !prev);
        return;
      }

      if (e.key === 'F8') {
        e.preventDefault();
        handleHoldCart();
        return;
      }

      if (e.key === 'F9') {
        e.preventDefault();
        setIsResumeModalOpen((prev) => !prev);
        return;
      }

      // Inside Checkout modal shortcuts
      if (isCheckoutOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsCheckoutOpen(false);
          focusSearchInput();
        } else if (e.key === 'Enter' && !isSubmitting) {
          e.preventDefault();
          handleCompleteSale();
        } else if (e.altKey || (!isInput && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4'))) {
          if (e.key === '1') setPaymentMethod('cash');
          else if (e.key === '2') setPaymentMethod('mpesa');
          else if (e.key === '3') setPaymentMethod('card');
          else if (e.key === '4') setPaymentMethod('split');
        }
        return;
      }

      // Outside checkout modal: F4 or Space (when not typing) opens Checkout
      if ((e.key === 'F4' || (e.code === 'Space' && !isInput)) && cart.length > 0) {
        e.preventDefault();
        handleOpenCheckout();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div
      className={`flex flex-col lg:flex-row h-full overflow-hidden bg-neutral-50 ${
        scannerFlash === 'success'
          ? 'scanner-flash-success'
          : scannerFlash === 'error'
          ? 'scanner-flash-error'
          : ''
      }`}
    >
      {/* Mobile Top Segmented Tab Switcher */}
      <div className="lg:hidden flex items-center bg-white border-b border-neutral-200 px-3 py-2 shrink-0">
        <div className="grid grid-cols-2 w-full p-1 bg-neutral-100 rounded-lg text-sm font-medium">
          <button
            onClick={() => setMobileTab('catalog')}
            className={`py-2 rounded-md transition-all text-center touch-target ${
              mobileTab === 'catalog'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Catalog ({filteredBooks.length})
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`py-2 rounded-md transition-all text-center flex items-center justify-center gap-1.5 touch-target ${
              mobileTab === 'cart'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
            {cart.length > 0 && (
              <span className="font-mono text-xs text-emerald-600 font-bold tabular-nums">
                {formatKES(totals.grandTotal)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Left Column: Catalog & Scanner Header */}
      <div
        className={`flex-1 flex flex-col min-w-0 border-r border-neutral-200 bg-white ${
          mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search & Barcode Header */}
        <div className="p-3 sm:p-4 border-b border-neutral-200 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={STRINGS.pos.scannerPlaceholder}
                className="w-full pl-10 pr-20 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15 min-h-[44px] transition-all shadow-xs"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-neutral-400 pointer-events-none">
                <Barcode className="w-4 h-4" />
                <span className="text-xs font-mono hidden sm:inline">Scanner</span>
              </div>
            </form>

            {/* Quick shortcuts help button */}
            <button
              type="button"
              onClick={() => setIsCheatSheetOpen(true)}
              className="p-2.5 rounded-xl border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 transition-colors tactile-btn touch-target flex items-center justify-center shrink-0"
              title="Keyboard Shortcuts Cheat-Sheet (Press ?)"
              aria-label="Keyboard Shortcuts"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          {/* ALL Category Chips with Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  focusSearchInput();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all tactile-btn touch-target flex items-center justify-center shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white shadow-xs font-semibold'
                    : 'bg-neutral-100 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200'
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
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400">
                <Boxes className="w-7 h-7" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-base font-semibold text-neutral-900">Inventory is Empty</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  No books added yet. Register your first textbook or import a CSV catalog.
                </p>
              </div>
              {onNavigateInventory && (
                <button
                  type="button"
                  onClick={onNavigateInventory}
                  className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs shadow-xs tactile-btn min-h-[44px]"
                >
                  Go to Book Inventory
                </button>
              )}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="py-20 text-center text-neutral-400 text-sm">
              No titles match your search or filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredBooks.map((book) => {
                const inCart = cart.find((c) => c.book.id === book.id);
                const isOutOfStock = book.quantity <= 0;
                const isLowStock = book.quantity <= book.reorder_level && !isOutOfStock;

                return (
                  <button
                    key={book.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => addToCart(book)}
                    className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between tactile-btn group relative select-none min-h-[120px] ${
                      isOutOfStock
                        ? 'opacity-40 bg-neutral-100 border-neutral-200 cursor-not-allowed'
                        : inCart
                        ? 'bg-white border-neutral-900 shadow-xs ring-2 ring-neutral-900/15'
                        : 'bg-white border-neutral-200 hover:border-neutral-400 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs text-neutral-500 truncate uppercase font-medium">
                          {book.category}
                        </span>
                        <span
                          className={`text-xs font-mono font-medium px-1.5 py-0.5 rounded ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 font-semibold'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-800 font-semibold'
                              : 'text-neutral-500 bg-neutral-100'
                          }`}
                        >
                          {isOutOfStock ? '0 left' : `${book.quantity} left`}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:text-neutral-950">
                        {book.title}
                      </h4>
                      <p className="text-xs text-neutral-500 truncate mt-0.5">{book.author}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-sm sm:text-base font-mono font-bold text-neutral-900 tabular-nums">
                        {formatKES(book.selling_price)}
                      </span>
                      {inCart && (
                        <span className="text-xs font-mono font-bold bg-neutral-900 text-white min-w-[24px] h-6 px-1.5 rounded-md flex items-center justify-center shadow-xs">
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
              <p className="text-base font-bold font-mono text-neutral-900 tabular-nums">
                {formatKES(totals.grandTotal)}
              </p>
            </div>
            <button
              onClick={() => setMobileTab('cart')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold shadow-xs tactile-btn min-h-[44px]"
            >
              <span>Review & Pay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Cart & Checkout Column */}
      <div
        className={`w-full lg:w-96 xl:w-[420px] flex flex-col bg-white border-l border-neutral-200 shrink-0 ${
          mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Cart Header */}
        <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileTab('catalog')}
              className="lg:hidden p-1 text-neutral-600 hover:text-neutral-900 text-xs font-semibold"
              title="Back to Catalog"
            >
              ←
            </button>
            <ShoppingCart className="w-4 h-4 text-neutral-800" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Current Sale ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Hold Cart Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleHoldCart}
              title="Park / Hold current cart (F8)"
              className="px-2 py-1 text-xs rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 transition-colors"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hold</span>
            </button>

            {/* Resume Cart Button */}
            {parkedCarts.length > 0 && (
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                title="Resume parked cart (F9)"
                className="px-2 py-1 text-xs rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Parked ({parkedCarts.length})</span>
              </button>
            )}

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-neutral-500 hover:text-rose-600 transition-colors ml-1"
                title="Clear current cart"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Customer Name input for receipt */}
        <div className="px-3.5 py-2 border-b border-neutral-100 bg-neutral-50/50">
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional, printed on receipt)..."
            className="w-full text-xs px-3 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-900"
          />
        </div>

        {/* Cart Items List with Inline Stepper & Stock Warnings */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-neutral-400">
              <ShoppingCart className="w-10 h-10 text-neutral-300 stroke-[1.5]" />
              <p className="text-sm font-medium text-neutral-600">Cart is empty</p>
              <p className="text-xs text-neutral-400 max-w-xs">
                Scan barcode or select titles from catalog to begin sale
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const isLow = item.book.quantity <= 3;
              const isMaxStock = item.quantity >= item.book.quantity;

              return (
                <div
                  key={item.book.id}
                  className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-sm font-semibold text-neutral-900 leading-snug">
                        {item.book.title}
                      </h5>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5 tabular-nums font-mono">
                        <span>{formatKES(item.book.selling_price)}</span>
                        <span>×</span>
                        <span>{item.quantity}</span>
                        <span>=</span>
                        <span className="font-bold text-neutral-900">
                          {formatKES(item.book.selling_price * item.quantity - item.discountAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.book.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-neutral-200/50 transition-colors"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Stock Level Warning */}
                  {isLow && (
                    <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70 inline-block">
                      {isMaxStock ? 'All stock in cart' : `Only ${item.book.quantity} left in stock`}
                    </div>
                  )}

                  {/* Inline Stepper + Line Discount */}
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-200/60">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.book.id, -1)}
                        className="w-8 h-8 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-700 tactile-btn"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      {/* Typed numeric quantity input */}
                      <input
                        type="number"
                        min={1}
                        max={item.book.quantity}
                        value={item.quantity}
                        onChange={(e) =>
                          setItemDirectQuantity(item.book.id, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-12 h-8 text-center font-mono font-bold text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                        aria-label="Quantity"
                      />

                      <button
                        type="button"
                        disabled={isMaxStock}
                        onClick={() => updateQuantity(item.book.id, 1)}
                        className="w-8 h-8 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 flex items-center justify-center text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed tactile-btn"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line discount editor */}
                    <div className="flex items-center gap-1 text-xs">
                      <Tag className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-neutral-500 text-[11px]">Disc:</span>
                      <input
                        type="number"
                        min={0}
                        value={item.discountAmount || ''}
                        onChange={(e) =>
                          updateItemDiscount(item.book.id, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-16 h-8 text-right font-mono text-xs px-1.5 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-neutral-900"
                        title="Discount amount (KES)"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Financial Summary & Big Sticky Charge Button */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 space-y-3 shrink-0">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="font-mono tabular-nums text-neutral-900 font-medium">
                {formatKES(totals.subtotal)}
              </span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Total Discount:</span>
                <span className="font-mono tabular-nums">−{formatKES(totals.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline text-sm font-bold text-neutral-900 pt-2 border-t border-neutral-200">
              <span className="text-base">TOTAL DUE:</span>
              <span className="font-mono text-xl tabular-nums text-neutral-900 font-bold">
                {formatKES(totals.grandTotal)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleOpenCheckout}
            className={`w-full min-h-[50px] rounded-xl text-base font-bold flex items-center justify-center gap-2.5 shadow-md transition-all tactile-btn ${
              cart.length === 0
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            }`}
          >
            <span>Charge {formatKES(totals.grandTotal)}</span>
            <kbd className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              F4 / Space
            </kbd>
          </button>
        </div>
      </div>

      {/* Keyboard-Driven Checkout Tender Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
              onClick={() => {
                setIsCheckoutOpen(false);
                focusSearchInput();
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', duration: 0.25 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 z-10"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-neutral-900">
                    Payment Tender
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Amount Payable:{' '}
                    <span className="font-mono font-bold text-sm text-neutral-900">
                      {formatKES(totals.grandTotal)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    focusSearchInput();
                  }}
                  className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 touch-target"
                  aria-label="Close checkout (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Segmented Payment Tabs (Keys 1-4) */}
              <div className="p-6 space-y-4">
                <div className="p-1 rounded-xl bg-neutral-100 grid grid-cols-4 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setPaymentError(null);
                    }}
                    className={`py-2 rounded-lg font-semibold transition-all tactile-btn flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
                      paymentMethod === 'cash'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Cash (1)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('mpesa');
                      setPaymentError(null);
                    }}
                    className={`py-2 rounded-lg font-semibold transition-all tactile-btn flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
                      paymentMethod === 'mpesa'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>M-Pesa (2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('card');
                      setPaymentError(null);
                    }}
                    className={`py-2 rounded-lg font-semibold transition-all tactile-btn flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
                      paymentMethod === 'card'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card (3)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('split');
                      setPaymentError(null);
                    }}
                    className={`py-2 rounded-lg font-semibold transition-all tactile-btn flex flex-col sm:flex-row items-center justify-center gap-1 min-h-[44px] ${
                      paymentMethod === 'split'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>Split (4)</span>
                  </button>
                </div>

                {paymentError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Cash Method Form */}
                {paymentMethod === 'cash' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Cash Tendered (KES)
                      </label>
                      <input
                        ref={tenderInputRef}
                        type="number"
                        value={amountTendered}
                        onChange={(e) => setAmountTendered(e.target.value)}
                        className="w-full text-xl font-mono font-bold px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15 min-h-[48px]"
                        placeholder="Enter amount customer gave..."
                      />
                    </div>

                    {/* Quick Tender Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickTender(totals.grandTotal)}
                        className="px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono tactile-btn border border-neutral-200"
                      >
                        Exact ({formatKES(totals.grandTotal)})
                      </button>
                      {[100, 200, 500, 1000, 2000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickTender(amt)}
                          className="px-3 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono tactile-btn border border-neutral-200"
                        >
                          KES {amt}
                        </button>
                      ))}
                    </div>

                    {/* Big Change Due Display */}
                    <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-600">Change Due:</span>
                      <span className="text-2xl font-mono font-bold text-emerald-600 tabular-nums">
                        {formatKES(changeDue)}
                      </span>
                    </div>
                  </div>
                )}

                {/* M-Pesa Method Form with 10-char & Duplicate Warning */}
                {paymentMethod === 'mpesa' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        M-Pesa 10-Character Code (e.g. QKH789XYZ1)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={mpesaCode}
                        onChange={(e) => handleMpesaCodeChange(e.target.value)}
                        placeholder="10 alphanumeric characters..."
                        className="w-full text-lg font-mono font-bold uppercase px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/15 min-h-[48px]"
                      />
                    </div>

                    {mpesaDuplicateWarning && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>{mpesaDuplicateWarning}</span>
                      </div>
                    )}

                    <p className="text-xs text-neutral-500">
                      Verify that customer SMS has arrived on your business till or phone before finalizing.
                    </p>
                  </div>
                )}

                {/* Card Method Form */}
                {paymentMethod === 'card' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Card Approval / Slip Reference (Optional)
                      </label>
                      <input
                        type="text"
                        value={cardReference}
                        onChange={(e) => setCardReference(e.target.value)}
                        placeholder="e.g. AUTH-482910"
                        className="w-full text-base font-mono px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900 min-h-[48px]"
                      />
                    </div>
                    <p className="text-xs text-neutral-500">
                      Swipe/tap customer card on external PDQ terminal, then record slip reference.
                    </p>
                  </div>
                )}

                {/* Split Method Form with Auto-calculated Remainder */}
                {paymentMethod === 'split' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">
                          Cash Portion (KES)
                        </label>
                        <input
                          type="number"
                          value={splitCashAmount}
                          onChange={(e) => handleSplitCashChange(e.target.value)}
                          placeholder="0"
                          className="w-full text-base font-mono font-bold px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900 min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-neutral-700 mb-1">
                          M-Pesa Portion (Auto)
                        </label>
                        <input
                          type="number"
                          value={splitMpesaAmount}
                          onChange={(e) => setSplitMpesaAmount(e.target.value)}
                          placeholder="0"
                          className="w-full text-base font-mono font-bold px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900 min-h-[44px]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        M-Pesa 10-Character Code (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={mpesaCode}
                        onChange={(e) => handleMpesaCodeChange(e.target.value)}
                        placeholder="e.g. SHG89X2Q1Z"
                        className="w-full text-sm font-mono uppercase px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900 min-h-[44px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    focusSearchInput();
                  }}
                  className="px-4 py-2.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Cancel (Esc)
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCompleteSale}
                  className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm shadow-md tactile-btn flex items-center gap-2 min-h-[44px]"
                >
                  <span>{isSubmitting ? 'Recording...' : 'Confirm Sale (Enter)'}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Parked Carts Modal */}
      <AnimatePresence>
        {isResumeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
              onClick={() => setIsResumeModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden text-neutral-900 z-10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h4 className="text-sm font-bold text-neutral-900">Parked / Held Carts</h4>
                <button
                  onClick={() => setIsResumeModalOpen(false)}
                  className="p-1 rounded-md text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {parkedCarts.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-6">No parked carts.</p>
                ) : (
                  parkedCarts.map((p) => {
                    const itemCount = p.items.reduce((s, i) => s + i.quantity, 0);
                    const totalVal = p.items.reduce(
                      (s, i) => s + i.quantity * i.book.selling_price - i.discountAmount,
                      0
                    );
                    return (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">{p.label}</p>
                          <p className="text-xs text-neutral-500 font-mono">
                            {itemCount} items • {formatKES(totalVal)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleResumeCart(p)}
                            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold tactile-btn"
                          >
                            Resume
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setParkedCarts(parkedCarts.filter((item) => item.id !== p.id))
                            }
                            className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-md"
                            title="Discard parked cart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
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
          onClose={() => {
            setCompletedSale(null);
            focusSearchInput();
          }}
          onNewSale={() => {
            setCompletedSale(null);
            clearCart();
            focusSearchInput();
          }}
        />
      )}

      {/* Keyboard Shortcuts Cheat-Sheet */}
      <ShortcutCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => {
          setIsCheatSheetOpen(false);
          focusSearchInput();
        }}
      />
    </div>
  );
};
