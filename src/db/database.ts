import initSqlJs from 'sql.js';
import type { Database, SqlJsStatic } from 'sql.js';
import bcrypt from 'bcryptjs';
import { SCHEMA_SQL } from './schema.ts';
import { getSeedQueries } from './seed.ts';
import { calculateCartTotals, calculateChange } from '../utils/calculations.ts';
import type {
  Book,
  Expense,
  ExpenseCategory,
  Sale,
  SaleItem,
  ShopSettings,
  StockMovement,
  StockMovementType,
  Supplier,
  User,
  UserRole,
} from '../types/index.ts';

const DB_STORAGE_KEY = 'kitabupos_sqlite_db_v1';
const BACKUP_TIMESTAMP_KEY = 'kitabupos_last_backup_time';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

// ==========================================
// Roles & Permissions Control (RBAC)
// ==========================================

export const PERMISSIONS = {
  CAN_SELL: ['admin', 'manager', 'cashier'],
  CAN_MANAGE_INVENTORY: ['admin', 'manager'],
  CAN_ADJUST_STOCK: ['admin', 'manager'],
  CAN_VOID_SALE: ['admin', 'manager'],
  CAN_VIEW_PROFITABILITY: ['admin', 'manager'],
  CAN_MANAGE_PURCHASES: ['admin', 'manager'],
  CAN_MANAGE_EXPENSES: ['admin', 'manager'],
  CAN_MANAGE_USERS: ['admin'],
  CAN_RESTORE_DATABASE: ['admin'],
  CAN_EDIT_SETTINGS: ['admin'],
  CAN_CLEAN_DATABASE: ['admin'],
  CAN_EXPORT_FINANCIALS: ['admin', 'manager'],
} as const;

export function hasPermission(role: UserRole, permissionKey: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permissionKey] as readonly string[];
  return allowedRoles.includes(role);
}

export async function requirePermission(
  userOrRoleOrId: { role?: UserRole; id?: number } | UserRole | number | null | undefined,
  permissionKey: keyof typeof PERMISSIONS
): Promise<void> {
  let role: UserRole = 'admin';
  if (typeof userOrRoleOrId === 'string') {
    role = userOrRoleOrId as UserRole;
  } else if (typeof userOrRoleOrId === 'number') {
    const user = await runQueryOne<{ role: UserRole }>('SELECT role FROM users WHERE id = ?;', [userOrRoleOrId]);
    if (user) {
      role = user.role;
    }
  } else if (userOrRoleOrId && typeof userOrRoleOrId === 'object' && userOrRoleOrId.role) {
    role = userOrRoleOrId.role;
  }

  if (!hasPermission(role, permissionKey)) {
    throw new Error(`Unauthorized: Role "${role}" lacks permission "${permissionKey}".`);
  }
}

export function extractUserId(userOrIdOrRole: any, defaultId = 1): number {
  if (typeof userOrIdOrRole === 'number') return userOrIdOrRole;
  if (userOrIdOrRole && typeof userOrIdOrRole === 'object' && userOrIdOrRole.id) {
    return Number(userOrIdOrRole.id);
  }
  return defaultId;
}

// Helpers to save database to storage
async function persistDbToStorage(db: Database): Promise<void> {
  try {
    const binary = db.export();
    if (typeof window !== 'undefined' && window.indexedDB) {
      await saveToIndexedDB(binary);
    }
  } catch (err) {
    console.error('Failed to persist SQLite database:', err);
  }
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

// Binary Integrity Verifier
export async function verifyDatabaseBinary(binary: Uint8Array): Promise<boolean> {
  if (!binary || binary.byteLength === 0) return false;
  if (!SQL) {
    if (typeof window !== 'undefined') {
      SQL = await initSqlJs({ locateFile: (file) => `/${file}` });
    } else {
      SQL = await initSqlJs();
    }
  }
  try {
    const testDb = new SQL.Database(binary);
    const check = testDb.exec('PRAGMA integrity_check;');
    const ok = check[0]?.values[0]?.[0] === 'ok';
    testDb.close();
    return ok;
  } catch (e) {
    console.error('Database binary integrity check failed:', e);
    return false;
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

export async function migrateDatabase(db: Database): Promise<void> {
  // Verify backup before any migration
  const preBackup = db.export();
  const isValidBackup = await verifyDatabaseBinary(preBackup);
  if (!isValidBackup) {
    throw new Error('Pre-migration backup verification failed. Aborting migration.');
  }

  // Ensure migrations run with foreign_keys ON inside a transaction
  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);`);
    const versionsRes = db.exec('SELECT version FROM schema_migrations ORDER BY version ASC;');
    const appliedVersions = (versionsRes[0]?.values || []).map((v) => Number(v[0]));
    const now = new Date().toISOString();

    if (!appliedVersions.includes(1)) {
      db.run(`INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, '${now}');`);
    }

    if (!appliedVersions.includes(2)) {
      db.run('DROP TABLE IF EXISTS credit_payments;');
      db.run('DROP TABLE IF EXISTS customers;');
      db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (2, '${now}');`);
    }

    if (!appliedVersions.includes(3)) {
      // Non-destructive migration v3:
      // DO NOT delete manager users or accounts. Keep all users.
      // Ensure partial unique index on non-voided sales payment_reference and auth_lockouts table exist
      db.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_mpesa_unique ON sales(payment_reference)
         WHERE is_voided = 0 AND payment_reference IS NOT NULL AND payment_reference != '';`
      );
      db.run(
        `CREATE TABLE IF NOT EXISTS auth_lockouts (
          identifier TEXT PRIMARY KEY,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT
        );`
      );
      db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (3, '${now}');`);
    }

    // Verify foreign key constraints are clean
    const fkCheck = db.exec('PRAGMA foreign_key_check;');
    if (fkCheck.length > 0 && fkCheck[0]?.values && fkCheck[0].values.length > 0) {
      throw new Error('Foreign key violation detected during migration.');
    }

    db.run('COMMIT;');
    await persistDbToStorage(db);
  } catch (migErr) {
    db.run('ROLLBACK;');
    console.error('Migration failed and rolled back:', migErr);
    throw migErr;
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
  await runExecute("INSERT INTO shop_settings (key, value) VALUES ('last_backup_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;", [now]);
  return binary;
}

