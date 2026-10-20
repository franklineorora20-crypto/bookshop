import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  ShieldCheck,
  Download,
  Upload,
  AlertTriangle,
  Building2,
  CheckCircle,
  Sparkles,
  FileText,
  Trash2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Percent,
  Sliders,
  DollarSign,
  Receipt,
} from 'lucide-react';
import { ShopSettings, User } from '../../types/index.ts';
import {
  checkDatabaseIntegrity,
  exportDatabaseBinary,
  exportDatabaseJson,
  getLastBackupTimestamp,
  restoreDatabaseBinary,
  updateShopSettings,
  getAuditLogs,
  cleanBusinessDatabase,
} from '../../db/database.ts';
import { formatDateTime } from '../../utils/formatters.ts';

interface SettingsViewProps {
  settings: ShopSettings | null;
  currentUser: User | null;
  onRefreshData: () => Promise<void>;
  onOpenWizard?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentUser,
  onRefreshData,
  onOpenWizard,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'backup' | 'audit'>('profile');

  // Profile Form state
  const [shopName, setShopName] = useState(settings?.shop_name || '');
  const [tagline, setTagline] = useState(settings?.tagline || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [county, setCounty] = useState(settings?.county || 'Nairobi, Kenya');
  const [currency, setCurrency] = useState(settings?.currency || 'KES');
  const [receiptPrefix, setReceiptPrefix] = useState(settings?.receipt_prefix || 'RCP');
  const [tillNumber, setTillNumber] = useState(settings?.till_number || '');
  const [paybillNumber, setPaybillNumber] = useState(settings?.paybill_number || '');
  const [receiptFooter, setReceiptFooter] = useState(settings?.receipt_footer || '');
  const [taxRate, setTaxRate] = useState(settings?.tax_rate?.toString() || '0');
  const [defaultReorderLevel, setDefaultReorderLevel] = useState(
    settings?.default_reorder_level?.toString() || '5'
  );
  const [sessionTimeout, setSessionTimeout] = useState(
    settings?.session_timeout_minutes?.toString() || '15'
  );
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Backup & Integrity state
  const [integrityStatus, setIntegrityStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Data Clean Modal state
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [cleanConfirmText, setCleanConfirmText] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  useEffect(() => {
    if (settings) {
      setShopName(settings.shop_name || '');
      setTagline(settings.tagline || '');
      setLogoUrl(settings.logo_url || '');
      setPhone(settings.phone || '');
      setEmail(settings.email || '');
      setAddress(settings.address || '');
      setCounty(settings.county || 'Nairobi, Kenya');
      setCurrency(settings.currency || 'KES');
      setReceiptPrefix(settings.receipt_prefix || 'RCP');
      setTillNumber(settings.till_number || '');
      setPaybillNumber(settings.paybill_number || '');
      setReceiptFooter(settings.receipt_footer || '');
      setTaxRate(settings.tax_rate?.toString() || '0');
      setDefaultReorderLevel(settings.default_reorder_level?.toString() || '5');
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
      const logs = await getAuditLogs(200);
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

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('Logo image must be smaller than 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateShopSettings(
      {
        shop_name: shopName.trim(),
        tagline: tagline.trim(),
        logo_url: logoUrl || undefined,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        county: county.trim(),
        currency: currency.trim() || 'KES',
        receipt_prefix: receiptPrefix.trim().toUpperCase() || 'RCP',
        till_number: tillNumber.trim(),
        paybill_number: paybillNumber.trim(),
        receipt_footer: receiptFooter.trim(),
        tax_rate: parseFloat(taxRate) || 0,
        default_reorder_level: parseInt(defaultReorderLevel, 10) || 5,
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

  const handleCreateBinaryBackup = async () => {
    try {
      const binary = await exportDatabaseBinary();
      const d = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `KitabuPOS_Backup_${d}.sqlite`;

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
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    }
  };

  const handleCreateJsonBackup = async () => {
    try {
      const jsonStr = await exportDatabaseJson();
      const d = new Date().toISOString().slice(0, 10);
      const filename = `KitabuPOS_Export_${d}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`JSON export failed: ${err.message}`);
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

  const handleExecuteCleanData = async () => {
    if (cleanConfirmText !== 'CLEAN') return;

    setIsCleaning(true);
    try {
      const res = await cleanBusinessDatabase(
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      setCleanResult(
        `Business records cleared successfully! An emergency safety backup (${Math.round(
          res.backupSize / 1024
        )} KB) was automatically saved. Your store is now pristine and empty.`
      );
      setIsCleanModalOpen(false);
      setCleanConfirmText('');
      await onRefreshData();
    } catch (err: any) {
      alert('Cleaning error: ' + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q) ||
      log.user_name?.toLowerCase().includes(q) ||
      log.entity?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Guided Setup Launcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500">
              System Administration
            </span>
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900 mt-0.5">
            Settings, Receipts & Backups
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure your store identity, thermal receipt layout, SQLite backups, and data cleanup.
          </p>
        </div>

        {onOpenWizard && (
          <button
            type="button"
            onClick={onOpenWizard}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-colors tactile-btn shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Launch Store Setup Wizard</span>
          </button>
        )}
      </div>

      {cleanResult && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleanResult}</span>
          </div>
          <button
            onClick={() => setCleanResult(null)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Tabs */}
      <div className="flex border-b border-neutral-200 gap-4 text-xs font-bold">
        {[
          { id: 'profile', label: 'Store Profile & Receipts' },
          { id: 'backup', label: 'Database Backup & Integrity' },
          { id: 'audit', label: 'System Audit Logs' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Profile & Receipts */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6 max-w-3xl">
          <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Bookshop Profile & Receipt Header</h3>
              <p className="text-xs text-neutral-500">Information printed on customer sales receipts and delivery invoices.</p>
            </div>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </div>

          {/* Store Logo Section */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Store Logo (Printed on thermal receipts)
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-neutral-200 bg-neutral-50 p-1 flex items-center justify-center shrink-0">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] flex items-center justify-center hover:bg-rose-600"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-neutral-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  id="settings-logo-input"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="settings-logo-input"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer shadow-xs tactile-btn"
                >
                  <Upload className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{logoUrl ? 'Change Logo' : 'Upload Store Logo'}</span>
                </label>
                <p className="text-[11px] text-neutral-400 mt-1">PNG or JPG up to 1MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Bookshop Business Name *</label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Prestige Bookshop & Stationers"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 font-bold text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Tagline / Motto</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Your Academic Partner"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-neutral-400" /> Telephone / Mobile Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +254 700 000 000"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-neutral-400" /> Business Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. info@bookshop.co.ke"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" /> Physical Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Biashara Street, Shop 4"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Town / County / Region</label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="e.g. Nairobi, Kenya"
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Currency Code</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white font-medium"
              >
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="TZS">TZS - Tanzanian Shilling</option>
                <option value="UGX">UGX - Ugandan Shilling</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Receipt Prefix</label>
              <input
                type="text"
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. RCP"
                className="w-full px-3 py-2 font-mono text-xs uppercase font-medium rounded-xl border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-neutral-400" /> Default VAT Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                M-Pesa Buy Goods (Till Number)
              </label>
              <input
                type="text"
                value={tillNumber}
                onChange={(e) => setTillNumber(e.target.value)}
                placeholder="e.g. 524123"
                className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                M-Pesa Paybill Number / Account
              </label>
              <input
                type="text"
                value={paybillNumber}
                onChange={(e) => setPaybillNumber(e.target.value)}
                placeholder="e.g. 400200"
                className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-neutral-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-neutral-400" /> Default Reorder Level (Units)
              </label>
              <input
                type="number"
                min="1"
                value={defaultReorderLevel}
                onChange={(e) => setDefaultReorderLevel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Inactivity Lock Timeout
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white"
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
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Receipt Footer Return Policy / Message
            </label>
            <textarea
              rows={2}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors tactile-btn"
            >
              Save Bookshop Settings
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: SQLite Backup & Restore Center */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-3xl">
          {/* SQLite Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Offline Database Architecture
                </span>
                <h3 className="font-bold text-base text-neutral-900 mt-0.5">
                  Local SQLite 3 Engine with IndexedDB Mirroring
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Database storage runs completely offline on the local PC. External USB flash drives can receive scheduled backup snapshots.
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
              <span className="text-neutral-600 font-medium">Last Recorded Backup:</span>
              <span className="font-bold text-neutral-800">
                {lastBackup ? formatDateTime(lastBackup) : 'No backup performed yet (Recommended: Backup now)'}
              </span>
            </div>

            {/* Integrity Check */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-neutral-800">PRAGMA integrity_check</p>
                <p className="text-[11px] text-neutral-500">Run low-level B-tree and page parity diagnostics.</p>
              </div>
              <button
                type="button"
                disabled={isCheckingIntegrity}
                onClick={handleRunIntegrityCheck}
                className="px-3.5 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition-colors tactile-btn"
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
            {/* Create SQLite Backup */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Download Raw SQLite (.sqlite)</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Downloads an exact binary copy of the active SQLite database file. Suitable for disaster recovery or machine migrations.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateBinaryBackup}
                className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors tactile-btn"
              >
                <Download className="w-4 h-4" />
                <span>Export .sqlite Database</span>
              </button>
            </div>

            {/* Create JSON Backup */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Export Readable JSON Ledger</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Exports a human-readable JSON file containing inventory, sales, purchases, and settings for audit inspection.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateJsonBackup}
                className="w-full py-2.5 px-4 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors tactile-btn"
              >
                <FileText className="w-4 h-4 text-neutral-500" />
                <span>Export Readable JSON</span>
              </button>
            </div>
          </div>

          {/* Restore Database */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
            <div>
              <h4 className="font-bold text-sm text-neutral-900">Restore from SQLite Backup File</h4>
              <p className="text-xs text-neutral-500 mt-1">
                Replaces current active records with an authenticated backup file. A pre-restore safety snapshot is automatically created before any replacement.
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold shadow-xs transition-colors tactile-btn">
              <Upload className="w-4 h-4" />
              <span>Select .sqlite File to Restore</span>
              <input
                type="file"
                accept=".sqlite,.db"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </label>

            {restoreMessage && (
              <div
                className={`p-3 rounded-xl text-xs border font-medium ${
                  restoreMessage.ok
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                {restoreMessage.text}
              </div>
            )}
          </div>

          {/* Clear Demonstration Data / Factory Reset */}
          <div className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-rose-950">Clean Demonstration Data (Client Handover)</h4>
                <p className="text-xs text-rose-800 mt-1">
                  Clears all sample books, transactions, and purchases so the client begins with a 100% empty, clean database. Shop settings and Administrator credentials are strictly preserved.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCleanConfirmText('');
                setIsCleanModalOpen(true);
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs tactile-btn"
            >
              Clear Demo Records...
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: System Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden space-y-3 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-neutral-900">System Activity Audit Log</h4>
              <p className="text-xs text-neutral-500">
                Immutable ledger of sales, inventory deductions, stock adjustments, and settings updates.
              </p>
            </div>
            <input
              type="text"
              placeholder="Search audit records..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-neutral-200 w-full sm:w-64"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium text-neutral-800">
                {loadingAudit ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400">
                      No audit logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-mono text-neutral-500 tabular-nums">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-900">
                        {log.user_name || 'System'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-800">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-neutral-500 text-[10px]">
                        {log.entity}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 max-w-md truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Business Data */}
      {isCleanModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-neutral-900">Clear Demonstration Data</h3>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed">
              This action permanently clears all demonstration books, stock movements, sales, purchases, and expenses. An emergency backup copy will automatically be saved.
            </p>

            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
              <label className="block text-[11px] font-medium text-neutral-500 mb-1">
                Type <strong className="text-rose-600 font-mono">CLEAN</strong> to confirm:
              </label>
              <input
                type="text"
                value={cleanConfirmText}
                onChange={(e) => setCleanConfirmText(e.target.value)}
                placeholder="CLEAN"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-neutral-300 focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCleanModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={cleanConfirmText !== 'CLEAN' || isCleaning}
                onClick={handleExecuteCleanData}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40"
              >
                {isCleaning ? 'Cleaning...' : 'Confirm Clean Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
