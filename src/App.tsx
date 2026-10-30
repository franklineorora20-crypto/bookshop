/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar.tsx';
import { Header } from './components/layout/Header.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { POSView } from './components/pos/POSView.tsx';
import { InventoryView } from './components/inventory/InventoryView.tsx';
import { PurchasesView } from './components/purchases/PurchasesView.tsx';
import { ExpensesView } from './components/expenses/ExpensesView.tsx';
import { ReportsView } from './components/reports/ReportsView.tsx';
import { UsersView } from './components/users/UsersView.tsx';
import { SettingsView } from './components/settings/SettingsView.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { LockScreen } from './components/auth/LockScreen.tsx';
import { ReceiptModal } from './components/pos/ReceiptModal.tsx';
import { OfflineIndicator } from './components/common/OfflineIndicator.tsx';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt.tsx';
import { BackupBanner } from './components/common/BackupBanner.tsx';
import { Book, Sale, ShopSettings, User } from './types/index.ts';
import {
  getDatabase,
  getBooks,
  getDashboardMetrics,
  getShopSettings,
  getLastBackupTimestamp,
  exportDatabaseBinary,
  checkDatabaseIntegrity,
  resetDatabaseToFreshSetup,
} from './db/database.ts';
import { FirstRunWizard } from './components/setup/FirstRunWizard.tsx';
import { getStoredSession, saveSession, hasPermission } from './services/auth.ts';

