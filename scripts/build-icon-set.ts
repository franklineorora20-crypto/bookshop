import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

// ==========================================
// PALETTE PER USER SPECIFICATION
// ==========================================
const COLOR_BG_RED = '#791F1F';
const COLOR_COVER_BLUE = '#185FA5';
const COLOR_SPINE_NAVY = '#042C53';
const COLOR_STRIPE_RED = '#E24B4A';
const COLOR_STRIPE_CREAM = '#FAEEDA';
const COLOR_STRIPE_GOLD = '#EF9F27';

// ==========================================
// SVG TEMPLATES
// ==========================================

/**
 * Master SVG (120x120) with rounded corners rx=28
 */
export const SVG_MASTER_ROUNDED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="28" fill="${COLOR_BG_RED}"/>
  <rect x="28" y="18" width="64" height="84" rx="5" fill="${COLOR_COVER_BLUE}"/>
  <rect x="28" y="36" width="64" height="6" fill="${COLOR_STRIPE_CREAM}"/>
  <rect x="28" y="52" width="64" height="10" fill="${COLOR_STRIPE_RED}"/>
  <rect x="28" y="72" width="64" height="6" fill="${COLOR_STRIPE_GOLD}"/>
  <rect x="48" y="18" width="5" height="84" fill="${COLOR_STRIPE_CREAM}"/>
  <rect x="70" y="18" width="8" height="84" fill="${COLOR_STRIPE_RED}"/>
  <rect x="28" y="18" width="10" height="84" rx="4" fill="${COLOR_SPINE_NAVY}"/>
</svg>`;

/**
 * Master SVG with square background (no rounded corners, for Play Store & iOS full bleed)
 */
export const SVG_MASTER_SQUARE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" fill="${COLOR_BG_RED}"/>
  <rect x="28" y="18" width="64" height="84" rx="5" fill="${COLOR_COVER_BLUE}"/>
  <rect x="28" y="36" width="64" height="6" fill="${COLOR_STRIPE_CREAM}"/>
  <rect x="28" y="52" width="64" height="10" fill="${COLOR_STRIPE_RED}"/>
  <rect x="28" y="72" width="64" height="6" fill="${COLOR_STRIPE_GOLD}"/>
  <rect x="48" y="18" width="5" height="84" fill="${COLOR_STRIPE_CREAM}"/>
  <rect x="70" y="18" width="8" height="84" fill="${COLOR_STRIPE_RED}"/>
  <rect x="28" y="18" width="10" height="84" rx="4" fill="${COLOR_SPINE_NAVY}"/>
</svg>`;

/**
 * Splash/Marketing version: Book only on transparent background
 */
export const SVG_MARKETING_SPLASH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect x="28" y="18" width="64" height="84" rx="5" fill="${COLOR_COVER_BLUE}"/>
  <rect x="28" y="36" width="64" height="6" fill="${COLOR_STRIPE_CREAM}"/>
  <rect x="28" y="52" width="64" height="10" fill="${COLOR_STRIPE_RED}"/>
  <rect x="28" y="72" width="64" height="6" fill="${COLOR_STRIPE_GOLD}"/>
  <rect x="48" y="18" width="5" height="84" fill="${COLOR_STRIPE_CREAM}"/>
  <rect x="70" y="18" width="8" height="84" fill="${COLOR_STRIPE_RED}"/>
  <rect x="28" y="18" width="10" height="84" rx="4" fill="${COLOR_SPINE_NAVY}"/>
</svg>`;

/**
 * Android Adaptive Background: 108x108 solid #791F1F
 */
export const SVG_ANDROID_ADAPTIVE_BG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <rect width="108" height="108" fill="${COLOR_BG_RED}"/>
</svg>`;

/**
 * Android Adaptive Foreground: 108x108 dp
 * Book only (no red square), centered inside the 66dp safe zone (radius 33dp).
 * Scale factor 0.58: book width=37.12dp, height=48.72dp.
 * Farthest corner distance from center is 30.62dp (< 33dp safe circle radius).
 */
