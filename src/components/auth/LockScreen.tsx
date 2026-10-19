import React, { useState } from 'react';
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center space-y-5 border border-slate-200">
        <div className="w-16 h-16 rounded-full bg-slate-900 text-white mx-auto flex items-center justify-center shadow-md">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Session Locked</h2>
          <p className="text-xs text-slate-500 mt-1">
            Bookshop register locked due to inactivity or manual lock
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <p className="text-sm font-bold text-slate-800">{user.full_name}</p>
          <span className="inline-block mt-0.5 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
            {user.role}
          </span>
        </div>

        <form onSubmit={handleUnlock} className="space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 justify-center">
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
              className="w-full text-center tracking-widest text-lg font-bold py-2.5 px-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>{loading ? 'Verifying...' : 'Unlock Register'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="text-xs text-slate-400 hover:text-rose-600 font-semibold flex items-center justify-center gap-1.5 mx-auto transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch User / Log Out</span>
        </button>
      </div>
    </div>
  );
};
