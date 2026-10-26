import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
import { SCHEMA_SQL } from './schema.ts';
import { getSeedQueries } from './seed.ts';
import type { Book, Expense, Sale, SaleItem, ShopSettings, StockMovement, Supplier, User } from '../types/index.ts';

const DB_STORAGE_KEY = 'kitabupos_sqlite_db_v1';
const BACKUP_TIMESTAMP_KEY = 'kitabupos_last_backup_time';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
let isInitializing = false;
let initPromise: Promise<Database> | null = null;

// Helpers to save database to storage
async function persistDbToStorage(db: Database): Promise<void> {
  try {
    const binary = db.export();
    if (typeof window !== 'undefined' && window.indexedDB) {
      await saveToIndexedDB(binary);
    } else if (typeof localStorage !== 'undefined') {
      // Fallback for smaller environments if needed
      const base64 = uint8ArrayToBase64(binary);
      try {
        localStorage.setItem(DB_STORAGE_KEY, base64);
      } catch {
        // LocalStorage quota may be exceeded; IndexedDB handles large binaries
      }
    }
  } catch (err) {
    console.error('Failed to persist SQLite database:', err);
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

// IndexedDB Storage Engine for robust local storage
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KitabuPOS_DB_Storage', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sqlite')) {
        db.createObjectStore('sqlite');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveToIndexedDB(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction('sqlite', 'readwrite');
    const store = tx.objectStore('sqlite');
    const req = store.put(data, 'main_db');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction('sqlite', 'readonly');
      const store = tx.objectStore('sqlite');
      const req = store.get('main_db');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!SQL) {
      if (typeof window !== 'undefined') {
        SQL = await initSqlJs({
          locateFile: (file) => `/${file}`,
        });
      } else {
        SQL = await initSqlJs();
      }
    }

    let existingData: Uint8Array | null = null;
    if (typeof window !== 'undefined' && window.indexedDB) {
      existingData = await loadFromIndexedDB();
    }
    if (!existingData && typeof localStorage !== 'undefined') {
      const base64 = localStorage.getItem(DB_STORAGE_KEY);
      if (base64) {
        try {
          existingData = base64ToUint8Array(base64);
        } catch (e) {
          console.warn('Could not parse stored base64 DB:', e);
        }
      }
    }

    let db: Database;
    if (existingData && existingData.length > 0) {
      try {
        db = new SQL.Database(existingData);
        // Verify integrity
        const check = db.exec('PRAGMA integrity_check;');
        if (check[0]?.values[0]?.[0] !== 'ok') {
          console.warn('Integrity check failed on stored DB, re-initializing fresh schema.');
          db = new SQL.Database();
          await initFreshDatabase(db);
        } else {
          await migrateDatabase(db);
        }
      } catch (err) {
        console.warn('Failed to load existing database, starting fresh:', err);
        db = new SQL.Database();
        await initFreshDatabase(db);
      }
    } else {
      db = new SQL.Database();
      await initFreshDatabase(db);
    }

    db.run('PRAGMA foreign_keys = ON;');
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

async function migrateDatabase(db: Database): Promise<void> {
  // Ensure schema_migrations table exists
  db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);`);
  const versionsRes = db.exec('SELECT version FROM schema_migrations ORDER BY version ASC;');
  const appliedVersions = (versionsRes[0]?.values || []).map((v) => Number(v[0]));
  const now = new Date().toISOString();

  if (!appliedVersions.includes(1)) {
    db.run(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, '${now}');`);
  }

  if (!appliedVersions.includes(2)) {
    // Migration 2: Remove customer credit dependencies safely and preserve existing genuine data
    try {
      const preMigBinary = db.export();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kitabupos_pre_migration_v2_backup', uint8ArrayToBase64(preMigBinary));
      }
    } catch (e) {
      console.warn('Pre-migration backup warning:', e);
    }

    db.run('BEGIN TRANSACTION;');
    try {
      // Drop credit_payments table if exists
      db.run('DROP TABLE IF EXISTS credit_payments;');
      // Drop customers table if exists
      db.run('DROP TABLE IF EXISTS customers;');

      db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (2, '${now}');`);
      db.run('COMMIT;');
      await persistDbToStorage(db);
    } catch (migErr) {
      db.run('ROLLBACK;');
      console.error('Migration v2 failed:', migErr);
      throw migErr;
    }
  }

  if (!appliedVersions.includes(3)) {
    // Migration 3: Remove manager account and enforce only admin and cashier logins
    db.run('BEGIN TRANSACTION;');
    try {
      db.run("DELETE FROM users WHERE username = 'manager' OR role = 'manager';");
      db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (3, '${now}');`);
      db.run('COMMIT;');
      await persistDbToStorage(db);
    } catch (migErr) {
      db.run('ROLLBACK;');
      console.error('Migration v3 failed:', migErr);
      throw migErr;
    }
  }
}

