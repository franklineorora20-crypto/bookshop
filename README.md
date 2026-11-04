# KitabuPOS — Bookshop Management & Point of Sale System

A modern, fast, and reliable retail management system designed specifically for academic bookshops, stationers, and uniform stores in Kenya. KitabuPOS operates 100% locally on your computer with zero reliance on cloud subscriptions or internet connectivity.

**Developed & Maintained by:** [Franklin Eorora](https://github.com/franklineorora20-crypto)  
**Repository:** [franklineorora20-crypto/bookshop](https://github.com/franklineorora20-crypto/bookshop)  
**Contact:** franklineorora20@gmail.com  

---

## 🌟 Key Features

### 💻 100% Local Computer Storage
- **Fully Self-Contained**: All book inventory, daily sales, customer receipts, and expense vouchers are stored directly on your computer's local hard drive.
- **No Cloud Dependencies**: Works uninterrupted during network downtimes or power outages.
- **Data Privacy**: Your customer transactions and wholesale pricing stay strictly confidential on your machine.

### 🛒 High-Speed Counter Point of Sale (POS)
- **Fast Keyboard & Barcode Search**: Press `F2` from anywhere in the app to jump directly into the sales counter. Search by title, author, publisher, ISBN, or scan physical barcodes.
- **Tender Options**:
  - **Cash**: Instant calculation of amount tendered and change due.
  - **Safaricom M-Pesa**: Direct Buy Goods Till and Paybill support with automatic 10-character code verification (e.g., `SKL98X5Z21`) and duplicate entry protection.
  - **Split Tender**: Combine cash and M-Pesa on the same transaction.
- **Printable Thermal Receipts**: Formatted for standard 80mm and 58mm thermal receipt printers with your bookshop name, till number, itemized totals, and exchange policies.
- **Cart Parking**: Park an active customer's basket while another customer is attended to.

### 📚 Kenyan Curriculum Catalog & Inventory Management
- **Pre-configured CBC & KCSE Catalog**: Built-in support for Kenya Literature Bureau (KLB), Longhorn Publishers, Moran, East African Educational Publishers (EAEP), and Oxford University Press.
- **Categories**: CBC Grade 1–9, KCSE Set Books & Guides, Past Papers, Dictionaries, Exercise Books, and General Stationery.
- **Stock Movement Ledger**: Full audit trail recording every inventory change (`sale`, `restock`, `adjustment`, `damage`, `sale_void`).
- **CSV Catalog Import & Export**: Download sample CSV templates, import hundreds of book titles at once, or export inventory for stock taking.
- **Low Stock Alerts**: Configurable reorder threshold alerts directly on the dashboard.

### 📦 Publisher Purchases & Goods Received Notes (GRN)
- Record bulk book shipments directly from publishers and distributors.
- Automatically updates on-hand quantities and calculates invoice cost totals.

### 📊 Financial & Profitability Reports
- **Real-Time Profit & Loss (P&L)**: Live calculations of gross revenue, Cost of Goods Sold (COGS), operating expenses, and net profit margins.
- **Operating Expense Ledger**: Log store expenses including shop rent, KPLC electricity tokens, staff wages, and carrier bags.
- **Sales Breakdown**: Visual split between cash in till and M-Pesa collections.
- **Kenya Timezone Alignment**: Financial ledgers and daily cuts follow Africa/Nairobi timezone conventions (`EAT`, `UTC+3`).

### 🔒 Staff Security & Role-Based Access Control
- **Account Tiers**: Administrator and Cashier roles. Cashiers are restricted to the POS till and cannot view wholesale cost prices or business profit margins.
- **Password Security**: Strong bcrypt password hashing and optional 4–6 digit quick PINs for unlocking counter screens.
- **Automatic Inactivity Lock**: Locks the register screen after a configurable period of inactivity to prevent unauthorized sales.
- **Emergency Recovery Code**: Self-service administrator recovery code generated during first-time setup for secure password resets.

### 💾 Simple PC Backup & Restore
- **Save Store Copy (.pos file)**: Single-click export to save a dated file of all store records to your Documents folder or an external USB flash drive.
- **Restore Store Records**: Effortlessly load store records from a saved file with automatic pre-restore safety snapshots.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 20 or higher)
- [npm](https://www.npmjs.com/) (version 10 or higher)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/franklineorora20-crypto/bookshop.git
   cd bookshop
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Start the local application:**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:3000`.

4. **Run the automated test suite:**
   ```bash
   npm test
   ```
   Verifies all 29 business calculation, CSV parsing, local storage, and security hardening tests.

5. **Build for production:**
   ```bash
   npm run build
   ```

6. **Package Windows Desktop Installer Bundle:**
   ```bash
   npm run package:win
   ```
   Generates the 1-click Windows Installer bundle (`Install-KitabuPOS.cmd`, `Install-KitabuPOS.ps1`, documentation) in `release/KitabuPOS-Windows-Installer`.

---

## 🪟 Windows Desktop Installer Deployment

KitabuPOS is distributed as a native Windows 10 / 11 64-bit desktop application for bookshop till computers:
- **1-Click User Installation**: Run `Install-KitabuPOS.cmd`. Deploys directly into `%LOCALAPPDATA%\Programs\KitabuPOS` without requiring Windows administrator credentials.
- **Shortcuts & Start Menu**: Automatically adds a desktop shortcut ("KitabuPOS Bookshop System") and Start Menu entries.
- **Data Protection**: Store records and automatic 14-day backups remain isolated in `%APPDATA%\KitabuPOS` and are never overwritten by software updates.
- **Portable USB Mode**: Extract the portable archive and double-click `KitabuPOS.exe` to run immediately from any flash drive.
- Detailed step-by-step instructions and hardware specifications are provided in [INSTALLATION_GUIDE.md](INSTALLATION_GUIDE.md).

---

## 🛠️ Technology Architecture

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Dev Server**: [Vite 6](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Local Storage Engine**: Client-side SQLite ([sql.js](https://sql.js.org/) WASM engine) persisted securely via IndexedDB
- **Icons & UI**: [Lucide React](https://lucide.dev/), [Sonner](https://sonner.emilkowal.ski/), [Motion](https://motion.dev/)
- **Typography**: Inter & JetBrains Mono (locally bundled via Fontsource)
- **Audio Feedback**: Web Audio API synthesizer for barcode scanning beeps

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `F2` | Open Point of Sale (POS) Counter |
| `Alt + D` | Store Dashboard |
| `Alt + I` | Inventory & Books Catalog |
| `Alt + S` | Publisher Purchases & GRN |
| `Alt + E` | Store Operating Expenses |
| `Alt + R` | Financial Reports & P&L |
| `Alt + U` | Staff User Accounts |
| `Alt + T` | System & Store Settings |
| `Ctrl + K` / `Cmd + K` | Quick Command Palette |
| `Enter` | Complete Tender & Finalize Sale |

---

## 📄 License & Attribution

Created and maintained by **Franklin Eorora**.  
Available for commercial and academic bookshop deployments in Kenya and East Africa.
