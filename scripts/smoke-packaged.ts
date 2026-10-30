/**
 * Packaged Electron smoke test using Playwright _electron.
 * Verifies that the built application loads from file://, renders setup or login screen,
 * and produces zero console errors regarding WebAssembly or missing assets.
 */
import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runSmokeTest() {
  console.log('[Smoke] Ensuring applet and electron main process are compiled...');
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
  execSync('npm run build:electron', { stdio: 'inherit', cwd: rootDir });

  // Verify that dist/index.html and dist-electron/main.js exist
  const indexHtml = path.join(rootDir, 'dist', 'index.html');
  const mainJs = path.join(rootDir, 'dist-electron', 'main.js');
  if (!fs.existsSync(indexHtml) || !fs.existsSync(mainJs)) {
    throw new Error('Build output missing: dist/index.html or dist-electron/main.js not found.');
  }

  console.log('[Smoke] Launching Electron app headlessly via Playwright _electron...');
  const app = await electron.launch({
    args: [
      mainJs,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--headless',
    ],
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_ENABLE_LOGGING: '1',
    },
  });

  const errors: string[] = [];

  try {
    const window = await app.firstWindow();

    window.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        console.error('[Browser Error]:', text);
        errors.push(text);
      } else {
        console.log('[Browser Console]:', text);
      }
    });

    window.on('pageerror', (err) => {
      console.error('[Page Error]:', err);
      errors.push(err.message);
    });

    console.log('[Smoke] Waiting for window DOM load...');
    await window.waitForLoadState('domcontentloaded');

    // Assert that setup or login screen renders
    console.log('[Smoke] Asserting setup or login screen is rendered...');
    const rootElement = await window.waitForSelector('#root', { timeout: 15000 });
    if (!rootElement) {
      throw new Error('#root container failed to render.');
    }

    // Wait for the UI content (FirstRunWizard, LoginView, or headings)
    await window.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && root.textContent && root.textContent.trim().length > 0;
    }, { timeout: 15000 });

    // Assert no console errors about wasm or assets
    const wasmOrAssetErrors = errors.filter((errText) =>
      /wasm|failed to load resource|404|net::ERR_FILE_NOT_FOUND|mime/i.test(errText)
    );

    if (wasmOrAssetErrors.length > 0) {
      throw new Error(`WASM or asset console error detected: ${wasmOrAssetErrors.join(' | ')}`);
    }

    console.log('[Smoke] PASS: Packaged application rendered successfully with 0 wasm or asset errors.');
  } finally {
    await app.close();
  }
}

runSmokeTest().catch((err) => {
  console.error('[Smoke Failed]:', err);
  process.exit(1);
});
