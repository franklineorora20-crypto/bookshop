import React, { useState, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  ShieldCheck,
  Download,
  Upload,
  AlertTriangle,
  History,
  Building,
  CheckCircle,
  FileCheck,
} from 'lucide-react';
import { ShopSettings, User } from '../../types/index.ts';
import {
  checkDatabaseIntegrity,
  exportDatabaseBinary,
  getLastBackupTimestamp,
  restoreDatabaseBinary,
  updateShopSettings,
  getAuditLogs,
} from '../../db/database.ts';
import { formatDateTime } from '../../utils/formatters.ts';

interface SettingsViewProps {
  settings: ShopSettings | null;
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentUser,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'backup' | 'audit'>('profile');

  // Profile Form state
  const [shopName, setShopName] = useState(settings?.shop_name || '');
  const [tagline, setTagline] = useState(settings?.tagline || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [county, setCounty] = useState(settings?.county || 'Nairobi, Kenya');
  const [tillNumber, setTillNumber] = useState(settings?.till_number || '');
  const [paybillNumber, setPaybillNumber] = useState(settings?.paybill_number || '');
  const [receiptFooter, setReceiptFooter] = useState(settings?.receipt_footer || '');
  const [taxRate, setTaxRate] = useState(settings?.tax_rate?.toString() || '0');
  const [sessionTimeout, setSessionTimeout] = useState(settings?.session_timeout_minutes?.toString() || '15');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Backup & Integrity state
  const [integrityStatus, setIntegrityStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (settings) {
      setShopName(settings.shop_name || '');
      setTagline(settings.tagline || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setAddress(settings.address || '');
      setCounty(settings.county || 'Nairobi, Kenya');
      setTillNumber(settings.till_number || '');
      setPaybillNumber(settings.paybill_number || '');
      setReceiptFooter(settings.receipt_footer || '');
      setTaxRate(settings.tax_rate?.toString() || '0');
      setSessionTimeout(settings.session_timeout_minutes?.toString() || '15');
    }
    (async () => {
      const ts = await getLastBackupTimestamp();
      setLastBackup(ts);
    })();
  }, [settings]);

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const logs = await getAuditLogs(100);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateShopSettings(
      {
        shop_name: shopName.trim(),
        tagline: tagline.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        county: county.trim(),
        till_number: tillNumber.trim(),
        paybill_number: paybillNumber.trim(),
        receipt_footer: receiptFooter.trim(),
        tax_rate: parseFloat(taxRate) || 0,
        session_timeout_minutes: parseInt(sessionTimeout, 10) || 15,
      },
      currentUser?.id || 1,
      currentUser?.full_name || 'Admin'
    );

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    await onRefreshData();
  };

  const handleRunIntegrityCheck = async () => {
    setIsCheckingIntegrity(true);
    try {
      const result = await checkDatabaseIntegrity();
      setIntegrityStatus(result);
    } catch (err: any) {
      setIntegrityStatus({ ok: false, message: err.message });
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const binary = await exportDatabaseBinary();
      const d = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `KitabuPOS_Backup_${d}.sqlite`;

      // Trigger download of raw SQLite database binary
      const blob = new Blob([binary as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const ts = await getLastBackupTimestamp();
      setLastBackup(ts);
      alert(`Local backup downloaded: "${filename}". Save this file to a USB flash drive or secure storage.`);
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        `DANGER: Restoring a database will replace the current active inventory, sales, and accounts with records from "${file.name}".\n\nA safety pre-restore backup will be created automatically.\n\nDo you wish to proceed?`
      )
    ) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const uint8 = new Uint8Array(buffer);
      const res = await restoreDatabaseBinary(
        uint8,
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      if (res.ok) {
        setRestoreMessage({ ok: true, text: res.message });
        await onRefreshData();
      } else {
        setRestoreMessage({ ok: false, text: res.message });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold">
        {[
          { id: 'profile', label: 'Bookshop Details & Receipts' },
          { id: 'backup', label: 'SQLite Database Integrity & Backup' },
          { id: 'audit', label: 'System Audit Logs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Profile & Receipts */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5 max-w-3xl">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Shop Profile & Receipt Header</h3>
              <p className="text-xs text-slate-500">Information printed on customer sales receipts and invoices.</p>
            </div>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded flex items-center gap-1 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Bookshop Business Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official Telephone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">M-Pesa Buy Goods Till #</label>
              <input
                type="text"
                value={tillNumber}
                onChange={(e) => setTillNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono font-bold text-emerald-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Paybill Number</label>
              <input
                type="text"
                value={paybillNumber}
                onChange={(e) => setPaybillNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Town / County</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                VAT / Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Set to 0% for standard exempt educational books.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inactivity Lock Timeout (Minutes)
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="5">5 Minutes</option>
                <option value="10">10 Minutes</option>
                <option value="15">15 Minutes (Recommended)</option>
                <option value="30">30 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Receipt Footer Return Policy / Message
            </label>
            <textarea
              rows={2}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              Save Business Profile
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: SQLite Backup & Restore Center */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-3xl">
          {/* SQLite Status Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Offline Database Architecture
                </span>
                <h3 className="font-bold text-base text-slate-900 mt-0.5">
                  Local SQLite 3 Engine
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Database storage is stored on the local PC disk and IndexedDB. It operates 100% offline without requiring internet access.
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Last Recorded Backup:</span>
              <span className="font-bold text-slate-800">
                {lastBackup ? formatDateTime(lastBackup) : 'No backup performed yet (Recommended: Backup now)'}
              </span>
            </div>

            {/* Integrity Check */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-slate-800">PRAGMA integrity_check</p>
                <p className="text-[11px] text-slate-500">Run low-level B-tree and page parity diagnostics.</p>
              </div>
              <button
                type="button"
                disabled={isCheckingIntegrity}
                onClick={handleRunIntegrityCheck}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                {isCheckingIntegrity ? 'Running Check...' : 'Verify Database Integrity'}
              </button>
            </div>

            {integrityStatus && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                  integrityStatus.ok
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                    : 'bg-rose-50 border border-rose-200 text-rose-900 font-medium'
                }`}
              >
                {integrityStatus.ok ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{integrityStatus.message}</span>
              </div>
            )}
          </div>

          {/* Backup & Restore Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Create Backup */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Manual Local Backup</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Downloads an exact binary copy of the active SQLite database (.sqlite). Copy it to a flash drive or safe folder.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateBackup}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download .sqlite Database Backup</span>
              </button>
            </div>

            {/* Restore Database */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Restore from Backup File</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Replaces the current active database with a verified SQLite backup. Safety snapshot is created automatically.
                </p>
              </div>

              <label className="cursor-pointer w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>Select .sqlite File to Restore</span>
                <input
                  type="file"
                  accept=".sqlite,.db"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {restoreMessage && (
            <div
              className={`p-4 rounded-xl text-xs border font-medium ${
                restoreMessage.ok
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {restoreMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: System Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900">System Activity Audit Log</h4>
            <p className="text-xs text-slate-500">Immutable ledger of system events, sales, voids, price adjustments, and backups.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-500">{formatDateTime(log.created_at)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{log.user_name || 'System'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{log.action}</td>
                      <td className="py-2.5 px-3 uppercase text-slate-500">{log.entity}</td>
                      <td className="py-2.5 px-3 text-slate-700">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
