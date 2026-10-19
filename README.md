# KitabuPOS - Offline Bookshop Management System

A production-grade, offline-first desktop management system engineered specifically for small and medium-sized academic bookshops and stationers in Kenya.

---

## 1. System Overview & Offline-First Architecture

KitabuPOS is designed to operate completely without internet connectivity, external APIs, cloud subscriptions, or remote CDNs:

- **Local SQLite Database**: All books, categories, sales, stock movement audit trails, supplier purchases, operating expenses, and customer credit ledgers reside in an offline SQLite database.
- **Kenyan Shilling (KES) & Nairobi Time**: Formatted natively for Kenyan commercial standards with Africa/Nairobi timezone conventions (`EAT`).
- **M-Pesa Buy Goods & Paybill Ready**: Built-in support for cash, split payment, credit sales, and manual 10-character M-Pesa transaction reference recording.
- **Hardware Integration**: High-speed USB barcode scanner keyboard wedge input, thermal receipt formatting, and offline PDF/CSV export.
- **Role-Based Security**: Administrative, manager, and cashier roles protected with bcrypt password hashing, quick PIN session locking, and inactivity auto-lock.

---

## 2. Core Modules

### A. Point of Sale (POS)
- Instant barcode scanner search and real-time stock balance lookup.
- Fast cart management with line item discounts and total order discounts.
- Flexible payment methods: **Cash**, **M-Pesa** (with Till number and transaction code), **Customer Credit**, and **Split Payments**.
- Cash tender calculation with one-click note helpers (`+100`, `+200`, `+500`, `+1,000`, `+2,000`, and `Exact`).
- Thermal 80mm-style printable receipt with shop branding, tax PIN/Till, item breakdown, and return policy.
- Atomic SQLite transactions preventing partial transactions or orphaned stock deductions.

### B. Book Inventory & Stock Movements
- Complete cataloging: Title, Author, Publisher, Category (KCSE Set Books, CBC Junior School, Primary, Dictionaries, Stationery), Edition, Purchase Price, Selling Price, and Reorder Levels.
- Real-time stock movement ledger tracking every transaction (`SALE`, `PURCHASE`, `DAMAGE`, `RETURN`, `ADJUSTMENT`) with staff attribution.
- CSV import with preview, column mapping, and row-level error validation.
- CSV inventory export for audits.

### C. Customer Credit & School Accounts
- Track institutional debtors (e.g. secondary schools, primary academies) and individual debtors (teachers, parents).
- Enforced credit limits and real-time available spending allowance.
- Debt payment processing with receipt tracking and printable customer statements.

### D. Purchases & Suppliers
- Manage publishers (Longhorn, Oxford University Press, KLB, Moran, EAEP, etc.).
- Goods Received Notes (GRN) to update stock atomically on physical delivery.
- Supplier purchase invoices and outstanding balance tracking.

### E. Financial Reports & Profitability
- **Profit & Loss (P&L)**: Real-time Operating Revenue vs. Cost of Goods Sold (COGS) vs. Store Expenses (Rent, KPLC power tokens, casual staff, licensing).
- Excludes uncollected credit sales from cash-collected totals to prevent false profit assumptions.
- Detailed sales ledger, top-selling titles, and voided/refunded transaction audit log.
- Offline printable reports and CSV data export.

### F. Backup & Data Integrity
- One-click SQLite `PRAGMA integrity_check` for page parity diagnostics.
- Binary SQLite file backup (`.sqlite`) downloadable to local flash drives.
- Safe backup restore with automatic pre-restore safety snapshot.
- Full immutable system audit logs.

---

## 3. Packaging into Windows `.exe` Installer

The application includes full Electron and Electron-Builder configuration for building an offline Windows NSIS installer:

### Prerequisites:
- Node.js 18+ and npm

### Build Commands:
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (pure unit tests + SQLite integration tests)
npm test

# 3. Compile client web bundle
npm run build

# 4. Generate Windows NSIS Installer (.exe)
npm run build:win
```

The resulting setup executable (`KitabuPOS-Setup.exe`) will be generated inside the `release/` directory.

### Windows Application Data Paths:
In a packaged Windows installation, the application stores SQLite database files in:
- `%APPDATA%\KitabuPOS\kitabupos.sqlite`

---

## 4. Default Seed Staff Accounts

For testing and initial onboarding, the database initializes with the following default accounts:

| Role | Username | Password | PIN |
|---|---|---|---|
| **System Administrator** | `admin` | `admin123` | `1234` |
| **Store Manager** | `manager` | `manager123` | `5678` |
| **POS Cashier** | `cashier` | `cashier123` | `9999` |

Staff can modify their passwords and settings in the **Staff & Roles** and **Settings** modules.

---

## 5. Development & Testing

```bash
# Run dev server on port 3000
npm run dev

# Run full test suite
npm test

# Typecheck and linting
npm run lint
```
