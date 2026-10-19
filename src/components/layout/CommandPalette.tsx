import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShoppingCart,
  Boxes,
  Truck,
  ReceiptText,
  BarChart3,
  Settings,
  UserCog,
  Lock,
  Plus,
  HardDrive,
  CornerDownLeft,
  X,
  BookOpen,
} from 'lucide-react';
import { Book } from '../../types/index.ts';
import { NavTab } from './Sidebar.tsx';
import { formatKES } from '../../utils/formatters.ts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  books: Book[];
  onSelectBook?: (book: Book) => void;
  onTriggerBackup?: () => void;
  onLock?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  books,
  onSelectBook,
  onTriggerBackup,
  onLock,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Quick navigation items
  const navActions = [
    { id: 'pos', title: 'Open Point of Sale (POS)', tab: 'pos' as NavTab, icon: ShoppingCart, shortcut: 'F2' },
    { id: 'inventory', title: 'Open Book Inventory', tab: 'inventory' as NavTab, icon: Boxes, shortcut: 'Alt+I' },
    { id: 'purchases', title: 'Open Purchases & Suppliers', tab: 'purchases' as NavTab, icon: Truck, shortcut: 'Alt+S' },
    { id: 'expenses', title: 'Open Shop Expenses', tab: 'expenses' as NavTab, icon: ReceiptText, shortcut: 'Alt+E' },
    { id: 'reports', title: 'View Financial Reports', tab: 'reports' as NavTab, icon: BarChart3, shortcut: 'Alt+R' },
    { id: 'settings', title: 'Settings & Local Backups', tab: 'settings' as NavTab, icon: Settings, shortcut: 'Alt+T' },
    { id: 'users', title: 'Manage Staff & Roles', tab: 'users' as NavTab, icon: UserCog, shortcut: 'Alt+U' },
  ];

  const filteredNav = query.trim()
    ? navActions.filter((n) => n.title.toLowerCase().includes(query.toLowerCase()))
    : navActions;

  // Book search items
  const matchingBooks = query.trim()
    ? books
        .filter((b) => {
          if (b.is_archived) return false;
          const q = query.toLowerCase();
          return (
            b.title.toLowerCase().includes(q) ||
            b.author.toLowerCase().includes(q) ||
            (b.isbn && b.isbn.toLowerCase().includes(q)) ||
            (b.barcode && b.barcode.toLowerCase().includes(q))
          );
        })
        .slice(0, 5)
    : [];

  // Build combined flat list for arrow keys
  const combinedItems: Array<
    | { type: 'nav'; data: typeof navActions[0] }
    | { type: 'book'; data: Book }
    | { type: 'action'; label: string; action: () => void; icon: any }
  > = [];

  filteredNav.forEach((n) => combinedItems.push({ type: 'nav', data: n }));
  matchingBooks.forEach((b) => combinedItems.push({ type: 'book', data: b }));

  if (onTriggerBackup) {
    if (!query.trim() || 'backup database'.includes(query.toLowerCase())) {
      combinedItems.push({
        type: 'action',
        label: 'Create Instant SQLite Backup',
        action: onTriggerBackup,
        icon: HardDrive,
      });
    }
  }

  if (onLock) {
    if (!query.trim() || 'lock register screen'.includes(query.toLowerCase())) {
      combinedItems.push({
        type: 'action',
        label: 'Lock Register Screen',
        action: onLock,
        icon: Lock,
      });
    }
  }

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, combinedItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = combinedItems[selectedIndex];
      if (!item) return;

      if (item.type === 'nav') {
        onNavigate(item.data.tab);
        onClose();
      } else if (item.type === 'book') {
        if (onSelectBook) {
          onSelectBook(item.data);
        } else {
          onNavigate('inventory');
        }
        onClose();
      } else if (item.type === 'action') {
        item.action();
        onClose();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop with frosted blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', duration: 0.25, bounce: 0.1 }}
            className="relative w-full max-w-xl bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-200/90 overflow-hidden text-neutral-900"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
              <Search className="w-4 h-4 text-neutral-400 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDownNav}
                placeholder="Search commands, books, barcode, or jump to tab..."
                className="w-full text-sm text-neutral-900 placeholder:text-neutral-400 outline-none bg-transparent"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 border border-neutral-200 rounded">
                ESC
              </kbd>
            </div>

            {/* List Results */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {combinedItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No matching books or commands found.
                </div>
              ) : (
                combinedItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;

                  if (item.type === 'nav') {
                    const Icon = item.data.icon;
                    return (
                      <div
                        key={item.data.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          onNavigate(item.data.tab);
                          onClose();
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-neutral-400" />
                          <span>{item.data.title}</span>
                        </div>
                        <kbd className="text-[10px] font-mono text-neutral-400 px-1 py-0.5 rounded bg-neutral-50 border border-neutral-200/60">
                          {item.data.shortcut}
                        </kbd>
                      </div>
                    );
                  }

                  if (item.type === 'book') {
                    const b = item.data;
                    return (
                      <div
                        key={`book-${b.id}`}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          if (onSelectBook) {
                            onSelectBook(b);
                          } else {
                            onNavigate('inventory');
                          }
                          onClose();
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BookOpen className="w-4 h-4 text-neutral-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-medium text-neutral-900">{b.title}</span>
                            <span className="text-neutral-400 ml-2">by {b.author}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 tabular-nums">
                          <span className="text-[11px] font-mono font-medium text-neutral-900">
                            {formatKES(b.selling_price)}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {b.current_stock} in stock
                          </span>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'action') {
                    const Icon = item.icon;
                    return (
                      <div
                        key={`act-${idx}`}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          item.action();
                          onClose();
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-neutral-400" />
                          <span>{item.label}</span>
                        </div>
                        <CornerDownLeft className="w-3.5 h-3.5 text-neutral-400" />
                      </div>
                    );
                  }

                  return null;
                })
              )}
            </div>

            {/* Footer with helper hints */}
            <div className="px-3 py-2 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white border border-neutral-200 text-[10px] font-mono">↑</kbd>
                  <kbd className="px-1 py-0.5 rounded bg-white border border-neutral-200 text-[10px] font-mono">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-white border border-neutral-200 text-[10px] font-mono">↵</kbd>
                  Select
                </span>
              </div>
              <span className="font-mono text-[10px]">KitabuPOS Spotlight</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
