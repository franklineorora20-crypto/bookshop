import React, { useState, useEffect } from 'react';
import { ShoppingCart, HardDrive, Clock, Search, Command, Menu } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters.ts';
import { PWAInstallButton } from '../common/PWAInstallButton.tsx';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSaleClick: () => void;
  lastBackupTime?: string | null;
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewSaleClick,
  lastBackupTime,
  onToggleMobileMenu,
  onOpenCommandPalette,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        new Intl.DateTimeFormat('en-KE', {
          timeZone: 'Africa/Nairobi',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }).format(now)
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-6 flex items-center justify-between shadow-xs sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors touch-target flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-semibold text-neutral-900 tracking-tight leading-tight truncate max-w-[200px] sm:max-w-none">
              {title}
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Saved</span>
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-neutral-500 font-normal hidden sm:block truncate max-w-md">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Quick Command Palette Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200/80 bg-neutral-50/80 hover:bg-neutral-100/80 text-neutral-500 hover:text-neutral-800 text-xs transition-colors tactile-btn"
          >
            <Search className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-[11px] text-neutral-500">Quick search...</span>
            <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-neutral-500 bg-white border border-neutral-200 rounded shadow-[0_1px_0_rgba(0,0,0,0.04)]">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>
        )}

        {/* Backup Status with Emil Kowalski clean dot indicator */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg border border-neutral-200/70 bg-white text-xs text-neutral-600">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              lastBackupTime ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-amber-500 ring-2 ring-amber-100'
            }`}
          />
          <span className="text-[11px] text-neutral-500">Backup:</span>
          {lastBackupTime ? (
            <span className="text-[11px] font-medium text-neutral-800 tabular-nums">
              {formatDateTime(lastBackupTime)}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-amber-600">Pending</span>
          )}
        </div>

        {/* Live Africa/Nairobi Clock with tabular numerals */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200/70 bg-white text-xs text-neutral-600 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-[11px] font-medium text-neutral-700">{currentTime || 'Nairobi Time'}</span>
          <span className="text-[9px] font-mono font-medium text-neutral-400 ml-0.5">EAT</span>
        </div>

        {/* PWA Install Button for Mobile & Desktop Web Browsers */}
        <PWAInstallButton variant="header" />

        {/* POS Fast Button - Emil Kowalski tactile button */}
        <button
          onClick={onNewSaleClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-xs shadow-xs tactile-btn"
        >
          <ShoppingCart className="w-3.5 h-3.5 text-neutral-300" />
          <span>New Sale</span>
          <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono font-normal bg-neutral-800 border border-neutral-700 rounded text-neutral-300">
            F2
          </kbd>
        </button>
      </div>
    </header>
  );
};
