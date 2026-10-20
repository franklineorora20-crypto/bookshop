# KitabuPOS Operator & User Manual

Welcome to **KitabuPOS**, an offline bookshop management system engineered for high-speed counter sales, accurate inventory tracking, publisher deliveries, and financial profitability reporting.

---

## 1. Daily Workflow Summary

```
[Morning Opening]
  1. Login with Cashier or Manager credentials.
  2. Review low-stock alerts on Store Dashboard.
  3. Verify receipt printer paper roll.

[During Operating Hours]
  1. Point of Sale (POS): Scan barcode or search title -> Tender Cash / M-Pesa -> Print Receipt.
  2. Deliveries: Go to Purchases -> Enter Goods Received Note (GRN) -> Inventory auto-increments.
  3. Adjustments: Log damages, returns, or write-offs with audit notes.
  4. Operating Expenses: Record petty cash, rent, transport, or casual labor expenses.

[Evening Close of Day]
  1. Review Financial Reports -> Daily P&L and Sales Ledger.
  2. Settings & Backups -> Click "Download .sqlite Database Backup".
  3. Copy the backup file to a designated external USB flash drive.
```

---

## 2. Navigation & Keyboard Shortcuts

| Shortcut | Screen | Description |
|---|---|---|
| **F2** | Point of Sale (POS) | Jump straight to the sales cash register |
| **Alt + D** | Store Dashboard | High-level metrics, revenue, inventory valuation |
| **Alt + I** | Inventory | Catalog, book registration, stock adjustments |
| **Alt + S** | Purchases & Deliveries | Goods Received Notes, publisher invoices |
| **Alt + E** | Shop Expenses | Operational expense recording |
| **Alt + R** | Financial Reports | Profit & Loss, sales ledger, bestsellers, void audits |
| **Alt + U** | Staff & Roles | User account creation and role permissions |
| **Alt + T** | Settings & Backups | Shop details, receipt headers, SQLite backup |

---

## 3. Core Modules Guide

### A. Point of Sale (POS Register)
1. **Adding Items to Cart**:
   - **Barcode / ISBN Scanner**: Aim scanner at the book's barcode. Item will be detected and added to the cart instantly.
   - **Manual Search**: Type title, author, or ISBN into the search bar. Click the book card or press Enter.
   - **Catalog Browser**: Filter by category (e.g. KCSE Set Books, CBC Primary, Dictionaries, Stationery).
2. **Adjusting Cart Quantities & Line Discounts**:
   - Use the `+` and `−` buttons to adjust units. Stock limits are enforced in real time (cannot sell more than available physical inventory).
3. **Checkout & Payment Options**:
   - Click **Proceed to Payment**.
   - **Cash Sale**: Type amount tendered or click a quick-cash button (e.g., KES 1,000, KES 2,000, Exact). The change due is calculated automatically.
   - **M-Pesa Sale**: Select M-Pesa tab. Enter the customer's M-Pesa transaction confirmation code (e.g., `SHG892KLO1`).
   - **Split Payment**: Enter partial cash and partial M-Pesa amounts.
4. **Thermal Receipt Printing**:
   - Upon completion, the printable receipt modal pops up with your store logo, receipt number, date, cashier name, itemized lines, and return policy.
   - Click **Print Receipt** (or press Enter).

### B. Book Inventory Management
1. **Adding a New Book Manually**:
   - Click **Inventory** -> **Add New Book**.
   - Required fields: **Title**, **Author**, **Publisher**, **Selling Price**.
   - Optional fields: **ISBN**, **Barcode**, **Edition**, **Cost Price**, **Initial Opening Stock**, **Reorder Level**.
   - Category: Choose from standard bookshop categories or click **+ Custom** to enter a specialized category.
2. **Bulk CSV Inventory Import**:
   - Click **Import CSV**.
   - Click **Download Template (.csv)** to obtain the spreadsheet format.
   - Populate your books in Excel or Google Sheets and save as CSV.
   - Click **Select .csv File** to preview validated rows and detect duplicates.
   - Click **Import Valid Records** to commit to the SQLite database.
3. **Stock Adjustments & Write-Offs**:
   - Locate the book in Inventory -> Click the **Adjust** button.
   - Choose adjustment type:
     - `damage` (Damaged / Soiled copies)
     - `adjustment` (Physical inventory count correction)
     - `customer_return` (Customer return / exchange)
     - `purchase_return` (Return to publisher)
   - Enter quantity change (+ or −) and an explanation note.
   - The adjustment is committed atomically and recorded in the audit trail.

### C. Publisher Purchases & Goods Received Notes (GRN)
1. Register your publisher or supplier in the **Suppliers** tab (Name, Phone, Email).
2. In **Purchases**, click **Receive New Delivery (GRN)**.
3. Select Supplier and enter their Invoice / Delivery Note number.
4. Add the titles delivered with received quantities and invoice unit costs.
5. Enter amount paid (Paid in full, Partial, or Unpaid).
6. Click **Save & Receive Stock**. Inventory counts and cost prices are updated automatically.

### D. Store Operating Expenses
1. Click **Expenses** -> **Record New Expense**.
2. Select category:
   - Rent
   - Electricity & Water
   - Salaries & Casuals
   - Transport & Delivery
   - Packaging & Carrier Bags
   - Licences & County Council Fees
   - Internet & Airtime
   - Maintenance & Repairs
   - Office & Stationery
   - Miscellaneous
3. Enter amount (KES), date, and description.
4. All expenses are deducted from Gross Profit to compute Net Operating Profit.

### E. Financial & Audit Reports
- **Profit & Loss**: Revenue, Cost of Goods Sold (COGS), Gross Profit Margin (%), Operating Expenses, and Net Operating Profit.
- **Sales Journal**: Full chronological transaction history with receipt reprint controls.
- **Top Selling Titles**: Most popular books ranked by quantity sold and revenue generated.
- **Void Audit**: Every voided transaction with cashier details, restocked inventory count, and cancellation rationale.

### F. Staff Accounts & Permissions
- **Admin**: Full access to all modules, settings, user accounts, and database restoration.
- **Store Manager**: Access to POS, Inventory, Purchases, Expenses, and Financial Reports.
- **Cashier**: Access to POS Register only. Restrained from accessing publisher wholesale costs, store profit margins, and user management.