export async function getLastBackupTimestamp(): Promise<string | null> {
  const setting = await runQueryOne<{ value: string }>("SELECT value FROM shop_settings WHERE key = 'last_backup_at'");
  return setting?.value || null;
}

// Restore Database from binary file
export async function restoreDatabaseBinary(
  data: Uint8Array,
  userOrIdOrRole?: { role: UserRole; id?: number } | UserRole | number,
  adminName?: string
): Promise<{ ok: boolean; message: string }> {
  if (userOrIdOrRole) {
    await requirePermission(userOrIdOrRole, 'CAN_RESTORE_DATABASE');
  }

  // 1. Verify candidate database integrity before restoration
  const isVerified = await verifyDatabaseBinary(data);
  if (!isVerified) {
    return {
      ok: false,
      message: 'Restoration aborted: The provided backup file failed the SQLite integrity check or is corrupted.',
    };
  }

  if (!SQL) {
    if (typeof window !== 'undefined') {
      SQL = await initSqlJs({ locateFile: (file) => `/${file}` });
    } else {
      SQL = await initSqlJs();
    }
  }

  const candidateDb = new SQL.Database(data);
  const tables = candidateDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('books', 'sales', 'users');");
  if (!tables[0] || tables[0].values.length < 3) {
    candidateDb.close();
    return { ok: false, message: 'Restoration aborted: Missing required KitabuPOS tables (books, sales, users).' };
  }

  // 2. Pre-restore automatic backup saved to IndexedDB (never localStorage)
  if (dbInstance && typeof window !== 'undefined' && window.indexedDB) {
    try {
      const preRestoreBackup = dbInstance.export();
      const idb = await openIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = idb.transaction('sqlite', 'readwrite');
        const store = tx.objectStore('sqlite');
        const req = store.put(preRestoreBackup, 'pre_restore_safety_backup');
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Could not store pre_restore_safety_backup in IndexedDB:', e);
    }
  }

  // 3. Switch active instance
  dbInstance = candidateDb;
  dbInstance.run('PRAGMA foreign_keys = ON;');
  await persistDbToStorage(dbInstance);

  // 4. Log audit record
  const aId = extractUserId(userOrIdOrRole, 1);
  await logAudit(aId, adminName || 'Admin', 'DATABASE_RESTORE', 'system', '1', 'Restored database from external backup file.');

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
  // Current date in Nairobi time (UTC+3)
  const now = new Date();
  const nairobiDate = new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000);
  const today = `${nairobiDate.getFullYear()}-${String(nairobiDate.getMonth() + 1).padStart(2, '0')}-${String(nairobiDate.getDate()).padStart(2, '0')}`;

  // Today sales & payment split using Nairobi date filtering and excluding tax from revenue
  const todaySalesRes = await runQuery<{
    count: number;
    total: number;
    cashTotal: number;
    mpesaTotal: number;
    cardTotal: number;
  }>(
    `SELECT 
      COUNT(*) as count, 
      COALESCE(SUM(grand_total - tax_total), 0) as total,
      COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_paid - change_amount WHEN payment_method = 'split' THEN total_paid - change_amount ELSE 0 END), 0) as cashTotal,
      COALESCE(SUM(CASE WHEN payment_method = 'mpesa' THEN grand_total ELSE 0 END), 0) as mpesaTotal,
      COALESCE(SUM(CASE WHEN payment_method = 'card' THEN grand_total ELSE 0 END), 0) as cardTotal
     FROM sales 
     WHERE is_voided = 0 AND date(created_at, '+3 hours') = ?;`,
    [today]
  );
  const todaySalesCount = todaySalesRes[0]?.count || 0;
  const todayRevenue = todaySalesRes[0]?.total || 0;
  const todayCashRevenue = todaySalesRes[0]?.cashTotal || 0;
  const todayMpesaRevenue = todaySalesRes[0]?.mpesaTotal || 0;
  const todayCardRevenue = todaySalesRes[0]?.cardTotal || 0;

  // Today estimated COGS and profit (excludes tax)
  const cogsRes = await runQuery<{ cogs: number }>(
    `SELECT COALESCE(SUM(si.quantity * si.unit_purchase_price), 0) as cogs
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE s.is_voided = 0 AND date(s.created_at, '+3 hours') = ?;`,
    [today]
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

  // Low stock titles
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

  // Recent transactions
  const recentSales = await runQuery<Sale>(
    `SELECT id, receipt_number, cashier_name, customer_name, grand_total, payment_method, is_voided, created_at
     FROM sales
     ORDER BY id DESC
     LIMIT 6;`
  );

  const lastBackupTime = await getLastBackupTimestamp();

  return {
    todaySalesCount,
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    todayProfit,
    todayCashRevenue: Math.round(todayCashRevenue * 100) / 100,
    todayMpesaRevenue: Math.round(todayMpesaRevenue * 100) / 100,
    todayCardRevenue: Math.round(todayCardRevenue * 100) / 100,
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
    sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ? OR barcode LIKE ? OR category LIKE ?)';
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY id DESC;';
  return runQuery<Book>(sql, params);
}

