# KitabuPOS Operator & User Manual

Welcome to **KitabuPOS**, an offline bookshop management system engineered for high-speed counter sales, accurate inventory tracking, publisher deliveries, operational expenses, and financial profitability reporting.

---

## 1. Daily Workflow Summary

```
[Morning Opening]
  1. Login with Staff credentials (Administrator, Store Manager, or Cashier).
  2. Review any persistent warning banners (e.g. Overdue Database Backup).
  3. Review low-stock alerts on Store Dashboard.
  4. Verify thermal receipt printer paper roll.

[During Operating Hours]
  1. Point of Sale (POS): Scan barcode or search title -> Enter payment -> Print Receipt.
  2. Deliveries: Go to Purchases -> Enter Goods Received Note (GRN) -> Inventory auto-increments.
  3. Stock Adjustments: Log damages, returns, or stock corrections with audit notes.
  4. Operating Expenses: Record petty cash, rent, transport, or casual labor expenses.

[Evening Close of Day]
  1. Review Financial Reports -> Daily Cash Up Report and Sales Ledger.
  2. Database Backup: Backups occur automatically to <userData>/Backups.
  3. If using an external USB drive, plug it in to mirror the verified backup.
```

---

## 2. Navigation & Keyboard Shortcuts

| Shortcut | Screen | Required Permission | Description |
|---|---|---|---|
| **F2** | Point of Sale (POS) | Cashier, Manager, Admin | Jump straight to the sales cash register |
| **Alt + D** | Store Dashboard | Manager, Admin | High-level metrics, revenue, inventory valuation |
| **Alt + I** | Inventory | Manager, Admin | Catalog, book registration, stock adjustments |
| **Alt + S** | Purchases & Deliveries | Manager, Admin | Goods Received Notes, publisher invoices |
| **Alt + E** | Shop Expenses | Manager, Admin | Operational expense recording |
| **Alt + R** | Financial Reports | Manager, Admin | Profit & Loss, sales ledger, bestsellers, void audits |
| **Alt + U** | Staff & Roles | Admin only | User account creation and role permissions |
| **Alt + T** | Settings & Backups | Admin only | Shop details, receipt headers, SQLite backup & rotation |

*Note: Cashier accounts are restricted strictly to the POS register (F2). Shortcuts to managerial views are gated and inaccessible to cashiers.*

---

## 3. Core Modules Guide

### A. Point of Sale (POS Register)
1. **Adding Items to Cart**:
   - **Barcode / ISBN Scanner**: Aim scanner at the book's barcode. Item is detected and added to the cart instantly.
   - **Manual Search**: Type title, author, or ISBN into the search bar. Click the book card or press Enter.
   - **Catalog Browser**: Filter by category (e.g. KCSE Set Books, CBC Primary, Dictionaries, Stationery).
2. **Cart Quantities & Line Discounts**:
   - Use the `+` and `−` buttons to adjust units. Stock limits are enforced in real time (cannot sell more than physical stock).
   - Cashiers have an enforced maximum discount percentage (default: 10%). Any discount exceeding this limit is rejected by the database transaction.
3. **Checkout & Payment Options**:
   - Click **Proceed to Payment**.
   - **Cash Sale**: Type amount tendered or click quick-cash buttons. Change due is calculated automatically (change is only allowed on cash overpayments).
   - **M-Pesa Sale**: Enter the customer's 10-character alphanumeric transaction reference (e.g., `SHG892KLO1`). The database rejects duplicate or malformed codes.
   - **Split Payment**: Enter broken-down cash, M-Pesa, or card amounts.
4. **Thermal Receipt Printing**:
   - The database commits the sale and flushes persistence before presenting the receipt modal.
   - Click **Print Receipt** (or press Enter) to send to your 80mm/58mm thermal printer.

### B. Book Inventory Management
1. **Adding a New Book**:
   - Click **Inventory** -> **Add New Book**.
   - Required fields: **Title**, **Author**, **Publisher**, **Selling Price**.
   - Optional fields: **ISBN**, **Barcode**, **Edition**, **Cost Price**, **Initial Opening Stock**, **Reorder Level**.
2. **Bulk CSV Inventory Import**:
   - Click **Import CSV** and use `kitabupos_inventory_template.csv`.
   - Preview validated rows and detect duplicates before committing.
3. **CSV Inventory Export**:
   - Export full inventory for stocktaking. Purchase cost prices are automatically masked when exported by Cashier accounts.
4. **Stock Adjustments & Write-Offs**:
   - Locate the book in Inventory -> Click **Adjust**.
   - Choose adjustment type: `damage`, `adjustment`, `customer_return`, or `purchase_return`.
   - Enter quantity change (+ or −) and reason note. Recorded in the immutable audit trail.

### C. Publisher Purchases & Goods Received Notes (GRN)
1. Register publishers or suppliers in the **Suppliers** section.
2. In **Purchases**, click **Receive New Delivery (GRN)**.
3. Select Supplier and enter their Invoice / Delivery Note number.
4. Add received books with quantities and unit purchase costs.
5. Save delivery to atomically increment inventory and update latest unit costs.

### D. Store Operating Expenses
1. Click **Expenses** -> **Record New Expense**.
2. Select category (Rent, Electricity & Water, Salaries & Casuals, Transport, Packaging Bags, Licenses, Maintenance).
3. Enter amount (KES), date, and description. Automatically factored into Net Operating Profit.

### E. Financial Reports & Analytics
- **Profit & Loss**: Operating Revenue (excluding VAT), Cost of Goods Sold (COGS), Gross Profit, Operating Expenses, and Net Operating Profit.
- **Cash Up Report**: Daily reconciliation of cash, M-Pesa, card, voids, and cash expenses for end-of-shift balancing.
- **Nairobi Date Filtering**: All financial summaries filter dates according to East Africa Time (`UTC+3`).

### F. Staff Accounts & Security
- **Administrator**: Full system access, staff management, store settings, and database disaster recovery.
- **Store Manager**: Full inventory management, purchasing deliveries, operational expenses, reports, and sales voids. Cannot manage staff accounts or wipe store data.
- **Cashier**: Restricted strictly to POS sales. Cannot view wholesale purchase costs, profit margins, reports, or administrative settings.
- **5-Failure Lockout Protection**: 5 consecutive incorrect password or PIN unlock attempts lock the account for 5 minutes (doubling on repeated lockout events). Lockout state is persisted in the database.
- **Inactivity Auto-Lock**: Screen locks after the configured timeout (default: 15 minutes) to protect unattended tills.

### G. Backup & Disaster Recovery
- **Automatic Backups**: The system writes verified `.sqlite` snapshots to `<userData>/Backups` with automatic rotation (keeps 14 daily + 8 weekly files).
- **Secondary Backup Folder**: An external folder (such as a USB flash drive) can be selected in Settings to mirror all backups automatically.
- **Persistent Overdue Banner**: A warning banner appears at the top of the till if no verified backup has completed within 2 days (daily schedule) or 8 days (weekly schedule). Click **Back Up Now** to trigger an immediate verified snapshot.
- **Integrity Verification**: Candidates must pass `PRAGMA integrity_check` before any restore, clean, or migration.