export const SVG_ANDROID_ADAPTIVE_FG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <g transform="translate(54, 54) scale(0.58) translate(-60, -60)">
    <rect x="28" y="18" width="64" height="84" rx="5" fill="${COLOR_COVER_BLUE}"/>
    <rect x="28" y="36" width="64" height="6" fill="${COLOR_STRIPE_CREAM}"/>
    <rect x="28" y="52" width="64" height="10" fill="${COLOR_STRIPE_RED}"/>
    <rect x="28" y="72" width="64" height="6" fill="${COLOR_STRIPE_GOLD}"/>
    <rect x="48" y="18" width="5" height="84" fill="${COLOR_STRIPE_CREAM}"/>
    <rect x="70" y="18" width="8" height="84" fill="${COLOR_STRIPE_RED}"/>
    <rect x="28" y="18" width="10" height="84" rx="4" fill="${COLOR_SPINE_NAVY}"/>
  </g>
</svg>`;

/**
 * Android 13 Themed Monochrome Icon: 108x108 dp
 * Single color book silhouette with stripes cut out as negative space.
 */
export const SVG_ANDROID_MONOCHROME = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <defs>
    <mask id="kitabu-shuka-cutout">
      <rect width="108" height="108" fill="#FFFFFF"/>
      <g transform="translate(54, 54) scale(0.58) translate(-60, -60)">
        <!-- Horizontal stripe negative space cutouts -->
        <rect x="28" y="36" width="64" height="6" fill="#000000"/>
        <rect x="28" y="52" width="64" height="10" fill="#000000"/>
        <rect x="28" y="72" width="64" height="6" fill="#000000"/>
        <!-- Vertical stripe negative space cutouts -->
        <rect x="48" y="18" width="5" height="84" fill="#000000"/>
        <rect x="70" y="18" width="8" height="84" fill="#000000"/>
        <!-- Spine separator cutout slit -->
        <rect x="37" y="18" width="2" height="84" fill="#000000"/>
      </g>
    </mask>
  </defs>
  <g mask="url(#kitabu-shuka-cutout)">
    <g transform="translate(54, 54) scale(0.58) translate(-60, -60)">
      <rect x="28" y="18" width="64" height="84" rx="5" fill="#FFFFFF"/>
      <rect x="28" y="18" width="10" height="84" rx="4" fill="#FFFFFF"/>
    </g>
  </g>
</svg>`;

/**
 * Small-size variant (for 48px and below):
 * Blue cover, navy spine, one cream horizontal stripe, one red vertical stripe.
 * Dropped: gold horizontal stripe and thin cream vertical stripe.
 * Tuned stripe dimensions for pixel-crisp rendering at 48px, 32px, 29px, 16px.
 */
export const SVG_SMALL_VARIANT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="28" fill="${COLOR_BG_RED}"/>
  <rect x="28" y="18" width="64" height="84" rx="6" fill="${COLOR_COVER_BLUE}"/>
  <rect x="28" y="38" width="64" height="9" fill="${COLOR_STRIPE_CREAM}"/>
  <rect x="68" y="18" width="11" height="84" fill="${COLOR_STRIPE_RED}"/>
  <rect x="28" y="18" width="12" height="84" rx="4" fill="${COLOR_SPINE_NAVY}"/>
</svg>`;

/**
 * One-color version for receipts, stamps, and thermal printers:
 * Black on white, min 1-bit safe, no fine detail under 2px at 203 dpi.
 */
export const SVG_ONE_COLOR_RECEIPT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" fill="#FFFFFF"/>
  <!-- Book outline -->
  <rect x="28" y="18" width="64" height="84" rx="6" fill="#FFFFFF" stroke="#000000" stroke-width="4.5"/>
  <!-- Spine -->
  <rect x="28" y="18" width="12" height="84" rx="4" fill="#000000"/>
  <!-- Horizontal stripes -->
  <rect x="40" y="36" width="52" height="6" fill="#000000"/>
  <rect x="40" y="52" width="52" height="10" fill="#000000"/>
  <rect x="40" y="72" width="52" height="6" fill="#000000"/>
  <!-- Vertical stripes with 1.5px white gap around cross-points for plaid legibility -->
  <rect x="49" y="18" width="5" height="16" fill="#000000"/>
  <rect x="49" y="44" width="5" height="6" fill="#000000"/>
  <rect x="49" y="64" width="5" height="6" fill="#000000"/>
  <rect x="49" y="80" width="5" height="22" fill="#000000"/>

  <rect x="71" y="18" width="8" height="16" fill="#000000"/>
  <rect x="71" y="44" width="8" height="6" fill="#000000"/>
  <rect x="71" y="64" width="8" height="6" fill="#000000"/>
  <rect x="71" y="80" width="8" height="22" fill="#000000"/>
</svg>`;