export async function getBookById(id: number): Promise<Book | null> {
  return runQueryOne<Book>('SELECT * FROM books WHERE id = ?;', [id]);
}

export async function addBook(
  book: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'is_archived'>,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<number> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_INVENTORY');
  const userId = extractUserId(userOrIdOrRole, 1);
  const now = new Date().toISOString();

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

  await logAudit(userId, userName || 'User', 'BOOK_CREATE', 'book', lastInsertId, `Added new book "${book.title}" (Qty: ${book.quantity}, Price: KES ${book.selling_price}).`);
  return lastInsertId;
}

export async function updateBook(
  id: number,
  book: Partial<Book>,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_INVENTORY');
  const userId = extractUserId(userOrIdOrRole, 1);
  const current = await runQueryOne<Book>('SELECT * FROM books WHERE id = ?', [id]);
  if (!current) throw new Error('Book not found');

  const now = new Date().toISOString();

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
  await logAudit(userId, userName || 'User', 'BOOK_UPDATE', 'book', id, details);
}

export async function archiveBook(
  id: number,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_INVENTORY');
  const userId = extractUserId(userOrIdOrRole, 1);
  const current = await runQueryOne<Book>('SELECT title FROM books WHERE id = ?', [id]);
  await runExecute('UPDATE books SET is_archived = 1 WHERE id = ?;', [id]);
  await logAudit(userId, userName || 'User', 'BOOK_ARCHIVE', 'book', id, `Archived book "${current?.title}".`);
}

export async function bulkArchiveBooks(
  ids: number[],
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  if (ids.length === 0) return;
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_INVENTORY');
  const userId = extractUserId(userOrIdOrRole, 1);
  const placeholders = ids.map(() => '?').join(',');
  await runExecute(`UPDATE books SET is_archived = 1 WHERE id IN (${placeholders});`, ids);
  await logAudit(userId, userName || 'User', 'BOOK_BULK_ARCHIVE', 'book', ids.length, `Archived ${ids.length} book titles.`);
}

export async function bulkUpdateCategory(
  ids: number[],
  newCategory: string,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  if (ids.length === 0 || !newCategory.trim()) return;
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_INVENTORY');
  const userId = extractUserId(userOrIdOrRole, 1);
  const placeholders = ids.map(() => '?').join(',');
  await runExecute(`UPDATE books SET category = ? WHERE id IN (${placeholders});`, [newCategory.trim(), ...ids]);
  await logAudit(userId, userName || 'User', 'BOOK_BULK_CATEGORY', 'book', ids.length, `Updated category to "${newCategory.trim()}" for ${ids.length} books.`);
}

