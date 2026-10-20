# KitabuPOS Client Deployment Checklist

This checklist must be reviewed and executed by the deployment engineer prior to handing over KitabuPOS to the client.

---

## 1. Pre-Deployment Data Sanitization Audit
- [x] **No Demonstration Data**: Verify the database contains zero demo books, zero fabricated sales, zero mock suppliers, and zero fake expenses.
- [x] **Clean Initial Seeding**: Verify `seed.ts` does not pre-populate fictional business names (e.g. "My Bookshop & Stationers"), fake addresses, or sample phone numbers.
- [x] **Real-Time Financial Calculation**: Verify that all metrics on the Dashboard, Reports, and Inventory views aggregate strictly from active SQL rows and evaluate to 0 in an empty store.
- [x] **Credit Module Completely Removed**: Verify there are no customer credit tables (`customers`, `credit_payments`), no credit transaction routes, no credit limit indicators, and no credit buttons anywhere in the system.
- [x] **Zero Telemetry & External Logs**: Ensure the app operates strictly locally with zero external network requests or logging.

---

## 2. First-Run Client Setup Wizard Verification
- [x] **Launch Detection**: On a fresh installation, verify the First-Run Setup Wizard launches automatically before the normal login prompt.
- [x] **Store Branding**: Ensure the client can enter their official bookshop name, upload their store logo (encoded and stored offline in SQLite), and set a tagline.
- [x] **Location & Contact**: Validate telephone number, business email, street address, and county inputs.
- [x] **Currency & VAT**: Verify currency selection (defaults to `KES`) and VAT percentage (0% for zero-rated academic books, 16% for commercial stationery).
- [x] **Payment Methods**: Confirm Cash is active and M-Pesa Till / Paybill numbers can be recorded and printed on receipts.
- [x] **Receipt Prefix & Policies**: Verify receipt prefix (e.g., `RCP`) and return policy footer message.
- [x] **Administrator Account**: Require the client to set their real administrator name, username, and secure password (minimum 6 characters), with an optional 4-digit unlock PIN.
- [x] **One-Time Wizard Flow**: Once completed, the flag `is_setup_completed = 'true'` is saved to `shop_settings`. The client will never be forced to repeat the wizard, but an authorized administrator can access "Store Setup Wizard" or "Store Profile" at any time in the Settings view.

---

## 3. Core Functional Operations Testing
- [x] **Manual Book Registration**: Successfully create a book record with Title, ISBN, Author, Publisher, Category (standard or custom), Selling Price, Purchase Price, Quantity, and Reorder Level.
- [x] **CSV Inventory Import**: Validate CSV import with duplicate ISBN checking, validation preview, and the downloadable `KitabuPOS_Inventory_Template.csv`.
- [x] **Supplier & Purchase Orders**: Record Goods Received Notes (GRN) with supplier details, invoice number, unit cost updates, and automatic stock increment.
- [x] **Point of Sale (POS)**: Test barcode scanning, manual search, quick-add, cart calculation, cash tender with change calculation, and manual M-Pesa code recording.
- [x] **Stock Deduction**: Verify atomic inventory reduction upon completing a sale.
- [x] **Thermal Receipt Printing**: Verify standard 80mm / 58mm thermal receipt layout with store logo, business details, sequential receipt numbering, tax lines, and footer.
- [x] **Sale Voiding**: Verify that authorized managers/admins can void a receipt with a stated reason, which immediately restocks the books into inventory and logs an immutable audit event.
- [x] **Operating Expenses**: Verify adding operational expenses (Rent, Electricity, Casuals, Licences) with date, amount, and category.
- [x] **Role-Based Access Control**:
  - `admin`: Full access (Users, Database, Settings, Financials).
  - `manager`: Inventory, Purchases, Expenses, Reports, POS.
  - `cashier`: POS Register only (no access to purchasing costs, profit margins, user management, or raw database backups).

---

## 4. Offline Environment & Disaster Recovery
- [x] **Zero Internet Dependency**: Disconnect internet / Wi-Fi adapter. Launch the application and perform a sale, inventory update, and report generation. Ensure no errors occur.
- [x] **Automated Data Persistence**: Verify data persists across app closures via WebAssembly SQLite and local disk/IndexedDB.
- [x] **Manual Backup Download**: Click "Download .sqlite Database Backup" in Settings. Verify that a valid `.sqlite` binary downloads with accurate timestamp.
- [x] **Human-Readable JSON Export**: Click "Export Readable JSON" to generate an auditable ledger snapshot.
- [x] **Restore Testing**: Test restoring the SQLite backup file and confirm `PRAGMA integrity_check` passes with status `ok`.
- [x] **Pre-Restore Safety Snapshot**: Ensure the system creates an automatic emergency backup in browser storage before executing any database restore or wipe.

---

## 5. Client Handover Sign-Off
- **Client Name**: ____________________________________________
- **Bookshop Name**: __________________________________________
- **Deployment Engineer**: ____________________________________
- **Date**: ________________________ **Sign-off**: ____________