export default function App() {
  // Authentication & session
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // App navigation
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Shared data state
  const [books, setBooks] = useState<Book[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal receipt preview
  const [previewReceipt, setPreviewReceipt] = useState<Sale | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // Inactivity tracking
  const lastActivityRef = useRef<number>(Date.now());

  // Load all database state
  const refreshAllData = useCallback(async () => {
    try {
      await getDatabase(); // Ensure SQLite database initialized
      const [bList, metrics, settings, backupTime] = await Promise.all([
        getBooks({ includeArchived: false }),
        getDashboardMetrics(),
        getShopSettings(),
        getLastBackupTimestamp(),
      ]);
      setBooks(bList);
      setDashboardMetrics(metrics);
      setShopSettings(settings);
      setLastBackupTime(backupTime);
    } catch (err) {
      console.error('Failed to load database records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setCurrentUser({
        id: session.userId,
        username: session.name,
        full_name: session.name,
        role: session.role,
        is_active: 1,
        created_at: '',
      });
      setIsLocked(session.locked || false);
    }
    refreshAllData();
  }, [refreshAllData]);

  // Gate all view routes by role (cashiers restricted to POS)
  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'cashier' && activeTab !== 'pos') {
      setActiveTab('pos');
    }
  }, [currentUser, activeTab]);

  // Inactivity watchdog
  useEffect(() => {
    if (!currentUser || isLocked) return;

    const timeoutMinutes = shopSettings?.session_timeout_minutes || 15;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const onUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', onUserActivity);
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('click', onUserActivity);

    const checkInterval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        setIsLocked(true);
        saveSession({ userId: currentUser.id, role: currentUser.role, name: currentUser.full_name, locked: true });
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', onUserActivity);
      window.removeEventListener('keydown', onUserActivity);
      window.removeEventListener('click', onUserActivity);
      clearInterval(checkInterval);
    };
  }, [currentUser, isLocked, shopSettings]);

  // Global Keyboard Shortcuts (F2 for POS, gated Alt shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentUser || isLocked) return;

      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.altKey && e.key.toLowerCase() === 'd' && hasPermission(currentUser.role, 'CAN_VIEW_PROFITABILITY')) {
        e.preventDefault();
        setActiveTab('dashboard');
      } else if (e.altKey && e.key.toLowerCase() === 'i' && hasPermission(currentUser.role, 'CAN_MANAGE_INVENTORY')) {
        e.preventDefault();
        setActiveTab('inventory');
      } else if (e.altKey && e.key.toLowerCase() === 's' && hasPermission(currentUser.role, 'CAN_MANAGE_PURCHASES')) {
        e.preventDefault();
        setActiveTab('purchases');
      } else if (e.altKey && e.key.toLowerCase() === 'e' && hasPermission(currentUser.role, 'CAN_MANAGE_EXPENSES')) {
        e.preventDefault();
        setActiveTab('expenses');
      } else if (e.altKey && e.key.toLowerCase() === 'r' && hasPermission(currentUser.role, 'CAN_VIEW_PROFITABILITY')) {
        e.preventDefault();
        setActiveTab('reports');
      } else if (e.altKey && e.key.toLowerCase() === 'u' && hasPermission(currentUser.role, 'CAN_MANAGE_USERS')) {
        e.preventDefault();
        setActiveTab('users');
      } else if (e.altKey && e.key.toLowerCase() === 't' && hasPermission(currentUser.role, 'CAN_EDIT_SETTINGS')) {
        e.preventDefault();
        setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, isLocked]);

  // Handle Logout
  const handleLogout = () => {
    saveSession(null);
    setCurrentUser(null);
    setIsLocked(false);
  };

  // Handle Lock
  const handleLock = () => {
    if (!currentUser) return;
    setIsLocked(true);
    saveSession({ userId: currentUser.id, role: currentUser.role, name: currentUser.full_name, locked: true });
  };

  // Handle Unlock
  const handleUnlock = () => {
    if (!currentUser) return;
    setIsLocked(false);
    lastActivityRef.current = Date.now();
    saveSession({ userId: currentUser.id, role: currentUser.role, name: currentUser.full_name, locked: false });
  };

  // Automated & Manual Backup Handler
  const handleBackupNow = useCallback(async () => {
    try {
      const binary = await exportDatabaseBinary();
      const integrity = await checkDatabaseIntegrity();
      if (!integrity.ok) {
        console.error('Integrity check failed prior to backup:', integrity.message);
        return;
      }
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.writeAutoBackup) {
        await electronAPI.writeAutoBackup(
          binary,
          shopSettings?.backup_folder_path,
          shopSettings?.backup_schedule || 'daily'
        );
      }
      const ts = await getLastBackupTimestamp();
      setLastBackupTime(ts);
    } catch (err) {
      console.error('Automated backup error:', err);
    }
  }, [shopSettings]);

  // Hook Electron IPC events for background backups (quit, startup overdue, hourly)
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    const unbindQuit = electronAPI.onQuitBackupRequested?.(async () => {
      try {
        const binary = await exportDatabaseBinary();
        electronAPI.sendQuitBackupComplete?.(binary);
      } catch {
        electronAPI.sendQuitBackupComplete?.(new Uint8Array(0));
      }
    });

    const unbindCheck = electronAPI.onBackupCheckRequested?.(async () => {
      if (shopSettings?.backup_schedule === 'manual') return;
      const last = await getLastBackupTimestamp();
      const lastMs = last ? new Date(last).getTime() : 0;
      const thresholdHours = shopSettings?.backup_schedule === 'weekly' ? 168 : 24;
      const isDue = Date.now() - lastMs > thresholdHours * 60 * 60 * 1000;
      if (isDue) {
        await handleBackupNow();
      }
    });

    return () => {
      unbindQuit?.();
      unbindCheck?.();
    };
  }, [shopSettings, handleBackupNow]);

  // Factory reset: clear all saved data and open initial setup wizard
  const handleResetAndStartSetup = async () => {
    try {
      setLoading(true);
      await resetDatabaseToFreshSetup();
      setCurrentUser(null);
      setIsLocked(false);
      setIsWizardOpen(false);
      await refreshAllData();
    } catch (err) {
      console.error('Failed to reset database:', err);
    } finally {
      setLoading(false);
    }
  };

  // If first-time run and setup wizard not completed, display wizard first!
  if (!loading && shopSettings && !shopSettings.is_setup_completed) {
    return (
      <FirstRunWizard
        initialSettings={shopSettings}
        onComplete={(adminUser, updatedSettings) => {
          setShopSettings(updatedSettings);
          setCurrentUser(adminUser);
          setIsLocked(false);
          lastActivityRef.current = Date.now();
          saveSession({ userId: adminUser.id, role: adminUser.role, name: adminUser.full_name, locked: false });
          refreshAllData();
        }}
      />
    );
  }

  // If not logged in, show Login Screen
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLocked(false);
          lastActivityRef.current = Date.now();
          saveSession({ userId: user.id, role: user.role, name: user.full_name, locked: false });
        }}
        onResetAndSetup={handleResetAndStartSetup}
      />
    );
  }

  // Titles per active view
  const titles: { [key in NavTab]: { title: string; subtitle: string } } = {
    dashboard: {
      title: 'Store Dashboard',
      subtitle: `${shopSettings?.shop_name || 'Bookshop System'} • Local SQLite Operations`,
    },
    pos: {
      title: 'Point of Sale (POS)',
      subtitle: 'Fast barcode scanning, shopping cart, cash & M-Pesa checkout',
    },
    inventory: {
      title: 'Book Inventory & Stock Levels',
      subtitle: 'Manage titles, authors, categories, retail pricing, and stock movements',
    },
    purchases: {
      title: 'Purchases & Publisher Deliveries',
      subtitle: 'Goods Received Notes (GRN), invoice costs, and publisher balances',
    },
    expenses: {
      title: 'Store Operating Expenses',
      subtitle: 'Rent, utility tokens, salaries, licensing, and carrier bags',
    },
    reports: {
      title: 'Financial & Sales Reports',
      subtitle: 'Profit & Loss, top selling titles, sales ledger, and void audits',
    },
    users: {
      title: 'Staff Accounts & Roles',
      subtitle: 'Administrator and cashier permission controls',
    },
    settings: {
      title: 'Settings, Backup & Data Integrity',
      subtitle: 'Shop details, receipt footer, SQLite integrity checks, and backups',
    },
  };

  const lowStockCount =
    (dashboardMetrics?.lowStockCount || 0) + (dashboardMetrics?.outOfStockCount || 0);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800">
      {/* Persistent Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        currentUser={currentUser}
        onLock={handleLock}
        onLogout={handleLogout}
        lowStockCount={lowStockCount}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          title={titles[activeTab].title}
          subtitle={titles[activeTab].subtitle}
          onNewSaleClick={() => setActiveTab('pos')}
          lastBackupTime={lastBackupTime}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Persistent Overdue Backup Alert Banner */}
        <BackupBanner
          lastBackupTime={lastBackupTime}
          backupSchedule={shopSettings?.backup_schedule || 'daily'}
          onBackupNow={handleBackupNow}
          onOpenSettings={() => setActiveTab('settings')}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              metrics={dashboardMetrics}
              loading={loading}
              onNavigate={setActiveTab}
              onViewReceipt={(sale) => setPreviewReceipt(sale)}
            />
          )}

          {activeTab === 'pos' && (
            <POSView
              books={books}
              settings={shopSettings}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
              onNavigateInventory={() => setActiveTab('inventory')}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              books={books}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesView
              books={books}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              currentUser={currentUser}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              books={books}
              currentUser={currentUser}
              settings={shopSettings}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'users' && <UsersView currentUser={currentUser} />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={shopSettings}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
              onOpenWizard={() => setIsWizardOpen(true)}
              onResetAndSetup={handleResetAndStartSetup}
            />
          )}
        </main>
      </div>

      {/* Rerun Setup Wizard Modal */}
      {isWizardOpen && (
        <FirstRunWizard
          isRerun
          initialSettings={shopSettings}
          onCancel={() => setIsWizardOpen(false)}
          onComplete={(_adminUser, updatedSettings) => {
            setShopSettings(updatedSettings);
            setIsWizardOpen(false);
            refreshAllData();
          }}
        />
      )}

      {/* Printable Receipt Preview Modal */}
      {previewReceipt && (
        <ReceiptModal
          sale={previewReceipt}
          settings={shopSettings}
          onClose={() => setPreviewReceipt(null)}
          onNewSale={() => {
            setPreviewReceipt(null);
            setActiveTab('pos');
          }}
        />
      )}

      {/* Lock Screen Overlay */}
      {isLocked && (
        <LockScreen
          user={currentUser}
          onUnlock={handleUnlock}
          onLogout={handleLogout}
        />
      )}

      {/* Network Connectivity & Offline Indicator */}
      <OfflineIndicator />

      {/* Custom In-App PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
