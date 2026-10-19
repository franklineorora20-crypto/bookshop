import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, AlertCircle, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { loginWithPassword } from '../../services/auth.ts';
import { User as UserType } from '../../types/index.ts';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await loginWithPassword(username, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSwitch = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 flex flex-col justify-center items-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.4, bounce: 0.12 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden"
      >
        {/* Brand Header */}
        <div className="p-6 text-center border-b border-neutral-100 bg-neutral-50/50">
          <div className="w-10 h-10 mx-auto rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shadow-xs mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900">KitabuPOS</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Offline Bookshop Management System
          </p>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200/60 text-[10px] text-neutral-600 mt-2.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Local SQLite Database</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              placeholder="e.g. admin"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 font-mono"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all tactile-btn"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Register'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Role Switchers */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-100">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium text-center mb-2">
            Quick Local Accounts
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickSwitch('admin', 'admin123')}
              className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-colors text-center tactile-btn"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickSwitch('manager', 'manager123')}
              className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-colors text-center tactile-btn"
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickSwitch('cashier', 'cashier123')}
              className="p-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-[11px] font-medium text-neutral-700 transition-colors text-center tactile-btn"
            >
              Cashier
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
