import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, AlertCircle, UserCog, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import bcrypt from 'bcryptjs';
import type { User, UserRole } from '../../types/index.ts';
import { getUsers, addUser, updateUser } from '../../db/database.ts';
import { formatDateTime } from '../../utils/formatters.ts';
import { Button } from '../common/Button.tsx';
import { Input } from '../common/Input.tsx';
import { Modal } from '../common/Modal.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';

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
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toggle user active status confirmation
  const [targetToggleUser, setTargetToggleUser] = useState<User | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load user accounts');
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

    if (password.trim().length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (pin.trim() && pin.trim().length < 4) {
      setError('Quick lock PIN must be at least 4 digits if provided.');
      return;
    }

    setSubmitting(true);
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
      setPin('');
      setIsAddUserOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmToggleActive = async () => {
    if (!targetToggleUser) return;
    if (targetToggleUser.id === currentUser?.id) {
      toast.error('You cannot deactivate your own active session.');
      setTargetToggleUser(null);
      return;
    }
    const nextStatus = targetToggleUser.is_active === 1 ? 0 : 1;
    try {
      await updateUser(
        targetToggleUser.id,
        { is_active: nextStatus },
        currentUser?.id || 1,
        currentUser?.full_name || 'Admin'
      );
      toast.success(
        `Account @${targetToggleUser.username} ${nextStatus === 1 ? 'activated' : 'suspended'}`
      );
      setTargetToggleUser(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base tracking-tight text-neutral-900">
            Staff Accounts & Role Permissions
          </h3>
          <p className="text-sm text-neutral-500 mt-0.5">
            Manage cashier logins, system administrators, and lock screen PINs.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setError(null);
            setUsername('');
            setFullName('');
            setPassword('');
            setPin('');
            setIsAddUserOpen(true);
          }}
          className="min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Account</span>
        </Button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white p-5 rounded-xl border border-neutral-200/80 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base text-neutral-900">{u.full_name}</h4>
                  <p className="text-xs text-neutral-500 font-mono">@{u.username}</p>
                </div>
                <span className="text-xs font-mono uppercase px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-200 font-semibold">
                  {u.role}
                </span>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-xs space-y-2">
                <div className="flex justify-between items-center text-neutral-600">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Lock PIN:</span>
                  </span>
                  <span className="font-mono text-neutral-900 font-bold">
                    {u.pin ? '••••' : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Last Login:</span>
                  <span className="text-neutral-800 tabular-nums font-medium">
                    {formatDateTime(u.last_login)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
              <div>
                {u.is_active === 1 ? (
                  <StatusBadge status="success" label="Active" />
                ) : (
                  <StatusBadge status="danger" label="Suspended" />
                )}
              </div>

              {u.id !== currentUser?.id && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setTargetToggleUser(u)}
                  className="min-h-[36px]"
                >
                  {u.is_active === 1 ? 'Suspend Account' : 'Activate Account'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Create New Staff Account"
        maxWidth="md"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-800 text-sm border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Full Name *"
            required
            placeholder="e.g. Dennis Kiprono"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Username *"
              required
              placeholder="e.g. dkiprono"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Role Permission *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white font-medium focus:border-neutral-900"
              >
                <option value="cashier">Cashier (POS & Sales)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
          </div>

          {/* Password with Show/Hide toggle */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Account Password (min 6 chars) *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full min-h-[44px] pl-3 pr-11 py-2 text-sm font-mono rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
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

          {/* Quick Lock PIN with Show/Hide toggle and no default prefill */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Quick Lock PIN (4-6 digits, optional)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                maxLength={6}
                placeholder="Enter 4-6 digit numeric PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full min-h-[44px] pl-3 pr-11 py-2 text-sm font-mono rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPin(!showPin)}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-400 hover:text-neutral-700"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Used by the cashier to quickly unlock the screen without entering full password.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-neutral-100">
            <Button
              variant="secondary"
              onClick={() => setIsAddUserOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={submitting}
            >
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivate / Activate User */}
      <ConfirmDialog
        isOpen={!!targetToggleUser}
        title={targetToggleUser?.is_active === 1 ? 'Suspend Staff Account' : 'Activate Staff Account'}
        message={`Are you sure you want to ${
          targetToggleUser?.is_active === 1 ? 'suspend' : 'reactivate'
        } @${targetToggleUser?.username} (${targetToggleUser?.full_name})?`}
        confirmLabel={targetToggleUser?.is_active === 1 ? 'Suspend Account' : 'Reactivate'}
        variant={targetToggleUser?.is_active === 1 ? 'danger' : 'primary'}
        onConfirm={confirmToggleActive}
        onClose={() => setTargetToggleUser(null)}
      />
    </div>
  );
};