async function initFreshDatabase(db: Database): Promise<void> {
  db.run(SCHEMA_SQL);
  const seedQueries = await getSeedQueries();
  for (const query of seedQueries) {
    try {
      db.run(query);
    } catch (e) {
      console.warn('Seed statement error (ignored if already existing):', e);
    }
  }
  db.run(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (3, '${new Date().toISOString()}');`);
  await persistDbToStorage(db);
}

// Core database executor helper
export async function runQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export async function runQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await runQuery<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function runExecute(sql: string, params: any[] = []): Promise<{ lastInsertId: number; changes: number }> {
  const db = await getDatabase();
  db.run(sql, params);
  const lastIdRes = db.exec('SELECT last_insert_rowid() as id, changes() as changes;');
  const lastInsertId = Number(lastIdRes[0]?.values[0]?.[0] || 0);
  const changes = Number(lastIdRes[0]?.values[0]?.[1] || 0);
  await persistDbToStorage(db);
  return { lastInsertId, changes };
}

// Integrity Check
export async function checkDatabaseIntegrity(): Promise<{ ok: boolean; message: string }> {
  const db = await getDatabase();
  const res = db.exec('PRAGMA integrity_check;');
  const status = res[0]?.values[0]?.[0] as string;
  if (status === 'ok') {
    return { ok: true, message: 'SQLite Database Integrity verified. All pages and indexes valid (0 errors).' };
  }
  return { ok: false, message: `Integrity check failed: ${status}` };
}

// Backup & Export
export async function exportDatabaseBinary(): Promise<Uint8Array> {
  const db = await getDatabase();
  const binary = db.export();
  const now = new Date().toISOString();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, now);
  }
  await runExecute("UPDATE shop_settings SET value = ? WHERE key = 'last_backup_at';", [now]);
  return binary;
}

export async function getLastBackupTimestamp(): Promise<string | null> {
  if (typeof localStorage !== 'undefined') {
    const val = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (val) return val;
  }
  const setting = await runQueryOne<{ value: string }>("SELECT value FROM shop_settings WHERE key = 'last_backup_at'");
  return setting?.value || null;
}

// Restore Database from binary file
export async function restoreDatabaseBinary(data: Uint8Array, adminUserId: number, adminName: string): Promise<{ ok: boolean; message: string }> {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: (file) => `/${file}` });
  }

  // 1. Safety check candidate database
  let candidateDb: Database;
  try {
    candidateDb = new SQL.Database(data);
    const check = candidateDb.exec('PRAGMA integrity_check;');
    if (check[0]?.values[0]?.[0] !== 'ok') {
      return { ok: false, message: 'Restoration aborted: The provided backup file is corrupted or not a valid SQLite database.' };
    }
    // Verify core tables exist
    const tables = candidateDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('books', 'sales', 'users');");
    if (!tables[0] || tables[0].values.length < 3) {
      return { ok: false, message: 'Restoration aborted: Missing required KitabuPOS tables (books, sales, users).' };
    }
  } catch (err: any) {
    return { ok: false, message: `Invalid database format: ${err.message}` };
  }

  // 2. Pre-restore automatic backup of current DB
  if (dbInstance) {
    const preRestoreBackup = dbInstance.export();
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kitabupos_pre_restore_safety_backup', uint8ArrayToBase64(preRestoreBackup));
    }
  }

  // 3. Switch active instance
  dbInstance = candidateDb;
  dbInstance.run('PRAGMA foreign_keys = ON;');
  await persistDbToStorage(dbInstance);

  // 4. Log audit record
  await logAudit(adminUserId, adminName, 'DATABASE_RESTORE', 'system', '1', 'Restored database from external backup file.');

  return { ok: true, message: 'Database restored successfully! All records, inventory, and transactions loaded.' };
}

// Audit logger
export async function logAudit(
  userId: number,
  userName: string,
  action: string,
  entity: string,
  entityId: string | number,
  details: string
): Promise<void> {
  const now = new Date().toISOString();
  await runExecute(
    `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [userId, userName, action, entity, String(entityId), details, now]
  );
}

// ==========================================
// High-Level Domain Operations
// ==========================================

export async function getDashboardMetrics(): Promise<{
  todaySalesCount: number;
  todayRevenue: number;
  todayProfit: number;
  todayCashRevenue: number;
  todayMpesaRevenue: number;
  todayCardRevenue: number;
  totalInventoryCount: number;
  totalInventoryCostValue: number;
  totalInventoryRetailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentSales: Sale[];
  lowStockBooks: Array<{ id: number; title: string; category: string; quantity: number; reorder_level: number; purchase_price: number }>;
  lastBackupTime: string | null;
}> {
  const db = await getDatabase();
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Today sales & payment split
  const todaySalesRes = await runQuery<{
    count: number;
    total: number;
    cashTotal: number;
    mpesaTotal: number;
    cardTotal: number;
  }>(
    `SELECT 
      COUNT(*) as count, 
      COALESCE(SUM(grand_total), 0) as total,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN grand_total WHEN payment_method = 'split' THEN total_paid - change_amount ELSE 0 END), 0) as cashTotal,
      COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN grand_total ELSE 0 END), 0) as mpesaTotal,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN grand_total ELSE 0 END), 0) as cardTotal
     FROM sales 
     WHERE is_voided = 0 AND created_at LIKE ?;`,
    [`${today}%`]
  );
  const todaySalesCount = todaySalesRes[0]?.count || 0;
  const todayRevenue = todaySalesRes[0]?.total || 0;
  const todayCashRevenue = todaySalesRes[0]?.cashTotal || 0;
  const todayMpesaRevenue = todaySalesRes[0]?.mpesaTotal || 0;
  const todayCardRevenue = todaySalesRes[0]?.cardTotal || 0;

  // Today estimated COGS and profit
  const cogsRes = await runQuery<{ cogs: number }>(
    `SELECT COALESCE(SUM(si.quantity * si.unit_purchase_price), 0) as cogs
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE s.is_voided = 0 AND s.created_at LIKE ?;`,
    [`${today}%`]
  );
  const todayCogs = cogsRes[0]?.cogs || 0;
  const todayProfit = Math.round((todayRevenue - todayCogs) * 100) / 100;

  // Inventory valuation
  const invRes = await runQuery<{
    totalQty: number;
    costVal: number;
    retailVal: number;
    lowStock: number;
    outStock: number;
  }>(
    `SELECT 
      COALESCE(SUM(quantity), 0) as totalQty,
      COALESCE(SUM(quantity * purchase_price), 0) as costVal,
      COALESCE(SUM(quantity * selling_price), 0) as retailVal,
      COALESCE(SUM(CASE WHEN quantity <= reorder_level AND quantity > 0 THEN 1 ELSE 0 END), 0) as lowStock,
      COALESCE(SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END), 0) as outStock
     FROM books
     WHERE is_archived = 0;`
  );

  // Low stock titles for actionable purchase order creation
  const lowStockBooks = await runQuery<{
    id: number;
    title: string;
    category: string;
    quantity: number;
    reorder_level: number;
    purchase_price: number;
  }>(
    `SELECT id, title, category, quantity, reorder_level, purchase_price
     FROM books
     WHERE is_archived = 0 AND quantity <= reorder_level
     ORDER BY quantity ASC, title ASC
     LIMIT 8;`
  );

  // Recent 6 transactions
  const recentSales = await runQuery<Sale>(
    `SELECT id, receipt_number, cashier_name, customer_name, grand_total, payment_method, is_voided, created_at
     FROM sales
     ORDER BY id DESC
     LIMIT 6;`
  );

  const lastBackupTime = await getLastBackupTimestamp();

  return {
    todaySalesCount,
    todayRevenue,
    todayProfit,
    todayCashRevenue,
    todayMpesaRevenue,
    todayCardRevenue,
    totalInventoryCount: invRes[0]?.totalQty || 0,
    totalInventoryCostValue: Math.round((invRes[0]?.costVal || 0) * 100) / 100,
    totalInventoryRetailValue: Math.round((invRes[0]?.retailVal || 0) * 100) / 100,
    lowStockCount: invRes[0]?.lowStock || 0,
    outOfStockCount: invRes[0]?.outStock || 0,
    recentSales,
    lowStockBooks,
    lastBackupTime,
  };
}

