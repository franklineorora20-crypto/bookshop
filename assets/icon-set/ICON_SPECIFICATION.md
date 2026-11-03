# Kitabu POS — "Shuka Cover" Production Icon Specification

## Overview
This document specifies the production icon set generated from the master "Shuka cover" vector design for **Kitabu POS** ("Kitabu" means "book" in Swahili). The design depicts a closed book with a Maasai shuka-inspired plaid cover.

---

## 1. Master Design & Palette

### Master Vector (viewBox: `0 0 120 120`)
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="28" fill="#791F1F"/>
  <rect x="28" y="18" width="64" height="84" rx="5" fill="#185FA5"/>
  <rect x="28" y="36" width="64" height="6" fill="#FAEEDA"/>
  <rect x="28" y="52" width="64" height="10" fill="#E24B4A"/>
  <rect x="28" y="72" width="64" height="6" fill="#EF9F27"/>
  <rect x="48" y="18" width="5" height="84" fill="#FAEEDA"/>
  <rect x="70" y="18" width="8" height="84" fill="#E24B4A"/>
  <rect x="28" y="18" width="10" height="84" rx="4" fill="#042C53"/>
</svg>
```

### Color Palette
| Element | Hex Code | RGB | Description |
|---|---|---|---|
| Background | `#791F1F` | `rgb(121, 31, 31)` | Deep rich red |
| Book Cover | `#185FA5` | `rgb(24, 95, 165)` | Classic cobalt blue |
| Book Spine | `#042C53` | `rgb(4, 44, 83)` | Deep navy |
| Stripe 1 (Horiz / Vert) | `#FAEEDA` | `rgb(250, 238, 218)` | Warm cream |
| Stripe 2 (Horiz / Vert) | `#E24B4A` | `rgb(226, 75, 74)` | Vibrant shuka red |
| Stripe 3 (Horiz) | `#EF9F27` | `rgb(239, 159, 39)` | Warm gold |

---

## 2. Deliverables Catalog

### A. Android Assets
1. **Adaptive Icon Background** (`kitabu-icon-android-adaptive-bg.svg`, `kitabu-icon-android-adaptive-bg-108.png`, `kitabu-icon-android-adaptive-bg-432.png`)
   - 108x108 dp canvas
   - Solid `#791F1F` with zero gradient or border
   - Vector drawable: `android/app/src/main/res/drawable/ic_launcher_background.xml`

2. **Adaptive Icon Foreground** (`kitabu-icon-android-adaptive-fg.svg`, `kitabu-icon-android-adaptive-fg-108.png`, `kitabu-icon-android-adaptive-fg-432.png`)
   - 108x108 dp canvas
   - Book centered at `(54, 54)`
   - Scaled by `0.58` so that the book bounding box is `37.12dp x 48.72dp`
   - Corner distance from center: `30.62 dp` (safely inside the `33 dp` / `66 dp` safe zone)
   - Zero clipping under Circle, Squircle, Pebble, and Rounded-Square masks
   - Vector drawable: `android/app/src/main/res/drawable/ic_launcher_foreground.xml`

3. **Android 13 Themed Monochrome Icon** (`kitabu-icon-android-monochrome.svg`, `kitabu-icon-android-monochrome-108.png`, `kitabu-icon-android-monochrome-512.png`)
   - 108x108 dp canvas
   - Solid white (`#FFFFFF`) silhouette of the book and spine
   - Horizontal and vertical stripes and spine separator cut out as transparent negative space
   - Compatible with Material You dynamic color theming
   - Vector drawable: `android/app/src/main/res/drawable/ic_launcher_monochrome.xml`

4. **Play Store Icon** (`kitabu-icon-android-playstore-512.png`)
   - 512x512 PNG, 32-bit RGBA
   - Full square with `#791F1F` bleed, no rounded corners (Google Play applies the mask)

5. **Mipmap Launcher Icons**:
   - `mipmap-mdpi`: 48x48 (`ic_launcher.png`, `ic_launcher_round.png`)
   - `mipmap-hdpi`: 72x72 (`ic_launcher.png`, `ic_launcher_round.png`)
   - `mipmap-xhdpi`: 96x96 (`ic_launcher.png`, `ic_launcher_round.png`)
   - `mipmap-xxhdpi`: 144x144 (`ic_launcher.png`, `ic_launcher_round.png`)
   - `mipmap-xxxhdpi`: 192x192 (`ic_launcher.png`, `ic_launcher_round.png`)
   - `mipmap-anydpi-v26/ic_launcher.xml` configured for adaptive launchers

