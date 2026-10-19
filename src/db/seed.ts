import bcrypt from 'bcryptjs';

export async function getSeedQueries(): Promise<string[]> {
  const adminHash = bcrypt.hashSync('admin123', 8);
  const managerHash = bcrypt.hashSync('manager123', 8);
  const cashierHash = bcrypt.hashSync('cashier123', 8);

  const now = new Date().toISOString();
  const today = now.split('T')[0];

  return [
    `INSERT INTO schema_migrations (version, applied_at) VALUES (1, '${now}');`,

    `INSERT INTO users (id, username, full_name, role, password_hash, pin, is_active, created_at) VALUES 
      (1, 'admin', 'Kariuki Mwangi (System Admin)', 'admin', '${adminHash}', '1234', 1, '${now}'),
      (2, 'manager', 'Grace Wanjiku (Store Manager)', 'manager', '${managerHash}', '2345', 1, '${now}'),
      (3, 'cashier', 'Amina Mohammed (Cashier)', 'cashier', '${cashierHash}', '3456', 1, '${now}');`,

    `INSERT INTO shop_settings (key, value) VALUES
      ('shop_name', 'Kitabu Central Bookshop & Stationers'),
      ('tagline', 'Your Trusted Academic & Stationery Partner'),
      ('phone', '+254 722 890 123'),
      ('email', 'info@kitabubookshop.co.ke'),
      ('address', 'Biashara Street, City Center Plaza, Ground Floor'),
      ('county', 'Nairobi, Kenya'),
      ('till_number', '849201'),
      ('paybill_number', '522522'),
      ('receipt_footer', 'Thank you for supporting education! Goods once sold can be exchanged within 7 days with valid receipt.'),
      ('currency', 'KES'),
      ('tax_rate', '0'),
      ('session_timeout_minutes', '15'),
      ('backup_schedule', 'daily');`,

    `INSERT INTO suppliers (id, name, contact_person, phone, email, address, balance, created_at) VALUES
      (1, 'Longhorn Publishers PLC', 'Patrick Ochieng', '+254 719 035000', 'orders@longhornpublishers.com', 'Funzi Road, Industrial Area, Nairobi', 15400, '${now}'),
      (2, 'Kenya Literature Bureau (KLB)', 'Mercy Njeri', '+254 711 088000', 'sales@klb.co.ke', 'Belle Vue, South C, Nairobi', 0, '${now}'),
      (3, 'East African Educational Publishers', 'David Kilonzo', '+254 722 205661', 'customerservice@eaep.co.ke', 'Brick Court, Mpaka Rd, Westlands', 8200, '${now}'),
      (4, 'Oxford University Press East Africa', 'Faith Chebet', '+254 722 202179', 'orders.ke@oup.com', 'ABC Place, Waiyaki Way, Nairobi', 0, '${now}'),
      (5, 'Kasuku / Kartasi Industries', 'Nilesh Shah', '+254 733 600500', 'sales@kartasi.com', 'Mombasa Road, Nairobi', 4500, '${now}');`,

    `INSERT INTO customers (id, name, phone, email, institution_type, credit_limit, current_balance, created_at) VALUES
      (1, 'St. Mary''s Girls High School', '+254 721 554433', 'accounts@stmarysgirls.ac.ke', 'school', 150000, 32500, '${now}'),
      (2, 'Baraka Junior Academy', '+254 733 998877', 'bursar@barakajunior.co.ke', 'school', 80000, 0, '${now}'),
      (3, 'Teacher John Mwangi', '+254 722 112233', 'johnmwangi77@gmail.com', 'teacher', 15000, 2400, '${now}'),
      (4, 'Musa Kiprono (Parent)', '+254 710 445566', 'mkiprono@yahoo.com', 'parent', 10000, 0, '${now}');`,

    `INSERT INTO books (id, isbn, barcode, title, author, publisher, category, edition, purchase_price, selling_price, quantity, reorder_level, is_archived, created_at, updated_at) VALUES
      (1, '978-0195738592', '9780195738592', 'Fathers of Nations', 'Paul B. Vitta', 'Oxford University Press', 'KCSE Set Books', '1st Edition', 450.00, 650.00, 48, 10, 0, '${now}', '${now}'),
      (2, '978-9966103328', '9789966103328', 'The Samaritan', 'John Lara', 'KLB', 'KCSE Set Books', 'Official Edition', 380.00, 550.00, 35, 10, 0, '${now}', '${now}'),
      (3, '978-9966052732', '9789966052732', 'A Silent Song and Other Stories', 'Edited by Godwin Siundu', 'Spotlight Publishers', 'KCSE Set Books', '2023 Edition', 330.00, 480.00, 40, 10, 0, '${now}', '${now}'),
      (4, '978-9966258410', '9789966258410', 'Parliament of Owls', 'Adipo Sidang''', 'East African Educational Publishers', 'KCSE Set Books', '1st Edition', 350.00, 500.00, 28, 8, 0, '${now}', '${now}'),
      (5, '978-9966448378', '9789966448378', 'Bembea ya Maisha', 'Timothy Arege', 'Early Bird', 'KCSE Set Books', 'Re-issue', 360.00, 520.00, 32, 8, 0, '${now}', '${now}'),
      (6, '978-9966052800', '9789966052800', 'Mapambazuko ya Machweo', 'Spotlight Editorial', 'Spotlight Publishers', 'KCSE Set Books', 'Current Edition', 340.00, 490.00, 30, 8, 0, '${now}', '${now}'),
      (7, '978-9966104882', '9789966104882', 'KLB Top Scholar English Grade 8', 'KLB Authors', 'KLB', 'CBC Junior School', 'Learners Book', 520.00, 720.00, 25, 6, 0, '${now}', '${now}'),
      (8, '978-9966104899', '9789966104899', 'KLB Top Scholar Mathematics Grade 8', 'KLB Authors', 'KLB', 'CBC Junior School', 'Learners Book', 560.00, 780.00, 22, 6, 0, '${now}', '${now}'),
      (9, '978-9966367280', '9789966367280', 'Longhorn Integrated Science Grade 7', 'Prof. J. Omwenga', 'Longhorn Publishers', 'CBC Junior School', 'CBC Edition', 540.00, 750.00, 18, 5, 0, '${now}', '${now}'),
      (10, '978-0195740113', '9780195740113', 'Oxford Primary Atlas for Kenya', 'Oxford Cartography', 'Oxford University Press', 'Reference & Atlas', 'New Edition', 800.00, 1100.00, 12, 5, 0, '${now}', '${now}'),
      (11, '978-9966345672', '9789966345672', 'Moran English Dictionary (Compact)', 'Moran Editorial', 'Moran Publishers', 'Dictionaries', 'Hardcover', 850.00, 1200.00, 4, 5, 0, '${now}', '${now}'),
      (12, '978-9966368898', '9789966368898', 'Kamusi Kuu ya Kiswahili', 'Prof. Ahmed Ndalu', 'Longhorn Publishers', 'Dictionaries', '3rd Edition', 1300.00, 1800.00, 6, 3, 0, '${now}', '${now}'),
      (13, '616110001234', '616110001234', 'Oxford Mathematical Set (Original)', 'Helix Oxford', 'Helix UK / Kasuku', 'Stationery', 'Tin Case', 220.00, 350.00, 60, 15, 0, '${now}', '${now}'),
      (14, '616110005678', '616110005678', 'Kasuku Exercise Book 200 Pages A4 (Pack of 6)', 'Kasuku', 'Kartasi Industries', 'Stationery', 'Ruled', 420.00, 600.00, 45, 10, 0, '${now}', '${now}'),
      (15, '4549526609930', '4549526609930', 'Casio fx-82MS Scientific Calculator', 'Casio Japan', 'Casio Electronics', 'Stationery & Electronics', 'Original', 1450.00, 1950.00, 14, 5, 0, '${now}', '${now}'),
      (16, '616110009988', '616110009988', 'Bic Cristal Medium Pens (Blue, Box of 50)', 'Société Bic', 'Haco Industries Kenya', 'Stationery', 'Medium 1.0mm', 850.00, 1250.00, 15, 5, 0, '${now}', '${now}'),
      (17, '978-9966054111', '9789966054111', 'Spotlight KCSE Revision Biology', 'Dr. S. Kimani', 'Spotlight Publishers', 'Revision Guides', '2024 Edition', 620.00, 880.00, 2, 5, 0, '${now}', '${now}');`,

    `INSERT INTO stock_movements (book_id, movement_type, quantity_change, previous_quantity, new_quantity, unit_cost, reference_type, notes, user_id, created_at) VALUES
      (1, 'initial', 48, 0, 48, 450.00, 'manual', 'Opening stock inventory count', 1, '${now}'),
      (2, 'initial', 35, 0, 35, 380.00, 'manual', 'Opening stock inventory count', 1, '${now}'),
      (3, 'initial', 40, 0, 40, 330.00, 'manual', 'Opening stock inventory count', 1, '${now}'),
      (7, 'initial', 25, 0, 25, 520.00, 'manual', 'Opening stock inventory count', 1, '${now}'),
      (13, 'initial', 60, 0, 60, 220.00, 'manual', 'Opening stock inventory count', 1, '${now}');`,

    `INSERT INTO expenses (category, amount, description, date, user_id, created_at) VALUES
      ('Rent', 35000.00, 'Monthly Shop Premises Rent - Biashara St.', '${today}', 1, '${now}'),
      ('Electricity & Water', 4250.00, 'Kenya Power (KPLC) Prepaid Token & City Water', '${today}', 2, '${now}'),
      ('Licences & County Council', 12500.00, 'Nairobi County Single Business Permit Installment', '${today}', 1, '${now}'),
      ('Packaging & Bags', 3200.00, 'Branded Kraft Paper Bags (1,000 pcs)', '${today}', 2, '${now}'),
      ('Internet & Airtime', 3000.00, 'Safaricom 4G Wi-Fi Monthly Unlimited & Support phone', '${today}', 2, '${now}');`,

    `INSERT INTO sales (id, receipt_number, user_id, cashier_name, customer_id, customer_name, subtotal, discount_total, tax_total, grand_total, total_paid, change_amount, payment_method, payment_reference, is_credit, is_voided, created_at) VALUES
      (1, 'RCP-2026-00001', 3, 'Amina Mohammed', NULL, 'Walk-in Customer', 1950.00, 0, 0, 1950.00, 2000.00, 50.00, 'cash', NULL, 0, 0, '${now}'),
      (2, 'RCP-2026-00002', 3, 'Amina Mohammed', NULL, 'Walk-in Customer', 1200.00, 0, 0, 1200.00, 1200.00, 0.00, 'mpesa', 'QKE893KL12', 0, 0, '${now}'),
      (3, 'RCP-2026-00003', 2, 'Grace Wanjiku', 1, 'St. Mary''s Girls High School', 32500.00, 0, 0, 32500.00, 0.00, 0.00, 'credit', 'School LPO #4920', 1, 0, '${now}');`,

    `INSERT INTO sale_items (sale_id, book_id, book_title, isbn, quantity, unit_purchase_price, unit_selling_price, discount_amount, total_price) VALUES
      (1, 1, 'Fathers of Nations', '978-0195738592', 2, 450.00, 650.00, 0, 1300.00),
      (1, 13, 'Oxford Mathematical Set (Original)', '616110001234', 1, 220.00, 350.00, 0, 350.00),
      (1, 14, 'Kasuku Exercise Book 200 Pages A4 (Pack of 6)', '616110005678', 1, 420.00, 300.00, 0, 300.00),
      (2, 2, 'The Samaritan', '978-9966103328', 1, 380.00, 550.00, 0, 550.00),
      (2, 1, 'Fathers of Nations', '978-0195738592', 1, 450.00, 650.00, 0, 650.00),
      (3, 1, 'Fathers of Nations', '978-0195738592', 50, 450.00, 650.00, 0, 32500.00);`,

    `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details, created_at) VALUES
      (1, 'Kariuki Mwangi', 'SYSTEM_INITIALIZATION', 'system', '1', 'Initial database setup and seed data initialized successfully.', '${now}'),
      (1, 'Kariuki Mwangi', 'STOCK_RECEIVE', 'book', '1', 'Initial stock verified for Fathers of Nations (48 units).', '${now}');`
  ];
}