/**
 * PWA Maskable icon with extra padding:
 * The book is scaled to 0.75 within the safe 80% circle of the 512x512 canvas.
 */
export const SVG_PWA_MASKABLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" fill="${COLOR_BG_RED}"/>
  <g transform="translate(60, 60) scale(0.72) translate(-60, -60)">
    <rect x="28" y="18" width="64" height="84" rx="5" fill="${COLOR_COVER_BLUE}"/>
    <rect x="28" y="36" width="64" height="6" fill="${COLOR_STRIPE_CREAM}"/>
    <rect x="28" y="52" width="64" height="10" fill="${COLOR_STRIPE_RED}"/>
    <rect x="28" y="72" width="64" height="6" fill="${COLOR_STRIPE_GOLD}"/>
    <rect x="48" y="18" width="5" height="84" fill="${COLOR_STRIPE_CREAM}"/>
    <rect x="70" y="18" width="8" height="84" fill="${COLOR_STRIPE_RED}"/>
    <rect x="28" y="18" width="10" height="84" rx="4" fill="${COLOR_SPINE_NAVY}"/>
  </g>
</svg>`;

// ==========================================
// BUILD RUNNER
// ==========================================

async function generateAllIcons() {
  console.log('🚀 Generating Kitabu POS production-ready icon set...');

  const outputDir = path.resolve(process.cwd(), 'assets/icon-set');
  fs.mkdirSync(outputDir, { recursive: true });

  const rootPublicDir = path.resolve(process.cwd(), 'public');
  const androidResDir = path.resolve(process.cwd(), 'android/app/src/main/res');
  const iosAssetDir = path.resolve(process.cwd(), 'ios/Runner/Assets.xcassets/AppIcon.appiconset');

  fs.mkdirSync(rootPublicDir, { recursive: true });
  fs.mkdirSync(androidResDir, { recursive: true });
  fs.mkdirSync(iosAssetDir, { recursive: true });

  // 1. SAVE ALL CLEAN OPTIMIZED SVGs
  console.log('📦 Writing optimized SVG assets...');
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-master.svg'), SVG_MASTER_ROUNDED.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-master-square.svg'), SVG_MASTER_SQUARE.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-android-adaptive-bg.svg'), SVG_ANDROID_ADAPTIVE_BG.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-android-adaptive-fg.svg'), SVG_ANDROID_ADAPTIVE_FG.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-android-monochrome.svg'), SVG_ANDROID_MONOCHROME.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-small-48.svg'), SVG_SMALL_VARIANT.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-onecolor-receipt.svg'), SVG_ONE_COLOR_RECEIPT.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-marketing-splash.svg'), SVG_MARKETING_SPLASH.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-web-favicon.svg'), SVG_MASTER_ROUNDED.trim());
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-pwa-maskable.svg'), SVG_PWA_MASKABLE.trim());

  // Also update public/icon.svg and public/favicon.svg
  fs.writeFileSync(path.join(rootPublicDir, 'icon.svg'), SVG_MASTER_ROUNDED.trim());
  fs.writeFileSync(path.join(rootPublicDir, 'favicon.svg'), SVG_MASTER_ROUNDED.trim());

  // 2. DELIVERABLE 1: ANDROID
  console.log('📱 Generating Android assets (Adaptive, Monochrome, Play Store)...');
  // Adaptive 108dp base exports (at 432x432 for xxxhdpi 4x)
  await sharp(Buffer.from(SVG_ANDROID_ADAPTIVE_BG))
    .resize(108, 108)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-adaptive-bg-108.png'));
  await sharp(Buffer.from(SVG_ANDROID_ADAPTIVE_BG))
    .resize(432, 432)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-adaptive-bg-432.png'));

  await sharp(Buffer.from(SVG_ANDROID_ADAPTIVE_FG))
    .resize(108, 108)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-adaptive-fg-108.png'));
  await sharp(Buffer.from(SVG_ANDROID_ADAPTIVE_FG))
    .resize(432, 432)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-adaptive-fg-432.png'));

  await sharp(Buffer.from(SVG_ANDROID_MONOCHROME))
    .resize(108, 108)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-monochrome-108.png'));
  await sharp(Buffer.from(SVG_ANDROID_MONOCHROME))
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-monochrome-512.png'));

  // Play Store icon: 512x512 PNG, 32-bit RGBA, full square, no rounded corners
  const playStoreBuffer = await sharp(Buffer.from(SVG_MASTER_SQUARE))
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-android-playstore-512.png'), playStoreBuffer);

  // Android mipmaps (standard launcher icons)
  const densities = [
    { name: 'mipmap-mdpi', size: 48 },
    { name: 'mipmap-hdpi', size: 72 },
    { name: 'mipmap-xhdpi', size: 96 },
    { name: 'mipmap-xxhdpi', size: 144 },
    { name: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const d of densities) {
    const dir = path.join(androidResDir, d.name);
    fs.mkdirSync(dir, { recursive: true });

    // Square / rounded square
    await sharp(Buffer.from(SVG_MASTER_ROUNDED))
      .resize(d.size, d.size)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Circular icon for ic_launcher_round.png
    const circleMask = Buffer.from(
      `<svg width="${d.size}" height="${d.size}"><circle cx="${d.size / 2}" cy="${d.size / 2}" r="${d.size / 2}" fill="#ffffff"/></svg>`
    );
    await sharp(Buffer.from(SVG_MASTER_SQUARE))
      .resize(d.size, d.size)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  // Android XML Adaptive Vector Drawables
  const drawableDir = path.join(androidResDir, 'drawable');
  const mipmapAnyDpiDir = path.join(androidResDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(drawableDir, { recursive: true });
  fs.mkdirSync(mipmapAnyDpiDir, { recursive: true });

  fs.writeFileSync(
    path.join(drawableDir, 'ic_launcher_background.xml'),
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <path
      android:fillColor="#791F1F"
      android:pathData="M0,0h108v108h-108z"/>
</vector>`.trim()
  );

  fs.writeFileSync(
    path.join(drawableDir, 'ic_launcher_foreground.xml'),
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <group
      android:scaleX="0.58"
      android:scaleY="0.58"
      android:translateX="19.2"
      android:translateY="19.2">
    <!-- Blue cover -->
    <path
        android:fillColor="#185FA5"
        android:pathData="M33,18h54a5,5 0 0,1 5,5v74a5,5 0 0,1 -5,5h-54a5,5 0 0,1 -5,-5v-74a5,5 0 0,1 5,-5z"/>
    <!-- Cream horizontal -->
    <path
        android:fillColor="#FAEEDA"
        android:pathData="M28,36h64v6h-64z"/>
    <!-- Red horizontal -->
    <path
        android:fillColor="#E24B4A"
        android:pathData="M28,52h64v10h-64z"/>
    <!-- Gold horizontal -->
    <path
        android:fillColor="#EF9F27"
        android:pathData="M28,72h64v6h-64z"/>
    <!-- Cream vertical -->
    <path
        android:fillColor="#FAEEDA"
        android:pathData="M48,18h5v84h-5z"/>
    <!-- Red vertical -->
    <path
        android:fillColor="#E24B4A"
        android:pathData="M70,18h8v84h-8z"/>
    <!-- Spine navy -->
    <path
        android:fillColor="#042C53"
        android:pathData="M32,18h6v84h-6a4,4 0 0,1 -4,-4v-76a4,4 0 0,1 4,-4z"/>
  </group>
</vector>`.trim()
  );

  fs.writeFileSync(
    path.join(drawableDir, 'ic_launcher_monochrome.xml'),
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <group
      android:scaleX="0.58"
      android:scaleY="0.58"
      android:translateX="19.2"
      android:translateY="19.2">
    <!-- Monochrome book with negative space stripes -->
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M33,18h54a5,5 0 0,1 5,5v74a5,5 0 0,1 -5,5h-54a5,5 0 0,1 -5,-5v-74a5,5 0 0,1 5,-5z M28,36h64v6h-64z M28,52h64v10h-64z M28,72h64v6h-64z M48,18h5v84h-5z M70,18h8v84h-8z M37,18h2v84h-2z"
        android:fillType="evenOdd"/>
  </group>
</vector>`.trim()
  );

  fs.writeFileSync(
    path.join(mipmapAnyDpiDir, 'ic_launcher.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>`.trim()
  );

  // 3. DELIVERABLE 2: iOS
  console.log('🍎 Generating iOS assets (1024x1024 full square, no transparency)...');
  const ios1024Buffer = await sharp(Buffer.from(SVG_MASTER_SQUARE))
    .resize(1024, 1024)
    .removeAlpha()
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-ios-1024.png'), ios1024Buffer);
  fs.writeFileSync(path.join(iosAssetDir, 'AppIcon-1024.png'), ios1024Buffer);

  // 4. DELIVERABLE 3: WEB / PWA
  console.log('🌐 Generating Web & PWA assets (favicon, apple-touch, pwa-192, pwa-512, maskable)...');
  // apple-touch-icon 180x180
  const appleTouch180 = await sharp(Buffer.from(SVG_MASTER_SQUARE))
    .resize(180, 180)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-web-apple-touch-180.png'), appleTouch180);
  fs.writeFileSync(path.join(rootPublicDir, 'apple-touch-icon.png'), appleTouch180);

  // PWA 192x192
  const pwa192 = await sharp(Buffer.from(SVG_MASTER_ROUNDED))
    .resize(192, 192)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-web-pwa-192.png'), pwa192);
  fs.writeFileSync(path.join(rootPublicDir, 'pwa-192x192.png'), pwa192);

  // PWA 512x512
  const pwa512 = await sharp(Buffer.from(SVG_MASTER_ROUNDED))
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-web-pwa-512.png'), pwa512);
  fs.writeFileSync(path.join(rootPublicDir, 'pwa-512x512.png'), pwa512);

  // PWA Maskable 512x512 with safe padding
  const pwaMaskable512 = await sharp(Buffer.from(SVG_PWA_MASKABLE))
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-web-pwa-maskable-512.png'), pwaMaskable512);
  fs.writeFileSync(path.join(rootPublicDir, 'pwa-maskable-512x512.png'), pwaMaskable512);

  // favicon.ico (16, 32, 48) using small-size variant for sharpness
  const ico16 = await sharp(Buffer.from(SVG_SMALL_VARIANT)).resize(16, 16).png().toBuffer();
  const ico32 = await sharp(Buffer.from(SVG_SMALL_VARIANT)).resize(32, 32).png().toBuffer();
  const ico48 = await sharp(Buffer.from(SVG_SMALL_VARIANT)).resize(48, 48).png().toBuffer();

  const icoBuffer = await pngToIco([ico16, ico32, ico48]);
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-web-favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(rootPublicDir, 'favicon.ico'), icoBuffer);

  // 5. DELIVERABLE 4: SMALL-SIZE VARIANT (48px, 32px, 29px, 16px)
  console.log('🔍 Generating Small-Size Simplified variants (48px, 32px, 29px, 16px)...');
  const smallSizes = [48, 32, 29, 16];
  for (const s of smallSizes) {
    await sharp(Buffer.from(SVG_SMALL_VARIANT))
      .resize(s, s)
      .png()
      .toFile(path.join(outputDir, `kitabu-icon-small-${s}.png`));
  }

  // 6. DELIVERABLE 5: ONE-COLOR VERSION FOR THERMAL RECEIPT & STAMPS
  console.log('🧾 Generating One-Color thermal printer & receipt assets...');
  const receipt512 = await sharp(Buffer.from(SVG_ONE_COLOR_RECEIPT))
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-onecolor-receipt-512.png'), receipt512);

  // 203 DPI simulated thermal output (384x384 1-bit high-contrast black/white)
  const thermal384 = await sharp(Buffer.from(SVG_ONE_COLOR_RECEIPT))
    .resize(384, 384)
    .threshold(128)
    .png({ palette: true, colours: 2 })
    .toBuffer();
  fs.writeFileSync(path.join(outputDir, 'kitabu-icon-onecolor-thermal-203dpi.png'), thermal384);

  // 7. DELIVERABLE 6: SPLASH / MARKETING VERSION
  console.log('✨ Generating Splash / Marketing version (transparent 2048x2048)...');
  await sharp(Buffer.from(SVG_MARKETING_SPLASH))
    .resize(2048, 2048)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-marketing-splash-2048.png'));

  // 8. VERIFICATION SHEET PREVIEW COMPOSITION
  console.log('📋 Creating Comprehensive Verification Preview Sheet...');
  await buildVerificationSheet(outputDir);

  // Also update legacy branding folder so any other references stay consistent
  const brandingDir = path.resolve(process.cwd(), 'assets/branding');
  fs.mkdirSync(brandingDir, { recursive: true });
  fs.copyFileSync(
    path.join(outputDir, 'kitabu-icon-android-playstore-512.png'),
    path.join(brandingDir, 'app_icon_teal_1024.png')
  );
  fs.copyFileSync(
    path.join(outputDir, 'kitabu-icon-onecolor-receipt-512.png'),
    path.join(brandingDir, 'logo_single_black.png')
  );

  console.log('🎉 All icons successfully generated and verified!');
}