// Books
export async function getBooks(options?: {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
  includeArchived?: boolean;
}): Promise<Book[]> {
  let sql = 'SELECT * FROM books WHERE 1=1';
  const params: any[] = [];

  if (!options?.includeArchived) {
    sql += ' AND is_archived = 0';
  }

  if (options?.category && options.category !== 'All') {
    sql += ' AND category = ?';
    params.push(options.category);
  }

  if (options?.lowStockOnly) {
    sql += ' AND quantity <= reorder_level';
  }

  if (options?.search && options.search.trim()) {
    const q = `%${options.search.trim()}%`;
    sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR barcode LIKE ? OR publisher LIKE ?)';
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY title ASC';
  return runQuery<Book>(sql, params);
}

export async function addBook(
  book: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'is_archived'>,
  userId: number,
  userName: string
): Promise<number> {
  const now = new Date().toISOString();
  // Check duplicate ISBN if provided
  if (book.isbn && book.isbn.trim()) {
    const existing = await runQueryOne('SELECT id, title FROM books WHERE isbn = ? AND is_archived = 0', [book.isbn.trim()]);
    if (existing) {
      throw new Error(`A book with ISBN "${book.isbn}" already exists: "${existing.title}".`);
    }
  }

  const { lastInsertId } = await runExecute(
    `INSERT INTO books (isbn, barcode, title, author, publisher, category, edition, purchase_price, selling_price, quantity, reorder_level, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
    [
      book.isbn?.trim() || null,
      book.barcode?.trim() || null,
      book.title.trim(),
      book.author.trim(),
      book.publisher.trim(),
      book.category.trim(),
      book.edition?.trim() || null,
      book.purchase_price,
      book.selling_price,
      book.quantity,
      book.reorder_level || 5,
      now,
      now,
    ]
  );

  if (book.quantity > 0) {
    await runExecute(
      `INSERT INTO stock_movements (book_id, movement_type, quantity_change, previous_quantity, new_quantity, unit_cost, reference_type, notes, user_id, created_at)
       VALUES (?, 'initial', ?, 0, ?, ?, 'manual', 'Initial inventory opening count', ?, ?);`,
      [lastInsertId, book.quantity, book.quantity, book.purchase_price, userId, now]
    );
  }

  await logAudit(userId, userName, 'BOOK_CREATE', 'book', lastInsertId, `Added new book "${book.title}" (Qty: ${book.quantity}, Price: KES ${book.selling_price}).`);
  return lastInsertId;
}

export async function updateBook(
  id: number,
  book: Partial<Book>,
  userId: number,
  userName: string
): Promise<void> {
  const current = await runQueryOne<Book>('SELECT * FROM books WHERE id = ?', [id]);
  if (!current) throw new Error('Book not found');

  const now = new Date().toISOString();

  // Check duplicate ISBN if changed
  if (book.isbn && book.isbn.trim() && book.isbn !== current.isbn) {
    const existing = await runQueryOne('SELECT id, title FROM books WHERE isbn = ? AND id != ? AND is_archived = 0', [book.isbn.trim(), id]);
    if (existing) {
      throw new Error(`A book with ISBN "${book.isbn}" already exists: "${existing.title}".`);
    }
  }

  await runExecute(
    `UPDATE books SET
      isbn = ?,
      barcode = ?,
      title = ?,
      author = ?,
      publisher = ?,
      category = ?,
      edition = ?,
      purchase_price = ?,
      selling_price = ?,
      reorder_level = ?,
      updated_at = ?
     WHERE id = ?;`,
    [
      book.isbn !== undefined ? book.isbn?.trim() || null : current.isbn,
      book.barcode !== undefined ? book.barcode?.trim() || null : current.barcode,
      book.title !== undefined ? book.title.trim() : current.title,
      book.author !== undefined ? book.author.trim() : current.author,
      book.publisher !== undefined ? book.publisher.trim() : current.publisher,
      book.category !== undefined ? book.category.trim() : current.category,
      book.edition !== undefined ? book.edition?.trim() || null : current.edition,
      book.purchase_price !== undefined ? book.purchase_price : current.purchase_price,
      book.selling_price !== undefined ? book.selling_price : current.selling_price,
      book.reorder_level !== undefined ? book.reorder_level : current.reorder_level,
      now,
      id,
    ]
  );

  let details = `Updated book details for "${book.title || current.title}".`;
  if (book.selling_price !== undefined && book.selling_price !== current.selling_price) {
    details += ` Price changed from KES ${current.selling_price} to KES ${book.selling_price}.`;
  }
  await logAudit(userId, userName, 'BOOK_UPDATE', 'book', id, details);
}

export async function archiveBook(id: number, userId: number, userName: string): Promise<void> {
  const current = await runQueryOne<Book>('SELECT title FROM books WHERE id = ?', [id]);
  await runExecute('UPDATE books SET is_archived = 1 WHERE id = ?;', [id]);
  await logAudit(userId, userName, 'BOOK_ARCHIVE', 'book', id, `Archived book "${current?.title}".`);
}

export async function bulkArchiveBooks(ids: number[], userId: number, userName: string): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await runExecute(`UPDATE books SET is_archived = 1 WHERE id IN (${placeholders});`, ids);
  await logAudit(userId, userName, 'BOOK_BULK_ARCHIVE', 'book', ids.length, `Archived ${ids.length} book titles.`);
}

export async function bulkUpdateCategory(ids: number[], newCategory: string, userId: number, userName: string): Promise<void> {
  if (ids.length === 0 || !newCategory.trim()) return;
  const placeholders = ids.map(() => '?').join(',');
  await runExecute(`UPDATE books SET category = ? WHERE id IN (${placeholders});`, [newCategory.trim(), ...ids]);
  await logAudit(userId, userName, 'BOOK_BULK_CATEGORY', 'book', ids.length, `Updated category to "${newCategory.trim()}" for ${ids.length} books.`);
}

// Stock Adjustment
export async function adjustStock(
  bookId: number,
  quantityChange: number,
  movementType: 'purchase' | 'damage' | 'adjustment' | 'customer_return' | 'purchase_return',
  notes: string,
  userId: number,
  userName: string,
  unitCost?: number
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // Run in immediate transaction
  db.run('BEGIN TRANSACTION;');
  try {
    const bookRes = db.exec(`SELECT title, quantity, purchase_price FROM books WHERE id = ${bookId};`);
    if (!bookRes[0] || bookRes[0].values.length === 0) {
      throw new Error('Book not found');
    }
    const title = bookRes[0].values[0][0] as string;
    const prevQty = Number(bookRes[0].values[0][1]);
    const cost = unitCost !== undefined ? unitCost : Number(bookRes[0].values[0][2]);

    const newQty = prevQty + quantityChange;
    if (newQty < 0) {
      throw new Error(`Cannot adjust stock below zero. Current stock: ${prevQty}, Requested change: ${quantityChange}`);
    }

    // Update book stock
    db.run(`UPDATE books SET quantity = ?, updated_at = ? WHERE id = ?;`, [newQty, now, bookId]);

    // Record movement
    db.run(
      `INSERT INTO stock_movements (book_id, movement_type, quantity_change, previous_quantity, new_quantity, unit_cost, reference_type, notes, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'adjustment', ?, ?, ?);`,
      [bookId, movementType, quantityChange, prevQty, newQty, cost, notes || '', userId, now]
    );

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName,
      'STOCK_ADJUSTMENT',
      'book',
      bookId,
      `Adjusted stock for "${title}" (${quantityChange > 0 ? '+' : ''}${quantityChange}). Previous: ${prevQty}, New: ${newQty}. Reason: ${movementType} (${notes || 'No note'}).`
    );
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

export async function getStockMovements(bookId?: number): Promise<StockMovement[]> {
  let sql = `
    SELECT sm.*, b.title as book_title, u.full_name as user_name
    FROM stock_movements sm
    JOIN books b ON sm.book_id = b.id
    LEFT JOIN users u ON sm.user_id = u.id
  `;
  const params: any[] = [];
  if (bookId) {
    sql += ' WHERE sm.book_id = ?';
    params.push(bookId);
  }
  sql += ' ORDER BY sm.id DESC LIMIT 200;';
  return runQuery<StockMovement>(sql, params);
}

// Point of Sale - Atomic Transaction (Cash, M-Pesa, Card, Split)
export async function processSale(
  sale: {
    cashierName: string;
    customerName?: string;
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    totalPaid: number;
    changeAmount: number;
    paymentMethod: 'cash' | 'mpesa' | 'split' | 'card';
    paymentReference?: string;
    paymentsJson?: string;
  },
  items: Array<{
    bookId: number;
    bookTitle: string;
    isbn?: string;
    quantity: number;
    unitPurchasePrice: number;
    unitSellingPrice: number;
    discountAmount: number;
    totalPrice: number;
  }>,
  userId: number,
  userName: string
): Promise<{ saleId: number; receiptNumber: string }> {
  if (items.length === 0) {
    throw new Error('Sale must contain at least one item.');
  }

  const db = await getDatabase();
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  db.run('BEGIN TRANSACTION;');
  try {
    // 1. Verify stock availability for all items before any changes
    for (const item of items) {
      const bookRes = db.exec(`SELECT title, quantity FROM books WHERE id = ${item.bookId};`);
      if (!bookRes[0] || bookRes[0].values.length === 0) {
        throw new Error(`Book "${item.bookTitle}" was not found in the database.`);
      }
      const availableQty = Number(bookRes[0].values[0][1]);
      if (item.quantity > availableQty) {
        throw new Error(`Insufficient stock for "${item.bookTitle}". Available: ${availableQty}, Requested: ${item.quantity}.`);
      }
    }

    // 2. Generate sequential receipt number with configured prefix
    const maxIdRes = db.exec('SELECT COALESCE(MAX(id), 0) + 1 FROM sales;');
    const nextSaleId = Number(maxIdRes[0]?.values[0]?.[0] || 1);
    const prefixRes = db.exec("SELECT value FROM shop_settings WHERE key = 'receipt_prefix';");
    const prefix = (prefixRes[0]?.values[0]?.[0] as string)?.trim() || 'RCP';
    const receiptNumber = `${prefix}-${year}-${String(nextSaleId).padStart(5, '0')}`;

    // 3. Insert sale header
    db.run(
      `INSERT INTO sales (
        id, receipt_number, user_id, cashier_name, customer_name,
        subtotal, discount_total, tax_total, grand_total, total_paid, change_amount,
        payment_method, payment_reference, payments_json, is_voided, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?);`,
      [
        nextSaleId,
        receiptNumber,
        userId,
        sale.cashierName,
        sale.customerName?.trim() || 'Walk-in Customer',
        sale.subtotal,
        sale.discountTotal,
        sale.taxTotal,
        sale.grandTotal,
        sale.totalPaid,
        sale.changeAmount,
        sale.paymentMethod,
        sale.paymentReference || null,
        sale.paymentsJson || null,
        now,
      ]
    );

    // 4. Insert items, deduct inventory, and record stock movement
    for (const item of items) {
      db.run(
        `INSERT INTO sale_items (
          sale_id, book_id, book_title, isbn, quantity,
          unit_purchase_price, unit_selling_price, discount_amount, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          nextSaleId,
          item.bookId,
          item.bookTitle,
          item.isbn || null,
          item.quantity,
          item.unitPurchasePrice,
          item.unitSellingPrice,
          item.discountAmount,
          item.totalPrice,
        ]
      );

      // Get current stock
      const bookRes = db.exec(`SELECT quantity FROM books WHERE id = ${item.bookId};`);
      const prevQty = Number(bookRes[0].values[0][0]);
      const newQty = prevQty - item.quantity;

      // Deduct stock
      db.run(`UPDATE books SET quantity = ?, updated_at = ? WHERE id = ?;`, [newQty, now, item.bookId]);

      // Record movement
      db.run(
        `INSERT INTO stock_movements (
          book_id, movement_type, quantity_change, previous_quantity, new_quantity,
          unit_cost, reference_type, reference_id, notes, user_id, created_at
        ) VALUES (?, 'sale', ?, ?, ?, ?, 'sale', ?, ?, ?, ?);`,
        [
          item.bookId,
          -item.quantity,
          prevQty,
          newQty,
          item.unitPurchasePrice,
          receiptNumber,
          `Sale #${receiptNumber}`,
          userId,
          now,
        ]
      );
    }

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName,
      'SALE_COMPLETE',
      'sale',
      nextSaleId,
      `Completed sale #${receiptNumber} for KES ${sale.grandTotal.toFixed(2)} (${sale.paymentMethod.toUpperCase()}${sale.paymentReference ? ': ' + sale.paymentReference : ''}). Items: ${items.length}.`
    );

    return { saleId: nextSaleId, receiptNumber };
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

