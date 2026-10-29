# KitabuPOS Backup & Disaster Recovery Guide

Because KitabuPOS operates 100% offline without remote cloud servers, the business owner retains complete custody and sovereignty of all store data. This guide outlines standard operating procedures for safeguarding, backing up, and restoring the bookshop database.

---

## 1. Storage Architecture & Backup Locations

1. **Active Database Storage**:
   - The active database is currently persisted in browser-isolated IndexedDB storage within the application renderer, architected for future migration to main-process SQLite.
2. **Automated Electron Backups**:
   - The desktop system automatically creates verified `.sqlite` snapshots in the operating system application data folder:
     ```
     %APPDATA%\KitabuPOS\Backups\
     ```
   - **Rotation Policy**: Maintains at most **14 daily** and **8 weekly** backup files automatically. Old files exceeding retention limits are pruned.
3. **Secondary Backup Destination**:
   - In **Settings -> Database Backup**, an administrator can choose an optional secondary directory (e.g. an external USB flash drive `D:\KitabuPOS_Backups`). Every automated and manual backup is mirrored to this folder.
4. **Trigger Intervals**:
   - **On Application Startup**: Checks if the last backup is overdue and takes a snapshot immediately.
   - **Hourly While Running**: Takes background snapshots according to the configured schedule (`daily` or `weekly`).
   - **On Application Quit**: Triggers an emergency snapshot before closing the window.

---

## 2. Overdue Backup Warning Banner

To protect stores against forgotten backups:
- If `backup_schedule = 'daily'` and no verified backup has been completed within **2 days**, a persistent amber banner displays at the top of the till.
- If `backup_schedule = 'weekly'` and no verified backup has been completed within **8 days**, the banner displays.
- Clicking **Back Up Now** on the banner executes an immediate verified snapshot, writes it to disk, and dismisses the alert.

---

## 3. Mandatory Binary Verification

KitabuPOS enforces pre-execution verification on all database binary operations:
- Every candidate backup must pass SQLite `PRAGMA integrity_check` before any restore, clean, or schema migration is permitted.
- If the binary fails the integrity check or is corrupted, the operation is **aborted immediately** without altering active records.
- Pre-restore and pre-cleanup safety copies are stored in IndexedDB (never localStorage).

---

## 4. Manual Backup & JSON Export

### Download Direct SQLite Binary:
1. Log into KitabuPOS as an **Administrator** or **Store Manager**.
2. Navigate to **Settings & Backups** (`Alt + T`) -> **Database Backup & Integrity**.
3. Click **Run Verified Backup Now** or **Download SQLite .db File**.
4. The verified `.sqlite` file is saved to your computer.

### Export Readable JSON Ledger:
Click **Export JSON Data** to generate a human-readable snapshot of all books, sales, purchases, expenses, and settings for spreadsheet reporting or external auditing.

---

## 5. Database Restoration & Recovery

In the event of a computer failure or accidental data loss:
1. Open KitabuPOS and log in with Administrator credentials.
2. Navigate to **Settings & Backups** -> **Database Backup & Integrity**.
3. Under "Restore Database from Backup File", click **Choose .sqlite Backup File**.
4. Select the `.sqlite` backup file from your computer or USB drive.
5. KitabuPOS will:
   - Run `PRAGMA integrity_check` on the backup file. If invalid, restoration is rejected.
   - Verify that required core tables (`books`, `sales`, `users`) exist.
   - Save an emergency pre-restore safety snapshot of current records in IndexedDB.
   - Swap the active SQLite database instance and enable foreign key enforcement (`PRAGMA foreign_keys = ON;`).
   - Log an immutable `DATABASE_RESTORE` entry in the system audit trail.
6. A success notification will confirm the restoration.

---

## 6. Cleaning Business Data for Production Handover

To clear test or onboarding transactions prior to real-world sales:
1. Navigate to **Settings & Backups** -> **Data & Maintenance**.
2. Locate **Clean Business Database (Reset Store Data)** and click the button.
3. Type the exact confirmation string: **`DELETE ALL STORE DATA`**.
4. KitabuPOS will:
   - Create a verified pre-cleanup safety snapshot in IndexedDB.
   - Atomically wipe transactional data (sales, order items, purchases, book stock movements, expenses).
   - **Safely preserve** administrator/staff accounts, store settings, and the audit log.
   - Append an immutable `SYSTEM_CLEAN` entry to `audit_logs`.
