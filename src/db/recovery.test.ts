import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL } from './schema.ts';
import {
  __resetDatabaseStateForTests,
  __setMockStorageForTests,
  __setForcePersistFailureForTests,
  configureInitialAdministratorRecoveryCode,
  generateAdministratorRecoveryCode,
  getAdministratorRecoveryStatus,
  getDatabase,
  migrateDatabase,
  recoverAdministratorPassword,
  regenerateAdministratorRecoveryCode,
  restoreDatabaseBinary,
  runExecute,
  runQueryOne,
  verifyDatabaseBinary,
} from './database.ts';
import {
  getStoredSession,
  loginWithPassword,
  saveSession,
  validateStoredSession,
} from '../services/auth.ts';

const RECOVERY_LOCKOUT_KEY = 'administrator-recovery';

function resetDatabase(storage: Map<string, Uint8Array>): void {
  __resetDatabaseStateForTests();
  __setForcePersistFailureForTests(false);
  __setMockStorageForTests(storage);
}

test('recovery codes are secure, grouped, and unique per generation', () => {
  const codes = Array.from({ length: 10 }, generateAdministratorRecoveryCode);
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) {
    assert.match(code, /^(?:[0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/);
    assert.equal(code.replace(/-/g, '').length, 32);
  }
});

test('version 3 migration and restore preserve existing accounts, password hashes, settings, sales, and inventory', async () => {
  const SQL = await initSqlJs();
  const v3Schema = SCHEMA_SQL
    .replace(',\n  auth_version INTEGER NOT NULL DEFAULT 0', '')
    .replace(/CREATE TABLE IF NOT EXISTS administrator_recovery[\s\S]*?\n\);\n/, '');
  const oldDb = new SQL.Database();
  oldDb.run('PRAGMA foreign_keys = ON;');
  oldDb.run(v3Schema);
  const now = new Date().toISOString();
  const adminHash = bcrypt.hashSync('preserved-admin-password', 10);
  const staffHash = bcrypt.hashSync('preserved-staff-password', 10);
  oldDb.run(
    `INSERT INTO schema_migrations (version, applied_at) VALUES (1, '${now}'), (2, '${now}'), (3, '${now}');`
  );
  oldDb.run(
    `INSERT INTO users (id, username, full_name, role, password_hash, is_active, created_at)
     VALUES (1, 'admin', 'Shop Administrator', 'admin', '${adminHash}', 1, '${now}'),
            (2, 'cashier', 'Shop Cashier', 'cashier', '${staffHash}', 1, '${now}');`
  );
  oldDb.run(`INSERT INTO shop_settings (key, value) VALUES ('shop_name', 'Existing Bookshop');`);
  oldDb.run(
    `INSERT INTO books (id, title, author, publisher, category, purchase_price, selling_price, quantity, reorder_level, created_at, updated_at)
     VALUES (31, 'Existing Textbook', 'Author', 'Publisher', 'Education', 250, 400, 9, 2, '${now}', '${now}');`
  );
  oldDb.run(
    `INSERT INTO suppliers (id, name, phone, created_at)
     VALUES (51, 'Existing Publisher', '0712345678', '${now}');`
  );
  oldDb.run(
    `INSERT INTO purchases (id, supplier_id, invoice_number, total_cost, amount_paid, user_id, created_at)
     VALUES (52, 51, 'INV-EXISTING-52', 250, 250, 1, '${now}');`
  );
  oldDb.run(
    `INSERT INTO purchase_items (id, purchase_id, book_id, book_title, quantity, unit_cost, total_cost)
     VALUES (53, 52, 31, 'Existing Textbook', 1, 250, 250);`
  );
  oldDb.run(
    `INSERT INTO sales (id, receipt_number, user_id, cashier_name, customer_name, subtotal, discount_total, tax_total, grand_total, total_paid, change_amount, payment_method, is_voided, created_at)
     VALUES (41, 'RCP-EXISTING-41', 1, 'Shop Administrator', 'Walk-in Customer', 400, 0, 0, 400, 400, 0, 'cash', 0, '${now}');`
  );
  oldDb.run(
    `INSERT INTO expenses (id, category, amount, description, date, user_id, created_at)
     VALUES (61, 'Rent', 1000, 'Existing rent expense', '${now}', 1, '${now}');`
  );
  oldDb.run(
    `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at)
     VALUES (1, 'Shop Administrator', 'EXISTING_AUDIT', 'system', '1', 'Keep this history', '${now}');`
  );
  const previousBackup = oldDb.export();
  assert.equal(await verifyDatabaseBinary(previousBackup), true);

  await migrateDatabase(oldDb, false);
  const migratedAuthVersion = oldDb.exec('SELECT auth_version FROM users WHERE id = 1;');
  assert.equal(migratedAuthVersion[0]?.values[0]?.[0], 0);
  assert.equal(oldDb.exec('SELECT version FROM schema_migrations WHERE version = 4;')[0]?.values.length, 1);
  assert.equal(oldDb.exec('SELECT password_hash FROM users WHERE id = 1;')[0]?.values[0]?.[0], adminHash);
  assert.equal(oldDb.exec('SELECT password_hash FROM users WHERE id = 2;')[0]?.values[0]?.[0], staffHash);
  assert.equal(oldDb.exec('SELECT title, quantity FROM books WHERE id = 31;')[0]?.values[0]?.[0], 'Existing Textbook');
  assert.equal(oldDb.exec('SELECT quantity FROM books WHERE id = 31;')[0]?.values[0]?.[0], 9);
  assert.equal(oldDb.exec('SELECT invoice_number FROM purchases WHERE id = 52;')[0]?.values[0]?.[0], 'INV-EXISTING-52');
  assert.equal(oldDb.exec('SELECT quantity FROM purchase_items WHERE id = 53;')[0]?.values[0]?.[0], 1);
  assert.equal(oldDb.exec('SELECT receipt_number FROM sales WHERE id = 41;')[0]?.values[0]?.[0], 'RCP-EXISTING-41');
  assert.equal(oldDb.exec('SELECT description FROM expenses WHERE id = 61;')[0]?.values[0]?.[0], 'Existing rent expense');
  assert.equal(oldDb.exec("SELECT value FROM shop_settings WHERE key = 'shop_name';")[0]?.values[0]?.[0], 'Existing Bookshop');
  assert.equal(oldDb.exec("SELECT action FROM audit_logs WHERE action = 'EXISTING_AUDIT';")[0]?.values.length, 1);
  oldDb.close();

  const storage = new Map<string, Uint8Array>();
  resetDatabase(storage);
  await getDatabase();
  const restored = await restoreDatabaseBinary(previousBackup, 1, 'Shop Administrator');
  assert.equal(restored.ok, true, restored.message);
  const restoredBook = await runQueryOne<{ quantity: number }>('SELECT quantity FROM books WHERE id = 31;');
  const restoredPurchase = await runQueryOne<{ invoice_number: string }>('SELECT invoice_number FROM purchases WHERE id = 52;');
  const restoredSale = await runQueryOne<{ receipt_number: string }>('SELECT receipt_number FROM sales WHERE id = 41;');
  const restoredExpense = await runQueryOne<{ description: string }>('SELECT description FROM expenses WHERE id = 61;');
  assert.equal(restoredBook?.quantity, 9);
  assert.equal(restoredPurchase?.invoice_number, 'INV-EXISTING-52');
  assert.equal(restoredSale?.receipt_number, 'RCP-EXISTING-41');
  assert.equal(restoredExpense?.description, 'Existing rent expense');
  assert.equal(await loginWithPassword('admin', 'preserved-admin-password').then((user) => user.id), 1);
  assert.equal(await runQueryOne('SELECT * FROM administrator_recovery WHERE admin_user_id = 1;'), null);
});

