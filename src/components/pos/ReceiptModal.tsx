import React, { useRef } from 'react';
import { Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Receipt Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-slate-800" ref={receiptRef}>
          <div className="text-center space-y-1 mb-4 pb-3 border-b border-dashed border-slate-300">
            <h2 className="font-bold text-base uppercase tracking-tight text-slate-900">
              {settings?.shop_name || 'Kitabu Central Bookshop'}
            </h2>
            <p className="text-[11px] text-slate-600">{settings?.tagline || 'Academic & Stationery Partner'}</p>
            <p className="text-[11px] text-slate-600">{settings?.address || 'Biashara Street, Nairobi'}</p>
            <p className="text-[11px] text-slate-600">Tel: {settings?.phone || '+254 722 890 123'}</p>
            {settings?.till_number && (
              <p className="text-[11px] font-bold text-emerald-800">
                M-PESA TILL: {settings.till_number}
              </p>
            )}
            {settings?.paybill_number && (
              <p className="text-[11px] font-semibold text-slate-700">
                PAYBILL: {settings.paybill_number}
              </p>
            )}
          </div>

          <div className="space-y-1 mb-3 pb-3 border-b border-dashed border-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-bold text-slate-900">{sale.receipt_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{formatDateTime(sale.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{sale.cashier_name || 'Cashier'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-medium">{sale.customer_name || 'Walk-in'}</span>
            </div>
            {sale.is_voided === 1 && (
              <div className="bg-rose-50 text-rose-700 p-1.5 rounded text-center font-bold text-xs mt-1 border border-rose-200">
                *** VOIDED TRANSACTION ***
                {sale.void_reason && <p className="text-[10px] font-normal">{sale.void_reason}</p>}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-2 mb-4 pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold pb-1 border-b border-slate-200 text-[11px]">
              <span className="w-1/2">Item</span>
              <span className="w-1/6 text-center">Qty</span>
              <span className="w-1/6 text-right">Price</span>
              <span className="w-1/6 text-right">Total</span>
            </div>

            {sale.items && sale.items.length > 0 ? (
              sale.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] leading-tight">
                  <div className="w-1/2 pr-1">
                    <p className="font-medium text-slate-900">{item.book_title}</p>
                    {item.discount_amount > 0 && (
                      <span className="text-[10px] text-emerald-600">
                        Disc: -{formatKES(item.discount_amount)}
                      </span>
                    )}
                  </div>
                  <span className="w-1/6 text-center">{item.quantity}</span>
                  <span className="w-1/6 text-right text-slate-600">
                    {item.unit_selling_price.toFixed(0)}
                  </span>
                  <span className="w-1/6 text-right font-semibold text-slate-900">
                    {item.total_price.toFixed(0)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center py-2 text-slate-400">Items detail in database record.</p>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-xs pb-3 border-b border-dashed border-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span>{formatKES(sale.subtotal)}</span>
            </div>
            {sale.discount_total > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{formatKES(sale.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
              <span className="text-slate-900">GRAND TOTAL:</span>
              <span className="text-slate-900">{formatKES(sale.grand_total)}</span>
            </div>
            <div className="flex justify-between pt-1 text-slate-700">
              <span>Paid ({sale.payment_method.toUpperCase()}):</span>
              <span>{formatKES(sale.total_paid)}</span>
            </div>
            {sale.change_amount > 0 && (
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Change:</span>
                <span>{formatKES(sale.change_amount)}</span>
              </div>
            )}
            {sale.payment_reference && (
              <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                <span>Ref / M-Pesa Code:</span>
                <span className="font-mono font-bold text-slate-900">{sale.payment_reference}</span>
              </div>
            )}
          </div>

          {/* Footer & Policy */}
          <div className="text-center space-y-1 pt-3 text-[10px] text-slate-500">
            <p>{settings?.receipt_footer || 'Thank you for shopping with us! Knowledge is power.'}</p>
            <p className="text-[9px] text-slate-400">Powered by KitabuPOS Offline Bookshop System</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          {onNewSale && (
            <button
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              New Sale (F2)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
