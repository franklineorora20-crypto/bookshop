import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import bcrypt from 'bcryptjs';
import {
  BookOpen,
  Building2,
  Phone,
  Mail,
  MapPin,
  Banknote,
  Receipt,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertCircle,
  Sparkles,
  Download,
  KeyRound,
  Percent,
  Sliders,
} from 'lucide-react';
import { ShopSettings, User } from '../../types/index.ts';
import { updateShopSettings, updateUser, exportDatabaseBinary } from '../../db/database.ts';

interface FirstRunWizardProps {
  initialSettings: ShopSettings | null;
  onComplete: (user: User, settings: ShopSettings) => void;
  isRerun?: boolean;
  onCancel?: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({
  initialSettings,
  onComplete,
  isRerun = false,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 6;

  // Step 1: Store Branding & Identity
  const [shopName, setShopName] = useState(initialSettings?.shop_name || '');
  const [tagline, setTagline] = useState(initialSettings?.tagline || '');
  const [logoUrl, setLogoUrl] = useState(initialSettings?.logo_url || '');

  // Step 2: Contact & Location Details
  const [phone, setPhone] = useState(initialSettings?.phone || '');
  const [email, setEmail] = useState(initialSettings?.email || '');
  const [address, setAddress] = useState(initialSettings?.address || '');
  const [county, setCounty] = useState(initialSettings?.county || 'Nairobi, Kenya');

  // Step 3: Currency, Tax & Payment Methods
  const [currency, setCurrency] = useState(initialSettings?.currency || 'KES');
  const [taxRate, setTaxRate] = useState(initialSettings?.tax_rate?.toString() || '0');
  const [tillNumber, setTillNumber] = useState(initialSettings?.till_number || '');
  const [paybillNumber, setPaybillNumber] = useState(initialSettings?.paybill_number || '');

  // Step 4: Receipt & Inventory Configuration
  const [receiptPrefix, setReceiptPrefix] = useState(initialSettings?.receipt_prefix || 'RCP');
  const [receiptFooter, setReceiptFooter] = useState(
    initialSettings?.receipt_footer || 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days with a valid receipt.'
  );
  const [defaultReorderLevel, setDefaultReorderLevel] = useState(
    initialSettings?.default_reorder_level?.toString() || '5'
  );
  const [sessionTimeout, setSessionTimeout] = useState(
    initialSettings?.session_timeout_minutes?.toString() || '15'
  );

  // Step 5: Administrator Account Security
  const [adminFullName, setAdminFullName] = useState('System Administrator');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminPin, setAdminPin] = useState('1234');

  // Step 6: Backup Preferences
  const [backupSchedule, setBackupSchedule] = useState<'daily' | 'weekly' | 'manual'>(
    initialSettings?.backup_schedule || 'daily'
  );
  const [downloadedInitialBackup, setDownloadedInitialBackup] = useState(false);

  // UI status
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Logo Upload (converts to base64 for persistent offline storage)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setError('Logo image must be smaller than 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!shopName.trim()) {
        setError('Please enter your Bookshop name.');
        return false;
      }
    } else if (step === 2) {
      // Optional contact fields, but if phone is entered ensure sanity
      if (phone.trim() && phone.trim().length < 5) {
        setError('Please provide a valid telephone number.');
        return false;
      }
    } else if (step === 5) {
      if (!isRerun) {
        if (!adminFullName.trim()) {
          setError('Administrator full name is required.');
          return false;
        }
        if (!adminUsername.trim()) {
          setError('Administrator username is required.');
          return false;
        }
        if (!adminPassword || adminPassword.length < 6) {
          setError('Password must be at least 6 characters.');
          return false;
        }
        if (adminPassword !== confirmPassword) {
          setError('Passwords do not match. Please re-enter.');
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Download initial blank backup
  const handleDownloadInitialBackup = async () => {
    try {
      const binary = await exportDatabaseBinary();
      const filename = `KitabuPOS_Fresh_Installation_${new Date().toISOString().slice(0, 10)}.sqlite`;
      const blob = new Blob([binary as any], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadedInitialBackup(true);
    } catch (err: any) {
      setError('Failed to export initial backup: ' + err.message);
    }
  };

  // Complete Wizard
  const handleFinishSetup = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const finalSettings: Partial<ShopSettings> = {
        shop_name: shopName.trim(),
        tagline: tagline.trim(),
        logo_url: logoUrl || undefined,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        county: county.trim(),
        currency: currency.trim() || 'KES',
        tax_rate: parseFloat(taxRate) || 0,
        till_number: tillNumber.trim(),
        paybill_number: paybillNumber.trim(),
        receipt_prefix: receiptPrefix.trim() || 'RCP',
        receipt_footer: receiptFooter.trim(),
        default_reorder_level: parseInt(defaultReorderLevel, 10) || 5,
        session_timeout_minutes: parseInt(sessionTimeout, 10) || 15,
        backup_schedule: backupSchedule,
        is_setup_completed: true,
      };

      await updateShopSettings(finalSettings, 1, adminFullName.trim() || 'Administrator');

      let activeAdminUser: User = {
        id: 1,
        username: adminUsername.trim() || 'admin',
        full_name: adminFullName.trim() || 'Administrator',
        role: 'admin',
        password_hash: '',
        pin: adminPin.trim() || '1234',
        is_active: 1,
        created_at: new Date().toISOString(),
      };

      if (!isRerun && adminPassword) {
        const passwordHash = bcrypt.hashSync(adminPassword, 8);
        await updateUser(
          1,
          {
            full_name: adminFullName.trim(),
            username: adminUsername.trim(),
            password_hash: passwordHash,
            pin: adminPin.trim() || undefined,
            is_active: 1,
            role: 'admin',
          },
          1,
          adminFullName.trim()
        );
        activeAdminUser.password_hash = passwordHash;
      }

      onComplete(activeAdminUser, finalSettings as ShopSettings);
    } catch (err: any) {
      setError(err.message || 'Failed to complete store setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col my-8"
      >
        {/* Header Bar */}
        <div className="bg-neutral-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight">KitabuPOS Client Setup</h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                  {isRerun ? 'Store Config' : 'First-Run Wizard'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Configure your offline bookshop profile, tax, receipt details, and security.
              </p>
            </div>
          </div>
          {isRerun && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded border border-neutral-700"
            >
              Close
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="bg-neutral-50 px-6 py-3 border-b border-neutral-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((stepNum) => (
              <div
                key={stepNum}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-semibold transition-all ${
                  stepNum === currentStep
                    ? 'bg-neutral-900 text-white ring-2 ring-neutral-900/20 shadow-xs'
                    : stepNum < currentStep
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {stepNum < currentStep ? '✓' : stepNum}
              </div>
            ))}
          </div>
          <span className="text-neutral-500 font-medium text-[11px]">
            Step {currentStep} of {totalSteps}:{' '}
            {currentStep === 1 && 'Store Identity'}
            {currentStep === 2 && 'Location & Contact'}
            {currentStep === 3 && 'Currency & Payments'}
            {currentStep === 4 && 'Receipt & Stock Limits'}
            {currentStep === 5 && 'Admin Account'}
            {currentStep === 6 && 'Backup & Launch'}
          </span>
        </div>

        {/* Form Body */}
        <div className="p-6 flex-1 min-h-[360px]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Store Branding & Identity */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Bookshop Identity & Name</h3>
                  <p className="text-xs text-neutral-500">
                    This business name will appear on all client receipts, Goods Received Notes, and reports.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Bookshop Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Prestige Bookshop & Stationers"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-neutral-300 font-medium text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Store Tagline or Motto (Optional)
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Your Academic, CBC & Stationery Partner"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Store Logo (Optional)
                  </label>
                  <div className="flex items-center gap-4">
                    {logoUrl ? (
                      <div className="relative w-16 h-16 rounded-xl border border-neutral-200 bg-neutral-50 p-1 flex items-center justify-center shrink-0">
                        <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain rounded-lg" />
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
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        id="logo-file-input"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-file-input"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 cursor-pointer shadow-xs tactile-btn"
                      >
                        <Upload className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Upload Logo File</span>
                      </label>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        PNG or JPG up to 1MB. Encoded and stored offline in local SQLite.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Location & Contact Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Location & Contact Details</h3>
                  <p className="text-xs text-neutral-500">
                    Printed on receipt headers so customers can contact your store.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" /> Telephone / Mobile Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +254 712 345 678"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" /> Business Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. info@prestigebookshop.co.ke"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" /> Street / Building Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Mama Ngina Street, Opp. City Hall"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Town / County / Region
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="e.g. Nairobi, Kenya"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Currency & Payment Methods */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Currency, Tax & Payments</h3>
                  <p className="text-xs text-neutral-500">
                    Configure your operating currency, VAT tax rate, and mobile money options.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Operating Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white font-medium"
                    >
                      <option value="KES">KES - Kenyan Shilling (Ksh)</option>
                      <option value="USD">USD - US Dollar ($)</option>
                      <option value="EUR">EUR - Euro (€)</option>
                      <option value="GBP">GBP - British Pound (£)</option>
                      <option value="TZS">TZS - Tanzanian Shilling</option>
                      <option value="UGX">UGX - Ugandan Shilling</option>
                    </select>
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
                    <p className="text-[10px] text-neutral-400 mt-1">
                      In Kenya, school books are zero-rated (0%), while commercial stationery is 16%.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-100">
                  <h4 className="text-xs font-semibold text-neutral-800 mb-2">M-Pesa Payment Details (Optional)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        M-Pesa Buy Goods (Till Number)
                      </label>
                      <input
                        type="text"
                        value={tillNumber}
                        onChange={(e) => setTillNumber(e.target.value)}
                        placeholder="e.g. 524123"
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                        M-Pesa Paybill / Account
                      </label>
                      <input
                        type="text"
                        value={paybillNumber}
                        onChange={(e) => setPaybillNumber(e.target.value)}
                        placeholder="e.g. 400200 Acc: BOOKSHOP"
                        className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    Printed on receipts for customer convenience. Cash payments are always supported by default.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 4: Receipt & Inventory Configuration */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Receipts & Inventory Thresholds</h3>
                  <p className="text-xs text-neutral-500">
                    Define receipt numbering and low-stock notification triggers.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Receipt Number Prefix
                    </label>
                    <input
                      type="text"
                      value={receiptPrefix}
                      onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                      placeholder="e.g. RCP"
                      className="w-full px-3 py-2 font-mono text-xs uppercase font-medium rounded-xl border border-neutral-300"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Receipt format: <code className="font-mono">{receiptPrefix || 'RCP'}-2026-00001</code>
                    </p>
                  </div>

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
                    <p className="text-[10px] text-neutral-400 mt-1">
                      Titles with stock at or below this number trigger low-stock alerts.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Receipt Footer Note / Return Policy
                  </label>
                  <textarea
                    rows={2}
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="e.g. Goods once sold can be exchanged within 7 days with a valid receipt."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Auto-Lock Inactivity Timeout (Minutes)
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
              </motion.div>
            )}

            {/* Step 5: Administrator Security Account */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Administrator Security Account</h3>
                  <p className="text-xs text-neutral-500">
                    Create the primary administrator account for managing inventory, staff, and financial reports.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Admin Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Admin Login Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                      placeholder="e.g. admin"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-neutral-300"
                    />
                  </div>
                </div>

                {!isRerun && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-neutral-400" /> Secure Password (Min 6 chars) *
                      </label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:border-neutral-900"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Quick-Unlock 4-Digit PIN (Optional)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-32 px-3 py-2 text-center text-sm font-mono tracking-widest rounded-xl border border-neutral-300"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Used to quickly unlock the screen during busy checkout hours without typing the full password.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 6: Backup Preferences & Ready to Launch */}
            {currentStep === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Backup Preferences & Launch</h3>
                  <p className="text-xs text-neutral-500">
                    KitabuPOS runs entirely on local SQLite. Configure routine backups to protect your business records.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Recommended Backup Schedule
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'daily', title: 'Daily Backup', desc: 'Prompt at close of day' },
                      { id: 'weekly', title: 'Weekly', desc: 'Weekly USB export' },
                      { id: 'manual', title: 'On-Demand', desc: 'Manual export only' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setBackupSchedule(item.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          backupSchedule === item.id
                            ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                        }`}
                      >
                        <div className="text-xs font-semibold">{item.title}</div>
                        <div className={`text-[10px] mt-0.5 ${backupSchedule === item.id ? 'text-neutral-300' : 'text-neutral-400'}`}>
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-start gap-3">
                  <HardDrive className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <h4 className="font-semibold text-emerald-950">Initial Database Safety Backup</h4>
                    <p className="text-emerald-800 text-[11px] mt-0.5">
                      Save a copy of your initial clean database file to a USB flash drive or secure storage.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadInitialBackup}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs tactile-btn"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{downloadedInitialBackup ? 'Backup Downloaded ✓' : 'Download Initial SQLite (.sqlite)'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-1">
                  <div className="font-semibold text-neutral-900">Ready to start operations:</div>
                  <ul className="list-disc list-inside text-neutral-600 space-y-0.5 text-[11px]">
                    <li>Empty business database ready for your titles, suppliers, and opening stock</li>
                    <li>No sample or fabricated transactions</li>
                    <li>100% offline functionality — works without internet access</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Bar */}
        <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-200 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-100 tactile-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs tactile-btn"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishSetup}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs tactile-btn disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving Configuration...' : 'Complete Setup & Launch Store'}</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
