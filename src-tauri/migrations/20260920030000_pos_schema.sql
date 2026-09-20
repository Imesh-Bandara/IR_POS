-- Insert POS permissions
INSERT OR IGNORE INTO permissions (id, name, description) VALUES
  ('perm_sales_create', 'sales.create', 'Create and checkout sales'),
  ('perm_sales_view', 'sales.view', 'View sales and reports'),
  ('perm_sales_discount', 'sales.discount', 'Apply regular discounts'),
  ('perm_sales_discount_ovr', 'sales.discount.override', 'Override discount limits'),
  ('perm_sales_cancel', 'sales.cancel', 'Cancel sales'),
  ('perm_sales_hold', 'sales.hold', 'Hold sales'),
  ('perm_sales_resume', 'sales.resume', 'Resume held sales');

-- Assign to Cashier
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_cashier', 'perm_sales_create'),
  ('role_cashier', 'perm_sales_view'),
  ('role_cashier', 'perm_sales_hold'),
  ('role_cashier', 'perm_sales_resume');

-- Assign to Manager
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_manager', 'perm_sales_create'),
  ('role_manager', 'perm_sales_view'),
  ('role_manager', 'perm_sales_discount'),
  ('role_manager', 'perm_sales_discount_ovr'),
  ('role_manager', 'perm_sales_cancel'),
  ('role_manager', 'perm_sales_hold'),
  ('role_manager', 'perm_sales_resume');

-- Assign to Admin
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_admin', 'perm_sales_create'),
  ('role_admin', 'perm_sales_view'),
  ('role_admin', 'perm_sales_discount'),
  ('role_admin', 'perm_sales_discount_ovr'),
  ('role_admin', 'perm_sales_cancel'),
  ('role_admin', 'perm_sales_hold'),
  ('role_admin', 'perm_sales_resume');
