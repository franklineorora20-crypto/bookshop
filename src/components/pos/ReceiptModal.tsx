import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Printer, X, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Sale, ShopSettings } from '../../types/index.ts';
import { formatKES, formatDateTime } from '../../utils/formatters.ts';

interface ReceiptModalProps {
  sale: Sale;
  settings: ShopSettings | null;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  settings,
  onClose,
  onNewSale,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (onNewSale) {
          onNewSale();
        } else {
          onClose();
        }
      } else if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNewSale]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', duration: 0.25 }}
        className="relative bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full overflow-hidden flex flex-col max-h-[92vh] z-10"
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-neutral-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm tracking-tight text-neutral-100">Sale Receipt Preview</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close receipt preview (Esc)"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors touch-target flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs sm:text-sm text-neutral-900" ref={receiptRef}>
          <div className="text-center space-y-1 mb-4 pb-3 border-b border-dashed border-neutral-300">
            {settings?.logo_url && (
              <img
                src={settings.logo_url}
                alt="Store Logo"
                className="max-h-12 mx-auto mb-2 object-contain filter grayscale"
              />
            )}
            <h2 className="text-base font-bold tracking-tight text-neutral-900">
              {settings?.shop_name || 'KITABU BOOKSHOP & STATIONERS'}
            </h2>
            {settings?.tagline && <p className="text-xs text-neutral-500 italic">{settings.tagline}</p>}
            <p className="text-xs text-neutral-600">{settings?.address || 'Main Street, CBD'}</p>
            <p className="text-xs text-neutral-600">Tel: {settings?.phone || '0700 000 000'}</p>
            {settings?.till_number && (
              <p className="text-xs font-semibold text-neutral-900">M-PESA TILL: {settings.till_number}</p>
            )}
            {settings?.paybill_number && (
              <p className="text-xs font-semibold text-neutral-900">PAYBILL: {settings.paybill_number}</p>
            )}
          </div>

          {/* Receipt Info */}
          <div className="space-y-1 pb-3 mb-3 border-b border-dashed border-neutral-300 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500">Receipt No:</span>
              <span className="font-bold text-neutral-900 select-all">{sale.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Date/Time:</span>
              <span className="tabular-nums text-neutral-800">{formatDateTime(sale.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Served By:</span>
              <span className="text-neutral-800">{sale.cashier_name}</span>
            </div>
            {sale.customer_name && (
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer:</span>
                <span className="text-neutral-800">{sale.customer_name}</span>
              </div>
            )}
          </div>

          {/* Itemized Table */}
          <div className="space-y-2 pb-3 mb-3 border-b border-dashed border-neutral-300">
            <div className="grid grid-cols-12 text-xs font-bold text-neutral-900 border-b border-neutral-200 pb-1">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-4 text-right">Total</span>
            </div>
            {(sale.items || []).map((item) => (
              <div key={item.id} className="grid grid-cols-12 text-xs">
                <div className="col-span-6 pr-1">
                  <p className="font-semibold text-neutral-900 leading-tight">{item.book_title}</p>
                  <p className="text-[11px] text-neutral-500 font-mono">@{formatKES(item.unit_selling_price)}</p>
                </div>
                <div className="col-span-2 text-center font-medium">{item.quantity}</div>
                <div className="col-span-4 text-right font-bold tabular-nums">
                  {formatKES(item.total_price)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals & Financial Breakdown */}
          <div className="space-y-1.5 text-xs pb-3 border-b border-dashed border-neutral-300">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span className="tabular-nums">{formatKES(sale.subtotal)}</span>
            </div>
            {sale.discount_total > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount:</span>
                <span className="tabular-nums">−{formatKES(sale.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-200">
              <span className="text-neutral-900">GRAND TOTAL:</span>
              <span className="text-neutral-900 tabular-nums">{formatKES(sale.grand_total)}</span>
            </div>
            <div className="flex justify-between pt-1 text-neutral-700">
              <span>Paid ({sale.payment_method.toUpperCase()}):</span>
              <span className="tabular-nums font-bold">{formatKES(sale.total_paid)}</span>
            </div>
            {sale.change_amount > 0 && (
              <div className="flex justify-between font-bold text-neutral-900">
                <span>Change:</span>
                <span className="tabular-nums text-emerald-600 font-bold">{formatKES(sale.change_amount)}</span>
              </div>
            )}
            {sale.payment_reference && (
              <div className="flex justify-between text-xs text-neutral-600 pt-1">
                <span>Reference:</span>
                <span className="font-mono font-bold text-neutral-900 select-all">{sale.payment_reference}</span>
              </div>
            )}
          </div>

          {/* Footer & Policy */}
          <div className="text-center space-y-1 pt-3 text-xs text-neutral-500">
            <p>{settings?.receipt_footer || 'Thank you for shopping with us! Knowledge is power.'}</p>
            <p className="text-[11px] text-neutral-400">Powered by KitabuPOS Offline Bookshop System</p>
          </div>
        </div>

        {/* Action Buttons with Keyboard Shortcuts */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-colors shadow-xs tactile-btn min-h-[44px]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt (P)</span>
          </button>
          {onNewSale && (
            <button
              type="button"
              onClick={onNewSale}
              className="flex items-center justify-center gap-2 py-2.5 px-5 bg-white hover:bg-neutral-100 border border-neutral-300 text-neutral-900 font-bold rounded-xl text-sm transition-colors tactile-btn min-h-[44px]"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>New Sale (Enter)</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