---

### B. iOS Assets
1. **iOS App Store Icon** (`kitabu-icon-ios-1024.png`)
   - 1024x1024 PNG
   - Full square, no transparency (24-bit RGB / alpha flattened)
   - Solid `#791F1F` background, no rounded corners (iOS applies the squircle mask)
   - Synced to `ios/Runner/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` and `Contents.json`

---

### C. Web & Progressive Web App (PWA) Assets
1. `kitabu-icon-web-favicon.svg` (and `public/icon.svg`, `public/favicon.svg`)
   - Infinite resolution SVG favicon with `rx="28"`
2. `kitabu-icon-web-favicon.ico` (and `public/favicon.ico`)
   - Multi-resolution ICO containing 16x16, 32x32, and 48x48 px mipmaps using the small-size simplified design
3. `kitabu-icon-web-apple-touch-180.png` (and `public/apple-touch-icon.png`)
   - 180x180 PNG
4. `kitabu-icon-web-pwa-192.png` (and `public/pwa-192x192.png`)
   - 192x192 PNG
5. `kitabu-icon-web-pwa-512.png` (and `public/pwa-512x512.png`)
   - 512x512 PNG standard
6. `kitabu-icon-web-pwa-maskable-512.png` (and `public/pwa-maskable-512x512.png`)
   - 512x512 PNG with extra padding (book scaled to 72% within the 80% safe circle) to prevent edge clipping on Android/Chrome PWA installations

---

### D. Small-Size Simplified Variant (≤ 48px)
Files: `kitabu-icon-small-48.svg`, `kitabu-icon-small-48.png`, `kitabu-icon-small-32.png`, `kitabu-icon-small-29.png`, `kitabu-icon-small-16.png`

**Simplification Rules Applied:**
- Retained: Cobalt blue cover (`#185FA5`), navy spine (`#042C53`), one cream horizontal stripe (`#FAEEDA`, h=9), one red vertical stripe (`#E24B4A`, w=11).
- Dropped: Gold horizontal stripe (`#EF9F27`) and thin vertical cream line (`#FAEEDA`, w=5).
- Reason: At 29px and 16px, lines under 1.5px create subpixel aliasing. The simplified 2-stripe cross keeps the plaid book identity distinct and legible down to 16x16 px.

---

### E. One-Color Version (Receipts, Stamps, Thermal Printers)
Files: `kitabu-icon-onecolor-receipt.svg`, `kitabu-icon-onecolor-receipt-512.png`, `kitabu-icon-onecolor-thermal-203dpi.png`

**Thermal Print Rules Applied:**
- Pure black (`#000000`) on white (`#FFFFFF`)
- Book outline: 4.5px stroke width (safely above the 2px minimum at 203 DPI)
- Solid spine and black plaid stripes with clean spacing gaps
- 1-bit thresholding applied for low-cost 58mm/80mm ESC/POS thermal printers

---

### F. Marketing & Splash Version
Files: `kitabu-icon-marketing-splash.svg`, `kitabu-icon-marketing-splash-2048.png`
- Full-detail book icon isolated on a 100% transparent background
- 2048x2048 PNG with 8-bit alpha channel

---

## 3. Verification & Compliance Report

| Test Item | Specification | Result |
|---|---|---|
| Master Fidelity | Shapes, proportions, colors unaltered from master SVG | **PASSED** |
| Flat Color Discipline | No gradients, shadows, glows, or bevels | **PASSED** |
| Typography | Zero text embedded inside the icon | **PASSED** |
| Android Safe Zone | Book centered inside 66dp diameter circle (r=33dp) | **PASSED** (corner r=30.62dp) |
| Circle Mask | Zero edge clipping under circular launcher mask | **PASSED** |
| Squircle Mask | Clear padding under superellipse squircle mask | **PASSED** |
| Rounded Square Mask | Balanced margins under rounded rect mask | **PASSED** |
| Themed Icon | Negative space stripe cutouts for Android 13 | **PASSED** |
| 29px Small Size | Recognizable and sharp at 29x29 px | **PASSED** |
| 1-bit Thermal Print | No details under 2px at 203 DPI | **PASSED** |
| Store Masks | Play Store 512 & iOS 1024 exported full square | **PASSED** |
| PWA Maskable | Safe 80% inner circle clearance | **PASSED** |
