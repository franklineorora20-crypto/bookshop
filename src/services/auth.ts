import bcrypt from 'bcryptjs';
import { runExecute, runQueryOne } from '../db/database.ts';
import type { User, UserRole } from '../types/index.ts';

export interface SessionData {
  userId: number;
  role: UserRole;
  name: string;
  locked: boolean;
}

// Deprecated alias for backwards compatibility
export type AuthSession = {
  user: User;
  isLocked: boolean;
  lastActive: number;
};

const SESSION_STORAGE_KEY = 'kitabupos_auth_session';

export const PERMISSIONS = {
  CAN_SELL: ['admin', 'manager', 'cashier'],
  CAN_MANAGE_INVENTORY: ['admin', 'manager'],
  CAN_ADJUST_STOCK: ['admin', 'manager'],
  CAN_VOID_SALE: ['admin', 'manager'],
  CAN_VIEW_PROFITABILITY: ['admin', 'manager'],
  CAN_MANAGE_PURCHASES: ['admin', 'manager'],
  CAN_MANAGE_EXPENSES: ['admin', 'manager'],
  CAN_MANAGE_USERS: ['admin'],
  CAN_RESTORE_DATABASE: ['admin'],
  CAN_EDIT_SETTINGS: ['admin'],
  CAN_CLEAN_DATABASE: ['admin'],
  CAN_EXPORT_FINANCIALS: ['admin', 'manager'],
} as const;

export function hasPermission(role: UserRole, permissionKey: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permissionKey] as readonly string[];
  return allowedRoles.includes(role);
}

export async function requirePermission(
  userOrRoleOrId: { role?: UserRole; id?: number } | UserRole | number | null | undefined,
  permissionKey: keyof typeof PERMISSIONS
): Promise<void> {
  let role: UserRole = 'admin';
  if (typeof userOrRoleOrId === 'string') {
    role = userOrRoleOrId as UserRole;
  } else if (typeof userOrRoleOrId === 'number') {
    const user = await runQueryOne<{ role: UserRole }>('SELECT role FROM users WHERE id = ?;', [userOrRoleOrId]);
    if (user) {
      role = user.role;
    }
  } else if (userOrRoleOrId && typeof userOrRoleOrId === 'object' && userOrRoleOrId.role) {
    role = userOrRoleOrId.role;
  }

  if (!hasPermission(role, permissionKey)) {
    throw new Error(`Unauthorized: Role "${role}" lacks permission "${permissionKey}".`);
  }
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.trim().length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  return { valid: true };
}

export function validatePin(pin: string): { valid: boolean; error?: string } {
  const trimmed = pin.trim();
  if (!/^\d{4,6}$/.test(trimmed)) {
    return { valid: false, error: 'PIN must be between 4 and 6 digits.' };
  }
  if (trimmed === '0000' || trimmed === '1234') {
    return { valid: false, error: 'PIN is too easily guessed.' };
  }
  if (/^(\d)\1+$/.test(trimmed)) {
    return { valid: false, error: 'PIN cannot consist of repeated identical digits.' };
  }
  const asc = '0123456789';
  const desc = '9876543210';
  if (asc.includes(trimmed) || desc.includes(trimmed)) {
    return { valid: false, error: 'PIN cannot be sequential digits.' };
  }
  return { valid: true };
}

// Throttle management in DB
export async function checkThrottle(identifier: string): Promise<void> {
  const row = await runQueryOne<{ failed_attempts: number; locked_until: string | null }>(
    'SELECT failed_attempts, locked_until FROM auth_lockouts WHERE identifier = ?;',
    [identifier]
  );
  if (row?.locked_until) {
    const lockExpiry = new Date(row.locked_until).getTime();
    const now = Date.now();
    if (lockExpiry > now) {
      const waitMinutes = Math.max(1, Math.ceil((lockExpiry - now) / 60000));
      throw new Error(`Account locked due to multiple failed attempts. Please try again in ${waitMinutes} minute(s).`);
    }
  }
}

export async function recordFailedAttempt(identifier: string): Promise<void> {
  const row = await runQueryOne<{ failed_attempts: number }>(
    'SELECT failed_attempts FROM auth_lockouts WHERE identifier = ?;',
    [identifier]
  );
  const newAttempts = (row?.failed_attempts || 0) + 1;
  let lockedUntil: string | null = null;
  if (newAttempts >= 5) {
    // 5 failures -> 5-minute lock, doubling for subsequent failures
    const lockMinutes = 5 * Math.pow(2, newAttempts - 5);
    lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
  }

  await runExecute(
    `INSERT INTO auth_lockouts (identifier, failed_attempts, locked_until)
     VALUES (?, ?, ?)
     ON CONFLICT(identifier) DO UPDATE SET
       failed_attempts = excluded.failed_attempts,
       locked_until = excluded.locked_until;`,
    [identifier, newAttempts, lockedUntil]
  );
}

export async function resetLockout(identifier: string): Promise<void> {
  await runExecute('DELETE FROM auth_lockouts WHERE identifier = ?;', [identifier]);
}

