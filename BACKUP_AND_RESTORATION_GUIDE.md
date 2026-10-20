# KitabuPOS Backup & Disaster Recovery Guide

Because KitabuPOS operates 100% offline without remote cloud servers, the business owner holds complete ownership and custody of all store data. This guide outlines standard operating procedures for safeguarding, backing up, and restoring the bookshop database.

---

## 1. The 3-2-1 Offline Backup Strategy

Bookshops handle essential financial records, tax data, and high-value inventory. We recommend implementing the **3-2-1 rule**:
1. **3 Copies of Data**:
   - The primary active database on the store computer.
   - A daily backup copy on an external USB flash drive.
   - A weekly backup copy stored off-site (or on a manager's secondary laptop/storage).
2. **2 Different Media Types**:
   - Local PC internal solid-state drive (SSD).
   - Removable USB flash drive / external hard disk.
3. **1 Off-Site Location**:
   - Keep a secondary USB drive away from the physical bookstore in case of physical theft, fire, or hardware failure.

---

## 2. Performing a Manual SQLite Database Backup

### Step-by-Step Procedure:
1. Log into KitabuPOS using an **Administrator** or **Store Manager** account.
2. Navigate to **Settings & Backups** (`Alt + T`).
3. Click on the **Database Backup & Integrity** tab.
4. Click **Download .sqlite Database Backup**.
5. Your browser / desktop environment will immediately save the file:
   ```
   KitabuPOS_Backup_YYYY-MM-DDTHH-mm-ss.sqlite
   ```
6. Open your Windows File Explorer (`Win + E`), locate the downloaded file in your `Downloads` folder, and copy it to your plugged-in USB drive.
7. Safely eject the USB drive.

### Optional: Exporting a Readable JSON Ledger
In addition to the raw SQLite database binary, you can click **Export Readable JSON**. This produces a human-readable text document containing all books, sales, purchases, expenses, and settings that can be opened in text editors, Excel, or ingested into accounting software.

---

## 3. Database Restoration & Recovery

In the event of a computer crash, hard drive replacement, or data corruption, follow these steps to restore your records:

### Restoration Steps:
1. Install a clean copy of KitabuPOS on the replacement Windows computer.
2. Open KitabuPOS and log in with your administrative credentials.
3. Go to **Settings & Backups** -> **Database Backup & Integrity**.
4. In the "Restore from SQLite Backup File" section, click **Select .sqlite File to Restore**.
5. Locate and select your backup file (e.g., `KitabuPOS_Backup_2026-10-20.sqlite`) from your USB drive.
6. The system will prompt:
   > *"DANGER: Restoring a database will replace the current active inventory, sales, and accounts with records from the selected backup. A safety pre-restore backup will be created automatically. Do you wish to proceed?"*
7. Click **OK**.
8. KitabuPOS will:
   - Create an internal pre-restore snapshot of the current state.
   - Load the replacement SQLite binary.
   - Execute `PRAGMA integrity_check;` to verify page and index consistency.
   - Refresh all tables, inventory balances, and historical ledgers.
9. A confirmation banner will indicate: *"Database restored successfully."*

---

## 4. Verifying Database Integrity

To ensure the local database file is healthy and free from disk corruption:
1. Go to **Settings & Backups** -> **Database Backup & Integrity**.
2. Under "PRAGMA integrity_check", click **Verify Database Integrity**.
3. The system scans all B-tree structures, foreign key constraints, and database pages.
4. If healthy, the system displays:
   > *"Database integrity check passed (status: ok). No corruption detected."*

---

## 5. Cleaning Demonstration Data for Clean Client Handover

If you configured test records while exploring the application, you can restore the system to a clean production state before commencing real sales:
1. Navigate to **Settings & Backups** -> **Database Backup & Integrity**.
2. Locate the red panel: **Clean Demonstration Data (Client Handover)**.
3. Click **Clear Demo Records...**.
4. Type **`CLEAN`** in the confirmation input and click **Confirm Clean Reset**.
5. The system automatically creates a full emergency backup of the current database before wiping demo books, sales, and expenses, leaving your store settings and administrator credentials intact.
