# KitabuPOS - Offline Bookshop Management System

A production-grade, offline-first desktop management system engineered specifically for academic bookshops and stationers in Kenya.

---

## 1. System Overview & Offline-First Architecture

KitabuPOS is designed to operate completely without internet connectivity, external APIs, cloud subscriptions, or remote CDNs:

- **Local SQLite Database**: All books, categories, sales, stock movement audit trails, publisher purchases, operating expenses, and system settings reside in an offline SQLite database.
- **Data Storage Location**: Currently persisted in browser-isolated IndexedDB storage within the application renderer, architected for future migration to main-process SQLite. Automated backups are stored natively on the machine at `<userData>/Backups`.
- **Kenyan Shilling (KES) & Nairobi Time**: Formatted natively for Kenyan commercial standards with Africa/Nairobi timezone conventions (`EAT`, `UTC+3`).
- **M-Pesa Buy Goods & Paybill Ready**: Built-in support for cash, split payment, card, and strict 10-character alphanumeric M-Pesa transaction reference recording with duplicate detection.
- **Hardware Integration**: High-speed USB barcode scanner keyboard wedge input, 80mm/58mm thermal receipt printing, and offline CSV export.
- **Role-Based Security**: Administrator, Store Manager, and Cashier roles protected with bcrypt password hashing (cost factor 10), hashed PINs, and inactivity auto-lock. Cashiers cannot see wholesale cost prices or store profit margins.
- **Brute-Force & Lockout Protection**: Consecutive failed login or PIN unlock attempts trigger a 5-minute lockout after 5 failures, doubling upon repeated violations, persisted in the database.
- **Overdue Backup Banner**: A persistent warning banner alerts staff when the last verified database backup is older than 2 days (on daily schedule) or 8 days (on weekly schedule).

---

## 2. Core Modules

### A. Point of Sale (POS)
- Instant barcode scanner search and real-time stock balance lookup.
- Fast cart management with line item discounts, cashier discount ceiling limits (default: 10%), and cash tender calculations.
- Strict payment methods: **Cash**, **M-Pesa** (validated 10-character alphanumeric code e.g. `SKL98X5Z21`), and **Split Payments**.
- Server-authoritative calculation: all totals, line discounts, and taxes are recalculated and verified in SQLite transactions before committing.
- Thermal 80mm/58mm printable receipt with shop branding, tax PIN/Till, item breakdown, and return policy.
- Immediate database persistence flush after completed sales before displaying receipt.

### B. Book Inventory & Stock Movements
- Complete cataloging: Title, Author, Publisher, Category (KCSE Set Books, CBC Junior School, Primary, Dictionaries, Stationery), Edition, Purchase Price, Selling Price, and Reorder Levels.
- Real-time stock movement ledger tracking every transaction (`sale`, `sale_void`, `purchase`, `damage`, `adjustment`) with staff attribution.
- CSV import with preview, column mapping, and row-level error validation.
- CSV inventory export for audits with automatic cost-price masking for cashier accounts.

### C. Purchases & Suppliers
- Manage publishers (Longhorn, Oxford University Press, KLB, Moran, EAEP, etc.).
- Goods Received Notes (GRN) to update stock atomically on physical delivery.
- Supplier purchase invoices and outstanding balance tracking.

### D. Store Operating Expenses
- Categorized operational expense recording (Rent, KPLC electricity tokens, salaries & casual labor, transport, packaging bags, county licenses).
- Real-time deduction from gross profit for accurate Net Operating Profit calculations.

### E. Financial Reports & Analytics
- **Profit & Loss (P&L)**: Real-time Operating Revenue vs. Cost of Goods Sold (COGS) vs. Store Expenses. All revenue and profit metrics strictly exclude sales tax (VAT).
- Cash Received metrics strictly exclude customer change given.
- Split payments are automatically broken down into cash, M-Pesa, and card buckets.
- All date-filtered queries use Nairobi timezone (`date(created_at, '+3 hours')`).
- Detailed sales ledger, top-selling titles, and voided transaction audit log.

### F. Backup & Data Integrity
- Automated verified SQLite backups written to `<userData>/Backups` with rotation keeping 14 daily and 8 weekly backup files.
- Optional secondary backup directory (e.g., an external USB drive) configured in Settings.
- Automatic backup triggers on app startup if overdue, hourly during operation, and on app quit.
- Compulsory SQLite `PRAGMA integrity_check` verification before any database restore, cleanup, or schema migration; destructive steps abort if verification fails.
- Database reset ("Clean Business Database") requires typed confirmation `DELETE ALL STORE DATA`, retains staff accounts and configuration, and appends an immutable `SYSTEM_CLEAN` entry to `audit_logs`.

---

## 3. Packaging into Windows `.exe` Installer

KitabuPOS includes Electron and Electron-Builder configurations targeted for Windows x64:

### Prerequisites:
- Node.js 20+ and npm

### Build Commands:
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Typecheck and lint
npm run lint

# 4. Generate Windows NSIS Installer (.exe)
npm run build:win
```

The resulting setup executable (`KitabuPOS-Setup-${version}.exe`) will be generated inside the `release/` directory.

### Windows Application Data Paths:
- **Application Binary**: Installed under `C:\Program Files\KitabuPOS`.
- **Database & Backups**: Stored in the user's application data directory (`%APPDATA%\KitabuPOS\Backups`).

---

## 4. Initial Setup & Staff Authentication

KitabuPOS enforces initial configuration through the First-Run Setup Wizard upon first launch:

1. **System Administrator Account**: The user defines the administrator username, full name, secure password (minimum 8 characters), and optional 4-6 digit quick PIN during the first-run wizard.
2. **Staff User Management**: Additional Store Manager and Cashier accounts can be created within **Staff Accounts & Roles** (`Alt + U`) by an Administrator.
3. **No Hardcoded Passwords**: There are no default public credentials in the codebase. All credentials are protected using bcrypt (cost 10).
4. **Session Security**: Session storage contains only `{ userId, role, name, locked }`. Passwords and PIN hashes are never exposed to the client or session storage.

---

## 5. Development & Testing

```bash
# Run local dev server
npm run dev

# Run automated unit and integration tests
npm test

# Typecheck codebase
npm run lint
```
