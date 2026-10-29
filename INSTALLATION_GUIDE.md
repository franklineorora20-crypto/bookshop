# KitabuPOS Windows Desktop Installation Guide

KitabuPOS is a standalone, offline-first bookshop management and Point-of-Sale (POS) system designed for retail academic bookshops, educational suppliers, and school bookstores in Kenya.

---

## 1. System Requirements

### Hardware Requirements
- **Operating System**: Windows 10 (64-bit) or Windows 11 (64-bit).
- **Processor**: Intel Core i3 (or AMD equivalent) 2.0 GHz or higher.
- **RAM**: 4 GB minimum (8 GB recommended for stores with > 20,000 titles).
- **Storage**: At least 500 MB of free storage space (SSD recommended).
- **Display**: 1366 × 768 minimum resolution (1920 × 1080 recommended).
- **Peripherals**:
  - USB Barcode Scanner (Plug-and-Play HID keyboard emulation).
  - 80mm or 58mm ESC/POS Thermal Receipt Printer (USB or network).
  - USB Flash Drive (for automated external backups).

### Software Requirements
- No internet access required after installation.
- Embedded SQLite engine—no external database servers (MySQL, PostgreSQL, or SQL Server) required.
- Node.js 20+ (if compiling from source code).

---

## 2. Windows Installer Deployment

### Method A: Running the Packaged Windows Setup (`.exe`)
1. Obtain the installer executable (`KitabuPOS-Setup-${version}.exe`).
2. Double-click the installer.
3. If Windows SmartScreen displays a prompt ("Windows protected your PC"), click **More info** and select **Run anyway**.
4. The NSIS installer guides you through setup:
   - Select installation directory (defaults to `C:\Program Files\KitabuPOS` or `%LOCALAPPDATA%\Programs\KitabuPOS`).
   - Leave the option checked to **Create a Desktop Shortcut**.
   - Check **Create a Start Menu Shortcut**.
5. Click **Install**.
6. When installation finishes, leave **Run KitabuPOS** checked and click **Finish**.
7. Note: The installer does not delete user data on uninstall (`deleteAppDataOnUninstall = false`) to protect business records.

### Method B: Portable Folder / Unpacked Directory
1. Copy the `release/win-unpacked` folder to the target machine (e.g. `C:\KitabuPOS`).
2. Right-click `KitabuPOS.exe` and select **Send to -> Desktop (create shortcut)**.
3. Double-click the shortcut to launch the application.

---

## 3. Database Location & Data Architecture

To ensure application updates and reinstalls never overwrite client business records:
- **Application Files**: Installed under `C:\Program Files\KitabuPOS`.
- **Database Storage**: Currently persisted in browser-isolated IndexedDB storage within the application renderer, architected for future migration to main-process SQLite.
- **Automatic Backups**: Verified `.sqlite` database backups are saved to:
  ```
  %APPDATA%\KitabuPOS\Backups
  ```
  Rotated automatically to retain 14 daily and 8 weekly backup files.
- **Secondary Backup Location**: In Settings -> Database Backup, an external path (such as a USB flash drive `D:\Backups`) can be chosen to mirror every verified backup.

---

## 4. First-Time Setup Wizard Walkthrough

When KitabuPOS is launched for the first time, it automatically displays the **Client Setup Wizard**:

1. **Step 1: Store Identity**
   - Enter your official Bookshop Business Name and Tagline.
   - Upload your Bookshop logo (PNG/JPG up to 500 KB) for thermal receipts.
2. **Step 2: Location & Contact**
   - Enter your Phone Number, Email, Physical Street Address, and County/Town.
3. **Step 3: Currency & Payments**
   - Currency defaults to `KES` (Kenyan Shillings).
   - Configure VAT rate (0% for academic school books, 16% for commercial stationery).
   - Enter your M-Pesa Buy Goods Till Number or Paybill Number.
4. **Step 4: Receipt & Stock Limits**
   - Set receipt numbering prefix (default: `RCP`).
   - Set receipt footer terms and return policy.
   - Set default low-stock alert threshold (default: 5 units).
5. **Step 5: Administrator Account**
   - Enter the Administrator's Full Name and Username.
   - Enter a secure password (**minimum 8 characters**) and confirm it.
   - Set an optional 4-6 digit quick unlock PIN (repeated digits like `1111` or sequential digits like `1234` are rejected).
   - All credentials are encrypted using bcrypt (cost factor 10).
6. **Step 6: Backup Preferences**
   - Select backup frequency (`daily`, `weekly`, or `manual`).
   - Optionally choose a secondary backup destination folder (e.g. USB flash drive).
   - Complete setup and proceed to Store Dashboard.

---

## 5. Security & Overdue Backup Protection

- **Brute-Force Lockout**: 5 consecutive failed login or PIN unlock attempts result in an automated 5-minute lockout (duration doubles on repeated lockouts). The lockout state is persisted in the database.
- **Overdue Backup Banner**: If no verified backup has been completed within 2 days (daily schedule) or 8 days (weekly schedule), a persistent banner appears at the top of the till prompting staff to back up immediately.
