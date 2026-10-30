import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL } from './schema.ts';
import { getSeedQueries } from './seed.ts';
import {
  getDatabase,
  migrateDatabase,
  verifyDatabaseBinary,
  updateUser,
  addUser,
  getUsers,
  processSale,
  voidSale,
  adjustStock,
  addBook,
  updateBook,
  archiveBook,
  recordPurchase,
  updatePurchaseStatus,
  recordExpense,
  updateShopSettings,
  cleanBusinessDatabase,
  restoreDatabaseBinary,
  getFinancialSummary,
  resetDatabaseToFreshSetup,
  runExecute,
  runQueryOne,
  DatabaseRecoveryRequired,
  getPersistenceError,
  persistDbToStorage,
  __setMockStorageForTests,
  __setForcePersistFailureForTests,
  __resetDatabaseStateForTests,
} from './database.ts';
import {
  loginWithPassword,
  saveSession,
  getStoredSession,
  unlockWithPinOrPassword,
  checkThrottle,
  recordFailedAttempt,
  resetLockout,
} from '../services/auth.ts';

test('A1 [TEST]: a v2 DB with a manager who made sales migrates with all users kept and PRAGMA foreign_key_check returning no rows', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA_SQL);

  // Set schema migration version to 2
  const now = new Date().toISOString();
  db.run('DELETE FROM schema_migrations;');
  db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (1, '${now}'), (2, '${now}');`);

  // Insert manager user (role = 'manager')
  const passHash = bcrypt.hashSync('manager123', 10);
  db.run(
    `INSERT INTO users (id, username, full_name, role, password_hash, is_active, created_at)
     VALUES (99, 'manager', 'Store Manager', 'manager', '${passHash}', 1, '${now}');`
  );

  // Manager makes a sale
  db.run(
    `INSERT INTO sales (id, receipt_number, user_id, cashier_name, customer_name, subtotal, discount_total, tax_total, grand_total, total_paid, change_amount, payment_method, is_voided, created_at)
     VALUES (999, 'RCP-2026-99999', 99, 'Store Manager', 'Walk-in Customer', 500, 0, 0, 500, 500, 0, 'cash', 0, '${now}');`
  );

  // Run migration v3
  await migrateDatabase(db);

  // Verify manager user is NOT deleted
  const managerUser = db.exec("SELECT id, username, role FROM users WHERE role = 'manager';");
  assert.equal(managerUser[0]?.values?.length, 1, 'Manager user must be preserved in migration v3');
  assert.equal(managerUser[0]?.values[0][1], 'manager');

  // Verify foreign key integrity has 0 violations
  const fkCheck = db.exec('PRAGMA foreign_key_check;');
  assert.equal(fkCheck.length === 0 || fkCheck[0]?.values?.length === 0, true, 'PRAGMA foreign_key_check must return no rows');

  db.close();
});

test("A2 [TEST]: updateUser must update username (trimmed, case-insensitive unique). The wizard's chosen admin username can log in", async () => {
  const adminUser = await runQueryOne<{ id: number }>('SELECT id FROM users WHERE id = 1;');
  assert.ok(adminUser);

  // Update username with leading/trailing spaces and setup password
  const newPassHash = bcrypt.hashSync('MyNewAdminPass2026!', 10);
  await updateUser(1, { username: '  chiefAdmin  ', password_hash: newPassHash }, 1, 'admin');

  const updated = await runQueryOne<{ username: string }>('SELECT username FROM users WHERE id = 1;');
  assert.equal(updated?.username, 'chiefAdmin', 'Username must be trimmed and updated');

  // Verify that the wizard's chosen admin username and password can log in successfully
  const loggedIn = await loginWithPassword('chiefadmin', 'MyNewAdminPass2026!');
  assert.equal(loggedIn.id, 1);
  assert.equal(loggedIn.username, 'chiefAdmin');

  // Case-insensitive duplicate check
  await assert.rejects(
    async () => {
      await updateUser(2, { username: 'CHIEFADMIN' }, 1, 'admin');
    },
    /already taken/i,
    'Duplicate username should be rejected case-insensitively'
  );

  // Reset back to admin for subsequent tests
  const defaultHash = bcrypt.hashSync('admin123', 10);
  await updateUser(1, { username: 'admin', password_hash: defaultHash }, 1, 'admin');
});

test('A3 [TEST]: lockout and that getUsers/session expose no hash or PIN', async () => {
  // 1. Verify getUsers exposes no password_hash or pin
  const users = await getUsers();
  for (const u of users) {
    assert.equal('password_hash' in u, false, 'getUsers must not expose password_hash');
    assert.equal('pin' in u, false, 'getUsers must not expose pin');
  }

  // 2. Verify sessionStorage exposes only {userId, role, name, locked}
  saveSession({
    userId: 1,
    role: 'admin',
    name: 'Administrator',
    locked: false,
  });

  const session = getStoredSession();
  assert.ok(session);
  assert.equal(session.userId, 1);
  assert.equal(session.role, 'admin');
  assert.equal('password_hash' in (session as any), false, 'Session must not contain password_hash');
  assert.equal('pin' in (session as any), false, 'Session must not contain pin');

  // 3. Test throttling lockout: 5 failures triggers lock
  const testKey = 'test_lockout_user';
  await resetLockout(testKey);

  // 4 failed attempts: not yet locked
  for (let i = 0; i < 4; i++) {
    await recordFailedAttempt(testKey);
  }
  // Should not throw yet
  await checkThrottle(testKey);

  // 5th failure: triggers lock
  await recordFailedAttempt(testKey);

  await assert.rejects(
    async () => {
      await checkThrottle(testKey);
    },
    /locked/i,
    '5th failed attempt must trigger persisted lockout'
  );

  await resetLockout(testKey);
});

test('A4 [TEST]: tampered price/total rejected, underpayment rejected, duplicate/invalid M-Pesa rejected', async () => {
  // Create a verified book
  const bookId = await addBook(
    {
      title: 'Security Testing Handbook',
      author: 'Author',
      publisher: 'Publisher',
      category: 'Education',
      purchase_price: 300,
      selling_price: 600,
      quantity: 50,
      reorder_level: 5,
    },
    1,
    'admin'
  );

  // 1. Tampered price / total rejected
  await assert.rejects(
    async () => {
      await processSale(
        {
          cashierName: 'Cashier',
          subtotal: 300, // Tampered! DB selling price is 600
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 300,
          totalPaid: 300,
          changeAmount: 0,
          paymentMethod: 'cash',
        },
        [
          {
            bookId,
            bookTitle: 'Security Testing Handbook',
            quantity: 1,
            unitPurchasePrice: 300,
            unitSellingPrice: 300, // client tampered price
            discountAmount: 0,
            totalPrice: 300,
          },
        ],
        1,
        'admin'
      );
    },
    /mismatch/i,
    'Tampered prices or totals must be rejected'
  );

  // 2. Underpayment rejected
  await assert.rejects(
    async () => {
      await processSale(
        {
          cashierName: 'Cashier',
          subtotal: 600,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 600,
          totalPaid: 500, // Underpayment!
          changeAmount: 0,
          paymentMethod: 'cash',
        },
        [
          {
            bookId,
            bookTitle: 'Security Testing Handbook',
            quantity: 1,
            unitPurchasePrice: 300,
            unitSellingPrice: 600,
            discountAmount: 0,
            totalPrice: 600,
          },
        ],
        1,
        'admin'
      );
    },
    /underpayment/i,
    'Underpayment must be rejected'
  );

  // 3. Invalid M-Pesa format rejected (must be 10 uppercase alphanumeric chars)
  await assert.rejects(
    async () => {
      await processSale(
        {
          cashierName: 'Cashier',
          subtotal: 600,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 600,
          totalPaid: 600,
          changeAmount: 0,
          paymentMethod: 'mpesa',
          paymentReference: 'invalid_code!', // invalid
        },
        [
          {
            bookId,
            bookTitle: 'Security Testing Handbook',
            quantity: 1,
            unitPurchasePrice: 300,
            unitSellingPrice: 600,
            discountAmount: 0,
            totalPrice: 600,
          },
        ],
        1,
        'admin'
      );
    },
    /Invalid M-Pesa/i,
    'Invalid M-Pesa code format must be rejected'
  );

  // 4. Duplicate M-Pesa code rejected
  const validMpesa = 'QA77XY88ZZ';
  await processSale(
    {
      cashierName: 'Cashier',
      subtotal: 600,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 600,
      totalPaid: 600,
      changeAmount: 0,
      paymentMethod: 'mpesa',
      paymentReference: validMpesa,
    },
    [
      {
        bookId,
        bookTitle: 'Security Testing Handbook',
        quantity: 1,
        unitPurchasePrice: 300,
        unitSellingPrice: 600,
        discountAmount: 0,
        totalPrice: 600,
      },
    ],
    1,
    'admin'
  );

  // Attempting second sale with same M-Pesa code
  await assert.rejects(
    async () => {
      await processSale(
        {
          cashierName: 'Cashier',
          subtotal: 600,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 600,
          totalPaid: 600,
          changeAmount: 0,
          paymentMethod: 'mpesa',
          paymentReference: validMpesa, // duplicate!
        },
        [
          {
            bookId,
            bookTitle: 'Security Testing Handbook',
            quantity: 1,
            unitPurchasePrice: 300,
            unitSellingPrice: 600,
            discountAmount: 0,
            totalPrice: 600,
          },
        ],
        1,
        'admin'
      );
    },
    /Duplicate M-Pesa/i,
    'Duplicate M-Pesa code must be rejected'
  );
});

test('A5 [TEST]: a sale at 23:30 EAT lands on the correct day; profit excludes tax', async () => {
  // 23:30 EAT on 2026-08-15 is 20:30 UTC on 2026-08-15
  const utcCreatedAt = '2026-08-15T20:30:00.000Z';
  const targetDay = '2026-08-15';

  // Insert a sale at 23:30 EAT with 16% tax
  // Subtotal = 1000, Tax = 160, GrandTotal = 1160, COGS = 600
  await runExecute(
    `INSERT INTO sales (
      receipt_number, user_id, cashier_name, customer_name,
      subtotal, discount_total, tax_total, grand_total, total_paid, change_amount,
      payment_method, is_voided, created_at
    ) VALUES ('RCP-2026-TESTNBI', 1, 'Cashier', 'Customer', 1000, 0, 160, 1160, 1160, 0, 'cash', 0, ?);`,
    [utcCreatedAt]
  );

  const saleRes = await runQueryOne<{ id: number }>('SELECT id FROM sales WHERE receipt_number = ?', ['RCP-2026-TESTNBI']);
  assert.ok(saleRes);

  await runExecute(
    `INSERT INTO sale_items (
      sale_id, book_id, book_title, quantity, unit_purchase_price, unit_selling_price, discount_amount, total_price
    ) VALUES (?, 1, 'Sample', 2, 300, 500, 0, 1000);`,
    [saleRes.id]
  );

  const summary = await getFinancialSummary(targetDay, targetDay);

  // Revenue must exclude tax (1000, NOT 1160)
  assert.equal(summary.revenue, 1000, 'Revenue must exclude VAT/tax');

  // COGS is 2 * 300 = 600
  assert.equal(summary.cogs, 600);

  // Gross profit = 1000 - 600 = 400 (NOT 1160 - 600 = 560)
  assert.equal(summary.grossProfit, 400, 'Gross profit must exclude VAT/tax');
});

test('A6 [TEST]: matrix: each mutating function rejects a cashier', async () => {
  const cashierContext = { role: 'cashier' as const, id: 2 };

  // 1. voidSale
  await assert.rejects(async () => {
    await voidSale(1, 'Reason', cashierContext, 'cashier');
  }, /Unauthorized/i);

  // 2. adjustStock
  await assert.rejects(async () => {
    await adjustStock(1, 5, 'adjustment', 'Notes', cashierContext, 'cashier');
  }, /Unauthorized/i);

  // 3. addBook
  await assert.rejects(async () => {
    await addBook(
      {
        title: 'Unauthorized Title',
        author: 'Author',
        publisher: 'Pub',
        category: 'Cat',
        purchase_price: 100,
        selling_price: 200,
        quantity: 5,
        reorder_level: 2,
      },
      cashierContext,
      'cashier'
    );
  }, /Unauthorized/i);

  // 4. updateBook
  await assert.rejects(async () => {
    await updateBook(1, { title: 'New Title' }, cashierContext, 'cashier');
  }, /Unauthorized/i);

  // 5. archiveBook
  await assert.rejects(async () => {
    await archiveBook(1, cashierContext, 'cashier');
  }, /Unauthorized/i);

  // 6. recordPurchase
  await assert.rejects(async () => {
    await recordPurchase(
      {
        supplierId: 1,
        invoiceNumber: 'INV-001',
        totalCost: 1000,
        amountPaid: 1000,
        paymentStatus: 'paid',
        status: 'received',
      },
      [],
      cashierContext,
      'cashier'
    );
  }, /Unauthorized/i);

  // 7. updatePurchaseStatus
  await assert.rejects(async () => {
    await updatePurchaseStatus(1, 'received', cashierContext, 'cashier');
  }, /Unauthorized/i);

  // 8. recordExpense
  await assert.rejects(async () => {
    await recordExpense(
      {
        category: 'Rent',
        amount: 500,
        description: 'Rent',
        date: '2026-05-10',
      },
      cashierContext,
      'cashier'
    );
  }, /Unauthorized/i);

  // 9. addUser
  await assert.rejects(async () => {
    await addUser(
      {
        username: 'unauth',
        full_name: 'Unauth',
        role: 'cashier',
        password_hash: 'hash',
        is_active: 1,
      },
      cashierContext,
      'cashier'
    );
  }, /Unauthorized/i);

  // 10. updateUser
  await assert.rejects(async () => {
    await updateUser(1, { full_name: 'Hacked' }, cashierContext, 'cashier');
  }, /Unauthorized/i);

  // 11. updateShopSettings
  await assert.rejects(async () => {
    await updateShopSettings({ shop_name: 'Hacked' }, cashierContext, 'cashier');
  }, /Unauthorized/i);

  // 12. cleanBusinessDatabase
  await assert.rejects(async () => {
    await cleanBusinessDatabase(cashierContext, 'cashier', 'DELETE ALL STORE DATA');
  }, /Unauthorized/i);

  // 13. restoreDatabaseBinary
  await assert.rejects(async () => {
    await restoreDatabaseBinary(new Uint8Array([1, 2, 3]), cashierContext, 'cashier');
  }, /Unauthorized/i);
});

test('B1/B2 [TEST]: backup -> restore round trip preserves row counts; failed verification aborts destructive step', async () => {
  const db = await getDatabase();
  const booksBefore = await getUsers();
  const binary = db.export();

  // Verified binary check passes
  const isValid = await verifyDatabaseBinary(binary);
  assert.equal(isValid, true, 'Healthy database binary must pass verification');

  // Corrupted binary fails verification
  const corrupted = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);
  const isCorruptValid = await verifyDatabaseBinary(corrupted);
  assert.equal(isCorruptValid, false, 'Corrupted binary must fail verification');

  // Restore with corrupted binary fails and aborts
  const res = await restoreDatabaseBinary(corrupted, 1, 'admin');
  assert.equal(res.ok, false, 'Corrupted restore must be aborted');

  // Restore with genuine verified binary succeeds and preserves row counts
  const restoreRes = await restoreDatabaseBinary(binary, 1, 'admin');
  assert.equal(restoreRes.ok, true, 'Valid binary restore must succeed');
  const booksAfter = await getUsers();
  assert.equal(booksAfter.length, booksBefore.length, 'Row counts must be preserved after restore');

  // cleanBusinessDatabase requires typed confirmation 'DELETE ALL STORE DATA'
  await assert.rejects(
    async () => {
      await cleanBusinessDatabase(1, 'admin', 'WRONG_CONFIRMATION');
    },
    /confirmation/i,
    'Incorrect confirmation must abort clean'
  );
});

test('resetDatabaseToFreshSetup clears all saved data and resets is_setup_completed to false', async () => {
  // First simulate completed setup
  await updateShopSettings({ is_setup_completed: true, shop_name: 'Temp Shop' }, 1, 'admin');
  const pre = await runQueryOne<{ value: string }>("SELECT value FROM shop_settings WHERE key = 'is_setup_completed';");
  assert.equal(pre?.value, 'true');

  // Perform full factory reset
  await resetDatabaseToFreshSetup();

  // Verify setup status is false and ready for new setup
  const post = await runQueryOne<{ value: string }>("SELECT value FROM shop_settings WHERE key = 'is_setup_completed';");
  assert.equal(post?.value, 'false');

  // Verify business tables are completely clean
  const books = await runQueryOne<{ count: number }>('SELECT COUNT(*) as count FROM books;');
  assert.equal(Number(books?.count), 0);
  const sales = await runQueryOne<{ count: number }>('SELECT COUNT(*) as count FROM sales;');
  assert.equal(Number(sales?.count), 0);
});

test('C1 [TEST]: corrupt stored bytes lead to DatabaseRecoveryRequired and the bytes are preserved, no fresh DB is created', async () => {
  __resetDatabaseStateForTests();
  const corruptBytes = new Uint8Array([99, 101, 102, 103, 104, 105]);
  const mockStorage = new Map<string, Uint8Array>();
  mockStorage.set('main_db', corruptBytes);
  __setMockStorageForTests(mockStorage);

  try {
    await assert.rejects(
      async () => {
        await getDatabase();
      },
      (err: any) => {
        assert.ok(err instanceof DatabaseRecoveryRequired || err?.name === 'DatabaseRecoveryRequired');
        assert.deepEqual(err.corruptData, corruptBytes);
        return true;
      },
      'Corrupt bytes must throw DatabaseRecoveryRequired'
    );

    // Verify stored bytes were copied to 'corrupt' in storage
    const preserved = mockStorage.get('corrupt');
    assert.ok(preserved, 'Corrupt bytes must be preserved in corrupt store');
    assert.deepEqual(preserved, corruptBytes, 'Corrupt record must exactly match original corrupt bytes');
  } finally {
    __resetDatabaseStateForTests();
    __setMockStorageForTests(null);
  }
});

test('C2 [TEST]: a failing persist sets persistenceError', async () => {
  __resetDatabaseStateForTests();
  const db = await getDatabase();
  assert.equal(getPersistenceError(), null);

  __setForcePersistFailureForTests(true);
  try {
    await assert.rejects(
      async () => {
        await persistDbToStorage(db);
      },
      /persistence write failure/i
    );
    assert.ok(getPersistenceError(), 'persistenceError must be set on failure');
    assert.match(getPersistenceError()!, /persistence write failure/i);
  } finally {
    __setForcePersistFailureForTests(false);
    __resetDatabaseStateForTests();
  }
});

test('C3 [TEST]: foreign keys are ON after a save', async () => {
  __resetDatabaseStateForTests();
  const db = await getDatabase();
  await persistDbToStorage(db);

  const fkCheck = db.exec('PRAGMA foreign_keys;');
  assert.equal(fkCheck[0]?.values[0]?.[0], 1, 'PRAGMA foreign_keys must be 1 (ON) after persistDbToStorage');
});

