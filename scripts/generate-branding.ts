import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Color Palette per user specifications
const PRIMARY_TEAL = '#0F4C5C';
const ACCENT_TEAL = '#1A9A8E';
const TASSEL_GOLD = '#F2E8C6';
const TEXT_DARK = '#121F33';

/**
 * Clean flat vector SVG of the simplified "K" composed of 4 books with bookmark tassels.
 * Flat vector, no gradients, designed to scale down to 24px crisply.
 */
function getMarkSvg(colorMode: 'teal' | 'black' | 'white' = 'teal'): string {
  let b1Color = PRIMARY_TEAL;
  let b2Color = PRIMARY_TEAL;
  let b3Color = ACCENT_TEAL;
  let b4Color = PRIMARY_TEAL;
  let tasselColor = TASSEL_GOLD;
  let pagesColor = '#FFFFFF';

  if (colorMode === 'black') {
    b1Color = '#121F33';
    b2Color = '#121F33';
    b3Color = '#121F33';
    b4Color = '#121F33';
    tasselColor = '#121F33';
    pagesColor = '#FFFFFF';
  } else if (colorMode === 'white') {
    b1Color = '#FFFFFF';
    b2Color = '#FFFFFF';
    b3Color = '#FFFFFF';
    b4Color = '#FFFFFF';
    tasselColor = TASSEL_GOLD;
    pagesColor = '#0F4C5C';
  }

  return `
    <g id="kitabu-k-mark">
      <!-- Book 1: Top vertical spine of K -->
      <g id="book-1">
        <rect x="144" y="96" width="56" height="150" rx="8" fill="${b1Color}" />
        <rect x="188" y="102" width="6" height="138" rx="2" fill="${pagesColor}" fill-opacity="0.4" />
        <!-- Tassel 1 -->
        <path d="M144 116 C124 122, 118 136, 122 152" stroke="${tasselColor}" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <circle cx="122" cy="152" r="4.5" fill="${tasselColor}" />
      </g>

      <!-- Book 2: Bottom vertical spine of K -->
      <g id="book-2">
        <rect x="144" y="266" width="56" height="150" rx="8" fill="${b2Color}" />
        <rect x="188" y="272" width="6" height="138" rx="2" fill="${pagesColor}" fill-opacity="0.4" />
        <!-- Tassel 2 -->
        <path d="M144 380 C124 374, 118 360, 122 344" stroke="${tasselColor}" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <circle cx="122" cy="344" r="4.5" fill="${tasselColor}" />
      </g>

      <!-- Book 3: Upper diagonal stroke of K -->
      <g id="book-3" transform="translate(196, 240) rotate(-40)">
        <rect x="0" y="-28" width="186" height="56" rx="8" fill="${b3Color}" />
        <rect x="8" y="18" width="170" height="6" rx="2" fill="${pagesColor}" fill-opacity="0.4" />
        <!-- Tassel 3 -->
        <path d="M186 0 C206 -4, 214 -16, 210 -30" stroke="${tasselColor}" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <circle cx="210" cy="-30" r="4.5" fill="${tasselColor}" />
      </g>

      <!-- Book 4: Lower diagonal stroke of K -->
      <g id="book-4" transform="translate(202, 272) rotate(40)">
        <rect x="0" y="-28" width="186" height="56" rx="8" fill="${b4Color}" />
        <rect x="8" y="-24" width="170" height="6" rx="2" fill="${pagesColor}" fill-opacity="0.4" />
        <!-- Tassel 4 -->
        <path d="M186 0 C206 4, 214 16, 210 30" stroke="${tasselColor}" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <circle cx="210" cy="30" r="4.5" fill="${tasselColor}" />
      </g>
    </g>
  `;
}

/**
 * 1. App Icon with Teal Background (1024x1024)
 */
function getAppIconSvg(): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
  <rect width="512" height="512" rx="112" fill="${PRIMARY_TEAL}" />
  <g transform="translate(4, 0)">
    ${getMarkSvg('white')}
  </g>
