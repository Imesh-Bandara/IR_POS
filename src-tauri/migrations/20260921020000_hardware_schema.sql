-- Add hardware permissions
INSERT OR IGNORE INTO permissions (id, name, description) VALUES
('perm_hardware_view', 'hardware.view', 'View hardware settings'),
('perm_hardware_configure', 'hardware.configure', 'Configure hardware settings'),
('perm_hardware_test', 'hardware.test', 'Test hardware devices'),
('perm_receipt_print', 'receipt.print', 'Print receipts'),
('perm_cashdrawer_open', 'cashdrawer.open', 'Manually open cash drawer');

-- Assign hardware permissions to Admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
('role_admin', 'perm_hardware_view'),
('role_admin', 'perm_hardware_configure'),
('role_admin', 'perm_hardware_test'),
('role_admin', 'perm_receipt_print'),
('role_admin', 'perm_cashdrawer_open');

-- Insert default hardware settings
INSERT OR IGNORE INTO settings (section, key, value) VALUES
('hardware', 'receipt_printer_enabled', 'false'),
('hardware', 'receipt_printer_connection', 'LAN'),
('hardware', 'receipt_printer_ip', '192.168.1.100'),
('hardware', 'receipt_printer_port', '9100'),
('hardware', 'receipt_paper_width', '80mm'),
('hardware', 'auto_print_receipt', 'true'),
('hardware', 'cash_drawer_enabled', 'false'),
('hardware', 'cash_drawer_auto_open', 'true'),
('hardware', 'customer_display_enabled', 'false'),
('hardware', 'label_printer_enabled', 'false');
