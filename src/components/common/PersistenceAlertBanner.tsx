import React, { useEffect, useState } from 'react';
import { AlertOctagon, Download } from 'lucide-react';
import { getPersistenceError, subscribePersistenceError, exportDatabaseBinary } from '../../db/database.ts';

interface PersistenceAlertBannerProps {
  onBackupNow?: () => void;
}

export const PersistenceAlertBanner: React.FC<PersistenceAlertBannerProps> = ({ onBackupNow }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(getPersistenceError());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribePersistenceError((err) => {
      setErrorMessage(err);
    });
    return unsubscribe;
  }, []);

  if (!errorMessage) {
    return null;
  }

  const handleBackupClick = async () => {
    if (onBackupNow) {
      onBackupNow();
      return;
    }
    try {
      setDownloading(true);
      const binary = await exportDatabaseBinary();
      const blob = new Blob([binary as unknown as BlobPart], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kitabupos_emergency_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Emergency backup export failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="alert"
      className="bg-red-600 text-white px-4 py-3 shadow-lg flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 border-b border-red-700 font-medium"
    >
      <div className="flex items-center gap-2.5">
        <AlertOctagon className="w-5 h-5 flex-shrink-0 animate-pulse text-amber-200" />
        <span className="text-sm font-semibold tracking-wide">
          Data is NOT being saved. Do not continue selling. Back up now.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBackupClick}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white text-red-700 hover:bg-red-50 rounded shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Exporting...' : 'Back up now'}
        </button>
      </div>
    </div>
  );
};
