# KitabuPOS Client Deployment Checklist

This checklist differentiates between features verified by automated test suites (`[x]`) and physical or visual checks requiring manual engineer verification (`[ ]`).

---

## 1. Pre-Deployment Data Sanitization Audit
- [x] **No Demonstration Data**: Automated test `database schema and initialization has zero sample business data` verifies 0 sample books, sales, and expenses.
- [x] **Clean Initial Seeding**: Automated test verifies fresh schema does not populate fictional store records.
- [x] **Real-Time Financial Calculation**: Automated test `A5 [TEST]` verifies profit, COGS, and revenue aggregate strictly from active SQL rows and exclude sales tax.
- [x] **Credit Module Completely Removed**: Automated test `credit module and tables are completely removed from database structure` verifies all customer credit tables and columns are dropped.
- [ ] **Zero Telemetry & External Logs**: Manual audit of network traffic to confirm strictly offline execution.

---

## 2. First-Run Client Setup Wizard Verification
- [ ] **Launch Detection**: Manual test: verify FirstRunWizard modal launches automatically on first boot when `is_setup_completed = 0`.
- [ ] **Store Branding**: Manual test: upload store logo image and verify rendering on thermal receipt canvas.
- [ ] **Location & Contact**: Manual test: populate telephone, address, and county in wizard.
- [x] **Currency & VAT**: Automated test `calculateCartTotals` verifies tax calculation at specified rates.
- [x] **Payment Reference Validation**: Automated test `A4 [TEST]` verifies 10-character alphanumeric M-Pesa references and duplicate code rejection.
- [x] **Receipt Prefix & Policies**: Automated test `processSale` verifies sequential receipt generation with custom prefix.
- [x] **Administrator Account Configuration**: Automated test `A2 [TEST]` verifies administrator username updates and login capability.
- [ ] **One-Time Wizard Flow**: Manual test: verify wizard dismisses permanently after completion.

---

## 3. Core Functional Operations Testing
- [x] **Manual Book Registration & Stock Deduction**: Automated test in `database.test.ts` verifies book cataloging and stock decrement.
- [x] **CSV Inventory Import**: Automated test `parseBooksCSV` in `csv.test.ts` validates row schema, field mapping, and error reporting.
- [ ] **Supplier & Purchase Orders (Physical)**: Manual test: record publisher Goods Received Note (GRN) with physical invoice.
- [x] **Point of Sale (POS) Calculations**: Automated test `calculateCartTotals` and `A4 [TEST]` verify line item totals, discounts, cashier limits, and change due.
- [x] **Stock Deduction**: Automated test verifies atomic inventory reduction inside SQLite transaction.
- [ ] **Thermal Receipt Printing**: Manual hardware test: print sample receipt on physical 80mm/58mm ESC/POS printer.
- [x] **Sale Voiding & Inventory Restock**: Automated test verifies voiding a receipt restocks books and logs an immutable audit event.
- [x] **Operating Expenses**: Automated test verifies expense entry and deduction from Gross Profit.
- [x] **Role-Based Access Control Matrix**: Automated test `A6 [TEST]` verifies cashier rejection on all administrative/managerial mutating functions.
- [x] **Brute-Force Lockout & PIN Security**: Automated test `A3 [TEST]` verifies 5-attempt persistent lockout and ensures password hashes and PINs are never exposed.

---

## 4. Offline Environment & Disaster Recovery
- [ ] **Zero Internet Dependency**: Manual test: disconnect PC network cable / Wi-Fi and verify full POS checkout.
- [ ] **Automated Data Persistence**: Manual test: restart application and confirm all records persist.
- [x] **Manual Backup & Verification**: Automated test `B1/B2 [TEST]` verifies binary export and integrity check.
- [ ] **Human-Readable JSON Export**: Manual test: export JSON data and inspect file contents.
- [x] **Restore Testing (Integrity & Row Preservation)**: Automated test `B1/B2 [TEST]` verifies that valid backup restoration preserves row counts and that corrupted backups are rejected.
- [x] **Pre-Restore Safety Snapshot & Abort**: Automated test `B1/B2 [TEST]` verifies that failed binary check aborts the operation without data loss.
- [x] **PRAGMA Integrity Check**: Automated test `verifyDatabaseBinary` verifies healthy vs. corrupted databases.
- [x] **Non-Destructive v3 Migration**: Automated test `A1 [TEST]` verifies existing manager accounts and sales survive migration with foreign keys clean.
- [x] **Clean Business Database with Typed Confirmation**: Automated test `B1/B2 [TEST]` verifies exact confirmation string `DELETE ALL STORE DATA` is enforced.

---

## 5. Client Handover Sign-Off
- [ ] **Client Name**: ____________________________________________
- [ ] **Bookshop Name**: __________________________________________
- [ ] **Deployment Engineer**: ____________________________________
- [ ] **Date**: ________________________ **Sign-off**: ____________
