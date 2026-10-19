import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, ArrowRight, AlertCircle, LogOut } from 'lucide-react';
import { User } from '../../types/index.ts';
import { unlockWithPinOrPassword } from '../../services/auth.ts';

interface LockScreenProps {
  user: User;
  onUnlock: () => void;
  onLogout: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ user, onUnlock, onLogout }) => {
  const [credential, setCredential] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credential.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const success = await unlockWithPinOrPassword(user.id, credential);
      if (success) {
        onUnlock();
      } else {
        setError('Incorrect PIN or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Unlock failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }}
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 border border-neutral-200"
      >
        <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 text-white mx-auto flex items-center justify-center shadow-xs">
          <Lock className="w-5 h-5 text-neutral-300" />
        </div>

        <div>
          <h2 className="text-base font-semibold tracking-tight text-neutral-900">Register Locked</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Locked due to inactivity or quick lock
          </p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs font-semibold text-neutral-900">{user.full_name}</p>
            <p className="text-[10px] text-neutral-400 font-mono">@{user.username}</p>
          </div>
          <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-neutral-200/80 text-neutral-700 font-medium">
            {user.role}
          </span>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3">
          {error && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 justify-center">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <input
              type="password"
              required
              autoFocus
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder={`Enter PIN (${user.pin ? 'e.g. ' + user.pin : 'password'})`}
              className="w-full text-center tracking-widest text-base font-mono font-medium py-2 px-3 rounded-lg border border-neutral-200 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all tactile-btn"
          >
            <span>{loading ? 'Verifying...' : 'Unlock Register'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="text-xs text-neutral-400 hover:text-rose-600 font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors pt-1"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch User / Exit</span>
        </button>
      </motion.div>
    </div>
  );
};