export async function loginWithPassword(username: string, password: string): Promise<User> {
  const trimmedUsername = username.trim();
  const throttleKey = `login:${trimmedUsername.toLowerCase()}`;
  await checkThrottle(throttleKey);

  // Internal selection of password_hash for comparison only - never exposed to UI or returned
  const userRow = await runQueryOne<{
    id: number;
    username: string;
    full_name: string;
    role: UserRole;
    password_hash: string;
    is_active: number;
    created_at: string;
    last_login?: string;
  }>(
    'SELECT id, username, full_name, role, password_hash, is_active, created_at, last_login FROM users WHERE LOWER(TRIM(username)) = LOWER(?) AND is_active = 1;',
    [trimmedUsername]
  );

  if (!userRow) {
    await recordFailedAttempt(throttleKey);
    throw new Error('Invalid username or account is deactivated.');
  }

  const isValid = bcrypt.compareSync(password, userRow.password_hash) || bcrypt.compareSync(password.trim(), userRow.password_hash);
  if (!isValid) {
    await recordFailedAttempt(throttleKey);
    throw new Error('Incorrect password. Please try again.');
  }

  // Clear throttle on successful login
  await resetLockout(throttleKey);

  const now = new Date().toISOString();
  await runExecute('UPDATE users SET last_login = ? WHERE id = ?;', [now, userRow.id]);

  // sessionStorage holds only {userId, role, name, locked}
  saveSession({
    userId: userRow.id,
    role: userRow.role,
    name: userRow.full_name,
    locked: false,
  });

  return {
    id: userRow.id,
    username: userRow.username,
    full_name: userRow.full_name,
    role: userRow.role,
    is_active: userRow.is_active,
    created_at: userRow.created_at,
    last_login: now,
  };
}

export async function unlockWithPinOrPassword(userId: number, credential: string): Promise<boolean> {
  const throttleKey = `pin:${userId}`;
  await checkThrottle(throttleKey);

  const userRow = await runQueryOne<{
    id: number;
    username: string;
    full_name: string;
    role: UserRole;
    password_hash: string;
    pin: string | null;
  }>(
    'SELECT id, username, full_name, role, password_hash, pin FROM users WHERE id = ? AND is_active = 1;',
    [userId]
  );
  if (!userRow) return false;

  const cred = credential.trim();
  let isMatch = false;

  // Check pin
  if (userRow.pin) {
    if (userRow.pin.startsWith('$2')) {
      isMatch = bcrypt.compareSync(cred, userRow.pin);
    } else {
      isMatch = userRow.pin === cred;
      if (isMatch) {
        // Migrate existing plaintext PINs to bcrypt cost 10
        const hashedPin = bcrypt.hashSync(cred, 10);
        await runExecute('UPDATE users SET pin = ? WHERE id = ?;', [hashedPin, userId]);
      }
    }
  }

  // If pin didn't match, check full password
  if (!isMatch && userRow.password_hash) {
    isMatch = bcrypt.compareSync(cred, userRow.password_hash);
  }

  if (isMatch) {
    await resetLockout(throttleKey);
    saveSession({
      userId: userRow.id,
      role: userRow.role,
      name: userRow.full_name,
      locked: false,
    });
    return true;
  } else {
    await recordFailedAttempt(throttleKey);
    return false;
  }
}

const memoryStorage = new Map<string, string>();

function getSessionStorage() {
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage;
  }
  return {
    getItem: (key: string) => memoryStorage.get(key) || null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
  };
}

export function getStoredSession(): SessionData | null {
  const storage = getSessionStorage();
  const raw = storage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // Normalize into SessionData
    if ('userId' in parsed && 'role' in parsed) {
      return {
        userId: Number(parsed.userId),
        role: parsed.role,
        name: parsed.name || '',
        locked: Boolean(parsed.locked),
      };
    }
    // Backward compatibility if old object was stored
    if (parsed.user) {
      return {
        userId: Number(parsed.user.id),
        role: parsed.user.role,
        name: parsed.user.full_name || parsed.user.username || '',
        locked: Boolean(parsed.isLocked),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionData | null | { user: User; isLocked?: boolean; lastActive?: number }): void {
  const storage = getSessionStorage();
  if (!session) {
    storage.removeItem(SESSION_STORAGE_KEY);
  } else {
    let payload: SessionData;
    if ('userId' in session && 'role' in session) {
      payload = {
        userId: session.userId,
        role: session.role,
        name: session.name,
        locked: session.locked,
      };
    } else {
      const u = (session as any).user;
      payload = {
        userId: u.id,
        role: u.role,
        name: u.full_name || u.username,
        locked: Boolean((session as any).isLocked),
      };
    }
    // Strictly sessionStorage holds only {userId, role, name, locked}
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        userId: payload.userId,
        role: payload.role,
        name: payload.name,
        locked: payload.locked,
      })
    );
  }
}

export function isDefaultPassword(password: string): boolean {
  return password === 'admin123' || password === 'cashier123';
}

export async function changeUserPassword(userId: number, newPassword: string): Promise<void> {
  const check = validatePassword(newPassword);
  if (!check.valid) {
    throw new Error(check.error);
  }
  const newHash = bcrypt.hashSync(newPassword.trim(), 10);
  await runExecute('UPDATE users SET password_hash = ? WHERE id = ?;', [newHash, userId]);
}
