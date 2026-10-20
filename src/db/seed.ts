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
      ('shop_name', ''),
      ('tagline', ''),
      ('phone', ''),
      ('email', ''),
      ('address', ''),
      ('county', ''),
      ('till_number', ''),
      ('paybill_number', ''),
      ('receipt_footer', 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days with a valid receipt.'),
      ('receipt_prefix', 'RCP'),
      ('currency', 'KES'),
      ('tax_rate', '0'),
      ('session_timeout_minutes', '15'),
      ('default_reorder_level', '5'),
      ('backup_schedule', 'daily'),
      ('is_setup_completed', 'false');`,

    `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at) VALUES
      (1, 'System Administrator', 'SYSTEM_INITIALIZATION', 'system', '1', 'Initial database schema and system administrator accounts initialized. Ready for genuine business records.', '${now}');`
  ];
}
