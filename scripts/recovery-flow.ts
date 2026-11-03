import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron } from 'playwright';

const rootDir = path.resolve(import.meta.dirname, '..');
const mainJs = path.join(rootDir, 'dist-electron', 'main.js');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'kitabupos-recovery-flow-'));
const appArgs = [
  mainJs,
  '--no-sandbox',
  '--disable-gpu',
  '--disable-background-networking',
  '--host-resolver-rules=MAP * ~NOTFOUND',
  `--user-data-dir=${userData}`,
  '--headless',
];

async function launchApp() {
  const app = await electron.launch({
    args: appArgs,
    env: { ...process.env, NODE_ENV: 'production' },
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => Boolean(document.querySelector('#root')?.textContent?.trim()));
  await page.context().setOffline(true);
  return { app, page };
}

async function main(): Promise<void> {
  if (!fs.existsSync(mainJs)) {
    throw new Error('Build the production Electron app before running the recovery UI test.');
  }

  let app: Awaited<ReturnType<typeof electron.launch>> | null = null;
  try {
    let launched = await launchApp();
    app = launched.app;
    let page = launched.page;
    const runtimeApi = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return {
        methods: api ? Object.keys(api) : [],
      };
    });
    assert.ok(runtimeApi.methods.includes('createEmergencyBackup'));

    await page.getByPlaceholder('e.g. St. Peters Bookshop & Stationers').fill('Recovery Test Bookshop');
    await page.getByPlaceholder('e.g. 0712 345 678').fill('0712345678');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('Admin Full Name').fill('Recovery Test Administrator');
    await page.getByLabel('Username').fill('admin');
    await page.getByPlaceholder('At least 8 characters').fill('InitialRecoveryPassword!');
    await page.getByPlaceholder('Re-enter password').fill('InitialRecoveryPassword!');
    await page.getByRole('button', { name: 'Continue' }).click();

    const initialCodeElement = page.locator('code').filter({
      hasText: /^(?:[0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/,
    });
    await initialCodeElement.waitFor();
    const initialCode = (await initialCodeElement.innerText()).trim();
    assert.match(initialCode, /^(?:[0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
    await page.getByRole('button', { name: 'I saved this code' }).click();
    await page.getByRole('button', { name: 'Finish & Launch Register' }).click();
    await page.getByText('Recovery Test Bookshop').waitFor();

    await app.close();
    app = null;

    launched = await launchApp();
    app = launched.app;
    page = launched.page;
    await page.getByRole('button', { name: 'Forgot Administrator Password?' }).click();
    await page.getByLabel('Administrator username').fill('admin');
    await page.getByLabel('Administrator recovery code').fill(initialCode);
    await page.getByLabel('New password', { exact: true }).fill('RecoveredPassword!');
    await page.getByLabel('Confirm new password').fill('RecoveredPassword!');
    await page.getByRole('button', { name: 'Recover password' }).click();

    const replacementCodeElement = page.locator('code').filter({
      hasText: /^(?:[0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/,
    });
    await replacementCodeElement.waitFor();
    const replacementCode = (await replacementCodeElement.innerText()).trim();
    assert.notEqual(replacementCode, initialCode);
    const emergencyPaths = await page.evaluate(async () => {
      const api = (window as any).electronAPI;
      return { app: await api.getAppPaths(), status: await api.getBackupStatus() };
    });
    assert.match(emergencyPaths.status.latestFileName, /^kitabupos_emergency_pre_recovery_/);
    const emergencyBackupPath = path.join(emergencyPaths.app.backupDir, emergencyPaths.status.latestFileName);
    assert.ok(fs.existsSync(emergencyBackupPath), 'The Electron emergency backup must remain on disk.');
    const emergencyBackup = fs.readFileSync(emergencyBackupPath);
    assert.equal(emergencyBackup.subarray(0, 16).toString('utf-8'), 'SQLite format 3\0');
    assert.ok(emergencyBackup.byteLength > 512);
    await page.getByRole('button', { name: 'I saved it — go to sign in' }).click();
    await page.getByPlaceholder('Enter your username').fill('admin');
    await page.getByPlaceholder('Enter account password').fill('RecoveredPassword!');
    await page.getByRole('button', { name: 'Sign In to Register' }).click();
    await page.getByText('Recovery Test Bookshop').waitFor();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Security & Audits' }).click();
    await page.getByText('Configured', { exact: true }).waitFor();
    const reauthentication = page.getByLabel('Re-enter administrator password to regenerate');
    await reauthentication.fill('incorrect-password');
    await page.getByRole('button', { name: 'Regenerate recovery code' }).click();
    await page.getByText('Administrator password could not be verified.').waitFor();
    await reauthentication.fill('RecoveredPassword!');
    await page.getByRole('button', { name: 'Regenerate recovery code' }).click();
    const settingsCode = page.locator('code').filter({
      hasText: /^(?:[0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/,
    });
    await settingsCode.waitFor();
    assert.notEqual((await settingsCode.innerText()).trim(), replacementCode);
    await page.getByRole('button', { name: 'I saved this code' }).click();
    await page.getByText('New recovery code saved and acknowledged.').waitFor();

    console.log('[Recovery UI] PASS: first-run code acknowledgement, offline recovery, replacement-code acknowledgement, and normal sign-in succeeded.');
  } finally {
    if (app) await app.close();
    fs.rmSync(userData, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('[Recovery UI failed]:', error);
  process.exitCode = 1;
});
