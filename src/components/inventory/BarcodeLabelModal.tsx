import React, { useRef } from 'react';
import { Modal } from '../common/Modal.tsx';
import { Button } from '../common/Button.tsx';
import { Printer, Barcode, Copy, Check } from 'lucide-react';
import { Book, ShopSettings } from '../../types/index.ts';
import { formatKES } from '../../utils/formatters.ts';

interface BarcodeLabelModalProps {
  book: Book | null;
  settings: ShopSettings | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  book,
  settings,
  isOpen,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!book) return null;

  const barcodeValue = (book.barcode || book.isbn || `KB-${book.id.toString().padStart(6, '0')}`).replace(/-/g, '');

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate simple Code 128 / EAN-style SVG barcode pattern deterministically
  const generateBarcodeLines = (str: string) => {
    const lines: number[] = [];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    // Generate 45 bars based on string hash
    for (let i = 0; i < 48; i++) {
      const bit = Math.abs((hash ^ (i * 37)) % 4);
      lines.push(bit === 0 ? 1 : bit === 1 ? 2 : bit === 2 ? 3 : 1);
    }
    return lines;
  };

  const barWidths = generateBarcodeLines(barcodeValue);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title="Print Shelf / Book Barcode Label"
      description="Formats for 58mm/80mm thermal receipt printers and sticky label printers"
    >
      <div className="space-y-5">
        {/* Printable Label Box */}
        <div
          ref={printAreaRef}
          className="p-5 bg-white border-2 border-dashed border-neutral-300 rounded-xl text-center space-y-2 max-w-xs mx-auto shadow-sm"
        >
          <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            {settings?.shop_name || 'KITABU BOOKSHOP'}
          </div>
          <h4 className="font-bold text-sm text-neutral-900 leading-snug line-clamp-2">
            {book.title}
          </h4>
          <p className="text-xs text-neutral-500">{book.author}</p>

          {/* Barcode Visual SVG */}
          <div className="py-2 flex flex-col items-center justify-center">
            <svg
              className="w-56 h-14"
              viewBox="0 0 200 50"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="200" height="50" fill="white" />
              <g fill="black">
                {barWidths.map((width, idx) => (
                  <rect
                    key={idx}
                    x={idx * 4 + 4}
                    y="4"
                    width={width}
                    height="42"
                  />
                ))}
              </g>
            </svg>
            <span className="font-mono text-xs tracking-widest text-neutral-900 font-bold mt-1 select-all">
              {barcodeValue}
            </span>
          </div>

          <div className="pt-2 border-t border-neutral-200">
            <span className="text-lg font-mono font-bold text-neutral-900">
              {formatKES(book.selling_price)}
            </span>
            <span className="text-[10px] text-neutral-500 block">VAT Inclusive</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
          <Button
            variant="outline"
            size="md"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied' : 'Copy Code'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print Label
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