/**
 * Builds a multi-platform verification preview sheet
 * - Previews at 512, 192, 96, 48, and 29px on both light and dark backgrounds
 * - Previews Android Adaptive icon under Circle, Squircle, and Rounded-Square masks
 * - Shows Monochrome themed icon and thermal print receipt preview
 */
async function buildVerificationSheet(outputDir: string) {
  const sheetWidth = 1400;
  const sheetHeight = 960;

  // Render individual preview elements
  const img512 = await sharp(Buffer.from(SVG_MASTER_ROUNDED)).resize(220, 220).png().toBuffer();
  const img192 = await sharp(Buffer.from(SVG_MASTER_ROUNDED)).resize(140, 140).png().toBuffer();
  const img96 = await sharp(Buffer.from(SVG_MASTER_ROUNDED)).resize(80, 80).png().toBuffer();
  const img48 = await sharp(Buffer.from(SVG_SMALL_VARIANT)).resize(48, 48).png().toBuffer();
  const img29 = await sharp(Buffer.from(SVG_SMALL_VARIANT)).resize(29, 29).png().toBuffer();

  // Adaptive icon viewport extraction (72dp visible viewport from 108dp canvas)
  // On Android, the canvas is 108x108dp and the launcher viewport is the central 72x72dp (x=18..90, y=18..90).
  const fullCanvasSize = 432; // 4x density for 108dp
  const viewportSize = 288;   // 4x density for 72dp (72 * 4 = 288)
  const viewportOffset = 72;  // 18 * 4 = 72

  const fgFullCanvas = await sharp(Buffer.from(SVG_ANDROID_ADAPTIVE_FG))
    .resize(fullCanvasSize, fullCanvasSize)
    .png()
    .toBuffer();

  const adaptiveCombinedCanvas = await sharp(Buffer.from(SVG_ANDROID_ADAPTIVE_BG))
    .resize(fullCanvasSize, fullCanvasSize)
    .composite([{ input: fgFullCanvas, blend: 'over' }])
    .png()
    .toBuffer();

  const previewSize = 160;

  // Extract the 72dp visible launcher viewport
  const launcherViewport = await sharp(adaptiveCombinedCanvas)
    .extract({
      left: viewportOffset,
      top: viewportOffset,
      width: viewportSize,
      height: viewportSize,
    })
    .resize(previewSize, previewSize)
    .png()
    .toBuffer();

  // 1. Circle mask (72dp diameter)
  const circleMask = Buffer.from(
    `<svg width="${previewSize}" height="${previewSize}"><circle cx="${previewSize/2}" cy="${previewSize/2}" r="${previewSize/2}" fill="#fff"/></svg>`
  );
  const adaptiveCircle = await sharp(launcherViewport)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 2. Squircle mask (superellipse approx)
  const squircleMask = Buffer.from(
    `<svg width="${previewSize}" height="${previewSize}">
      <path d="M 0,${previewSize/2} C 0,${previewSize*0.1} ${previewSize*0.1},0 ${previewSize/2},0 C ${previewSize*0.9},0 ${previewSize},${previewSize*0.1} ${previewSize},${previewSize/2} C ${previewSize},${previewSize*0.9} ${previewSize*0.9},${previewSize} ${previewSize/2},${previewSize} C ${previewSize*0.1},${previewSize} 0,${previewSize*0.9} 0,${previewSize/2} Z" fill="#fff"/>
    </svg>`
  );
  const adaptiveSquircle = await sharp(launcherViewport)
    .composite([{ input: squircleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 3. Rounded Square mask (standard rx=38 on 160)
  const roundedRectMask = Buffer.from(
    `<svg width="${previewSize}" height="${previewSize}"><rect width="${previewSize}" height="${previewSize}" rx="38" fill="#fff"/></svg>`
  );
  const adaptiveRounded = await sharp(launcherViewport)
    .composite([{ input: roundedRectMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Standalone 512x512 adaptive preview masks for developers & store reviewers
  const launcherViewport512 = await sharp(adaptiveCombinedCanvas)
    .extract({
      left: viewportOffset,
      top: viewportOffset,
      width: viewportSize,
      height: viewportSize,
    })
    .resize(512, 512)
    .png()
    .toBuffer();

  const circleMask512 = Buffer.from(
    `<svg width="512" height="512"><circle cx="256" cy="256" r="256" fill="#fff"/></svg>`
  );
  const squircleMask512 = Buffer.from(
    `<svg width="512" height="512">
      <path d="M 0,256 C 0,51.2 51.2,0 256,0 C 460.8,0 512,51.2 512,256 C 512,460.8 460.8,512 256,512 C 51.2,512 0,460.8 0,256 Z" fill="#fff"/>
    </svg>`
  );
  const roundedMask512 = Buffer.from(
    `<svg width="512" height="512"><rect width="512" height="512" rx="120" fill="#fff"/></svg>`
  );

  await sharp(launcherViewport512)
    .composite([{ input: circleMask512, blend: 'dest-in' }])
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-adaptive-preview-circle-512.png'));

  await sharp(launcherViewport512)
    .composite([{ input: squircleMask512, blend: 'dest-in' }])
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-adaptive-preview-squircle-512.png'));

  await sharp(launcherViewport512)
    .composite([{ input: roundedMask512, blend: 'dest-in' }])
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-android-adaptive-preview-rounded-512.png'));

  // Themed monochrome circle (Android 13)
  const monoBase = await sharp({
    create: {
      width: previewSize,
      height: previewSize,
      channels: 4,
      background: '#2D3748',
    },
  }).png().toBuffer();

  const monoFgFullCanvas = await sharp(Buffer.from(SVG_ANDROID_MONOCHROME))
    .resize(fullCanvasSize, fullCanvasSize)
    .png()
    .toBuffer();

  const monoViewport = await sharp(monoFgFullCanvas)
    .extract({
      left: viewportOffset,
      top: viewportOffset,
      width: viewportSize,
      height: viewportSize,
    })
    .resize(previewSize, previewSize)
    .png()
    .toBuffer();

  const adaptiveMono = await sharp(monoBase)
    .composite([
      { input: monoViewport, blend: 'over' },
      { input: circleMask, blend: 'dest-in' },
    ])
    .png()
    .toBuffer();

  // Thermal receipt preview (160x160)
  const receiptImg = await sharp(Buffer.from(SVG_ONE_COLOR_RECEIPT))
    .resize(160, 160)
    .threshold(128)
    .png()
    .toBuffer();

  // Marketing splash preview (160x160 on checkerboard)
  const splashImg = await sharp(Buffer.from(SVG_MARKETING_SPLASH))
    .resize(160, 160)
    .png()
    .toBuffer();

  // Build SVG background layout for the sheet
  const sheetSvg = `
<svg width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#e2e8f0"/>
      <rect x="8" width="8" height="8" fill="#cbd5e1"/>
      <rect y="8" width="8" height="8" fill="#cbd5e1"/>
      <rect x="8" y="8" width="8" height="8" fill="#e2e8f0"/>
    </pattern>
  </defs>

  <!-- Sheet Background -->
  <rect width="${sheetWidth}" height="${sheetHeight}" fill="#0b0f17"/>

  <!-- Header -->
  <text x="50" y="55" font-family="'Inter', sans-serif" font-size="24" font-weight="800" fill="#ffffff" letter-spacing="-0.5">Kitabu POS — "Shuka Cover" Production Icon Verification Sheet</text>
  <text x="50" y="82" font-family="'Inter', sans-serif" font-size="13" font-weight="500" fill="#94a3b8">Maasai Shuka-inspired plaid book design: Background #791F1F | Cover #185FA5 | Spine #042C53 | Cream #FAEEDA | Red #E24B4A | Gold #EF9F27</text>

  <!-- Section 1: Multi-scale on Light Background -->
  <rect x="50" y="110" width="630" height="380" rx="16" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="75" y="145" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#0f172a">Light Background Verification</text>
  <text x="75" y="165" font-family="'Inter', sans-serif" font-size="11" font-weight="500" fill="#64748b">Previews at 512, 192, 96, 48, and 29px (small-size simplified variant at ≤48px)</text>
  <text x="145" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">512px (scaled)</text>
  <text x="350" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">192px</text>
  <text x="480" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">96px</text>
  <text x="565" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">48px</text>
  <text x="635" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">29px</text>

  <!-- Section 2: Multi-scale on Dark Background -->
  <rect x="720" y="110" width="630" height="380" rx="16" fill="#0f172a" stroke="#1e293b"/>
  <text x="745" y="145" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#ffffff">Dark Background Verification</text>
  <text x="745" y="165" font-family="'Inter', sans-serif" font-size="11" font-weight="500" fill="#94a3b8">Contrast validation across dark OS theme and notification surfaces</text>
  <text x="815" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">512px (scaled)</text>
  <text x="1020" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">192px</text>
  <text x="1150" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">96px</text>
  <text x="1235" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">48px</text>
  <text x="1305" y="440" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#94a3b8" text-anchor="middle">29px</text>

  <!-- Section 3: Android Adaptive Masks -->
  <rect x="50" y="520" width="630" height="390" rx="16" fill="#131b2e" stroke="#1e293b"/>
  <text x="75" y="555" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#ffffff">Android Adaptive Icon Masks</text>
  <text x="75" y="575" font-family="'Inter', sans-serif" font-size="11" font-weight="500" fill="#94a3b8">Solid #791F1F background + book scaled within 66dp safe zone (zero corner clipping)</text>
  <text x="145" y="800" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#cbd5e1" text-anchor="middle">Circle Mask</text>
  <text x="365" y="800" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#cbd5e1" text-anchor="middle">Squircle Mask</text>
  <text x="585" y="800" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#cbd5e1" text-anchor="middle">Rounded Rect Mask</text>

  <!-- Section 4: Specialized Variants (Monochrome, Thermal, Splash) -->
  <rect x="720" y="520" width="630" height="390" rx="16" fill="#131b2e" stroke="#1e293b"/>
  <text x="745" y="555" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#ffffff">Specialized Icon Deployments</text>
  <text x="745" y="575" font-family="'Inter', sans-serif" font-size="11" font-weight="500" fill="#94a3b8">Android 13 Material You Themed, 203 DPI Thermal Receipt, and Marketing Splash</text>
  <text x="815" y="800" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#cbd5e1" text-anchor="middle">Android 13 Themed</text>
  <text x="1035" y="800" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#cbd5e1" text-anchor="middle">Thermal 203 DPI (Receipt)</text>
  <text x="1255" y="800" font-family="'Inter', sans-serif" font-size="12" font-weight="600" fill="#cbd5e1" text-anchor="middle">Marketing Splash</text>

  <!-- Checkerboard for splash transparency -->
  <rect x="1175" y="605" width="160" height="160" rx="12" fill="url(#checker)"/>
</svg>
`;

  const sheetBase = await sharp(Buffer.from(sheetSvg)).png().toBuffer();

  const compositeItems = [
    // Section 1: Light BG (x: 50..680, y: 110..490)
    { input: img512, top: 190, left: 75 },
    { input: img192, top: 230, left: 320 },
    { input: img96, top: 260, left: 470 },
    { input: img48, top: 280, left: 565 },
    { input: img29, top: 290, left: 635 },

    // Section 2: Dark BG (x: 720..1350, y: 110..490)
    { input: img512, top: 190, left: 745 },
    { input: img192, top: 230, left: 990 },
    { input: img96, top: 260, left: 1140 },
    { input: img48, top: 280, left: 1235 },
    { input: img29, top: 290, left: 1305 },

    // Section 3: Android Adaptive Masks
    { input: adaptiveCircle, top: 605, left: 65 },
    { input: adaptiveSquircle, top: 605, left: 285 },
    { input: adaptiveRounded, top: 605, left: 505 },

    // Section 4: Specialized Variants
    { input: adaptiveMono, top: 605, left: 735 },
    { input: receiptImg, top: 605, left: 955 },
    { input: splashImg, top: 605, left: 1175 },
  ];

  await sharp(sheetBase)
    .composite(compositeItems)
    .png()
    .toFile(path.join(outputDir, 'kitabu-icon-verification-preview.png'));

  console.log('✅ kitabu-icon-verification-preview.png generated');
}

generateAllIcons().catch((err) => {
  console.error('Fatal error building icon set:', err);
  process.exit(1);
});
