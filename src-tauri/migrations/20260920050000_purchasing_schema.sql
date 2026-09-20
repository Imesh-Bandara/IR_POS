-- Add missing fields to existing tables
ALTER TABLE suppliers ADD COLUMN supplier_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
ALTER TABLE suppliers ADD COLUMN outstanding_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE purchases ADD COLUMN branch_id TEXT REFERENCES branches(id);
ALTER TABLE purchases ADD COLUMN subtotal INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN discount_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN tax_total INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN amount_paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN outstanding_amount INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchases ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE purchase_items ADD COLUMN quantity_received INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN quantity_returned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN discount_amount INTEGER DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN tax_amount INTEGER DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN subtotal INTEGER NOT NULL DEFAULT 0;

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    business_id TEXT REFERENCES businesses(id),
    branch_id TEXT REFERENCES branches(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    created_by TEXT NOT NULL REFERENCES users(id),
    expected_delivery_date DATETIME,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED
    notes TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount_total INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    grand_total INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity_ordered INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    subtotal INTEGER NOT NULL,
    total INTEGER NOT NULL
);

-- Goods Receiving
CREATE TABLE IF NOT EXISTS purchase_receiving (
    id TEXT PRIMARY KEY,
    receiving_number TEXT UNIQUE NOT NULL,
    purchase_order_id TEXT REFERENCES purchase_orders(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    branch_id TEXT REFERENCES branches(id),
    received_by TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_receiving_items (
    id TEXT PRIMARY KEY,
    receiving_id TEXT NOT NULL REFERENCES purchase_receiving(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    purchase_order_item_id TEXT REFERENCES purchase_order_items(id),
    quantity_received INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL,
    total_cost INTEGER NOT NULL
);

-- Supplier Payments
CREATE TABLE IF NOT EXISTS supplier_payments (
    id TEXT PRIMARY KEY,
    payment_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    purchase_id TEXT REFERENCES purchases(id),
    branch_id TEXT REFERENCES branches(id),
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Returns
CREATE TABLE IF NOT EXISTS purchase_returns (
    id TEXT PRIMARY KEY,
    return_number TEXT UNIQUE NOT NULL,
    original_purchase_id TEXT NOT NULL REFERENCES purchases(id),
    supplier_id TEXT NOT NULL REFERENCES suppliers(id),
    branch_id TEXT REFERENCES branches(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    reason TEXT,
    total_refund INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
    id TEXT PRIMARY KEY,
    purchase_return_id TEXT NOT NULL REFERENCES purchase_returns(id),
    purchase_item_id TEXT NOT NULL REFERENCES purchase_items(id),
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    refund_amount INTEGER NOT NULL
);

-- New Permissions for Phase 7
INSERT OR IGNORE INTO permissions (id, name, description) VALUES
  ('perm_suppliers_view', 'suppliers.view', 'View suppliers'),
  ('perm_suppliers_create', 'suppliers.create', 'Create suppliers'),
  ('perm_suppliers_update', 'suppliers.update', 'Update suppliers'),
  ('perm_purchases_view', 'purchases.view', 'View purchases'),
  ('perm_purchases_create', 'purchases.create', 'Create purchases/POs'),
  ('perm_purchases_receive', 'purchases.receive', 'Receive goods'),
  ('perm_purchases_return', 'purchases.return', 'Process purchase returns'),
  ('perm_supplier_payments_create', 'supplier_payments.create', 'Record supplier payments');

-- Assign to Admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_admin', 'perm_suppliers_view'),
  ('role_admin', 'perm_suppliers_create'),
  ('role_admin', 'perm_suppliers_update'),
  ('role_admin', 'perm_purchases_view'),
  ('role_admin', 'perm_purchases_create'),
  ('role_admin', 'perm_purchases_receive'),
  ('role_admin', 'perm_purchases_return'),
  ('role_admin', 'perm_supplier_payments_create');

-- Assign to Manager
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_manager', 'perm_suppliers_view'),
  ('role_manager', 'perm_suppliers_create'),
  ('role_manager', 'perm_suppliers_update'),
  ('role_manager', 'perm_purchases_view'),
  ('role_manager', 'perm_purchases_create'),
  ('role_manager', 'perm_purchases_receive'),
  ('role_manager', 'perm_purchases_return'),
  ('role_manager', 'perm_supplier_payments_create');
