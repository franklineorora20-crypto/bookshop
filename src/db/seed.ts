import bcrypt from 'bcryptjs';

export async function getSeedQueries(): Promise<string[]> {
  const adminHash = bcrypt.hashSync('admin123', 8);
  const managerHash = bcrypt.hashSync('manager123', 8);
  const cashierHash = bcrypt.hashSync('cashier123', 8);

  const now = new Date().toISOString();

  return [
    `INSERT INTO schema_migrations (version, applied_at) VALUES (1, '${now}');`,

    `INSERT INTO users (id, username, full_name, role, password_hash, pin, is_active, created_at) VALUES 
      (1, 'admin', 'System Administrator', 'admin', '${adminHash}', '1234', 1, '${now}'),
      (2, 'manager', 'Store Manager', 'manager', '${managerHash}', '2345', 1, '${now}'),
      (3, 'cashier', 'Bookshop Cashier', 'cashier', '${cashierHash}', '3456', 1, '${now}');`,

    `INSERT INTO shop_settings (key, value) VALUES
      ('shop_name', 'My Bookshop & Stationers'),
      ('tagline', 'Academic & Stationery Partner'),
      ('phone', '+254 700 000 000'),
      ('email', 'info@mybookshop.co.ke'),
      ('address', 'Biashara Street'),
      ('county', 'Nairobi, Kenya'),
      ('till_number', ''),
      ('paybill_number', ''),
      ('receipt_footer', 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days with a valid receipt.'),
      ('currency', 'KES'),
      ('tax_rate', '0'),
      ('session_timeout_minutes', '15'),
      ('backup_schedule', 'daily');`,

    `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at) VALUES
      (1, 'System Administrator', 'SYSTEM_INITIALIZATION', 'system', '1', 'Initial database schema and system administrator accounts initialized. Ready for genuine business records.', '${now}');`
  ];
}
