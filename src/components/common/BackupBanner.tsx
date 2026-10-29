import React, { useState } from 'react';
import { AlertTriangle, Database, ArrowRight, Loader2 } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters.ts';

interface BackupBannerProps {
  lastBackupTime: string | null;
  backupSchedule?: 'daily' | 'weekly' | 'manual';
  onBackupNow: () => Promise<void>;
  onOpenSettings: () => void;
}

export const BackupBanner: React.FC<BackupBannerProps> = ({
  lastBackupTime,
  backupSchedule = 'daily',
  onBackupNow,
  onOpenSettings,
}) => {
  const [isRunning, setIsRunning] = useState(false);

  // Check overdue: > 2 days (daily or manual) or > 8 days (weekly)
  const isOverdue = React.useMemo(() => {
    if (!lastBackupTime) return true;
    const lastDate = new Date(lastBackupTime).getTime();
    if (isNaN(lastDate)) return true;
    const diffMs = Date.now() - lastDate;
    const dayMs = 24 * 60 * 60 * 1000;

    if (backupSchedule === 'weekly') {
      return diffMs > 8 * dayMs;
    }
    // 'daily' or 'manual' defaults to 2 days threshold
    return diffMs > 2 * dayMs;
  }, [lastBackupTime, backupSchedule]);

  if (!isOverdue) return null;

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await onBackupNow();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      role="alert"
      className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 text-amber-900 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm select-none"
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold text-amber-950">Database Backup Overdue: </span>
          <span className="text-amber-900">
            {lastBackupTime
              ? `Last verified backup was ${formatDateTime(lastBackupTime)} (${backupSchedule} schedule).`
              : 'No verified database backup has been recorded yet.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Database className="w-3.5 h-3.5" />
          )}
          <span>{isRunning ? 'Backing Up...' : 'Back Up Now'}</span>
        </button>
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-amber-900 hover:bg-amber-500/20 font-medium text-xs transition-colors cursor-pointer"
        >
          <span>Settings</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
