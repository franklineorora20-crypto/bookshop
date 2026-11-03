import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { BookOpen, AlertCircle, ArrowRight, ArrowLeft, Copy, Eye, EyeOff, ShieldCheck, Lock, Clock } from 'lucide-react';
import { KitabuLogo } from '../common/KitabuLogo.tsx';
import {
  loginWithPassword,
  isDefaultPassword,
  changeUserPassword,
  validatePassword,
  notifySessionsInvalidated,
} from '../../services/auth.ts';
import type { User as UserType } from '../../types/index.ts';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';
import { recoverAdministratorPassword } from '../../db/database.ts';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
  onResetAndSetup?: () => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onResetAndSetup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecoveryScreenOpen, setIsRecoveryScreenOpen] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [replacementRecoveryCode, setReplacementRecoveryCode] = useState<string | null>(null);


  // Rate limiting failed attempts
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // First-login password change state
  const [pendingUser, setPendingUser] = useState<UserType | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Cooldown countdown timer
  useEffect(() => {
    let interval: any;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;

    setError(null);
    setLoading(true);

    try {
      const user = await loginWithPassword(username, password);
      // Reset failed attempts
      setFailedAttempts(0);

      // Check if user is logging in with default initial password
      if (isDefaultPassword(password)) {
        setPendingUser(user);
      } else {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      if (nextFailed >= MAX_FAILED_ATTEMPTS) {
        setLockoutTimer(LOCKOUT_SECONDS);
        setError(`Too many failed sign-in attempts. Please wait ${LOCKOUT_SECONDS} seconds before trying again.`);
      } else {
        setError(
          `${err.message || 'Login failed.'} (${MAX_FAILED_ATTEMPTS - nextFailed} attempts remaining)`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser) return;
    setPasswordChangeError(null);

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      setPasswordChangeError(validation.error || 'Password must be at least 8 characters long.');
      return;
    }
    if (newPassword.trim() === 'admin123' || newPassword.trim() === 'cashier123') {
      setPasswordChangeError('Please choose a new, non-default password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const authVersion = await changeUserPassword(pendingUser.id, newPassword);
      toast.success('Password updated successfully! Welcome to KitabuPOS.');
      const updatedUser = { ...pendingUser, auth_version: authVersion };
      setPendingUser(null);
      onLoginSuccess(updatedUser);
    } catch (err: any) {
      setPasswordChangeError(err.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setIsRecovering(true);
    try {
      const result = await recoverAdministratorPassword(
        recoveryUsername,
        recoveryCode,
        recoveryNewPassword,
        confirmRecoveryPassword
      );
      notifySessionsInvalidated();
      setRecoveryCode('');
      setRecoveryNewPassword('');
      setConfirmRecoveryPassword('');
      setReplacementRecoveryCode(result.recoveryCode);
    } catch (err: any) {
      setRecoveryError(err.message || 'Recovery could not be completed. Check the information or wait before trying again.');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleCopyReplacementCode = async () => {
    if (!replacementRecoveryCode) return;
    try {
      await navigator.clipboard.writeText(replacementRecoveryCode);
      toast.success('Recovery code copied. Store it somewhere safe.');
    } catch {
      setRecoveryError('Copy was unavailable. Select and copy the recovery code manually.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-center items-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.12 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
      >
        {/* Brand Header */}
        <div className="p-6 text-center border-b border-neutral-100 bg-neutral-50/60 flex flex-col items-center">
          <KitabuLogo variant="badge" size={48} className="mb-3" />
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">KitabuPOS</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Bookshop Point of Sale & Inventory
          </p>
        </div>

        {/* Login Form */}
        {replacementRecoveryCode ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="font-bold">Password recovered</h2>
            </div>
            <p className="text-sm text-neutral-600">
              Save this replacement recovery code now. It is shown only once; sign in with your new password after saving it.
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
              <code className="break-all font-mono text-lg font-bold tracking-wider text-neutral-900">
                {replacementRecoveryCode}
              </code>
            </div>
            {recoveryError && (
              <p role="alert" className="text-sm text-rose-700">{recoveryError}</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={handleCopyReplacementCode} className="flex-1">
                <Copy className="w-4 h-4" /> Copy code
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setReplacementRecoveryCode(null);
                  setRecoveryError(null);
                  setIsRecoveryScreenOpen(false);
                  setUsername(recoveryUsername);
                  setPassword('');
                }}
                className="flex-1"
              >
                I saved it — go to sign in
              </Button>
            </div>
          </div>
        ) : isRecoveryScreenOpen ? (
          <form onSubmit={handleRecoverySubmit} className="p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="font-bold text-neutral-900">Recover administrator password</h2>
              <p className="text-sm text-neutral-600">
                Use the offline recovery code saved during setup. Recovery codes cannot be used to sign in.
              </p>
            </div>
            {recoveryError && (
              <div role="alert" className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
                {recoveryError}
              </div>
            )}
            <label className="block text-xs font-semibold text-neutral-700">
              Administrator username
              <input
                required
                autoComplete="username"
                value={recoveryUsername}
                onChange={(event) => setRecoveryUsername(event.target.value)}
                className="mt-1 w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200"
              />
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              Administrator recovery code
              <input
                required
                autoComplete="off"
                autoCapitalize="characters"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
                className="mt-1 w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200 font-mono"
              />
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              New password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={recoveryNewPassword}
                onChange={(event) => setRecoveryNewPassword(event.target.value)}
                className="mt-1 w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200"
              />
            </label>
            <label className="block text-xs font-semibold text-neutral-700">
              Confirm new password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmRecoveryPassword}
                onChange={(event) => setConfirmRecoveryPassword(event.target.value)}
                className="mt-1 w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200"
              />
            </label>
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setRecoveryError(null);
                  setIsRecoveryScreenOpen(false);
                }}
                disabled={isRecovering}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Button>
              <Button type="submit" variant="primary" loading={isRecovering} className="flex-1">
                Recover password
              </Button>
            </div>
          </form>
        ) : (
          <>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {lockoutTimer > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Sign-in locked for security. Resuming in <strong>{lockoutTimer}s</strong>...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              disabled={lockoutTimer > 0}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 disabled:opacity-50"
              placeholder="Enter your username"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={lockoutTimer > 0}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] pl-3.5 pr-11 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 font-mono disabled:opacity-50"
                placeholder="Enter account password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading || lockoutTimer > 0}
            loading={loading}
            className="w-full min-h-[44px] text-sm font-semibold mt-2"
          >
            <span>Sign In to Register</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <div className="p-3.5 bg-neutral-50/80 border-t border-neutral-100 text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              setRecoveryUsername(username);
              setRecoveryError(null);
              setIsRecoveryScreenOpen(true);
            }}
            className="block mx-auto text-sm font-medium text-teal-700 hover:text-teal-900 underline"
          >
            Forgot Administrator Password?
          </button>
        </div>
          </>
        )}
      </motion.div>

      {/* Mandatory Password Change Modal for Seeded Accounts */}
      <Modal
        isOpen={!!pendingUser}
        onClose={() => {
          // If closed without changing password, cancel login
          setPendingUser(null);
        }}
        title="Security Notice: Change Initial Password"
        maxWidth="md"
      >
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-sm space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Default System Password Detected</span>
            </div>
            <p className="text-xs text-amber-900">
              For security at your bookshop till, please create a new custom password before accessing the register.
            </p>
          </div>

          {passwordChangeError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordChangeError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              New Password (min 6 characters) *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                autoFocus
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create new password"
                className="w-full min-h-[44px] pl-3 pr-11 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 font-mono"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Confirm New Password *
            </label>
            <input
              type={showNewPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password"
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setPendingUser(null)}
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={isChangingPassword}
            >
              Save Password & Enter
            </Button>
          </div>
        </form>
      </Modal>


    </div>
  );
};
