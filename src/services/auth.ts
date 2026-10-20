import bcrypt from 'bcryptjs';
import { runExecute, runQueryOne } from '../db/database.ts';
import { User, UserRole } from '../types/index.ts';

export interface AuthSession {
  user: User;
  isLocked: boolean;
  lastActive: number;
}

const SESSION_STORAGE_KEY = 'kitabupos_auth_session';

export const PERMISSIONS = {
  CAN_SELL: ['admin', 'cashier'],
  CAN_MANAGE_INVENTORY: ['admin'],
  CAN_ADJUST_STOCK: ['admin'],
  CAN_VOID_SALE: ['admin'],
  CAN_VIEW_PROFITABILITY: ['admin'],
  CAN_MANAGE_PURCHASES: ['admin'],
  CAN_MANAGE_EXPENSES: ['admin'],
  CAN_MANAGE_USERS: ['admin'],
  CAN_RESTORE_DATABASE: ['admin'],
  CAN_EDIT_SETTINGS: ['admin'],
} as const;

export function hasPermission(role: UserRole, permissionKey: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permissionKey] as readonly string[];
  return allowedRoles.includes(role);
}

export async function loginWithPassword(username: string, password: string): Promise<User> {
  const user = await runQueryOne<User>(
    'SELECT * FROM users WHERE username = ? AND is_active = 1',
    [username.trim()]
  );

  if (!user) {
    throw new Error('Invalid username or account is deactivated.');
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    throw new Error('Incorrect password. Please try again.');
  }

  const now = new Date().toISOString();
  await runExecute('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);
  user.last_login = now;

  saveSession({ user, isLocked: false, lastActive: Date.now() });
  return user;
}

export async function unlockWithPinOrPassword(userId: number, credential: string): Promise<boolean> {
  const user = await runQueryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return false;

  // Check pin
  if (user.pin && user.pin === credential.trim()) {
    return true;
  }

  // Check password
  return bcrypt.compareSync(credential, user.password_hash);
}

export function getStoredSession(): AuthSession | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession | null): void {
  if (typeof sessionStorage === 'undefined') return;
  if (!session) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
}
