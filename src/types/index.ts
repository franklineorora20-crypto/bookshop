export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  password_hash?: string;
  pin?: string;
  has_pin?: boolean | number;
  is_active: number; // 1 or 0
  created_at: string;
  last_login?: string;
  failed_login_attempts?: number;
  locked_until?: string | null;
}

export interface Book {
  id: number;
  isbn?: string;
  barcode?: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  edition?: string;
  purchase_price: number; // KES
  selling_price: number; // KES
  quantity: number;
  reorder_level: number;
  is_archived: number; // 1 or 0
  created_at: string;
  updated_at: string;
}

export type StockMovementType = 'initial' | 'purchase' | 'sale' | 'sale_void' | 'purchase_return' | 'customer_return' | 'damage' | 'adjustment';

export interface StockMovement {
  id: number;
  book_id: number;
  book_title?: string;
  movement_type: StockMovementType;
  quantity_change: number; // positive or negative
  previous_quantity: number;
  new_quantity: number;
  unit_cost?: number;
  reference_type?: 'sale' | 'purchase' | 'manual' | 'adjustment';
  reference_id?: number | string;
  notes?: string;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'mpesa' | 'split' | 'card';

export interface SalePayment {
  method: 'cash' | 'mpesa' | 'card';
  amount: number;
  reference?: string; // e.g. M-Pesa transaction code
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  book_id: number;
  book_title: string;
  isbn?: string;
  quantity: number;
  unit_purchase_price: number; // Historical cost at time of sale
  unit_selling_price: number;
  discount_amount: number;
  total_price: number;
}

export interface Sale {
  id: number;
  receipt_number: string;
  user_id: number;
  cashier_name?: string;
  customer_id?: number;
  customer_name?: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  total_paid: number;
  change_amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string; // M-Pesa code or split notes
  payments_json?: string; // JSON array of SalePayment
  is_voided: number; // 1 or 0
  void_reason?: string;
  voided_by_user_id?: number;
  voided_at?: string;
  created_at: string;
  items?: SaleItem[];
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  balance: number; // amount owed to supplier
  created_at: string;
}

export interface PurchaseItem {
  id?: number;
  purchase_id?: number;
  book_id: number;
  book_title: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  invoice_number: string;
  total_cost: number;
  amount_paid: number;
  payment_status: 'paid' | 'partial' | 'unpaid';
  status: 'received' | 'pending' | 'cancelled';
  notes?: string;
  user_id: number;
  created_at: string;
  received_at?: string;
  items?: PurchaseItem[];
}



export type ExpenseCategory =
  | 'Rent'
  | 'Electricity & Water'
  | 'Salaries & Casuals'
  | 'Transport & Delivery'
  | 'Packaging & Bags'
  | 'Licences & County Council'
  | 'Internet & Airtime'
  | 'Maintenance & Repairs'
  | 'Office & Stationery'
  | 'Miscellaneous';

export interface Expense {
  id: number;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  user_id: number;
  user_name?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name?: string;
  action: string;
  entity: string;
  entity_id?: string;
  details: string;
  created_at: string;
}

export interface ShopSettings {
  shop_name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  county: string;
  till_number: string;
  paybill_number: string;
  receipt_footer: string;
  currency: string;
  tax_rate: number; // percentage, e.g. 0 or 16
  max_cashier_discount_percent?: number;
  session_timeout_minutes: number;
  last_backup_at?: string;
  backup_schedule: 'daily' | 'weekly' | 'manual';
  backup_folder_path?: string;
  logo_url?: string;
  receipt_prefix?: string;
  default_reorder_level?: number;
  is_setup_completed?: boolean;
}
