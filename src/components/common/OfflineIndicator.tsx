import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall.ts';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAInstall();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-neutral-900/95 text-white px-3.5 py-2 text-xs font-medium shadow-xl border border-neutral-700/80 backdrop-blur-md animate-in slide-in-from-bottom-3 duration-200">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="text-[11px] font-semibold text-neutral-200">
        Offline Mode Active
      </span>
      <span className="text-[10px] text-neutral-400 font-normal hidden sm:inline">
        • Local SQLite database & POS running 100% offline
      </span>
    </div>
  );
};