// Void Sale (Restores inventory and records audit)
export async function voidSale(
  saleId: number,
  reason: string,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  db.run('BEGIN TRANSACTION;');
  try {
    const saleRes = db.exec(`SELECT receipt_number, is_voided, grand_total FROM sales WHERE id = ${saleId};`);
    if (!saleRes[0] || saleRes[0].values.length === 0) {
      throw new Error('Sale not found');
    }
    const receiptNumber = saleRes[0].values[0][0] as string;
    const isVoided = Number(saleRes[0].values[0][1]);
    const grandTotal = Number(saleRes[0].values[0][2]);

    if (isVoided === 1) {
      throw new Error(`Sale #${receiptNumber} is already voided.`);
    }

    // Get sale items to reverse stock
    const itemsRes = db.exec(`SELECT book_id, quantity, unit_purchase_price FROM sale_items WHERE sale_id = ${saleId};`);
    if (itemsRes[0]) {
      for (const row of itemsRes[0].values) {
        const bookId = Number(row[0]);
        const quantity = Number(row[1]);
        const unitCost = Number(row[2]);

        const bookQtyRes = db.exec(`SELECT quantity FROM books WHERE id = ${bookId};`);
        const prevQty = Number(bookQtyRes[0]?.values[0]?.[0] || 0);
        const newQty = prevQty + quantity;

        // Restore stock
        db.run(`UPDATE books SET quantity = ?, updated_at = ? WHERE id = ?;`, [newQty, now, bookId]);

        // Record stock movement
        db.run(
          `INSERT INTO stock_movements (
            book_id, movement_type, quantity_change, previous_quantity, new_quantity,
            unit_cost, reference_type, reference_id, notes, user_id, created_at
          ) VALUES (?, 'sale_void', ?, ?, ?, ?, 'sale', ?, ?, ?, ?);`,
          [
            bookId,
            quantity,
            prevQty,
            newQty,
            unitCost,
            receiptNumber,
            `Voided sale #${receiptNumber}: ${reason}`,
            userId,
            now,
          ]
        );
      }
    }

    // Mark sale voided
    db.run(
      `UPDATE sales SET is_voided = 1, void_reason = ?, voided_by_user_id = ?, voided_at = ? WHERE id = ?;`,
      [reason, userId, now, saleId]
    );

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName,
      'SALE_VOID',
      'sale',
      saleId,
      `Voided sale #${receiptNumber} (KES ${grandTotal.toFixed(2)}). Reason: ${reason}. Inventory restocked.`
    );
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

export async function getSales(options?: {
  startDate?: string;
  endDate?: string;
  search?: string;
  customerId?: number;
  paymentMethod?: string;
  limit?: number;
}): Promise<Sale[]> {
  let sql = 'SELECT * FROM sales WHERE 1=1';
  const params: any[] = [];

  if (options?.startDate) {
    sql += ' AND substr(created_at, 1, 10) >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    sql += ' AND substr(created_at, 1, 10) <= ?';
    params.push(options.endDate);
  }
  if (options?.customerId) {
    sql += ' AND customer_id = ?';
    params.push(options.customerId);
  }
  if (options?.paymentMethod && options.paymentMethod !== 'all') {
    sql += ' AND payment_method = ?';
    params.push(options.paymentMethod);
  }
  if (options?.search && options.search.trim()) {
    const q = `%${options.search.trim()}%`;
    sql += ' AND (receipt_number LIKE ? OR customer_name LIKE ? OR payment_reference LIKE ?)';
    params.push(q, q, q);
  }

  sql += ' ORDER BY id DESC';
  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  } else {
    sql += ' LIMIT 200';
  }

  const sales = await runQuery<Sale>(sql, params);

  // Fetch items for recent sales
  for (const s of sales) {
    s.items = await runQuery<SaleItem>('SELECT * FROM sale_items WHERE sale_id = ?', [s.id]);
  }

  return sales;
}

