import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Shield, Key, CheckCircle, AlertCircle, Lock } from 'lucide-react';
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

      setUsername('');
      setFullName('');
      setPassword('');
      setPin('1234');
      setIsAddUserOpen(false);
      await loadUsers();
      alert('New user account created successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to create user account.');
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own active account!');
      return;
    }
    const nextStatus = user.is_active === 1 ? 0 : 1;
    await updateUser(
      user.id,
      { is_active: nextStatus },
      currentUser?.id || 1,
      currentUser?.full_name || 'Admin'
    );
    await loadUsers();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-800">Staff Accounts & Role Permissions</h3>
          <p className="text-xs text-slate-500">
            Control access to POS, inventory editing, discounts, refunds, and financial reports.
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{u.full_name}</h4>
                  <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                </div>
                <span
                  className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                    u.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : u.role === 'manager'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {u.role}
                </span>
              </div>

              <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Quick Lock PIN:</span>
                  <span className="font-mono font-bold text-slate-800">{u.pin ? '••••' : 'None'}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Last Login:</span>
                  <span className="text-slate-700">{formatDateTime(u.last_login)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span
                className={`text-xs font-semibold ${
                  u.is_active === 1 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {u.is_active === 1 ? '● Active' : '○ Suspended'}
              </span>

              {u.id !== currentUser?.id && (
                <button
                  onClick={() => handleToggleActive(u)}
                  className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                >
                  {u.is_active === 1 ? 'Suspend' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Create New Staff User</h3>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-5 space-y-3">
              {error && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dennis Kiprono"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dkiprono"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role Permission *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="cashier">Cashier (POS & Sales only)</option>
                    <option value="manager">Store Manager (Inventory, Reports, Voids)</option>
                    <option value="admin">System Administrator (Full Access)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quick Lock PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
