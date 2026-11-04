# KitabuPOS

Offline-first bookshop point-of-sale and inventory management for Windows. Store data and backups remain on the computer.

## Install

Run `KitabuPOS-Setup-<version>.exe` and follow the prompts. The per-user installer creates Start Menu and desktop shortcuts and registers an uninstaller. For silent installation, run the setup with `/S`. Uninstalling keeps business data and backups.

## Build the Windows installer

On Windows with Node.js 20+ and npm 10+, run:

```powershell
npm run build:win
```

The script installs locked dependencies, builds the app, and writes `release/KitabuPOS-Setup-<version>.exe`. To Authenticode-sign it, provide `KITABUPOS_SIGNING_CERT_PATH` and `KITABUPOS_SIGNING_CERT_PASSWORD` as environment variables. Without a signing certificate, the installer is unsigned and may trigger a SmartScreen warning. The app requires no additional certificates or internet access to run.
