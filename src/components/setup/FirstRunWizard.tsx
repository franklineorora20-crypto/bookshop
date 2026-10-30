import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import bcrypt from 'bcryptjs';
import {
  BookOpen,
  Building2,
  Phone,
  Smartphone,
  ShieldCheck,
  PackageCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import type { ShopSettings, User } from '../../types/index.ts';
import { updateShopSettings, updateUser, runQueryOne } from '../../db/database.ts';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';

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
  const totalSteps = 4;

  // Step 1: Shop Identity & Location
  const [shopName, setShopName] = useState(initialSettings?.shop_name || '');
  const [tagline, setTagline] = useState(initialSettings?.tagline || '');
  const [phone, setPhone] = useState(initialSettings?.phone || '');
  const [email, setEmail] = useState(initialSettings?.email || '');
  const [address, setAddress] = useState(initialSettings?.address || '');
  const [county, setCounty] = useState(initialSettings?.county || 'Nairobi, Kenya');
  const [logoUrl, setLogoUrl] = useState(initialSettings?.logo_url || '');

  // Step 2: Payments & M-Pesa Setup
  const [tillNumber, setTillNumber] = useState(initialSettings?.till_number || '');
  const [paybillNumber, setPaybillNumber] = useState(initialSettings?.paybill_number || '');
  const [receiptPrefix, setReceiptPrefix] = useState(initialSettings?.receipt_prefix || 'RCP');
  const [taxRate, setTaxRate] = useState(initialSettings?.tax_rate?.toString() || '0');

  // Step 3: Admin Account Security
  const [adminFullName, setAdminFullName] = useState('System Administrator');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminPin, setAdminPin] = useState('');

  // Step 4: Initial Catalog Preference
  const [catalogChoice, setCatalogChoice] = useState<'sample' | 'empty'>('sample');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setError('Logo image must be smaller than 500 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const validateStep = (step: number): boolean => {
    setError(null);
    if (step === 1) {
      if (!shopName.trim()) {
        setError('Please enter your bookshop business or trade name.');
        return false;
      }
      if (!phone.trim()) {
        setError('Please provide a shop contact telephone number for customer receipts.');
        return false;
      }
    } else if (step === 3) {
      if (!isRerun) {
        if (!adminPassword.trim()) {
          setError('Please create a secure password for your administrator account.');
          return false;
        }
        if (adminPassword.trim().length < 8) {
          setError('Administrator password must be at least 8 characters.');
          return false;
        }
        if (adminPassword.trim() === 'admin123' || adminPassword.trim() === 'cashier123') {
          setError('Please create a secure custom password rather than the default demo password.');
          return false;
        }
        if (adminPassword !== confirmPassword) {
          setError('Passwords do not match. Please re-enter.');
          return false;
        }
        if (adminPin.trim()) {
          const pinVal = adminPin.trim();
          if (!/^\d{4,6}$/.test(pinVal)) {
            setError('PIN must be 4 to 6 digits.');
            return false;
          }
          if (pinVal === '0000' || pinVal === '1234') {
            setError('PIN cannot be 0000 or 1234.');
            return false;
          }
          if (/^(\d)\1+$/.test(pinVal)) {
            setError('PIN cannot consist of repeated identical digits.');
            return false;
          }
          if ('0123456789'.includes(pinVal) || '9876543210'.includes(pinVal)) {
            setError('PIN cannot be sequential digits.');
            return false;
          }
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

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinishSetup = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const updatedSettingsPayload: Partial<ShopSettings> = {
        shop_name: shopName.trim(),
        tagline: tagline.trim(),
        logo_url: logoUrl || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        county: county.trim(),
        currency: 'KES',
        receipt_prefix: receiptPrefix.trim() || 'RCP',
        till_number: tillNumber.trim() || undefined,
        paybill_number: paybillNumber.trim() || undefined,
        tax_rate: parseFloat(taxRate) || 0,
        default_reorder_level: 5,
        session_timeout_minutes: 15,
        backup_schedule: 'daily',
        is_setup_completed: true,
      };

      await updateShopSettings(updatedSettingsPayload, 1, 'System Administrator');

      if (adminPassword.trim()) {
        const passwordHash = bcrypt.hashSync(adminPassword.trim(), 10);
        const pinHash = adminPin.trim() ? bcrypt.hashSync(adminPin.trim(), 10) : undefined;
        await updateUser(
          1,
          {
            full_name: adminFullName.trim(),
            username: adminUsername.trim(),
            password_hash: passwordHash,
            pin: pinHash,
          },
          1,
          'System Administrator'
        );
      }

      const adminUser = await runQueryOne<User>('SELECT * FROM users WHERE id = 1');
      if (adminUser) {
        onComplete(adminUser, updatedSettingsPayload as ShopSettings);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during initial configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
      >
        {/* Wizard Header with Step Indicator */}
        <div className="p-6 border-b border-neutral-100 bg-neutral-50/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-base text-neutral-900">KitabuPOS Setup Wizard</h1>
                <p className="text-xs text-neutral-500">
                  {isRerun ? 'Modify Bookshop Settings' : 'Quick 4-step initialization for your bookshop'}
                </p>
              </div>
            </div>
            {isRerun && onCancel && (
              <Button variant="secondary" size="sm" onClick={onCancel}>
                Close
              </Button>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex-1 flex flex-col gap-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    step < currentStep
                      ? 'bg-emerald-500'
                      : step === currentStep
                      ? 'bg-neutral-900'
                      : 'bg-neutral-200'
                  }`}
                />
                <span className="text-[11px] font-medium text-neutral-500 hidden sm:block">
                  {step === 1 && '1. Shop Profile'}
                  {step === 2 && '2. Payments & Till'}
                  {step === 3 && '3. Admin Account'}
                  {step === 4 && '4. Catalog'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Shop Identity & Location */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Bookshop Identity</h3>
                <p className="text-xs text-neutral-500">
                  This business name and contact info will appear on your customer receipts.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Bookshop Trade Name *"
                  required
                  autoFocus
                  placeholder="e.g. St. Peters Bookshop & Stationers"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
                <Input
                  label="Tagline / Motto"
                  placeholder="e.g. Empowering Education"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number (for receipts) *"
                  required
                  placeholder="e.g. 0712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="info@bookshop.co.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Physical Location / Street"
                  placeholder="e.g. Moi Avenue, Stage Market"
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
            </div>
          )}

          {/* STEP 2: Payments & M-Pesa Setup */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Payments & M-Pesa Setup</h3>
                <p className="text-xs text-neutral-500">
                  Configure your payment methods for the till checkout screen.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Safaricom M-Pesa Till Number"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Receipt Prefix"
                  placeholder="RCP"
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value.toUpperCase())}
                />
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200 bg-white"
                  />
                  <p className="text-xs text-neutral-400 mt-1">0% for VAT exempt school textbooks</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Admin Account Security */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Administrator Credentials</h3>
                <p className="text-xs text-neutral-500">
                  Set the master login password for your store manager and audit controls.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Admin Full Name"
                  required
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                />
                <Input
                  label="Username"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    New Admin Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 8 characters"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full min-h-[44px] pl-3.5 pr-11 py-2 text-sm font-mono rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-sm font-mono rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Quick Lock PIN (4-6 digits, optional)"
                  maxLength={6}
                  placeholder="e.g. 5829"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Allows unlocking the till counter screen quickly without re-typing full password.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Initial Catalog Preference */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Bookshop Inventory Setup</h3>
                <p className="text-xs text-neutral-500">
                  Choose how you would like to start your books catalog.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCatalogChoice('sample')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between space-y-2 ${
                    catalogChoice === 'sample'
                      ? 'border-neutral-900 bg-neutral-50 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-neutral-900">Kenyan CBC & KCSE Catalog</span>
                    {catalogChoice === 'sample' && <CheckCircle2 className="w-5 h-5 text-neutral-900" />}
                  </div>
                  <p className="text-xs text-neutral-600">
                    Includes sample curriculum textbooks (KLB, Longhorn, Moran), revision past papers,
                    exercise books, and stationery with genuine ISBNs and barcodes ready to test.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogChoice('empty')}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between space-y-2 ${
                    catalogChoice === 'empty'
                      ? 'border-neutral-900 bg-neutral-50 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-neutral-900">Fresh Blank Catalog</span>
                    {catalogChoice === 'empty' && <CheckCircle2 className="w-5 h-5 text-neutral-900" />}
                  </div>
                  <p className="text-xs text-neutral-600">
                    Start with an empty database. You can scan barcodes directly at the counter, import
                    a CSV inventory spreadsheet, or add titles one by one.
                  </p>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  You are all set! Once you click Finish, KitabuPOS will initialize your database and
                  open the Point of Sale register.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation */}
        <div className="p-6 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={isSubmitting}
                className="min-h-[44px]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < totalSteps ? (
              <Button
                variant="primary"
                onClick={handleNext}
                className="min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleFinishSetup}
                loading={isSubmitting}
                className="min-h-[44px]"
              >
                <span>Finish & Launch Register</span>
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
