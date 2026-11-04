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
- Node.js is not required to install or run the packaged application (only needed to build from source).
- The supplied Windows installer supports 64-bit Windows 10 and Windows 11 on Intel/AMD processors. It is not an ARM64 installer.

---

## 2. Windows Installer Deployment

### Method A: Per-user installation (recommended)
1. Copy `release/KitabuPOS-Windows-x64-Install.zip` to the Windows 10/11 64-bit computer. It can be copied by USB; internet access is not needed.
2. Extract the archive, then double-click `Install-KitabuPOS.cmd`. It installs to `%LOCALAPPDATA%\Programs\KitabuPOS` without administrator permission and creates Desktop and Start Menu shortcuts.
3. If Windows SmartScreen warns about an unrecognized publisher, continue only if you trust where you obtained the package. This build is not code-signed.
4. To choose another install folder, run `Install-KitabuPOS.cmd -InstallDirectory "D:\Apps\KitabuPOS"`. To launch immediately after installing, add `-Launch`.

To update an existing installation, close KitabuPOS and run the installer again for the same Windows account. Back up business data before updating. The installer only copies application files; it does not delete or replace the separate application data directory. Existing app data remains if you later remove the program folder or shortcuts.

### Method B: Portable Folder / Unpacked Directory
1. Copy `KitabuPOS-Portable-x64.zip` to the target Windows 10/11 64-bit computer and extract it to a writable folder (for example, `C:\KitabuPOS`).
2. Run `KitabuPOS.exe` from the extracted folder. Create a shortcut if you want quick access.

This option needs no installer or administrator permission. Keep the entire extracted folder together.

### Method C: Enterprise Silent & Multi-Till Deployment (PowerShell & Batch)
For academic institutions, multi-register bookstores, or school computer rooms:
1. **Silent / Background Installation**:
   ```cmd
   Install-KitabuPOS.cmd -InstallDirectory "C:\KitabuPOS" -NoShortcuts
   ```
2. **Immediate Auto-Launch after Deployment**:
   ```cmd
   Install-KitabuPOS.cmd -Launch
   ```
3. **PowerShell Direct Execution**:
   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Install-KitabuPOS.ps1 -InstallDirectory "$env:LOCALAPPDATA\Programs\KitabuPOS" -Launch
   ```

### Build and Check the Installer (developer)
From the project directory:
- Run `npm run package:win` to compile and stage the full Windows installer bundle at `release/KitabuPOS-Windows-Installer`.
- Run `npm run package:win:portable` (on Windows systems with PowerShell) to build `release/KitabuPOS-Windows-x64-Install.zip`.
- Run `npm run build:win` to generate the standard NSIS executable setup (`KitabuPOS-Setup-1.0.0.exe`).
- Run `npm test`, `npm run lint`, and `npm run smoke` to verify all business rules, database integrity, and packaged runtime rendering before distribution.

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
