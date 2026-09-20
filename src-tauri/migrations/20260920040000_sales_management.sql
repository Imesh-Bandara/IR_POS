-- Held Sales Persistence
CREATE TABLE IF NOT EXISTS held_sales (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    name TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0,
    discount_total INTEGER NOT NULL DEFAULT 0,
    tax_total INTEGER NOT NULL DEFAULT 0,
    grand_total INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS held_sale_items (
    id TEXT PRIMARY KEY,
    held_sale_id TEXT NOT NULL REFERENCES held_sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    discount_amount INTEGER DEFAULT 0,
    tax_amount INTEGER DEFAULT 0,
    subtotal INTEGER NOT NULL,
    total INTEGER NOT NULL
);

-- Refunds Ledger (Keeps original payments intact)
CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id),
    return_id TEXT REFERENCES returns(id),
    refund_amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Additional Permissions for Sales Management
INSERT OR IGNORE INTO permissions (id, name, description) VALUES
  ('perm_sales_return', 'sales.return', 'Process sales returns'),
  ('perm_sales_refund', 'sales.refund', 'Process sales refunds'),
  ('perm_sales_void', 'sales.void', 'Void completed sales');

-- Assign to Manager
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_manager', 'perm_sales_return'),
  ('role_manager', 'perm_sales_refund'),
  ('role_manager', 'perm_sales_void');

-- Assign to Admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_admin', 'perm_sales_return'),
  ('role_admin', 'perm_sales_refund'),
  ('role_admin', 'perm_sales_void');
