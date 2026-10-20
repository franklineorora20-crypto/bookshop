import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 px-3.5 py-2 text-xs font-medium shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
        <Wifi className="w-4 h-4 text-emerald-400" />
        <span>Back Online · Local data synchronized</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-neutral-950/90 backdrop-blur-md border border-neutral-800 text-neutral-200 px-3.5 py-2 text-xs font-medium shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
      <WifiOff className="w-3.5 h-3.5 text-neutral-400" />
      <span>Offline Mode · SQLite operating locally</span>
    </div>
  );
};
