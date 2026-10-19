import React from 'react';
import {
  BookOpen,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Users,
  ReceiptText,
  BarChart3,
  UserCog,
  Settings,
  Lock,
  LogOut,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../../types/index.ts';
import { hasPermission } from '../../services/auth.ts';

export type NavTab =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'purchases'
  | 'customers'
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
    icon: React.ReactNode;
    shortcut: string;
    badge?: number;
    permissionKey?: 'CAN_MANAGE_INVENTORY' | 'CAN_MANAGE_PURCHASES' | 'CAN_MANAGE_EXPENSES' | 'CAN_VIEW_PROFITABILITY' | 'CAN_MANAGE_USERS' | 'CAN_EDIT_SETTINGS';
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      shortcut: 'Alt+D',
    },
    {
      id: 'pos',
      label: 'Point of Sale (POS)',
      icon: <ShoppingCart className="w-5 h-5 text-emerald-400" />,
      shortcut: 'F2',
    },
    {
      id: 'inventory',
      label: 'Book Inventory',
      icon: <Boxes className="w-5 h-5" />,
      shortcut: 'Alt+I',
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    {
      id: 'purchases',
      label: 'Purchases & Suppliers',
      icon: <Truck className="w-5 h-5" />,
      shortcut: 'Alt+S',
      permissionKey: 'CAN_MANAGE_PURCHASES',
    },
    {
      id: 'customers',
      label: 'Customer Credit',
      icon: <Users className="w-5 h-5" />,
      shortcut: 'Alt+C',
    },
    {
      id: 'expenses',
      label: 'Shop Expenses',
      icon: <ReceiptText className="w-5 h-5" />,
      shortcut: 'Alt+E',
      permissionKey: 'CAN_MANAGE_EXPENSES',
    },
    {
      id: 'reports',
      label: 'Reports & Profits',
      icon: <BarChart3 className="w-5 h-5" />,
      shortcut: 'Alt+R',
      permissionKey: 'CAN_VIEW_PROFITABILITY',
    },
    {
      id: 'users',
      label: 'Staff & Roles',
      icon: <UserCog className="w-5 h-5" />,
      shortcut: 'Alt+U',
      permissionKey: 'CAN_MANAGE_USERS',
    },
    {
      id: 'settings',
      label: 'Settings & Backups',
      icon: <Settings className="w-5 h-5" />,
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden animate-in fade-in"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-200 flex flex-col h-screen border-r border-slate-800 select-none shrink-0 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white leading-tight">KitabuPOS</h1>
              <p className="text-[11px] text-emerald-400 font-medium">Bookshop System</p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

      {/* Offline Status Badge */}
      <div className="mx-3 mt-3 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium text-slate-300">Offline Mode</span>
        </div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
          SQLite OK
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.permissionKey && !hasPermission(role, item.permissionKey)) {
            return null;
          }

          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950/50 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {item.badge !== undefined && (
                  <span className="bg-amber-500 text-slate-950 text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                    {item.badge}
                  </span>
                )}
                <span className={`text-[10px] ${isActive ? 'text-emerald-200' : 'text-slate-500'}`}>
                  {item.shortcut}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Session & Quick Actions */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40 mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-white truncate max-w-[130px]">
              {currentUser?.full_name || 'Staff User'}
            </span>
            <span
              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                role === 'admin'
                  ? 'bg-purple-900/80 text-purple-200 border border-purple-700/40'
                  : role === 'manager'
                  ? 'bg-blue-900/80 text-blue-200 border border-blue-700/40'
                  : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/40'
              }`}
            >
              {role}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">@{currentUser?.username || 'user'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onLock}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Lock screen immediately"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lock</span>
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 text-xs font-medium border border-rose-800/40 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