</svg>
`;
}

/**
 * 2. Horizontal Logo on White Background (1200x360)
 */
function getHorizontalLogoSvg(onTeal = false): string {
  const bg = onTeal ? PRIMARY_TEAL : '#FFFFFF';
  const textColor = onTeal ? '#FFFFFF' : TEXT_DARK;
  const subColor = onTeal ? TASSEL_GOLD : ACCENT_TEAL;
  const markMode = onTeal ? 'white' : 'teal';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 360" width="1200" height="360">
  <rect width="1200" height="360" rx="24" fill="${bg}" />
  <g transform="translate(50, -76)">
    ${getMarkSvg(markMode)}
  </g>
  <text x="440" y="200" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="110" font-weight="800" letter-spacing="-3" fill="${textColor}">Kitabu<tspan fill="${subColor}">POS</tspan></text>
  <text x="445" y="248" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="600" letter-spacing="4" fill="${onTeal ? '#E2E8F0' : '#64748B'}" text-transform="uppercase">BOOKSHOP MANAGEMENT SYSTEM</text>
</svg>
`;
}

/**
 * 3. Single Black Logo Mark (512x512) for receipts, stamping
 */
function getSingleBlackSvg(): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="none" />
  <g transform="translate(10, 0)">
    ${getMarkSvg('black')}
  </g>
</svg>
`;
}

async function buildAllBranding() {
  console.log('Generating KitabuPOS Brand Pack assets...');

  // Ensure directories
  const dirs = [
    'assets/branding',
    'android/app/src/main/res/mipmap-xxxhdpi',
    'android/app/src/main/res/mipmap-xxhdpi',
    'android/app/src/main/res/mipmap-xhdpi',
    'ios/Runner/Assets.xcassets/AppIcon.appiconset',
    'public',
  ];

  for (const d of dirs) {
    fs.mkdirSync(path.resolve(process.cwd(), d), { recursive: true });
  }

  // 1. App Icon 1024x1024 (Teal background, 4 books forming K with tassels)
  const appIconSvg = getAppIconSvg();
  const appIcon1024Buffer = await sharp(Buffer.from(appIconSvg))
    .resize(1024, 1024)
    .png()
    .toBuffer();

  fs.writeFileSync('assets/branding/app_icon_teal_1024.png', appIcon1024Buffer);
  console.log('✅ assets/branding/app_icon_teal_1024.png created');

  // 2. Horizontal Teal Logo (Top right: white background + Kitabu POS text)
  const horizSvg = getHorizontalLogoSvg(false);
  const horizBuffer = await sharp(Buffer.from(horizSvg))
    .resize(1200, 360)
    .png()
    .toBuffer();

  fs.writeFileSync('assets/branding/logo_horizontal_teal.png', horizBuffer);
  console.log('✅ assets/branding/logo_horizontal_teal.png created');

  // 3. Single Black Mark (for thermal receipts, invoices, stamping)
  const blackSvg = getSingleBlackSvg();
  const blackBuffer = await sharp(Buffer.from(blackSvg))
    .resize(512, 512)
    .png()
    .toBuffer();

  fs.writeFileSync('assets/branding/logo_single_black.png', blackBuffer);
  console.log('✅ assets/branding/logo_single_black.png created');

  // 4. Inverted White on Teal
  const whiteOnTealSvg = getHorizontalLogoSvg(true);
  const whiteOnTealBuffer = await sharp(Buffer.from(whiteOnTealSvg))
    .resize(1200, 360)
    .png()
    .toBuffer();

  fs.writeFileSync('assets/branding/logo_white_on_teal.png', whiteOnTealBuffer);
  console.log('✅ assets/branding/logo_white_on_teal.png created');

  // Android mipmap icons
  fs.writeFileSync('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', appIcon1024Buffer);
  
  const icon512 = await sharp(appIcon1024Buffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync('android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', icon512);

  const icon192 = await sharp(appIcon1024Buffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync('android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', icon192);
  console.log('✅ Android mipmap icons created');

  // iOS AppIcon
  fs.writeFileSync('ios/Runner/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png', appIcon1024Buffer);
  const iosContents = {
    images: [
      {
        size: "1024x1024",
        idiom: "universal",
        filename: "AppIcon-1024.png",
        platform: "ios"
      }
    ],
    info: {
      version: 1,
      author: "xcode"
    }
  };
  fs.writeFileSync(
    'ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json',
    JSON.stringify(iosContents, null, 2)
  );
  console.log('✅ iOS AppIcon set created');

  // Public Web & PWA icons
  fs.writeFileSync('public/icon.svg', appIconSvg);
  fs.writeFileSync('public/pwa-192x192.png', icon192);
  fs.writeFileSync('public/pwa-512x512.png', icon512);
  fs.writeFileSync('public/pwa-maskable-512x512.png', icon512);
  fs.writeFileSync('public/apple-touch-icon.png', icon192);
  console.log('✅ Public web assets updated with new branding');
}

buildAllBranding().catch(err => {
  console.error('Error generating branding:', err);
  process.exit(1);
});