// Stock Adjustment
export async function adjustStock(
  bookId: number,
  quantityChange: number,
  movementType: 'purchase' | 'damage' | 'adjustment' | 'customer_return' | 'purchase_return',
  notes: string,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string,
  unitCost?: number
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_ADJUST_STOCK');
  const userId = extractUserId(userOrIdOrRole, 1);

  const db = await getDatabase();
  const now = new Date().toISOString();

  db.run('BEGIN TRANSACTION;');
  try {
    const bookRes = db.exec(`SELECT title, quantity, purchase_price FROM books WHERE id = ?;`, [bookId]);
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

    db.run(`UPDATE books SET quantity = ?, updated_at = ? WHERE id = ?;`, [newQty, now, bookId]);

    db.run(
      `INSERT INTO stock_movements (book_id, movement_type, quantity_change, previous_quantity, new_quantity, unit_cost, reference_type, notes, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'adjustment', ?, ?, ?);`,
      [bookId, movementType, quantityChange, prevQty, newQty, cost, notes || '', userId, now]
    );

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName || 'User',
      'STOCK_ADJUSTMENT',
      'book',
      bookId,
      `Adjusted stock for "${title}" by ${quantityChange > 0 ? '+' : ''}${quantityChange} units (${movementType}). New stock: ${newQty}. Notes: ${notes}`
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
    LEFT JOIN books b ON sm.book_id = b.id
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
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<{ saleId: number; receiptNumber: string }> {
  await requirePermission(userOrIdOrRole, 'CAN_SELL');
  const userId = extractUserId(userOrIdOrRole, 1);
  let userRole: UserRole = 'admin';
  if (typeof userOrIdOrRole === 'string') userRole = userOrIdOrRole as UserRole;
  else if (typeof userOrIdOrRole === 'object' && userOrIdOrRole.role) userRole = userOrIdOrRole.role;
  else if (typeof userOrIdOrRole === 'number') {
    const u = await runQueryOne<{ role: UserRole }>('SELECT role FROM users WHERE id = ?;', [userOrIdOrRole]);
    if (u) userRole = u.role;
  }

  if (!items || items.length === 0) {
    throw new Error('Sale must contain at least one item.');
  }

  // Load shop settings for tax rate and max cashier discount limit
  const settings = await getShopSettings();
  const maxCashierDiscountPct = Number(settings.max_cashier_discount_percent ?? 10);
  const taxRatePercent = Number(settings.tax_rate ?? 0);

  const db = await getDatabase();
  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    const recomputeInputs: any[] = [];
    const verifiedDbBooks: Array<{
      id: number;
      title: string;
      isbn?: string;
      quantity: number;
      purchase_price: number;
      selling_price: number;
      requestedQty: number;
      discountAmount: number;
    }> = [];

    // 1. Reload each book by id inside the transaction and validate with DB prices
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error(`Quantity for "${item.bookTitle}" must be an integer greater than 0.`);
      }

      const bookRows = db.exec('SELECT id, title, isbn, quantity, purchase_price, selling_price FROM books WHERE id = ?;', [item.bookId]);
      if (!bookRows[0] || bookRows[0].values.length === 0) {
        throw new Error(`Book "${item.bookTitle}" was not found in catalog.`);
      }
      const bRow = bookRows[0].values[0];
      const dbBook = {
        id: Number(bRow[0]),
        title: String(bRow[1]),
        isbn: bRow[2] ? String(bRow[2]) : undefined,
        quantity: Number(bRow[3]),
        purchase_price: Number(bRow[4]),
        selling_price: Number(bRow[5]),
        requestedQty: item.quantity,
        discountAmount: Number(item.discountAmount || 0),
      };

      if (dbBook.requestedQty > dbBook.quantity) {
        throw new Error(`Insufficient stock for "${dbBook.title}". Available: ${dbBook.quantity}, Requested: ${dbBook.requestedQty}.`);
      }

      const rawLineTotal = Math.round(dbBook.requestedQty * dbBook.selling_price * 100) / 100;
      if (dbBook.discountAmount < 0 || dbBook.discountAmount > rawLineTotal) {
        throw new Error(`Discount on "${dbBook.title}" must be between 0 and line total (KES ${rawLineTotal}).`);
      }

      // Cashier discount limit verification
      if (userRole === 'cashier' && rawLineTotal > 0) {
        const discountPct = (dbBook.discountAmount / rawLineTotal) * 100;
        if (discountPct > maxCashierDiscountPct + 0.001) {
          throw new Error(`Cashier discount on "${dbBook.title}" (${discountPct.toFixed(1)}%) exceeds maximum allowed limit of ${maxCashierDiscountPct}%.`);
        }
      }

      recomputeInputs.push({
        book_id: dbBook.id,
        quantity: dbBook.requestedQty,
        unit_selling_price: dbBook.selling_price,
        unit_purchase_price: dbBook.purchase_price,
        discount_amount: dbBook.discountAmount,
      });

      verifiedDbBooks.push(dbBook);
    }

    // 2. Recompute line totals, discounts, tax and grand total with shared calculation module
    const recomputed = calculateCartTotals(recomputeInputs, 0, taxRatePercent);

    // Reject if client totals differ by more than 0.01
    if (
      Math.abs(sale.subtotal - recomputed.subtotal) > 0.01 ||
      Math.abs(sale.grandTotal - recomputed.grandTotal) > 0.01 ||
      Math.abs(sale.taxTotal - recomputed.taxTotal) > 0.01
    ) {
      throw new Error(
        `Sale totals mismatch catalog pricing. Verified total: KES ${recomputed.grandTotal.toFixed(2)}, submitted: KES ${sale.grandTotal.toFixed(2)}.`
      );
    }

    // 3. Validate payment
    if (sale.totalPaid < recomputed.grandTotal - 0.001) {
      throw new Error(`Total paid (KES ${sale.totalPaid.toFixed(2)}) must be greater than or equal to grand total (KES ${recomputed.grandTotal.toFixed(2)}). Underpayment rejected.`);
    }

    // Change is cash overpayment only
    if (sale.paymentMethod === 'cash') {
      const expectedChange = calculateChange(recomputed.grandTotal, sale.totalPaid);
      if (Math.abs(sale.changeAmount - expectedChange) > 0.01) {
        throw new Error(`Change calculation mismatch. Expected KES ${expectedChange.toFixed(2)}, got KES ${sale.changeAmount.toFixed(2)}.`);
      }
    } else if (sale.paymentMethod === 'mpesa' || sale.paymentMethod === 'card') {
      if (sale.changeAmount > 0 || sale.totalPaid > recomputed.grandTotal + 0.001) {
        throw new Error('Change is only permitted for cash payments.');
      }
    } else if (sale.paymentMethod === 'split') {
      let splitPayments: any[] = [];
      try {
        splitPayments = JSON.parse(sale.paymentsJson || '[]');
      } catch {}
      let cashAmt = 0;
      let nonCashAmt = 0;
      for (const p of splitPayments) {
        if (p.method === 'cash') cashAmt += Number(p.amount) || 0;
        else nonCashAmt += Number(p.amount) || 0;
      }
      if (nonCashAmt > recomputed.grandTotal + 0.001) {
        throw new Error('Non-cash portion in split payment cannot exceed grand total.');
      }
      if (sale.changeAmount > 0 && cashAmt <= Math.max(0, recomputed.grandTotal - nonCashAmt)) {
        throw new Error('Change is only permitted for cash overpayment.');
      }
    }

    // 4. Validate M-Pesa codes
    const mpesaCodes: string[] = [];
    if (sale.paymentMethod === 'mpesa' && sale.paymentReference) {
      mpesaCodes.push(sale.paymentReference.trim());
    }
    if (sale.paymentsJson) {
      try {
        const parsed = JSON.parse(sale.paymentsJson);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            if (p.method === 'mpesa' && p.reference) {
              mpesaCodes.push(p.reference.trim());
            }
          }
        }
      } catch {}
    }

    for (const code of mpesaCodes) {
      if (!/^[A-Z0-9]{10}$/.test(code)) {
        throw new Error(`Invalid M-Pesa transaction code "${code}". Must be exactly 10 uppercase alphanumeric characters.`);
      }
      const dupRes = db.exec('SELECT id FROM sales WHERE payment_reference = ? AND is_voided = 0;', [code]);
      if (dupRes.length > 0 && dupRes[0].values.length > 0) {
        throw new Error(`Duplicate M-Pesa transaction code "${code}". Already used on sale #${dupRes[0].values[0][0]}.`);
      }
    }

    // 5. Generate sequential receipt number
    const maxIdRes = db.exec('SELECT COALESCE(MAX(id), 0) + 1 FROM sales;');
    const nextSaleId = Number(maxIdRes[0]?.values[0]?.[0] || 1);
    const prefix = settings.receipt_prefix?.trim() || 'RCP';
    const receiptNumber = `${prefix}-${year}-${String(nextSaleId).padStart(5, '0')}`;

    // 6. Insert sale header with parameterized queries only
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
        recomputed.subtotal,
        recomputed.totalDiscount,
        recomputed.taxTotal,
        recomputed.grandTotal,
        sale.totalPaid,
        sale.changeAmount,
        sale.paymentMethod,
        sale.paymentReference?.trim() || null,
        sale.paymentsJson || null,
        now,
      ]
    );

    // 7. Insert items, deduct inventory, and record stock movements
    for (const dbBook of verifiedDbBooks) {
      const lineTotal = Math.round((dbBook.requestedQty * dbBook.selling_price - dbBook.discountAmount) * 100) / 100;
      db.run(
        `INSERT INTO sale_items (
          sale_id, book_id, book_title, isbn, quantity,
          unit_purchase_price, unit_selling_price, discount_amount, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          nextSaleId,
          dbBook.id,
          dbBook.title,
          dbBook.isbn || null,
          dbBook.requestedQty,
          dbBook.purchase_price,
          dbBook.selling_price,
          dbBook.discountAmount,
          lineTotal,
        ]
      );

      const newQty = dbBook.quantity - dbBook.requestedQty;
      db.run('UPDATE books SET quantity = ?, updated_at = ? WHERE id = ?;', [newQty, now, dbBook.id]);

      db.run(
        `INSERT INTO stock_movements (
          book_id, movement_type, quantity_change, previous_quantity, new_quantity,
          unit_cost, reference_type, reference_id, notes, user_id, created_at
        ) VALUES (?, 'sale', ?, ?, ?, ?, 'sale', ?, ?, ?, ?);`,
        [
          dbBook.id,
          -dbBook.requestedQty,
          dbBook.quantity,
          newQty,
          dbBook.purchase_price,
          receiptNumber,
          `Sale #${receiptNumber}`,
          userId,
          now,
        ]
      );
    }

    db.run('COMMIT;');

    // Flush persistence immediately after each completed sale before the receipt shows
    await persistDbToStorage(db);

    return { saleId: nextSaleId, receiptNumber };
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

