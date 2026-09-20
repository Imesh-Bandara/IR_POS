-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Insert Default Roles
INSERT OR IGNORE INTO roles (id, name, description) VALUES 
('role_admin', 'Administrator', 'Full system access'),
('role_manager', 'Manager', 'Managerial access to reports and inventory'),
('role_cashier', 'Cashier', 'Standard POS operations');

-- Insert Default Permissions
INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
('perm_dashboard_view', 'dashboard.view', 'View dashboard metrics'),
('perm_sales_view', 'sales.view', 'View sales history'),
('perm_sales_create', 'sales.create', 'Create new sales'),
('perm_sales_void', 'sales.void', 'Void sales'),
('perm_sales_return', 'sales.return', 'Process returns'),
('perm_products_view', 'products.view', 'View product catalog'),
('perm_products_create', 'products.create', 'Create products'),
('perm_products_edit', 'products.edit', 'Edit products'),
('perm_products_delete', 'products.delete', 'Delete products'),
('perm_inventory_view', 'inventory.view', 'View inventory'),
('perm_inventory_adjust', 'inventory.adjust', 'Adjust inventory levels'),
('perm_purchases_view', 'purchases.view', 'View purchases'),
('perm_purchases_create', 'purchases.create', 'Create purchases'),
('perm_customers_view', 'customers.view', 'View customers'),
('perm_customers_manage', 'customers.manage', 'Manage customers'),
('perm_reports_view', 'reports.view', 'View financial reports'),
('perm_users_view', 'users.view', 'View users'),
('perm_users_manage', 'users.manage', 'Manage users'),
('perm_settings_view', 'settings.view', 'View system settings'),
('perm_settings_manage', 'settings.manage', 'Manage system settings'),
('perm_backup_create', 'backup.create', 'Create backups'),
('perm_backup_restore', 'backup.restore', 'Restore backups');

-- Assign Permissions to Admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_admin', id FROM permissions;

-- Assign Permissions to Manager
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_manager', id FROM permissions
WHERE name IN (
    'dashboard.view', 'sales.view', 'sales.create', 'sales.void', 'sales.return',
    'products.view', 'products.create', 'products.edit',
    'inventory.view', 'inventory.adjust',
    'purchases.view', 'purchases.create',
    'customers.view', 'customers.manage',
    'reports.view',
    'users.view'
);

-- Assign Permissions to Cashier
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_cashier', id FROM permissions
WHERE name IN (
    'dashboard.view', 'sales.view', 'sales.create',
    'products.view', 'customers.view', 'customers.manage'
);
