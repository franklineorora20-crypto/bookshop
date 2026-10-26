import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { BookOpen, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck, Lock, Clock } from 'lucide-react';
import { loginWithPassword, isDefaultPassword, changeUserPassword } from '../../services/auth.ts';
import type { User as UserType } from '../../types/index.ts';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword === 'admin123' || newPassword === 'cashier123') {
      setPasswordChangeError('Please choose a new, non-default password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changeUserPassword(pendingUser.id, newPassword);
      toast.success('Password updated successfully! Welcome to KitabuPOS.');
      const updatedUser = { ...pendingUser };
      setPendingUser(null);
      onLoginSuccess(updatedUser);
    } catch (err: any) {
      setPasswordChangeError(err.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
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
        <div className="p-6 text-center border-b border-neutral-100 bg-neutral-50/60">
          <div className="w-12 h-12 mx-auto rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shadow-xs mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">KitabuPOS</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Offline Bookshop Point of Sale & Inventory
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 mt-3 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Local SQLite Database (Offline-Ready)</span>
          </div>
        </div>

        {/* Login Form */}
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
              placeholder="e.g. admin or cashier"
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

        {/* Quick Role Fillers for initial setup */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold text-center mb-2.5">
            Initial Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin', 'admin123')}
              className="min-h-[44px] py-2 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors text-center"
            >
              Fill Admin Creds
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('cashier', 'cashier123')}
              className="min-h-[44px] py-2 px-3 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-xs font-semibold text-neutral-800 transition-colors text-center"
            >
              Fill Cashier Creds
            </button>
          </div>
        </div>
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