// Void Sale
export async function voidSale(
  saleId: number,
  reason: string,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_VOID_SALE');
  const userId = extractUserId(userOrIdOrRole, 1);

  const db = await getDatabase();
  const now = new Date().toISOString();

  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    const saleRes = db.exec('SELECT receipt_number, is_voided, grand_total FROM sales WHERE id = ?;', [saleId]);
    if (!saleRes[0] || saleRes[0].values.length === 0) {
      throw new Error('Sale not found');
    }
    const receiptNumber = saleRes[0].values[0][0] as string;
    const isVoided = Number(saleRes[0].values[0][1]);
    const grandTotal = Number(saleRes[0].values[0][2]);

    if (isVoided === 1) {
      throw new Error(`Sale #${receiptNumber} is already voided.`);
    }

    const itemsRes = db.exec('SELECT book_id, quantity, unit_purchase_price FROM sale_items WHERE sale_id = ?;', [saleId]);
    if (itemsRes[0]) {
      for (const row of itemsRes[0].values) {
        const bookId = Number(row[0]);
        const quantity = Number(row[1]);
        const unitCost = Number(row[2]);

        const bookQtyRes = db.exec('SELECT quantity FROM books WHERE id = ?;', [bookId]);
        const prevQty = Number(bookQtyRes[0]?.values[0]?.[0] || 0);
        const newQty = prevQty + quantity;

        db.run('UPDATE books SET quantity = ?, updated_at = ? WHERE id = ?;', [newQty, now, bookId]);

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

    db.run(
      'UPDATE sales SET is_voided = 1, void_reason = ?, voided_by_user_id = ?, voided_at = ? WHERE id = ?;',
      [reason, userId, now, saleId]
    );

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName || 'User',
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
    sql += " AND date(created_at, '+3 hours') >= ?";
    params.push(options.startDate);
  }
  if (options?.endDate) {
    sql += " AND date(created_at, '+3 hours') <= ?";
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
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<number> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_PURCHASES');
  const userId = extractUserId(userOrIdOrRole, 1);
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
  await logAudit(userId, userName || 'User', 'SUPPLIER_CREATE', 'supplier', lastInsertId, `Registered supplier "${supplier.name}".`);
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
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<number> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_PURCHASES');
  const userId = extractUserId(userOrIdOrRole, 1);

  const db = await getDatabase();
  const now = new Date().toISOString();

  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    const insertRes = db.exec(
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

    const lastIdRes = db.exec('SELECT last_insert_rowid();');
    const lastInsertId = Number(lastIdRes[0]?.values[0]?.[0] || 0);

    for (const item of items) {
      db.run(
        `INSERT INTO purchase_items (purchase_id, book_id, book_title, quantity, unit_cost, total_cost)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [lastInsertId, item.bookId, item.bookTitle, item.quantity, item.unitCost, item.totalCost]
      );

      if (purchase.status === 'received') {
        const bookRes = db.exec('SELECT quantity FROM books WHERE id = ?;', [item.bookId]);
        const prevQty = Number(bookRes[0]?.values[0]?.[0] || 0);
        const newQty = prevQty + item.quantity;

        db.run('UPDATE books SET quantity = ?, purchase_price = ?, updated_at = ? WHERE id = ?;', [
          newQty,
          item.unitCost,
          now,
          item.bookId,
        ]);

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

    db.run('COMMIT;');
    await persistDbToStorage(db);

    await logAudit(
      userId,
      userName || 'User',
      'PURCHASE_RECORD',
      'purchase',
      lastInsertId,
      `Recorded purchase invoice #${purchase.invoiceNumber} (KES ${purchase.totalCost.toFixed(2)}) from supplier #${purchase.supplierId}.`
    );
    return lastInsertId;
  } catch (error) {
    db.run('ROLLBACK;');
    throw error;
  }
}

export async function updatePurchaseStatus(
  purchaseId: number,
  status: 'received' | 'pending' | 'cancelled',
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_PURCHASES');
  const userId = extractUserId(userOrIdOrRole, 1);
  const now = new Date().toISOString();

  await runExecute(
    `UPDATE purchases SET status = ?, received_at = (CASE WHEN ? = 'received' THEN ? ELSE received_at END) WHERE id = ?;`,
    [status, status, now, purchaseId]
  );
  await logAudit(userId, userName || 'User', 'PURCHASE_STATUS_UPDATE', 'purchase', purchaseId, `Updated purchase #${purchaseId} status to "${status}".`);
}

export async function receivePendingPurchase(
  purchaseId: number,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_PURCHASES');
  const userId = extractUserId(userOrIdOrRole, 1);
  const now = new Date().toISOString();
  const db = await getDatabase();

  db.run('PRAGMA foreign_keys = ON;');
  db.run('BEGIN TRANSACTION;');
  try {
    const pRes = db.exec('SELECT invoice_number, status FROM purchases WHERE id = ?;', [purchaseId]);
    if (!pRes[0] || pRes[0].values.length === 0) throw new Error('Purchase not found');
    const invoiceNumber = pRes[0].values[0][0] as string;
    const status = pRes[0].values[0][1] as string;
    if (status === 'received') throw new Error('Purchase is already received.');

    db.run("UPDATE purchases SET status = 'received', received_at = ? WHERE id = ?;", [now, purchaseId]);

    const items = await runQuery<{ book_id: number; quantity: number; unit_cost: number }>(
      'SELECT book_id, quantity, unit_cost FROM purchase_items WHERE purchase_id = ?;',
      [purchaseId]
    );

    for (const item of items) {
      const bRes = db.exec('SELECT quantity FROM books WHERE id = ?;', [item.book_id]);
      const prevQty = Number(bRes[0]?.values[0]?.[0] || 0);
      const newQty = prevQty + item.quantity;
      db.run('UPDATE books SET quantity = ?, purchase_price = ?, updated_at = ? WHERE id = ?;', [newQty, item.unit_cost, now, item.book_id]);
      db.run(
        `INSERT INTO stock_movements (book_id, movement_type, quantity_change, previous_quantity, new_quantity, unit_cost, reference_type, reference_id, notes, user_id, created_at)
         VALUES (?, 'purchase', ?, ?, ?, ?, 'purchase', ?, ?, ?, ?);`,
        [item.book_id, item.quantity, prevQty, newQty, item.unit_cost, String(purchaseId), `Received delivery for Inv #${invoiceNumber}`, userId, now]
      );
    }

    db.run('COMMIT;');
    await persistDbToStorage(db);
    await logAudit(userId, userName || 'User', 'PURCHASE_RECEIVE', 'purchase', purchaseId, `Received stock delivery for purchase invoice #${invoiceNumber}.`);
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
}

export async function recordSupplierPayment(
  supplierId: number,
  amount: number,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_PURCHASES');
  const userId = extractUserId(userOrIdOrRole, 1);
  await runExecute('UPDATE suppliers SET balance = balance - ? WHERE id = ?;', [amount, supplierId]);
  await logAudit(userId, userName || 'User', 'SUPPLIER_PAYMENT', 'supplier', supplierId, `Recorded supplier payment of KES ${amount.toFixed(2)}.`);
}

export async function getPurchases(): Promise<any[]> {
  const sql = `
    SELECT p.*, s.name as supplier_name, u.full_name as user_name
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.id DESC;
  `;
  const purchases = await runQuery(sql);
  for (const p of purchases) {
    p.items = await runQuery('SELECT * FROM purchase_items WHERE purchase_id = ?;', [p.id]);
  }
  return purchases;
}

// Expenses
export async function getExpenses(options?: { startDate?: string; endDate?: string; category?: string }): Promise<Expense[]> {
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

export async function recordExpense(
  expense: {
    category: ExpenseCategory;
    amount: number;
    description: string;
    date: string;
    user_id?: number;
  },
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<number> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_EXPENSES');
  const userId = extractUserId(userOrIdOrRole, 1);
  const now = new Date().toISOString();
  const { lastInsertId } = await runExecute(
    `INSERT INTO expenses (category, amount, description, date, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [expense.category, expense.amount, expense.description.trim(), expense.date, userId, now]
  );
  await logAudit(userId, userName || 'User', 'EXPENSE_RECORD', 'expense', lastInsertId, `Recorded expense of KES ${expense.amount.toFixed(2)} under "${expense.category}": ${expense.description}.`);
  return lastInsertId;
}

export const addExpense = recordExpense;

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
  // Sales filtered by Nairobi date (+3 hours)
  const sales = await runQuery<{
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    total_paid: number;
    change_amount: number;
    is_voided: number;
    payment_method: string;
    payments_json?: string;
  }>(
    `SELECT subtotal, discount_total, tax_total, grand_total, total_paid, change_amount, is_voided, payment_method, payments_json
     FROM sales
     WHERE date(created_at, '+3 hours') >= ? AND date(created_at, '+3 hours') <= ?;`,
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

    // Revenue excludes VAT / tax
    const netSaleRevenue = Math.round((s.subtotal - s.discount_total) * 100) / 100;
    revenue += netSaleRevenue;

    // Cash received must not include change given
    if (s.payment_method === 'cash') {
      const netCash = s.total_paid - s.change_amount;
      cashReceived += netCash;
      paymentBreakdown.cash += s.grand_total;
    } else if (s.payment_method === 'mpesa') {
      paymentBreakdown.mpesa += s.grand_total;
    } else if (s.payment_method === 'card') {
      paymentBreakdown.card += s.grand_total;
    } else if (s.payment_method === 'split') {
      let parsed = false;
      if (s.payments_json) {
        try {
          const split = JSON.parse(s.payments_json);
          if (Array.isArray(split)) {
            for (const p of split) {
              const amt = Number(p.amount) || 0;
              if (p.method === 'cash') {
                cashReceived += (amt - s.change_amount);
                paymentBreakdown.cash += amt;
              } else if (p.method === 'mpesa') {
                paymentBreakdown.mpesa += amt;
              } else if (p.method === 'card') {
                paymentBreakdown.card += amt;
              }
            }
            parsed = true;
          }
        } catch {}
      }
      if (!parsed) {
        cashReceived += (s.total_paid - s.change_amount);
        paymentBreakdown.split = (paymentBreakdown.split || 0) + s.grand_total;
      }
    }
  }

  // COGS for non-voided sales using Nairobi date filtering
  const cogsRes = await runQuery<{ cogs: number }>(
    `SELECT COALESCE(SUM(si.quantity * si.unit_purchase_price), 0) as cogs
     FROM sale_items si
     JOIN sales s ON si.sale_id = s.id
     WHERE s.is_voided = 0 AND date(s.created_at, '+3 hours') >= ? AND date(s.created_at, '+3 hours') <= ?;`,
    [startDate, endDate]
  );
  const cogs = cogsRes[0]?.cogs || 0;

  // Gross profit excludes tax (revenue is already net of VAT)
  const grossProfit = Math.round((revenue - cogs) * 100) / 100;

  // Operating Expenses
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
    paymentBreakdown: {
      cash: Math.round(paymentBreakdown.cash * 100) / 100,
      mpesa: Math.round(paymentBreakdown.mpesa * 100) / 100,
      card: Math.round(paymentBreakdown.card * 100) / 100,
      split: Math.round((paymentBreakdown.split || 0) * 100) / 100,
    },
  };
}

export async function getTopSellingBooks(limit = 10, startDate?: string, endDate?: string): Promise<any[]> {
  let dateFilter = '';
  const params: any[] = [];
  if (startDate && endDate) {
    dateFilter = " AND date(s.created_at, '+3 hours') >= ? AND date(s.created_at, '+3 hours') <= ?";
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
    `SELECT * FROM sales WHERE date(created_at, '+3 hours') = ? ${userClause};`,
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
    // Exclude tax from gross revenue
    grossSales += (s.subtotal - s.discount_total);

    if (s.payment_method === 'cash') {
      cashSales += s.grand_total;
    } else if (s.payment_method === 'mpesa') {
      mpesaSales += s.grand_total;
    } else if (s.payment_method === 'card') {
      cardSales += s.grand_total;
    } else if (s.payment_method === 'split') {
      let handled = false;
      if (s.payments_json) {
        try {
          const split = JSON.parse(s.payments_json);
          if (Array.isArray(split)) {
            for (const p of split) {
              const amt = Number(p.amount) || 0;
              if (p.method === 'cash') cashSales += amt;
              else if (p.method === 'mpesa') mpesaSales += amt;
              else if (p.method === 'card') cardSales += amt;
            }
            handled = true;
          }
        } catch {}
      }
      if (!handled && s.payment_reference) {
        try {
          const split = JSON.parse(s.payment_reference);
          cashSales += Number(split.cash) || 0;
          mpesaSales += Number(split.mpesa) || 0;
          handled = true;
        } catch {}
      }
      if (!handled) {
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
  // Never SELECT password_hash or pin into anything reaching the UI
  return runQuery<User>(
    `SELECT id, username, full_name, role, is_active, created_at, last_login,
      (CASE WHEN pin IS NOT NULL AND pin != '' THEN 1 ELSE 0 END) as has_pin
     FROM users ORDER BY id ASC;`
  );
}

export async function addUser(
  user: Omit<User, 'id' | 'created_at'>,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  adminName?: string
): Promise<number> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_USERS');
  const adminId = extractUserId(userOrIdOrRole, 1);
  const now = new Date().toISOString();
  const trimmed = user.username.trim();

  // Case-insensitive unique check
  const existing = await runQueryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?);', [trimmed]);
  if (existing) {
    throw new Error(`Username "${user.username}" is already taken.`);
  }

  let passHash = user.password_hash || '';
  if (!passHash.startsWith('$2')) {
    passHash = bcrypt.hashSync(passHash, 10);
  }

  let pinHash: string | null = null;
  if (user.pin && user.pin.trim()) {
    pinHash = user.pin.startsWith('$2') ? user.pin : bcrypt.hashSync(user.pin.trim(), 10);
  }

  const { lastInsertId } = await runExecute(
    `INSERT INTO users (username, full_name, role, password_hash, pin, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [trimmed, user.full_name.trim(), user.role, passHash, pinHash, user.is_active, now]
  );
  await logAudit(adminId, adminName || 'Admin', 'USER_CREATE', 'user', lastInsertId, `Created user "${trimmed}" with role "${user.role}".`);
  return lastInsertId;
}

export async function updateUser(
  id: number,
  userData: Partial<User>,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  adminName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_MANAGE_USERS');
  const adminId = extractUserId(userOrIdOrRole, 1);
  const current = await runQueryOne<User & { password_hash: string; pin: string | null }>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  );
  if (!current) throw new Error('User not found');

  let newUsername = current.username;
  if (userData.username !== undefined) {
    const trimmed = userData.username.trim();
    if (!trimmed) throw new Error('Username cannot be empty.');
    const existing = await runQueryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?;', [trimmed, id]);
    if (existing) {
      throw new Error(`Username "${trimmed}" is already taken.`);
    }
    newUsername = trimmed;
  }

  let finalPin: string | null = current.pin || null;
  if (userData.pin !== undefined) {
    if (userData.pin) {
      finalPin = userData.pin.startsWith('$2') ? userData.pin : bcrypt.hashSync(userData.pin.trim(), 10);
    } else {
      finalPin = null;
    }
  }

  let finalPasswordHash = current.password_hash;
  if (userData.password_hash) {
    finalPasswordHash = userData.password_hash.startsWith('$2') ? userData.password_hash : bcrypt.hashSync(userData.password_hash.trim(), 10);
  }

  await runExecute(
    `UPDATE users SET
      username = ?,
      full_name = ?,
      role = ?,
      is_active = ?,
      pin = ?,
      password_hash = ?
     WHERE id = ?;`,
    [
      newUsername,
      userData.full_name !== undefined ? userData.full_name.trim() : current.full_name,
      userData.role !== undefined ? userData.role : current.role,
      userData.is_active !== undefined ? userData.is_active : current.is_active,
      finalPin,
      finalPasswordHash,
      id,
    ]
  );
  await logAudit(adminId, adminName || 'Admin', 'USER_UPDATE', 'user', id, `Updated user "${newUsername}".`);
}

// Shop Settings
export async function getShopSettings(): Promise<ShopSettings> {
  const rows = await runQuery<{ key: string; value: string }>('SELECT key, value FROM shop_settings;');
  const settings: any = {};
  for (const row of rows) {
    if (
      row.key === 'tax_rate' ||
      row.key === 'max_cashier_discount_percent' ||
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

export async function updateShopSettings(
  newSettings: Partial<ShopSettings>,
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName?: string
): Promise<void> {
  await requirePermission(userOrIdOrRole, 'CAN_EDIT_SETTINGS');
  const userId = extractUserId(userOrIdOrRole, 1);

  for (const [key, val] of Object.entries(newSettings)) {
    if (val !== undefined) {
      await runExecute(
        `INSERT INTO shop_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        [key, String(val)]
      );
    }
  }
  await logAudit(userId, userName || 'Admin', 'SETTINGS_UPDATE', 'settings', 'shop', 'Updated store configuration parameters.');
}

// Clean all business records (books, movements, purchases, sales, expenses)
// Does NOT delete audit_logs, appends SYSTEM_CLEAN entry, requires admin + typed confirmation
export async function cleanBusinessDatabase(
  userOrIdOrRole: { role: UserRole; id?: number } | UserRole | number,
  userName: string,
  typedConfirmation: string
): Promise<{ ok: boolean; backupSize: number }> {
  await requirePermission(userOrIdOrRole, 'CAN_CLEAN_DATABASE');
  const userId = extractUserId(userOrIdOrRole, 1);

  if (typedConfirmation !== 'DELETE ALL STORE DATA') {
    throw new Error('Database cleanup aborted: exact typed confirmation "DELETE ALL STORE DATA" required.');
  }

  const db = await getDatabase();
  const binary = db.export();
  const backupSize = binary?.byteLength || 0;

  if (!binary || backupSize === 0) {
    throw new Error('Safety backup failed: exported binary is empty. Aborting database cleanup to prevent data loss.');
  }

  // Verify backup integrity BEFORE clean
  const isVerified = await verifyDatabaseBinary(binary);
  if (!isVerified) {
    throw new Error('Pre-cleanup safety backup verification failed. Aborting database cleanup.');
  }

  // Save verified safety backup in IndexedDB (never localStorage)
  if (typeof window !== 'undefined' && window.indexedDB) {
    const idb = await openIDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction('sqlite', 'readwrite');
      const store = tx.objectStore('sqlite');
      const req = store.put(binary, 'pre_cleanup_safety_backup');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  const now = new Date().toISOString();

  db.run('PRAGMA foreign_keys = ON;');
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
    // DO NOT delete audit_logs! Append SYSTEM_CLEAN entry
    db.run(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at)
       VALUES (?, ?, 'SYSTEM_CLEAN', 'database', 'all', 'All business data cleared by administrator. Verified safety backup preserved.', ?);`,
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

// Export Human-Readable Database JSON (Financial Export - Gated)
export async function exportDatabaseJson(
  userOrIdOrRole?: { role: UserRole; id?: number } | UserRole | number
): Promise<string> {
  if (userOrIdOrRole) {
    await requirePermission(userOrIdOrRole, 'CAN_EXPORT_FINANCIALS');
  }

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
