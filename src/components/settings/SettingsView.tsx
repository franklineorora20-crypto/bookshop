import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  HardDrive,
  ShieldCheck,
  Download,
  Upload,
  AlertTriangle,
  Building2,
  CheckCircle,
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
  Printer,
  Barcode,
  Search,
  Lock,
  Database,
  Wrench,
  CreditCard,
  Smartphone,
  Info,
} from 'lucide-react';
import type { ShopSettings, User } from '../../types/index.ts';
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
import { formatDateTime, formatKES } from '../../utils/formatters.ts';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Modal } from '../common/Modal.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';

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
  const [activeTab, setActiveTab] = useState<
    'shop' | 'receipt' | 'payments' | 'security' | 'backup' | 'maintenance'
  >('shop');

  // Shop Profile state
  const [shopName, setShopName] = useState(settings?.shop_name || '');
  const [tagline, setTagline] = useState(settings?.tagline || '');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [email, setEmail] = useState(settings?.email || '');
  const [address, setAddress] = useState(settings?.address || '');
  const [county, setCounty] = useState(settings?.county || 'Nairobi, Kenya');
  const [currency, setCurrency] = useState(settings?.currency || 'KES');
  const [defaultReorderLevel, setDefaultReorderLevel] = useState(
    settings?.default_reorder_level?.toString() || '5'
  );

  // Receipt Settings state
  const [receiptPrefix, setReceiptPrefix] = useState(settings?.receipt_prefix || 'RCP');
  const [receiptFooter, setReceiptFooter] = useState(
    settings?.receipt_footer ||
      'Thank you for shopping with us! Books once sold can be exchanged within 7 days with a valid receipt.'
  );
  const [taxRate, setTaxRate] = useState(settings?.tax_rate?.toString() || '0');

  // Payments & M-Pesa state
  const [tillNumber, setTillNumber] = useState(settings?.till_number || '');
  const [paybillNumber, setPaybillNumber] = useState(settings?.paybill_number || '');

  // Security state
  const [sessionTimeout, setSessionTimeout] = useState(
    settings?.session_timeout_minutes?.toString() || '15'
  );

  // Backup & Integrity state
  const [integrityStatus, setIntegrityStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Data Clean Modal state
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [cleanConfirmText, setCleanConfirmText] = useState('');
  const [isCleaning, setIsCleaning] = useState(false);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

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
      toast.error('Failed to load audit logs');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'security') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const handleSaveAllSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateShopSettings(
        {
          shop_name: shopName.trim(),
          tagline: tagline.trim(),
          logo_url: logoUrl.trim() || undefined,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          county: county.trim(),
          currency: currency.trim() || 'KES',
          receipt_prefix: receiptPrefix.trim() || 'RCP',
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
      toast.success('Shop settings saved successfully!');
      await onRefreshData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error('Logo image must be smaller than 500 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl((event.target?.result as string) || '');
      toast.success('Logo loaded! Click Save to apply.');
    };
    reader.readAsDataURL(file);
  };

  const handleRunIntegrityCheck = async () => {
    setIsCheckingIntegrity(true);
    try {
      const res = await checkDatabaseIntegrity();
      setIntegrityStatus(res);
      if (res.ok) {
        toast.success('SQLite integrity check passed with zero errors!');
      } else {
        toast.error(`Database issue detected: ${res.message}`);
      }
    } catch (e: any) {
      setIntegrityStatus({ ok: false, message: e.message });
      toast.error(e.message);
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleDownloadBinaryBackup = async () => {
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
      toast.success('SQLite database backup file downloaded successfully!');
    } catch (err: any) {
      toast.error(`Backup failed: ${err.message}`);
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

      toast.success('Full shop JSON export downloaded!');
    } catch (err: any) {
      toast.error(`JSON export failed: ${err.message}`);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreFile) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const uint8 = new Uint8Array(buffer);
        const res = await restoreDatabaseBinary(
          uint8,
          currentUser?.id || 1,
          currentUser?.full_name || 'Admin'
        );
        if (res.ok) {
          toast.success('Database restored successfully! Data reloaded.');
          setPendingRestoreFile(null);
          await onRefreshData();
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(`Restore failed: ${err.message}`);
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsArrayBuffer(pendingRestoreFile);
  };

  const handleExecuteCleanData = async () => {
    if (cleanConfirmText !== 'CONFIRM') return;

    setIsCleaning(true);
    try {
      const res = await cleanBusinessDatabase(
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      toast.success(
        `Business records cleared! Safety backup (${Math.round(
          res.backupSize / 1024
        )} KB) was saved.`
      );
      setIsCleanModalOpen(false);
      setCleanConfirmText('');
      await onRefreshData();
    } catch (err: any) {
      toast.error('Cleaning aborted: ' + err.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.user_name?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Save Button */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900">System & Shop Settings</h2>
          <p className="text-sm text-neutral-500">
            Configure business identity, receipts, M-Pesa till, database backups, and security.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            onClick={() => handleSaveAllSettings()}
            loading={isSaving}
            className="min-h-[44px]"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Save Settings</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex rounded-lg bg-neutral-100 p-1 text-sm font-medium overflow-x-auto">
        {[
          { id: 'shop', label: 'Shop Profile', icon: Building2 },
          { id: 'receipt', label: 'Receipt Customization', icon: Receipt },
          { id: 'payments', label: 'Payments & M-Pesa', icon: Smartphone },
          { id: 'security', label: 'Security & Audits', icon: ShieldCheck },
          { id: 'backup', label: 'Database Backup', icon: Database },
          { id: 'maintenance', label: 'Data & Maintenance', icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`min-h-[40px] px-4 py-2 rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-4 h-4 text-neutral-500" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Shop Profile */}
      {activeTab === 'shop' && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs space-y-5 max-w-3xl">
          <h3 className="font-bold text-base text-neutral-900 pb-3 border-b border-neutral-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-neutral-700" />
            <span>Bookshop Identity</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Shop Legal / Trade Name *"
              required
              placeholder="e.g. Kitabu House Bookshop"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
            <Input
              label="Tagline / Motto"
              placeholder="e.g. Your Partner in Educational Excellence"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number (for receipts & inquiries) *"
              required
              placeholder="+254 712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Official Email Address"
              type="email"
              placeholder="info@kitabuhouse.co.ke"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Physical Shop Location / Street Address"
              placeholder="e.g. Moi Avenue, Bihi Towers 1st Floor"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Input
              label="County / City"
              placeholder="e.g. Nairobi, Kenya"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Default Low Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={defaultReorderLevel}
                onChange={(e) => setDefaultReorderLevel(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:border-neutral-900"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Books with stock below this number are highlighted on the POS and dashboard.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Base Currency Code
              </label>
              <input
                type="text"
                disabled
                value={currency}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-600 font-mono font-bold"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Kenyan Shillings (KES) is the standard currency.
              </p>
            </div>
          </div>

          {/* Logo upload */}
          <div className="pt-3 border-t border-neutral-100">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Shop Logo (shown on top of thermal receipts)
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="w-16 h-16 rounded-lg border border-neutral-200 p-1 bg-neutral-50 flex items-center justify-center overflow-hidden">
                  <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border border-dashed border-neutral-300 text-neutral-400 flex items-center justify-center text-xs text-center p-1">
                  No Logo
                </div>
              )}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="text-xs text-neutral-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
                />
                <p className="text-xs text-neutral-400">PNG or JPG, max 500 KB.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Receipt Customization with LIVE PREVIEW */}
      {activeTab === 'receipt' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Form Controls */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-neutral-900 pb-3 border-b border-neutral-100 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-neutral-700" />
              <span>Thermal Receipt Settings</span>
            </h3>

            <Input
              label="Receipt Number Prefix"
              value={receiptPrefix}
              onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
              placeholder="RCP"
            />

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Value Added Tax (VAT) % Rate
              </label>
              <input
                type="number"
                step="any"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200 bg-white"
                placeholder="0"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Set to 0% if textbooks and educational materials are VAT exempt in your category.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Customer Receipt Footer Note
              </label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full p-3 text-sm rounded-lg border border-neutral-200 focus:border-neutral-900"
                placeholder="e.g. Goods once sold can be exchanged within 7 days..."
              />
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => handleSaveAllSettings()}
                loading={isSaving}
                className="min-h-[44px]"
              >
                Save Receipt Template
              </Button>
            </div>
          </div>

          {/* Right Column: Live Thermal Receipt Preview */}
          <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-neutral-600" />
                <span>Live 80mm Thermal Receipt Preview</span>
              </span>
              <span className="text-[11px] font-mono text-neutral-400">Updates live</span>
            </div>

            {/* Paper Slip Preview */}
            <div className="mx-auto max-w-[340px] bg-neutral-50 p-6 rounded-xl border border-neutral-300 font-mono text-xs text-neutral-900 shadow-inner select-text">
              {/* Logo / Header */}
              {logoUrl && (
                <div className="flex justify-center mb-2">
                  <img src={logoUrl} alt="Logo" className="max-h-12 object-contain" />
                </div>
              )}
              <div className="text-center space-y-0.5">
                <h4 className="font-bold text-sm tracking-tight">{shopName || 'KITABU BOOKSHOP'}</h4>
                {tagline && <p className="text-[11px] text-neutral-600">{tagline}</p>}
                <p className="text-[11px] text-neutral-600">{address || 'Nairobi CBD'}</p>
                <p className="text-[11px] text-neutral-600">Tel: {phone || '+254 700 000 000'}</p>
                {tillNumber && (
                  <p className="text-[11px] font-bold text-emerald-800">
                    M-PESA TILL: {tillNumber}
                  </p>
                )}
                {paybillNumber && (
                  <p className="text-[11px] font-bold text-emerald-800">
                    PAYBILL: {paybillNumber}
                  </p>
                )}
              </div>

              <div className="my-2 border-b border-dashed border-neutral-400" />

              <div className="flex justify-between text-[11px] text-neutral-600">
                <span>Receipt: {receiptPrefix}-2026-0042</span>
                <span>{new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-600">
                <span>Cashier: Admin</span>
                <span>Customer: Walk-in</span>
              </div>

              <div className="my-2 border-b border-dashed border-neutral-400" />

              {/* Sample Items Table */}
              <div className="space-y-1.5">
                <div>
                  <div className="font-semibold text-neutral-900">1. Secondary Chemistry Form 4</div>
                  <div className="flex justify-between text-neutral-600 pl-2">
                    <span>1 × KES 780.00</span>
                    <span className="font-bold text-neutral-900">KES 780.00</span>
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-neutral-900">2. A4 Exercise Book 200 Pages</div>
                  <div className="flex justify-between text-neutral-600 pl-2">
                    <span>2 × KES 150.00</span>
                    <span className="font-bold text-neutral-900">KES 300.00</span>
                  </div>
                </div>
              </div>

              <div className="my-2 border-b border-dashed border-neutral-400" />

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>KES 1,080.00</span>
                </div>
                {parseFloat(taxRate) > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>VAT ({taxRate}%):</span>
                    <span>KES {((1080 * parseFloat(taxRate)) / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-300">
                  <span>GRAND TOTAL:</span>
                  <span>KES 1,080.00</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-600">
                  <span>PAID (M-PESA):</span>
                  <span>KES 1,080.00</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-600">
                  <span>CHANGE DUE:</span>
                  <span>KES 0.00</span>
                </div>
              </div>

              <div className="my-2 border-b border-dashed border-neutral-400" />

              {/* Footer */}
              <div className="text-center text-[10px] text-neutral-600 space-y-1">
                <p className="italic">{receiptFooter}</p>
                <p className="font-semibold text-neutral-800">Software: KitabuPOS Offline</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Payments & M-Pesa */}
      {activeTab === 'payments' && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs space-y-5 max-w-3xl">
          <h3 className="font-bold text-base text-neutral-900 pb-3 border-b border-neutral-100 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-neutral-700" />
            <span>M-Pesa & Cash Register Setup</span>
          </h3>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-sm space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>M-Pesa Buy Goods & Paybill Options</span>
            </div>
            <p className="text-xs text-emerald-900">
              Enter your official till or paybill numbers. These are printed on customer receipts and
              displayed at the POS checkout tender screen.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Safaricom Till Number (Buy Goods)"
              placeholder="e.g. 5432109"
              value={tillNumber}
              onChange={(e) => setTillNumber(e.target.value)}
            />
            <Input
              label="Paybill Number (Optional)"
              placeholder="e.g. 247247"
              value={paybillNumber}
              onChange={(e) => setPaybillNumber(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-neutral-100 space-y-2">
            <h4 className="font-bold text-sm text-neutral-900">Transaction Reference Validation</h4>
            <p className="text-xs text-neutral-600">
              KitabuPOS automatically validates Kenyan M-Pesa reference codes (10 alphanumeric
              characters such as <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">SKL98X5Z21</code>) and
              checks the local database to alert cashiers if a code has already been recorded in a prior sale.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Security & Audit Logs */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-neutral-200/80 shadow-xs space-y-4 max-w-3xl">
            <h3 className="font-bold text-base text-neutral-900 pb-3 border-b border-neutral-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-neutral-700" />
              <span>Session & Lock Screen Security</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Automatic Lock Screen Timeout (Minutes of inactivity)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full sm:w-64 min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200 bg-white"
              />
              <p className="text-xs text-neutral-500 mt-1">
                When inactive, the till screen locks automatically to prevent unauthorized sales.
              </p>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-base text-neutral-900">System Audit Trail</h4>
                <p className="text-xs text-neutral-500">
                  Immutable ledger of sales voids, inventory adjustments, and logins.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, action, details..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-neutral-500 font-sans">
                        No audit records match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-neutral-50/60">
                        <td className="py-2.5 px-4 text-neutral-500 tabular-nums">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="py-2.5 px-4 font-sans font-medium text-neutral-900">
                          {log.user_name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-semibold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-sans text-neutral-700">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Database Backup & Integrity */}
      {activeTab === 'backup' && (
        <div className="space-y-6 max-w-4xl">
          {/* Last Backup Card */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-base text-neutral-900">Backup Status</h4>
                <p className="text-xs text-neutral-500">
                  Last recorded backup:{' '}
                  <strong className="text-neutral-800">
                    {lastBackup ? formatDateTime(lastBackup) : 'Never recorded'}
                  </strong>
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleDownloadBinaryBackup}
              className="min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              <span>Download SQLite .db File</span>
            </Button>
          </div>

          {/* Backup & Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-neutral-600" />
                <span>Binary SQLite Database (.sqlite)</span>
              </h4>
              <p className="text-xs text-neutral-500">
                Exact binary snapshot of all SQLite tables, indexes, and transactions. Can be opened in
                DB Browser for SQLite or restored into another KitabuPOS terminal.
              </p>
              <Button
                variant="secondary"
                onClick={handleDownloadBinaryBackup}
                className="w-full min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Export SQLite File</span>
              </Button>
            </div>

            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-600" />
                <span>Human-Readable JSON Export (.json)</span>
              </h4>
              <p className="text-xs text-neutral-500">
                JSON export of all books, sales, inventory movements, and customers for easy external
                reporting or data migration into spreadsheets.
              </p>
              <Button
                variant="secondary"
                onClick={handleCreateJsonBackup}
                className="w-full min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Data</span>
              </Button>
            </div>
          </div>

          {/* Restore Database */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
            <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-neutral-600" />
              <span>Restore Database from Backup File</span>
            </h4>
            <p className="text-xs text-neutral-500">
              Restore a previous <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">.sqlite</code> backup.
              An emergency pre-restore safety copy is saved in your browser storage automatically before replacing records.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <label className="min-h-[44px] px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors">
                <Upload className="w-4 h-4" />
                <span>Choose .sqlite Backup File</span>
                <input
                  type="file"
                  accept=".sqlite,.db"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPendingRestoreFile(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Integrity Check */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-neutral-600" />
                  <span>SQLite PRAGMA Integrity Check</span>
                </h4>
                <p className="text-xs text-neutral-500">
                  Verify internal B-tree health, foreign key consistency, and index validity.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleRunIntegrityCheck}
                loading={isCheckingIntegrity}
                className="min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Run Integrity Check</span>
              </Button>
            </div>

            {integrityStatus && (
              <div
                className={`p-3.5 rounded-lg border text-xs font-mono ${
                  integrityStatus.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                Result: {integrityStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Data & Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6 max-w-3xl">
          {/* First Run Wizard Launch */}
          {onOpenWizard && (
            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-neutral-900">Setup Wizard</h4>
                <p className="text-xs text-neutral-500">
                  Re-run the initial 4-step quick configuration wizard to adjust store identity or import catalog.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={onOpenWizard}
                className="min-h-[44px]"
              >
                <span>Launch Wizard</span>
              </Button>
            </div>
          )}

          {/* Clean Database Section */}
          <div className="bg-white p-6 rounded-xl border border-rose-200 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-900">
                  Clean Business Database (Reset Store Data)
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  Permanently wipe transactional demo data, sales receipts, customer debts, and stock movements.
                  Your staff logins and shop configuration will be safely kept.
                </p>
              </div>
            </div>

            <Button
              variant="danger"
              onClick={() => {
                setCleanConfirmText('');
                setIsCleanModalOpen(true);
              }}
              className="min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clean Business Database...</span>
            </Button>
          </div>
        </div>
      )}

      {/* Clean Database Confirm Modal with strict CONFIRM type check */}
      <Modal
        isOpen={isCleanModalOpen}
        onClose={() => setIsCleanModalOpen(false)}
        title="⚠️ DANGER: Clean Business Database"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2">
            <p className="font-bold text-sm text-rose-800">
              This action permanently clears active business records.
            </p>
            <p>
              An automated emergency safety backup will be verified in your browser storage before
              wiping.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="font-bold text-neutral-800 uppercase tracking-wider">
              What WILL BE permanently wiped:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>All sales transactions, receipts, and order items</li>
              <li>All supplier purchase orders and delivery notes</li>
              <li>All shop expense records and cash drawer payouts</li>
              <li>All book titles, inventory stock levels, and movement history</li>
              <li>All supplier contacts and customer balance accounts</li>
            </ul>

            <div className="font-bold text-neutral-800 uppercase tracking-wider pt-2">
              What WILL BE safely preserved:
            </div>
            <ul className="list-disc pl-5 space-y-1 text-emerald-800 font-medium">
              <li>System administrator and cashier login accounts</li>
              <li>Shop profile name, till number, and receipt settings</li>
              <li>Automated safety backup in browser storage</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-neutral-100">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Type <strong className="font-mono text-rose-600">CONFIRM</strong> to proceed:
            </label>
            <input
              type="text"
              autoFocus
              value={cleanConfirmText}
              onChange={(e) => setCleanConfirmText(e.target.value)}
              placeholder="CONFIRM"
              className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono font-bold rounded-lg border-2 border-neutral-300 focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setIsCleanModalOpen(false)}
              disabled={isCleaning}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={cleanConfirmText !== 'CONFIRM' || isCleaning}
              loading={isCleaning}
              onClick={handleExecuteCleanData}
            >
              Permanently Clear Business Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Database Restore Modal */}
      <ConfirmDialog
        isOpen={!!pendingRestoreFile}
        title="Confirm Database Restore"
        message={`Restoring "${pendingRestoreFile?.name}" will replace current inventory, sales, and accounts with records from this backup file. An automated pre-restore backup will be taken first.`}
        confirmLabel="Restore Database Now"
        variant="danger"
        onConfirm={handleConfirmRestore}
        onClose={() => setPendingRestoreFile(null)}
      />
    </div>
  );
};
