import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { SCHEMA_SQL } from './schema.ts';
import { getSeedQueries } from './seed.ts';

test('database schema and initialization has zero sample business data', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');

  // Execute schema
  db.run(SCHEMA_SQL);

  // Execute seed queries
  const seeds = await getSeedQueries();
  for (const q of seeds) {
    db.run(q);
  }

  // 1. Verify PRAGMA integrity
  const check = db.exec('PRAGMA integrity_check;');
  assert.equal(check[0]?.values[0]?.[0], 'ok');

  // 2. Verify all business entities are completely empty (NO sample data)
  const booksRes = db.exec('SELECT COUNT(*) FROM books;');
  assert.equal(Number(booksRes[0]?.values[0]?.[0]), 0, 'Must have 0 sample books');

  const suppliersRes = db.exec('SELECT COUNT(*) FROM suppliers;');
  assert.equal(Number(suppliersRes[0]?.values[0]?.[0]), 0, 'Must have 0 sample suppliers');

  const purchasesRes = db.exec('SELECT COUNT(*) FROM purchases;');
  assert.equal(Number(purchasesRes[0]?.values[0]?.[0]), 0, 'Must have 0 sample purchases');

  const salesRes = db.exec('SELECT COUNT(*) FROM sales;');
  assert.equal(Number(salesRes[0]?.values[0]?.[0]), 0, 'Must have 0 sample sales');

  const expensesRes = db.exec('SELECT COUNT(*) FROM expenses;');
  assert.equal(Number(expensesRes[0]?.values[0]?.[0]), 0, 'Must have 0 sample expenses');

  // 3. Verify essential admin and cashier accounts & configuration exist
  const usersRes = db.exec('SELECT username, role FROM users ORDER BY id ASC;');
  assert.equal(usersRes[0]?.values.length, 2, 'Must have exactly 2 initial staff accounts: admin and cashier');
  assert.equal(usersRes[0]?.values[0]?.[0], 'admin');
  assert.equal(usersRes[0]?.values[1]?.[0], 'cashier');

  const settingsRes = db.exec('SELECT COUNT(*) FROM shop_settings;');
  assert.ok(Number(settingsRes[0]?.values[0]?.[0]) >= 5, 'Shop settings must be initialized');
});

test('credit module and tables are completely removed from database structure', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run(SCHEMA_SQL);

  // Check sqlite_master for credit tables
  const creditTablesRes = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND (name='credit_payments' OR name='customers');"
  );
  assert.equal(creditTablesRes.length, 0, 'Neither credit_payments nor customers tables should exist in schema');

  // Check sales table schema does not contain is_credit column
  const tableInfo = db.exec("PRAGMA table_info('sales');");
  const columnNames = (tableInfo[0]?.values || []).map((col) => col[1]);
  assert.equal(columnNames.includes('is_credit'), false, 'sales table must not contain is_credit column');
});

test('manual book entry and atomic non-credit point-of-sale deduction works', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA_SQL);
  const seeds = await getSeedQueries();
  for (const q of seeds) {
    db.run(q);
  }

  const now = new Date().toISOString();

  // 1. Manually add genuine book with opening stock
  db.run(
    `INSERT INTO books (title, author, publisher, category, purchase_price, selling_price, quantity, reorder_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    ['Fathers of Nations', 'Paul B. Vitta', 'Oxford University Press', 'KCSE Set Books', 450, 650, 20, 5, now, now]
  );

  const bookRes = db.exec('SELECT id, quantity, selling_price FROM books WHERE id = 1;');
  assert.equal(Number(bookRes[0]?.values[0]?.[1]), 20);
  assert.equal(Number(bookRes[0]?.values[0]?.[2]), 650);

  // 2. Perform atomic sale of 3 copies via cash
  db.run('BEGIN TRANSACTION;');
  const soldQty = 3;
  const unitSellingPrice = 650;
  const unitPurchasePrice = 450;
  const grandTotal = soldQty * unitSellingPrice; // 1950

  db.run('UPDATE books SET quantity = quantity - ? WHERE id = 1;', [soldQty]);
  db.run(
    `INSERT INTO sales (receipt_number, user_id, cashier_name, customer_name, subtotal, discount_total, tax_total, grand_total, total_paid, change_amount, payment_method, is_voided, created_at)
     VALUES ('RCP-2026-00001', 1, 'Cashier Admin', 'Walk-in Customer', ?, 0, 0, ?, 2000, 50, 'cash', 0, ?);`,
    [grandTotal, grandTotal, now]
  );
  db.run(
    `INSERT INTO sale_items (sale_id, book_id, book_title, quantity, unit_purchase_price, unit_selling_price, discount_amount, total_price)
     VALUES (last_insert_rowid(), 1, 'Fathers of Nations', ?, ?, ?, 0, ?);`,
    [soldQty, unitPurchasePrice, unitSellingPrice, grandTotal]
  );
  db.run('COMMIT;');

  // 3. Verify stock has reduced to 17
  const updatedBook = db.exec('SELECT quantity FROM books WHERE id = 1;');
  assert.equal(Number(updatedBook[0]?.values[0]?.[0]), 17);

  // 4. Verify financial reporting calculation on genuine records
  const revRes = db.exec('SELECT SUM(grand_total) FROM sales WHERE is_voided = 0;');
  assert.equal(Number(revRes[0]?.values[0]?.[0]), 1950);

  const cogsRes = db.exec(
    'SELECT SUM(si.quantity * si.unit_purchase_price) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.is_voided = 0;'
  );
  assert.equal(Number(cogsRes[0]?.values[0]?.[0]), 1350);

  // Gross profit = 1950 - 1350 = 600
  const grossProfit = Number(revRes[0]?.values[0]?.[0]) - Number(cogsRes[0]?.values[0]?.[0]);
  assert.equal(grossProfit, 600);
});
