import test from 'node:test';
import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import { SCHEMA_SQL } from './schema.ts';
import { getSeedQueries } from './seed.ts';

test('database schema and seed data initializes cleanly with foreign keys', async () => {
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

  // Check integrity
  const check = db.exec('PRAGMA integrity_check;');
  assert.equal(check[0]?.values[0]?.[0], 'ok');

  // Verify books count
  const booksRes = db.exec('SELECT COUNT(*) FROM books WHERE is_archived = 0;');
  const bookCount = Number(booksRes[0]?.values[0]?.[0]);
  assert.ok(bookCount > 10, 'Should have seeded at least 10 books');

  // Verify users
  const usersRes = db.exec('SELECT username, role FROM users;');
  assert.equal(usersRes[0]?.values.length, 3);
});

test('atomic transaction deducts stock and records sale', async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');
  db.run(SCHEMA_SQL);
  const seeds = await getSeedQueries();
  for (const q of seeds) {
    db.run(q);
  }

  // Read initial stock of book 1 (Fathers of Nations)
  const initialRes = db.exec('SELECT quantity FROM books WHERE id = 1;');
  const initialQty = Number(initialRes[0]?.values[0]?.[0]);

  // Simulate atomic sale of 3 units
  db.run('BEGIN TRANSACTION;');
  const newQty = initialQty - 3;
  db.run('UPDATE books SET quantity = ? WHERE id = 1;', [newQty]);
  db.run(
    `INSERT INTO sales (receipt_number, user_id, cashier_name, subtotal, discount_total, tax_total, grand_total, total_paid, change_amount, payment_method, is_credit, is_voided, created_at)
     VALUES ('RCP-TEST-001', 1, 'Admin', 1950, 0, 0, 1950, 2000, 50, 'cash', 0, 0, '2026-10-19T10:00:00Z');`
  );
  db.run(
    `INSERT INTO sale_items (sale_id, book_id, book_title, quantity, unit_purchase_price, unit_selling_price, discount_amount, total_price)
     VALUES (last_insert_rowid(), 1, 'Fathers of Nations', 3, 450, 650, 0, 1950);`
  );
  db.run('COMMIT;');

  // Verify updated quantity
  const postRes = db.exec('SELECT quantity FROM books WHERE id = 1;');
  assert.equal(Number(postRes[0]?.values[0]?.[0]), initialQty - 3);

  // Check integrity still intact
  const check = db.exec('PRAGMA integrity_check;');
  assert.equal(check[0]?.values[0]?.[0], 'ok');
});
