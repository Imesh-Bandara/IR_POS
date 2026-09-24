-- Add new permission
INSERT OR IGNORE INTO permissions (id, name, description) VALUES 
('perm_pos_quick_product_create', 'pos.quick_product_create', 'Create products on the fly during POS');

-- Assign to Admin and Manager
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
VALUES 
('role_admin', 'perm_pos_quick_product_create'),
('role_manager', 'perm_pos_quick_product_create');
