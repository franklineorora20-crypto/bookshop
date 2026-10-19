import React, { useState, useEffect } from 'react';
import { ShoppingCart, HardDrive, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters.ts';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNewSaleClick: () => void;
  lastBackupTime?: string | null;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onNewSaleClick,
  lastBackupTime,
  onToggleMobileMenu,
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
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shadow-xs select-none">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight truncate max-w-[200px] sm:max-w-none">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Backup Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <HardDrive className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600">Backup:</span>
          {lastBackupTime ? (
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {formatDateTime(lastBackupTime)}
            </span>
          ) : (
            <span className="font-semibold text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Pending Backup
            </span>
          )}
        </div>

        {/* Africa/Nairobi Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>{currentTime || 'Nairobi Time'}</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">EAT</span>
        </div>

        {/* POS Fast Button */}
        <button
          onClick={onNewSaleClick}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all hover:shadow active:scale-[0.98]"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>New Sale (F2)</span>
        </button>
      </div>
    </header>
  );
};
