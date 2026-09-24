-- Table to store metadata about the database backup itself
CREATE TABLE IF NOT EXISTS backup_metadata (
    id TEXT PRIMARY KEY,
    app_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- We only need a single row for the current active database.
-- We can insert a baseline record which will be updated whenever a backup is created.
INSERT INTO backup_metadata (id, app_version, schema_version, notes) 
VALUES ('active_db', '0.1.0', '20260921010000', 'Live database');