export async function checkMpesaReferenceUsed(reference: string): Promise<boolean> {
  const cleanRef = reference.trim();
  if (!cleanRef) return false;
  const res = await runQueryOne(
    'SELECT id FROM sales WHERE UPPER(payment_reference) = UPPER(?) AND is_voided = 0 LIMIT 1;',
    [cleanRef]
  );
  return Boolean(res);
}

export async function getSaleById(id: number): Promise<Sale | null> {
  const sale = await runQueryOne<Sale>('SELECT * FROM sales WHERE id = ?;', [id]);
  if (!sale) return null;
  sale.items = await runQuery<SaleItem>('SELECT * FROM sale_items WHERE sale_id = ?;', [id]);
  return sale;
}

// Suppliers & Purchases
export async function getSuppliers(): Promise<Supplier[]> {
  return runQuery<Supplier>('SELECT * FROM suppliers ORDER BY name ASC;');
}

export async function addSupplier(
  supplier: Omit<Supplier, 'id' | 'created_at' | 'balance'>,
  userId: number,
  userName: string
): Promise<number> {
  const now = new Date().toISOString();
  const { lastInsertId } = await runExecute(
    `INSERT INTO suppliers (name, contact_person, phone, email, address, balance, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    [
      supplier.name.trim(),
      supplier.contact_person?.trim() || null,
      supplier.phone.trim(),
      supplier.email?.trim() || null,
      supplier.address?.trim() || null,
      now,
    ]
  );
  await logAudit(userId, userName, 'SUPPLIER_CREATE', 'supplier', lastInsertId, `Registered supplier "${supplier.name}".`);
  return lastInsertId;
}

export async function recordPurchase(
  purchase: {
    supplierId: number;
    invoiceNumber: string;
    totalCost: number;
    amountPaid: number;
    paymentStatus: 'paid' | 'partial' | 'unpaid';
    status: 'received' | 'pending';
    notes?: string;
  },
  items: Array<{
    bookId: number;
    bookTitle: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>,
  userId: number,
  userName: string
): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  db.run('BEGIN TRANSACTION;');
  try {
    const { lastInsertId } = await runExecute(
      `INSERT INTO purchases (supplier_id, invoice_number, total_cost, amount_paid, payment_status, status, notes, user_id, created_at, received_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        purchase.supplierId,
        purchase.invoiceNumber.trim(),
        purchase.totalCost,
        purchase.amountPaid,
        purchase.paymentStatus,
        purchase.status,
        purchase.notes || null,
        userId,
        now,
        purchase.status === 'received' ? now : null,
      ]
    );

    // If purchase is received immediately, update stock
    for (const item of items) {
      db.run(
        `INSERT INTO purchase_items (purchase_id, book_id, book_title, quantity, unit_cost, total_cost)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [lastInsertId, item.bookId, item.bookTitle, item.quantity, item.unitCost, item.totalCost]
      );

      if (purchase.status === 'received') {
        const bookRes = db.exec(`SELECT quantity FROM books WHERE id = ${item.bookId};`);
        const prevQty = Number(bookRes[0]?.values[0]?.[0] || 0);
        const newQty = prevQty + item.quantity;

        // Update book stock and new cost price
        db.run(
          `UPDATE books SET quantity = ?, purchase_price = ?, updated_at = ? WHERE id = ?;`,
          [newQty, item.unitCost, now, item.bookId]
        );

        // Record stock movement
        db.run(
          `INSERT INTO stock_movements (book_id, movement_type, quantity_change, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, user_id, created_at)
           VALUES (?, 'purchase', ?, ?, ?, ?, 'purchase', ?, ?, ?, ?);`,
          [
            item.bookId,
            item.quantity,
            prevQty,
            newQty,
            item.unitCost,
            String(lastInsertId),
            `Goods Received (Inv: ${purchase.invoiceNumber})`,
            userId,
            now,
          ]
        );
      }
    }

    // Update supplier balance if unpaid / partial
    const unpaidBalance = Math.max(0, purchase.totalCost - purchase.amountPaid);
    if (unpaidBalance > 0) {
      db.run(`UPDATE suppliers SET balance = balance + ? WHERE id = ?;`, [unpaidBalance, purchase.supplierId]);
    }

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName,
      'PURCHASE_RECEIVE',
      'purchase',
      lastInsertId,
      `Recorded purchase invoice #${purchase.invoiceNumber} (KES ${purchase.totalCost.toFixed(2)}, Paid: KES ${purchase.amountPaid.toFixed(2)}).`
    );

    return lastInsertId;
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

export async function getPurchases(): Promise<any[]> {
  const purchases = await runQuery(
    `SELECT p.*, s.name as supplier_name, u.full_name as user_name
     FROM purchases p
     JOIN suppliers s ON p.supplier_id = s.id
     LEFT JOIN users u ON p.user_id = u.id
     ORDER BY p.id DESC LIMIT 100;`
  );
  for (const p of purchases) {
    p.items = await runQuery('SELECT * FROM purchase_items WHERE purchase_id = ?', [p.id]);
  }
  return purchases;
}

export async function receivePendingPurchase(
  purchaseId: number,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  db.run('BEGIN TRANSACTION;');
  try {
    const pRes = db.exec(`SELECT status, invoice_number FROM purchases WHERE id = ${purchaseId};`);
    if (!pRes[0] || pRes[0].values.length === 0) throw new Error('Purchase order not found');
    if (pRes[0].values[0][0] === 'received') throw new Error('Purchase order is already received');
    const invoiceNumber = pRes[0].values[0][1] as string;

    const itemsRes = db.exec(`SELECT book_id, quantity, unit_cost FROM purchase_items WHERE purchase_id = ${purchaseId};`);
    if (itemsRes[0]) {
      for (const row of itemsRes[0].values) {
        const bookId = Number(row[0]);
        const quantity = Number(row[1]);
        const unitCost = Number(row[2]);

        const bookRes = db.exec(`SELECT quantity FROM books WHERE id = ${bookId};`);
        const prevQty = Number(bookRes[0]?.values[0]?.[0] || 0);
        const newQty = prevQty + quantity;

        db.run(`UPDATE books SET quantity = ?, purchase_price = ?, updated_at = ? WHERE id = ?;`, [newQty, unitCost, now, bookId]);
        db.run(
          `INSERT INTO stock_movements (book_id, movement_type, quantity_change, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, user_id, created_at)
           VALUES (?, 'purchase', ?, ?, ?, ?, 'purchase', ?, ?, ?, ?);`,
          [bookId, quantity, prevQty, newQty, unitCost, String(purchaseId), `Goods Received (Inv: ${invoiceNumber})`, userId, now]
        );
      }
    }

    db.run(`UPDATE purchases SET status = 'received', received_at = ? WHERE id = ?;`, [now, purchaseId]);
    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(userId, userName, 'PURCHASE_RECEIVE', 'purchase', purchaseId, `Received pending purchase order #${invoiceNumber} into inventory.`);
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

export async function recordSupplierPayment(
  purchaseId: number,
  paymentAmount: number,
  userId: number,
  userName: string
): Promise<void> {
  const db = await getDatabase();

  db.run('BEGIN TRANSACTION;');
  try {
    const pRes = db.exec(`SELECT supplier_id, total_cost, amount_paid, invoice_number FROM purchases WHERE id = ${purchaseId};`);
    if (!pRes[0] || pRes[0].values.length === 0) throw new Error('Purchase order not found');
    const supplierId = Number(pRes[0].values[0][0]);
    const totalCost = Number(pRes[0].values[0][1]);
    const currentPaid = Number(pRes[0].values[0][2]);
    const invoiceNumber = pRes[0].values[0][3] as string;

    const newPaid = Math.min(totalCost, currentPaid + paymentAmount);
    const newStatus = newPaid >= totalCost ? 'paid' : 'partial';

    db.run(`UPDATE purchases SET amount_paid = ?, payment_status = ? WHERE id = ?;`, [newPaid, newStatus, purchaseId]);
    db.run(`UPDATE suppliers SET balance = MAX(0, balance - ?) WHERE id = ?;`, [paymentAmount, supplierId]);

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName,
      'SUPPLIER_PAYMENT',
      'purchase',
      purchaseId,
      `Recorded supplier payment of KES ${paymentAmount.toFixed(2)} for invoice #${invoiceNumber}. Status: ${newStatus}.`
    );
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

// Expenses
export async function getExpenses(options?: {
  startDate?: string;
  endDate?: string;
  category?: string;
}): Promise<Expense[]> {
  let sql = `
    SELECT e.*, u.full_name as user_name
    FROM expenses e
    LEFT JOIN users u ON e.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (options?.startDate) {
    sql += ' AND e.date >= ?';
    params.push(options.startDate);
  }
  if (options?.endDate) {
    sql += ' AND e.date <= ?';
    params.push(options.endDate);
  }
  if (options?.category && options.category !== 'All') {
    sql += ' AND e.category = ?';
    params.push(options.category);
  }
  sql += ' ORDER BY e.date DESC, e.id DESC;';
  return runQuery<Expense>(sql, params);
}

export async function addExpense(
  expense: Omit<Expense, 'id' | 'created_at'>,
  userId: number,
  userName: string
): Promise<number> {
  const now = new Date().toISOString();
  const { lastInsertId } = await runExecute(
    `INSERT INTO expenses (category, amount, description, date, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [expense.category, expense.amount, expense.description.trim(), expense.date, userId, now]
  );
  await logAudit(userId, userName, 'EXPENSE_RECORD', 'expense', lastInsertId, `Recorded expense of KES ${expense.amount.toFixed(2)} under "${expense.category}": ${expense.description}.`);
  return lastInsertId;
}

// Reports & Analytics
export async function getFinancialSummary(startDate: string, endDate: string): Promise<{
  revenue: number;
  cashReceived: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  netOperatingProfit: number;
  totalTransactions: number;
  voidedCount: number;
  paymentBreakdown: { [method: string]: number };
}> {
  // Sales revenue & COGS
  const sales = await runQuery<{
    grand_total: number;
    total_paid: number;
    is_voided: number;
    payment_method: string;
  }>(
    `SELECT grand_total, total_paid, is_voided, payment_method
     FROM sales
     WHERE substr(created_at, 1, 10) >= ? AND substr(created_at, 1, 10) <= ?;`,
    [startDate, endDate]
  );

  let revenue = 0;
  let cashReceived = 0;
  let totalTransactions = 0;
  let voidedCount = 0;
  const paymentBreakdown: { [method: string]: number } = {
    cash: 0,
    mpesa: 0,
    split: 0,
    card: 0,
  };

  for (const s of sales) {
    if (s.is_voided) {
      voidedCount++;
      continue;
    }
    totalTransactions++;
    revenue += s.grand_total;
    cashReceived += s.total_paid;
    const method = s.payment_method || 'cash';
    paymentBreakdown[method] = (paymentBreakdown[method] || 0) + s.grand_total;
  }

  // COGS for non-voided sales
  const cogsRes = await runQuery<{ cogs: number }>(
    `SELECT COALESCE(SUM(si.quantity * si.unit_purchase_price), 0) as cogs
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE s.is_voided = 0 AND substr(s.created_at, 1, 10) >= ? AND substr(s.created_at, 1, 10) <= ?;`,
    [startDate, endDate]
  );
  const cogs = cogsRes[0]?.cogs || 0;
  const grossProfit = Math.round((revenue - cogs) * 100) / 100;

  // Expenses in date range
  const expRes = await runQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM expenses
     WHERE date >= ? AND date <= ?;`,
    [startDate, endDate]
  );
  const totalExpenses = expRes[0]?.total || 0;
  const netOperatingProfit = Math.round((grossProfit - totalExpenses) * 100) / 100;

  return {
    revenue: Math.round(revenue * 100) / 100,
    cashReceived: Math.round(cashReceived * 100) / 100,
    cogs: Math.round(cogs * 100) / 100,
    grossProfit,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netOperatingProfit,
    totalTransactions,
    voidedCount,
    paymentBreakdown,
  };
}

export async function getTopSellingBooks(limit = 10, startDate?: string, endDate?: string): Promise<any[]> {
  let dateFilter = '';
  const params: any[] = [];
  if (startDate && endDate) {
    dateFilter = ' AND substr(s.created_at, 1, 10) >= ? AND substr(s.created_at, 1, 10) <= ?';
    params.push(startDate, endDate);
  }

  const sql = `
    SELECT 
      si.book_id,
      si.book_title,
      b.author,
      b.category,
      SUM(si.quantity) as total_units_sold,
      SUM(si.total_price) as total_revenue,
      SUM(si.quantity * (si.unit_selling_price - si.unit_purchase_price)) as estimated_gross_profit
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN books b ON si.book_id = b.id
    WHERE s.is_voided = 0 ${dateFilter}
    GROUP BY si.book_id
    ORDER BY total_units_sold DESC
    LIMIT ${limit};
  `;
  return runQuery(sql, params);
}

export interface CashUpReport {
  date: string;
  cashierId?: number;
  cashierName: string;
  totalTransactions: number;
  grossSales: number;
  cashSales: number;
  mpesaSales: number;
  cardSales: number;
  voidedCount: number;
  voidedTotal: number;
  cashExpenses: number;
}

export async function getCashUpReport(date: string, cashierId?: number): Promise<CashUpReport> {
  let userClause = '';
  const params: any[] = [date];
  if (cashierId) {
    userClause = ' AND user_id = ?';
    params.push(cashierId);
  }

  const sales = await runQuery<Sale>(
    `SELECT * FROM sales WHERE substr(created_at, 1, 10) = ? ${userClause};`,
    params
  );

  let totalTransactions = 0;
  let grossSales = 0;
  let cashSales = 0;
  let mpesaSales = 0;
  let cardSales = 0;
  let voidedCount = 0;
  let voidedTotal = 0;

  for (const s of sales) {
    if (s.is_voided) {
      voidedCount++;
      voidedTotal += s.grand_total;
      continue;
    }
    totalTransactions++;
    grossSales += s.grand_total;
    if (s.payment_method === 'cash') {
      cashSales += s.grand_total;
    } else if (s.payment_method === 'mpesa') {
      mpesaSales += s.grand_total;
    } else if (s.payment_method === 'card') {
      cardSales += s.grand_total;
    } else if (s.payment_method === 'split') {
      try {
        const split = s.payment_reference ? JSON.parse(s.payment_reference) : null;
        if (split) {
          cashSales += Number(split.cash) || 0;
          mpesaSales += Number(split.mpesa) || 0;
        } else {
          cashSales += s.grand_total;
        }
      } catch {
        cashSales += s.grand_total;
      }
    }
  }

  const expParams: any[] = [date];
  let expUserClause = '';
  if (cashierId) {
    expUserClause = ' AND user_id = ?';
    expParams.push(cashierId);
  }
  const expRes = await runQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ? ${expUserClause};`,
    expParams
  );
  const cashExpenses = expRes[0]?.total || 0;

  let cashierName = 'All Cashiers';
  if (cashierId) {
    const userRes = await runQueryOne<{ full_name: string }>('SELECT full_name FROM users WHERE id = ?;', [cashierId]);
    if (userRes) cashierName = userRes.full_name;
  }

  return {
    date,
    cashierId,
    cashierName,
    totalTransactions,
    grossSales: Math.round(grossSales * 100) / 100,
    cashSales: Math.round(cashSales * 100) / 100,
    mpesaSales: Math.round(mpesaSales * 100) / 100,
    cardSales: Math.round(cardSales * 100) / 100,
    voidedCount,
    voidedTotal: Math.round(voidedTotal * 100) / 100,
    cashExpenses: Math.round(cashExpenses * 100) / 100,
  };
}

// Users
export async function getUsers(): Promise<User[]> {
  return runQuery<User>('SELECT id, username, full_name, role, pin, is_active, created_at, last_login FROM users ORDER BY id ASC;');
}

export async function addUser(user: Omit<User, 'id' | 'created_at'>, adminUserId: number, adminName: string): Promise<number> {
  const now = new Date().toISOString();
  const existing = await runQueryOne('SELECT id FROM users WHERE username = ?', [user.username.trim()]);
  if (existing) {
    throw new Error(`Username "${user.username}" is already taken.`);
  }

  const { lastInsertId } = await runExecute(
    `INSERT INTO users (username, full_name, role, password_hash, pin, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [user.username.trim(), user.full_name.trim(), user.role, user.password_hash, user.pin || null, user.is_active, now]
  );
  await logAudit(adminUserId, adminName, 'USER_CREATE', 'user', lastInsertId, `Created user "${user.username}" with role "${user.role}".`);
  return lastInsertId;
}

export async function updateUser(
  id: number,
  userData: Partial<User>,
  adminUserId: number,
  adminName: string
): Promise<void> {
  const current = await runQueryOne<User>('SELECT * FROM users WHERE id = ?', [id]);
  if (!current) throw new Error('User not found');

  await runExecute(
    `UPDATE users SET
      full_name = ?,
      role = ?,
      is_active = ?,
      pin = ?,
      password_hash = COALESCE(?, password_hash)
     WHERE id = ?;`,
    [
      userData.full_name !== undefined ? userData.full_name.trim() : current.full_name,
      userData.role !== undefined ? userData.role : current.role,
      userData.is_active !== undefined ? userData.is_active : current.is_active,
      userData.pin !== undefined ? userData.pin : current.pin,
      userData.password_hash || null,
      id,
    ]
  );
  await logAudit(adminUserId, adminName, 'USER_UPDATE', 'user', id, `Updated user "${current.username}".`);
}

// Shop Settings
export async function getShopSettings(): Promise<ShopSettings> {
  const rows = await runQuery<{ key: string; value: string }>('SELECT key, value FROM shop_settings;');
  const settings: any = {};
  for (const row of rows) {
    if (
      row.key === 'tax_rate' ||
      row.key === 'session_timeout_minutes' ||
      row.key === 'default_reorder_level'
    ) {
      settings[row.key] = Number(row.value);
    } else if (row.key === 'is_setup_completed') {
      settings[row.key] = row.value === 'true' || row.value === '1';
    } else {
      settings[row.key] = row.value;
    }
  }
  return settings as ShopSettings;
}

export async function updateShopSettings(newSettings: Partial<ShopSettings>, userId: number, userName: string): Promise<void> {
  for (const [key, val] of Object.entries(newSettings)) {
    if (val !== undefined) {
      await runExecute(
        `INSERT INTO shop_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        [key, String(val)]
      );
    }
  }
  await logAudit(userId, userName, 'SETTINGS_UPDATE', 'settings', 'shop', 'Updated shop business settings and configuration.');
}

// Clean all business records (books, movements, purchases, sales, expenses, audits)
// Always creates a safety backup before wiping
export async function cleanBusinessDatabase(userId: number, userName: string): Promise<{ ok: boolean; backupSize: number }> {
  const db = await getDatabase();
  const binary = db.export();
  const backupSize = binary?.byteLength || 0;

  if (!binary || backupSize === 0) {
    throw new Error('Safety backup failed: exported binary is empty. Aborting database cleanup to prevent data loss.');
  }

  // Save emergency safety backup in IndexedDB and/or localStorage
  let backupSaved = false;
  let backupError: any = null;

  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const idb = await openIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction('sqlite', 'readwrite');
        const store = tx.objectStore('sqlite');
        const req = store.put(binary, 'pre_cleanup_safety_backup');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      backupSaved = true;
    }
  } catch (err) {
    backupError = err;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('kitabupos_pre_cleanup_backup', uint8ArrayToBase64(binary));
      backupSaved = true;
    } catch (err) {
      if (!backupSaved) {
        backupError = err;
      }
    }
  }

  // If running in a browser and no backup could be written, strictly abort!
  if (typeof window !== 'undefined' && !backupSaved) {
    throw new Error(`Safety backup failed: ${backupError?.message || 'Local storage write error'}. Aborting database cleanup to prevent data loss.`);
  }

  const now = new Date().toISOString();

  db.run('BEGIN TRANSACTION;');
  try {
    db.run('DELETE FROM sale_items;');
    db.run('DELETE FROM sales;');
    db.run('DELETE FROM purchase_items;');
    db.run('DELETE FROM purchases;');
    db.run('DELETE FROM suppliers;');
    db.run('DELETE FROM stock_movements;');
    db.run('DELETE FROM books;');
    db.run('DELETE FROM expenses;');
    db.run('DELETE FROM audit_logs;');

    db.run(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at)
       VALUES (?, ?, 'SYSTEM_CLEAN_DATABASE', 'database', 'system', 'Demonstration/business data cleared. Empty business database ready for production.', ?);`,
      [userId, userName, now]
    );

    db.run('COMMIT;');
    await persistDbToStorage(db);
    return { ok: true, backupSize };
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}

// Export Human-Readable Database JSON
export async function exportDatabaseJson(): Promise<string> {
  const [bList, sList, pList, smList, suppList, expList, settings, userList, logs] = await Promise.all([
    runQuery('SELECT * FROM books;'),
    runQuery('SELECT * FROM sales;'),
    runQuery('SELECT * FROM purchases;'),
    runQuery('SELECT * FROM stock_movements;'),
    runQuery('SELECT * FROM suppliers;'),
    runQuery('SELECT * FROM expenses;'),
    runQuery('SELECT * FROM shop_settings;'),
    runQuery('SELECT id, username, full_name, role, is_active, created_at FROM users;'),
    runQuery('SELECT * FROM audit_logs LIMIT 200;'),
  ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      system: 'KitabuPOS Offline Bookshop Management System',
      data: {
        settings,
        users: userList,
        books: bList,
        stock_movements: smList,
        suppliers: suppList,
        purchases: pList,
        sales: sList,
        expenses: expList,
        audit_logs: logs,
      },
    },
    null,
    2
  );
}

// Audit Logs
export async function getAuditLogs(limit = 100): Promise<any[]> {
  return runQuery(
    `SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?;`,
    [limit]
  );
}
