import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Plus, AlertCircle, X, UserCog } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../../types/index.ts';
import { getUsers, addUser, updateUser } from '../../db/database.ts';
import { formatDateTime } from '../../utils/formatters.ts';

interface UsersViewProps {
  currentUser: User | null;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !fullName.trim() || !password.trim()) {
      setError('Username, Full Name, and Password are required.');
      return;
    }

    try {
      const password_hash = bcrypt.hashSync(password.trim(), 8);
      await addUser(
        {
          username: username.trim().toLowerCase(),
          full_name: fullName.trim(),
          role,
          password_hash,
          pin: pin.trim() || undefined,
          is_active: 1,
        },
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );

      toast.success(`User @${username.trim().toLowerCase()} created successfully`);
      setUsername('');
      setFullName('');
      setPassword('');
      setPin('1234');
      setIsAddUserOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account.');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot deactivate your own active session.');
      return;
    }
    const nextStatus = user.is_active === 1 ? 0 : 1;
    await updateUser(
      user.id,
      { is_active: nextStatus },
      currentUser?.id || 1,
      currentUser?.full_name || 'Admin'
    );
    toast.success(`Account @${user.username} ${nextStatus === 1 ? 'activated' : 'suspended'}`);
    await loadUsers();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm tracking-tight text-neutral-900">Staff Accounts & Role Permissions</h3>
          <p className="text-xs text-neutral-400">
            Control access to POS, inventory, supplier purchases, expenses, and reporting.
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors shrink-0 tactile-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-xs text-neutral-900">{u.full_name}</h4>
                  <p className="text-[11px] text-neutral-400 font-mono">@{u.username}</p>
                </div>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 border border-neutral-200/60 font-medium">
                  {u.role}
                </span>
              </div>

              <div className="mt-3 p-2 rounded-lg bg-neutral-50/70 border border-neutral-100 text-xs space-y-1">
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>Lock PIN:</span>
                  <span className="font-mono text-neutral-800">{u.pin ? '••••' : 'None'}</span>
                </div>
                <div className="flex justify-between text-neutral-500 text-[11px]">
                  <span>Last Login:</span>
                  <span className="text-neutral-700 tabular-nums">{formatDateTime(u.last_login)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
              <span className={`font-mono text-[11px] ${u.is_active === 1 ? 'text-neutral-700' : 'text-neutral-400'}`}>
                {u.is_active === 1 ? '● Active' : '○ Suspended'}
              </span>

              {u.id !== currentUser?.id && (
                <button
                  onClick={() => handleToggleActive(u)}
                  className="px-2 py-0.5 text-xs font-medium rounded border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors tactile-btn"
                >
                  {u.is_active === 1 ? 'Suspend' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add User Modal with spring animation */}
      <AnimatePresence>
        {isAddUserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
              onClick={() => setIsAddUserOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 max-w-md w-full overflow-hidden text-neutral-900 z-10"
            >
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCog className="w-4 h-4 text-neutral-600" />
                  <h3 className="font-semibold text-sm tracking-tight text-neutral-900">
                    Create New Staff User
                  </h3>
                </div>
                <button onClick={() => setIsAddUserOpen(false)} className="p-1 rounded-md text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="p-5 space-y-3">
                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dennis Kiprono"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. dkiprono"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Role Permission *
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 bg-white font-medium"
                    >
                      <option value="cashier">Cashier (POS & Sales only)</option>
                      <option value="manager">Store Manager (Inventory, Reports, Voids)</option>
                      <option value="admin">System Administrator (Full Access)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Quick Lock PIN
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 1234"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-neutral-200"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium shadow-xs tactile-btn"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
