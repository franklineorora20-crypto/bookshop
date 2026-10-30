import React, { useState } from 'react';
import { AlertTriangle, Download, RefreshCw, Upload, ShieldAlert } from 'lucide-react';
import { restoreDatabaseBinary, startFreshAfterCorruptRecovery } from '../../db/database.ts';

interface DatabaseRecoveryScreenProps {
  errorMessage: string;
  corruptData?: Uint8Array;
  onRecovered: () => void;
}

export const DatabaseRecoveryScreen: React.FC<DatabaseRecoveryScreenProps> = ({
  errorMessage,
  corruptData,
  onRecovered,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleDownloadCorrupt = () => {
    if (!corruptData || corruptData.byteLength === 0) return;
    const blob = new Blob([corruptData as unknown as BlobPart], { type: 'application/x-sqlite3' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kitabupos_corrupt_database_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreError(null);

    try {
      const buffer = await file.arrayBuffer();
      const binary = new Uint8Array(buffer);
      const res = await restoreDatabaseBinary(binary, 1, 'Recovery Admin');
      if (!res.ok) {
        setRestoreError(res.message);
      } else {
        onRecovered();
      }
    } catch (err: any) {
      setRestoreError(err?.message || 'Failed to restore database backup.');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  const handleConfirmStartFresh = async () => {
    if (confirmationInput.trim() !== 'START FRESH') return;
    setIsResetting(true);
    setRestoreError(null);
    try {
      await startFreshAfterCorruptRecovery('START FRESH');
      onRecovered();
    } catch (err: any) {
      setRestoreError(err?.message || 'Failed to start fresh database.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-neutral-900 border border-red-800/80 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
          <div className="p-3 bg-red-950/80 border border-red-700 text-red-400 rounded-lg">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-red-400 tracking-tight">Database Recovery Required</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              KitabuPOS halted startup to prevent overwriting or losing your stored records.
            </p>
          </div>
        </div>

        <div className="bg-red-950/30 border border-red-900/60 rounded-lg p-3.5 text-xs text-red-200 space-y-1.5 font-mono break-words">
          <div className="font-semibold text-red-300 flex items-center gap-1.5 font-sans">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Integrity check failure / load error:
          </div>
          <div className="text-neutral-300">{errorMessage}</div>
        </div>

        <div className="bg-neutral-800/70 border border-neutral-700 rounded-lg p-4 text-xs text-neutral-300 space-y-2">
          <div className="font-semibold text-neutral-200">Data Safety Guarantee</div>
          <p>
            Your existing database bytes have been preserved in your browser&apos;s recovery store under key{' '}
            <code className="text-amber-300 font-mono">corrupt</code>. No automatic reset was performed.
          </p>
          {corruptData && corruptData.byteLength > 0 && (
            <button
              type="button"
              onClick={handleDownloadCorrupt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-700 hover:bg-neutral-600 text-white rounded transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Corrupt Database File ({Math.round(corruptData.byteLength / 1024)} KB)
            </button>
          )}
        </div>

        {restoreError && (
          <div className="p-3 bg-red-900/40 border border-red-700 text-red-300 text-xs rounded-lg">
            {restoreError}
          </div>
        )}

        <div className="space-y-4 pt-2">
          {/* Recovery Option 1: Restore verified backup */}
          <div className="border border-neutral-800 bg-neutral-900/90 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-neutral-100">Option 1: Restore from Verified Backup</h2>
                <p className="text-xs text-neutral-400">
                  Upload an uncorrupted .db backup file created previously.
                </p>
              </div>
            </div>
            <label className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-lg cursor-pointer transition">
              <Upload className="w-4 h-4" />
              {isRestoring ? 'Verifying & Restoring...' : 'Select Backup File (.db / .sqlite)'}
              <input
                type="file"
                accept=".db,.sqlite,.sqlite3"
                onChange={handleFileRestore}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>

          {/* Recovery Option 2: Start Fresh */}
          <div className="border border-neutral-800 bg-neutral-900/90 rounded-lg p-4 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Option 2: Emergency Fresh Start</h2>
              <p className="text-xs text-neutral-400">
                Initializes a fresh database for immediate operation. The corrupt copy remains preserved.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirm-fresh-input" className="block text-xs text-neutral-300">
                Type <span className="font-mono font-bold text-amber-400">START FRESH</span> to confirm:
              </label>
              <input
                id="confirm-fresh-input"
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="START FRESH"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-100 focus:outline-none focus:border-red-500"
              />
            </div>
            <button
              type="button"
              onClick={handleConfirmStartFresh}
              disabled={confirmationInput.trim() !== 'START FRESH' || isResetting}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-red-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Initializing...' : 'Confirm & Start Fresh'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
