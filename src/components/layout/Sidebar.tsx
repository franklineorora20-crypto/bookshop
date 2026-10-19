import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  ReceiptText,
  BarChart3,
  UserCog,
  Settings,
  Lock,
  LogOut,
  WifiOff,
  X,
} from 'lucide-react';
import { User } from '../../types/index.ts';
import { hasPermission } from '../../services/auth.ts';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'purchases'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User | null;
  onLock: () => void;
  onLogout: () => void;
  lowStockCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLock,
  onLogout,
  lowStockCount,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const role = currentUser?.role || 'cashier';

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: any;
    shortcut: string;
    badge?: number;
    permissionKey?:
      | 'CAN_MANAGE_INVENTORY'
      | 'CAN_MANAGE_PURCHASES'
      | 'CAN_MANAGE_EXPENSES'
      | 'CAN_VIEW_PROFITABILITY'
      | 'CAN_MANAGE_USERS'
      | 'CAN_EDIT_SETTINGS';
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      shortcut: 'Alt+D',
    },
    {
      id: 'pos',
      label: 'Point of Sale',
      icon: ShoppingCart,
      shortcut: 'F2',
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Boxes,
      shortcut: 'Alt+I',
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      id: 'purchases',
      label: 'Purchases & Stock',
      icon: Truck,
      shortcut: 'Alt+S',
      permissionKey: 'CAN_MANAGE_PURCHASES',
    },
    {
      id: 'expenses',
      label: 'Shop Expenses',
      icon: ReceiptText,
      shortcut: 'Alt+E',
      permissionKey: 'CAN_MANAGE_EXPENSES',
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      icon: BarChart3,
      shortcut: 'Alt+R',
      permissionKey: 'CAN_VIEW_PROFITABILITY',
    },
    {
      id: 'users',
      label: 'Staff & Roles',
      icon: UserCog,
      shortcut: 'Alt+U',
      permissionKey: 'CAN_MANAGE_USERS',
    },
    {
      id: 'settings',
      label: 'Settings & Backups',
      icon: Settings,
      shortcut: 'Alt+T',
      permissionKey: 'CAN_EDIT_SETTINGS',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity duration-200"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-60 bg-neutral-950 text-neutral-300 flex flex-col h-screen border-r border-neutral-800/80 select-none shrink-0 transition-transform duration-200 ease-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-700/80 flex items-center justify-center text-neutral-100 shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-semibold text-xs tracking-tight text-neutral-100 leading-tight">
                KitabuPOS
              </h1>
              <span className="text-[10px] text-neutral-500 font-normal">
                Bookshop System
              </span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Offline Status */}
        <div className="px-3 pt-3 pb-1">
          <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900/60 border border-neutral-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
              <span className="font-medium text-neutral-300">Offline SQLite</span>
            </div>
            <span className="font-mono text-[9px] text-neutral-500 uppercase">
              Local DB
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            if (item.permissionKey && !hasPermission(role, item.permissionKey)) {
              return null;
            }

            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-120 tactile-btn ${
                  isActive
                    ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                    : 'text-neutral-400 hover:bg-neutral-900/90 hover:text-neutral-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : 'text-neutral-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-medium px-1.5 py-0.2 rounded">
                      {item.badge}
                    </span>
                  )}
                  <kbd
                    className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                      isActive
                        ? 'bg-neutral-700/60 border-neutral-600/50 text-neutral-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {item.shortcut}
                  </kbd>
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Session Footer */}
        <div className="p-3 border-t border-neutral-800/80 bg-neutral-950">
          <div className="p-2 rounded-lg bg-neutral-900/70 border border-neutral-800/60 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-200 truncate max-w-[120px]">
                {currentUser?.full_name || 'Staff User'}
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                {role}
              </span>
            </div>
            <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
              @{currentUser?.username || 'user'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onLock}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs transition-colors tactile-btn"
              title="Lock screen immediately"
            >
              <Lock className="w-3.5 h-3.5 text-neutral-400" />
              <span>Lock</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs transition-colors tactile-btn"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
