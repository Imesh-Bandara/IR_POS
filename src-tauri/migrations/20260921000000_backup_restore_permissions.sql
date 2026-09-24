-- Insert backup view permission
INSERT OR IGNORE INTO permissions (id, name, description) VALUES
('perm_backup_view', 'backup.view', 'View available backups and status');

-- Assign permission to Admin role ('role_admin')
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
('role_admin', 'perm_backup_view');
