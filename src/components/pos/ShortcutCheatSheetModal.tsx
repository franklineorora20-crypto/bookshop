import React from 'react';
import { Modal } from '../common/Modal.tsx';
import { Keyboard, Zap } from 'lucide-react';

export interface ShortcutCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutCheatSheetModal: React.FC<ShortcutCheatSheetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcutGroups = [
    {
      title: 'Point of Sale (Cashier Counter)',
      shortcuts: [
        { key: 'F2', desc: 'Focus barcode scanner / Jump to POS' },
        { key: 'Exact Scan', desc: 'Auto-adds to cart instantly without pressing Enter' },
        { key: 'F4 or Space', desc: 'Open Checkout tender panel' },
        { key: 'Enter', desc: 'Confirm checkout / Start New Sale after receipt' },
        { key: 'Esc', desc: 'Cancel / Close modal / Clear search' },
        { key: 'F8', desc: 'Park / Hold current cart with label' },
        { key: 'F9', desc: 'Resume / Switch parked carts' },
        { key: '1 - 4', desc: 'Switch payment: 1=Cash, 2=M-Pesa, 3=Card, 4=Split' },
        { key: 'P', desc: 'Print receipt on thermal printer' },
        { key: '?', desc: 'Show this keyboard shortcut cheat-sheet' },
      ],
    },
    {
      title: 'Navigation & Navigation Tabs',
      shortcuts: [
        { key: 'Alt + D', desc: 'Go to Store Dashboard' },
        { key: 'Alt + I', desc: 'Go to Book Inventory' },
        { key: 'Alt + S', desc: 'Go to Purchases & Goods Received' },
        { key: 'Alt + E', desc: 'Go to Shop Expenses' },
        { key: 'Alt + R', desc: 'Go to Reports & Daily Z-Report' },
        { key: 'Alt + U', desc: 'Go to Staff Accounts' },
        { key: 'Alt + T', desc: 'Go to Settings & Database Backups' },
        { key: '⌘K / Ctrl+K', desc: 'Open global quick command search' },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-emerald-600" />
          <span>Keyboard Shortcuts Cheat-Sheet</span>
        </div>
      }
      description="Speed-optimized keyboard controls for busy bookshop counter operations"
    >
      <div className="space-y-5">
        {shortcutGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-neutral-400" />
              <span>{group.title}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.shortcuts.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs"
                >
                  <span className="text-neutral-700">{s.desc}</span>
                  <kbd className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-neutral-300 text-neutral-900 shadow-[0_1px_0_rgba(0,0,0,0.06)] shrink-0 ml-2">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