test('recovery stores only a bcrypt hash, verifies a safety copy, preserves business data, rotates the code, audits, invalidates sessions, and works after restart', async () => {
  const storage = new Map<string, Uint8Array>();
  resetDatabase(storage);
  await getDatabase();
  const initialCode = generateAdministratorRecoveryCode();
  await configureInitialAdministratorRecoveryCode(initialCode);

  const stored = await runQueryOne<{ recovery_hash: string; configured_at: string }>(
    'SELECT recovery_hash, configured_at FROM administrator_recovery WHERE admin_user_id = 1;'
  );
  assert.ok(stored);
  assert.match(stored.recovery_hash, /^\$2[aby]\$10\$/);
  assert.notEqual(stored.recovery_hash, initialCode);
  assert.equal(bcrypt.compareSync(initialCode.replace(/-/g, ''), stored.recovery_hash), true);
  assert.deepEqual(await getAdministratorRecoveryStatus(), { configured: true, configuredAt: stored.configured_at });

  const db = await getDatabase();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO books (id, title, author, publisher, category, purchase_price, selling_price, quantity, reorder_level, created_at, updated_at)
     VALUES (71, 'Recovery Preservation Book', 'Author', 'Publisher', 'Education', 100, 200, 8, 2, ?, ?);`,
    [now, now]
  );
  db.run(
    `INSERT INTO sales (id, receipt_number, user_id, cashier_name, customer_name, subtotal, discount_total, tax_total, grand_total, total_paid, change_amount, payment_method, is_voided, created_at)
     VALUES (72, 'RCP-RECOVERY-72', 1, 'System Administrator', 'Walk-in Customer', 200, 0, 0, 200, 200, 0, 'cash', 0, ?);`,
    [now]
  );
  await runExecute('UPDATE users SET auth_version = 0 WHERE id = 1;');
  saveSession({ userId: 1, role: 'admin', name: 'System Administrator', locked: false, authVersion: 0 });

  const result = await recoverAdministratorPassword(
    'admin',
    initialCode,
    'Recovered-admin-password-2026',
    'Recovered-admin-password-2026'
  );
  assert.notEqual(result.recoveryCode, initialCode);
  assert.equal(await verifyDatabaseBinary(storage.get('pre_recovery_safety_backup')!), true);
  const newPasswordHash = await runQueryOne<{ password_hash: string; auth_version: number }>(
    'SELECT password_hash, auth_version FROM users WHERE id = 1;'
  );
  assert.ok(newPasswordHash);
  assert.equal(bcrypt.compareSync('Recovered-admin-password-2026', newPasswordHash.password_hash), true);
  assert.equal(newPasswordHash.auth_version, 1);
  const newRecoveryHash = await runQueryOne<{ recovery_hash: string }>(
    'SELECT recovery_hash FROM administrator_recovery WHERE admin_user_id = 1;'
  );
  assert.ok(newRecoveryHash);
  assert.equal(bcrypt.compareSync(result.recoveryCode.replace(/-/g, ''), newRecoveryHash.recovery_hash), true);
  assert.equal(bcrypt.compareSync(initialCode.replace(/-/g, ''), newRecoveryHash.recovery_hash), false);
  assert.equal((await validateStoredSession()), null);
  assert.equal(getStoredSession(), null);
  assert.equal(
    (await runQueryOne<{ quantity: number }>('SELECT quantity FROM books WHERE id = 71;'))?.quantity,
    8
  );
  assert.equal(
    (await runQueryOne<{ receipt_number: string }>('SELECT receipt_number FROM sales WHERE id = 72;'))?.receipt_number,
    'RCP-RECOVERY-72'
  );
  assert.equal(
    await runQueryOne<{ count: number }>("SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'ADMIN_PASSWORD_RECOVERED';").then((row) => row?.count),
    1
  );
  await assert.rejects(
    recoverAdministratorPassword('admin', initialCode, 'Another-password-2026', 'Another-password-2026'),
    /Recovery could not be completed/
  );

  __resetDatabaseStateForTests();
  const reopened = await getDatabase();
  assert.ok(reopened);
  assert.equal((await loginWithPassword('admin', 'Recovered-admin-password-2026')).id, 1);
});

test('recovery validates password confirmation, limits persistent failures, and remains locked after reopening', async () => {
  const storage = new Map<string, Uint8Array>();
  resetDatabase(storage);
  await getDatabase();
  const code = generateAdministratorRecoveryCode();
  await configureInitialAdministratorRecoveryCode(code);
  await assert.rejects(
    recoverAdministratorPassword('admin', code, 'a-valid-password', 'a-different-password'),
    /matching passwords/
  );
  await assert.rejects(
    recoverAdministratorPassword('admin', code, ' admin123 ', ' admin123 '),
    /non-default password/
  );

  for (let attempt = 0; attempt < 5; attempt++) {
    await assert.rejects(
      recoverAdministratorPassword('admin', 'INVALID-CODE', 'valid-password-123', 'valid-password-123'),
      /Recovery could not be completed/
    );
  }
  const lockout = await runQueryOne<{ failed_attempts: number; locked_until: string }>(
    'SELECT failed_attempts, locked_until FROM auth_lockouts WHERE identifier = ?;',
    [RECOVERY_LOCKOUT_KEY]
  );
  assert.equal(lockout?.failed_attempts, 5);
  assert.ok(lockout?.locked_until);
  __resetDatabaseStateForTests();
  await getDatabase();
  await assert.rejects(
    recoverAdministratorPassword('admin', code, 'valid-password-123', 'valid-password-123'),
    /temporarily unavailable/
  );
});

test('authenticated recovery-code regeneration reauthenticates, backs up, hashes, and replaces the prior code', async () => {
  const storage = new Map<string, Uint8Array>();
  resetDatabase(storage);
  await getDatabase();
  const firstCode = generateAdministratorRecoveryCode();
  await configureInitialAdministratorRecoveryCode(firstCode);
  const previousHash = await runQueryOne<{ recovery_hash: string }>(
    'SELECT recovery_hash FROM administrator_recovery WHERE admin_user_id = 1;'
  );
  assert.ok(previousHash);

  await assert.rejects(
    regenerateAdministratorRecoveryCode(1, 'incorrect-password', generateAdministratorRecoveryCode()),
    /password could not be verified/
  );
  assert.equal(storage.has('pre_recovery_safety_backup'), false);

  const replacementCode = generateAdministratorRecoveryCode();
  await regenerateAdministratorRecoveryCode(1, 'admin123', replacementCode);
  assert.equal(await verifyDatabaseBinary(storage.get('pre_recovery_safety_backup')!), true);
  const replacementHash = await runQueryOne<{ recovery_hash: string; configured_at: string }>(
    'SELECT recovery_hash, configured_at FROM administrator_recovery WHERE admin_user_id = 1;'
  );
  assert.ok(replacementHash);
  assert.notEqual(replacementHash.recovery_hash, previousHash.recovery_hash);
  assert.equal(bcrypt.compareSync(replacementCode.replace(/-/g, ''), replacementHash.recovery_hash), true);
  assert.equal(bcrypt.compareSync(firstCode.replace(/-/g, ''), replacementHash.recovery_hash), false);
  assert.equal((await getAdministratorRecoveryStatus()).configuredAt, replacementHash.configured_at);
  assert.equal(
    await runQueryOne<{ count: number }>(
      "SELECT COUNT(*) AS count FROM audit_logs WHERE action = 'ADMIN_RECOVERY_REGENERATED';"
    ).then((row) => row?.count),
    1
  );
});

test('recovery fails closed if a verified emergency backup cannot be stored', async () => {
  const storage = new Map<string, Uint8Array>();
  resetDatabase(storage);
  await getDatabase();
  const code = generateAdministratorRecoveryCode();
  await configureInitialAdministratorRecoveryCode(code);
  const before = await runQueryOne<{ password_hash: string; auth_version: number }>(
    'SELECT password_hash, auth_version FROM users WHERE id = 1;'
  );
  __setMockStorageForTests(null);
  await assert.rejects(
    regenerateAdministratorRecoveryCode(1, 'admin123', generateAdministratorRecoveryCode()),
    /Emergency backup storage is unavailable/
  );
  const after = await runQueryOne<{ password_hash: string; auth_version: number }>(
    'SELECT password_hash, auth_version FROM users WHERE id = 1;'
  );
  assert.deepEqual(after, before);
});
