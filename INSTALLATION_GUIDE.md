# KitabuPOS Windows Desktop Installation Guide

KitabuPOS is a standalone, offline-first bookshop management and Point-of-Sale (POS) system designed for retail bookshops, educational suppliers, and school bookstores.

---

## 1. System Requirements

### Hardware Requirements
- **Operating System**: Windows 10 (64-bit) or Windows 11 (64-bit).
- **Processor**: Intel Core i3 (or AMD equivalent) 2.0 GHz or higher.
- **RAM**: 4 GB minimum (8 GB recommended for stores with > 20,000 titles).
- **Storage**: At least 500 MB of free hard drive space (SSD recommended).
- **Display**: 1366 × 768 minimum resolution (1920 × 1080 recommended).
- **Peripherals**:
  - USB or Wireless Barcode Scanner (Plug-and-Play HID keyboard emulation).
  - 80mm or 58mm ESC/POS Thermal Receipt Printer (USB or network).
  - USB Flash Drive (for daily offline backups).

### Software Requirements
- No internet access required after installation.
- No external database server (MySQL, PostgreSQL, or SQL Server) required. SQLite is embedded directly into the application.

---

## 2. Windows Installer Deployment

### Method A: Running the Packaged Windows Setup (`.exe`)
1. Download or copy the installer executable (`KitabuPOS-Setup-1.0.0.exe`) to the target computer or desktop.
2. Double-click `KitabuPOS-Setup-1.0.0.exe`.
3. If Windows SmartScreen displays a prompt ("Windows protected your PC"), click **More info** and select **Run anyway**.
4. The NSIS installer will guide you through the setup:
   - Select installation directory (defaults to `C:\Program Files\KitabuPOS` or `%LOCALAPPDATA%\Programs\KitabuPOS`).
   - Check the box to **Create a Desktop Shortcut**.
   - Check the box to **Create a Start Menu Shortcut**.
5. Click **Install**.
6. When the installation finishes, check **Run KitabuPOS** and click **Finish**.

### Method B: Portable Folder / Unpacked Directory
If running from a USB drive or direct folder:
1. Copy the `release/win-unpacked` folder to the target machine (e.g. `C:\KitabuPOS`).
2. Right-click `KitabuPOS.exe` and select **Send to -> Desktop (create shortcut)**.
3. Double-click the desktop shortcut to launch the application.

---

## 3. Database Location & Data Isolation
To ensure application updates and reinstalls never overwrite client business records, KitabuPOS maintains an isolated database path:
- **Application Files**: Installed under `C:\Program Files\KitabuPOS`.
- **Client SQLite Database**: Stored in the user's secure application profile:
  ```
  %APPDATA%\KitabuPOS_Data\kitabupos.sqlite
  ```
- **Browser Fallback Engine**: If run within a modern browser, data is mirrored to browser-isolated `IndexedDB (KitabuPOS_DB_Storage)`.

---

## 4. First-Time Setup Wizard Walkthrough
When KitabuPOS is launched for the first time, it automatically displays the **Client Setup Wizard**:

1. **Step 1: Store Identity**
   - Enter your official Bookshop Business Name.
   - Enter your Tagline / Motto.
   - Upload your Bookshop logo (PNG/JPG up to 1MB).
2. **Step 2: Location & Contact**
   - Enter your Telephone Number, Email Address, Physical Street Address, and County/Town.
3. **Step 3: Currency & Payments**
   - Currency defaults to `KES` (Kenyan Shillings).
   - Configure VAT rate (0% for academic school books, 16% for general stationery).
   - Enter your M-Pesa Buy Goods Till Number or Paybill Number (printed on receipts).
4. **Step 4: Receipt & Stock Limits**
   - Set receipt numbering prefix (default: `RCP`).
   - Set receipt footer terms and return policy.
   - Set default low-stock alert threshold (default: 5 units).
5. **Step 5: Administrator Account**
   - Enter the Administrator's Full Name and Username.
   - Enter a secure password (minimum 6 characters) and confirm it.
   - Set an optional 4-digit quick unlock PIN.
6. **Step 6: Backup Preferences & Initial Safety File**
   - Select your backup schedule (`daily`, `weekly`, or `manual`).
   - Click **Download Initial SQLite (.sqlite)** to save a reference copy of your clean starting database.
   - Click **Complete Setup & Launch Store**.

---

## 5. Hardware Configuration

### Barcode Scanner Setup
1. Connect the USB barcode scanner to any USB port.
2. Open **Point of Sale (F2)** in KitabuPOS.
3. Scan any book barcode (EAN-13 / ISBN-13). The item will immediately be identified and added to the sales cart.

### Thermal Receipt Printer Setup
1. Install your printer manufacturer's Windows driver (e.g., Epson, Xprinter, Rongta, POS-80).
2. Set the printer as your Windows **Default Printer** or select it in the print dialog.
3. In KitabuPOS, completed sales trigger the thermal receipt preview modal.
4. Click **Print Receipt** (or press Enter). The receipt will print cleanly on 80mm or 58mm roll paper.
