-- Safely add detailed tracking columns to stock_movements without dropping historical data
ALTER TABLE stock_movements ADD COLUMN branch_id TEXT;
ALTER TABLE stock_movements ADD COLUMN previous_quantity INTEGER DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN new_quantity INTEGER DEFAULT 0;
ALTER TABLE stock_movements ADD COLUMN unit_cost INTEGER;
ALTER TABLE stock_movements ADD COLUMN reference_type TEXT;

-- Insert inventory permissions
INSERT OR IGNORE INTO permissions (id, name, description) VALUES
  ('perm_inventory_view', 'inventory.view', 'View inventory status and reports'),
  ('perm_inventory_adjust', 'inventory.adjust', 'Make manual stock adjustments'),
  ('perm_inv_open', 'inventory.opening_stock', 'Set initial opening stock'),
  ('perm_inv_move', 'inventory.view_movements', 'View historical stock ledger'),
  ('perm_inv_manage', 'inventory.manage', 'Full inventory management');

-- Assign to roles (Admin gets all, Manager gets view/move/adjust)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role_admin', 'perm_inventory_view'),
  ('role_admin', 'perm_inventory_adjust'),
  ('role_admin', 'perm_inv_open'),
  ('role_admin', 'perm_inv_move'),
  ('role_admin', 'perm_inv_manage'),
  
  ('role_manager', 'perm_inventory_view'),
  ('role_manager', 'perm_inventory_adjust'),
  ('role_manager', 'perm_inv_move');
