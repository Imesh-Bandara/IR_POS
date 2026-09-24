use sqlx::{SqlitePool, sqlite::SqlitePoolOptions, Row, Executor};
use std::path::{Path, PathBuf};
use crate::models::backup::{BackupMetadata, RestorePreview};
use uuid::Uuid;
use std::fs;

pub async fn create_backup(db: &SqlitePool, dest_path: &Path, app_version: &str) -> Result<(), String> {
    // 1. Ensure the directory exists
    if let Some(parent) = dest_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create backup directory: {}", e))?;
        }
    }
    
    // 2. Perform VACUUM INTO
    let path_str = dest_path.to_string_lossy().replace("'", "''");
    let vacuum_query = format!("VACUUM INTO '{}'", path_str);
    let static_query: &'static str = Box::leak(vacuum_query.into_boxed_str());
    
    db.execute(static_query)
        .await
        .map_err(|e| format!("Failed to create database backup: {}", e))?;
        
    // 3. Connect to the new backup to write metadata
    let backup_url = format!("sqlite:{}", dest_path.to_string_lossy());
    let backup_pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&backup_url)
        .await
        .map_err(|e| format!("Failed to open backup for metadata: {}", e))?;
        
    // Try to get schema version from the backup
    let schema_version: String = sqlx::query("SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1")
        .fetch_optional(&backup_pool)
        .await
        .unwrap_or(None)
        .map(|row| row.try_get::<i64, _>("version").map(|v| v.to_string()).unwrap_or_else(|_| "unknown".to_string()))
        .unwrap_or_else(|| "unknown".to_string());
        
    // Insert/update metadata record
    let backup_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT OR REPLACE INTO backup_metadata (id, app_version, schema_version, notes) 
         VALUES (?, ?, ?, ?)"
    )
    .bind(&backup_id)
    .bind(app_version)
    .bind(&schema_version)
    .bind("Manual Backup")
    .execute(&backup_pool)
    .await
    .map_err(|e| format!("Failed to write backup metadata: {}", e))?;
    
    backup_pool.close().await;
    
    Ok(())
}

pub async fn validate_backup(backup_path: &Path) -> Result<RestorePreview, String> {
    if !backup_path.exists() {
        return Ok(RestorePreview {
            metadata: None,
            is_valid: false,
            error_message: Some("Backup file does not exist.".to_string()),
        });
    }
    
    let backup_url = format!("sqlite:{}", backup_path.to_string_lossy());
    let backup_pool_result = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&backup_url)
        .await;
        
    let backup_pool = match backup_pool_result {
        Ok(pool) => pool,
        Err(_) => {
            return Ok(RestorePreview {
                metadata: None,
                is_valid: false,
                error_message: Some("Failed to open backup. It may be corrupted or not a valid SQLite database.".to_string()),
            });
        }
    };
    
    // Check integrity
    let integrity: (String,) = match sqlx::query_as("PRAGMA integrity_check")
        .fetch_one(&backup_pool)
        .await {
            Ok(res) => res,
            Err(_) => {
                backup_pool.close().await;
                return Ok(RestorePreview {
                    metadata: None,
                    is_valid: false,
                    error_message: Some("Failed to run integrity check.".to_string()),
                });
            }
        };
        
    if integrity.0 != "ok" {
        backup_pool.close().await;
        return Ok(RestorePreview {
            metadata: None,
            is_valid: false,
            error_message: Some("Database integrity check failed. The backup is corrupted.".to_string()),
        });
    }
    
    // Read metadata
    let metadata_result = sqlx::query_as::<_, BackupMetadata>(
        "SELECT id, app_version, schema_version, created_at, notes FROM backup_metadata ORDER BY created_at DESC LIMIT 1"
    )
    .fetch_optional(&backup_pool)
    .await;
    
    backup_pool.close().await;
    
    match metadata_result {
        Ok(Some(meta)) => {
            Ok(RestorePreview {
                metadata: Some(meta),
                is_valid: true,
                error_message: None,
            })
        },
        Ok(None) => {
            Ok(RestorePreview {
                metadata: None,
                is_valid: false,
                error_message: Some("Backup is missing metadata. It might be an older or invalid IR POS database.".to_string()),
            })
        },
        Err(e) => {
            Ok(RestorePreview {
                metadata: None,
                is_valid: false,
                error_message: Some(format!("Could not read backup metadata: {}", e)),
            })
        }
    }
}

pub async fn perform_restore(
    current_pool: &SqlitePool, 
    current_db_path: &Path, 
    backup_path: &Path,
) -> Result<(), String> {
    // 1. Validate the backup again
    let preview = validate_backup(backup_path).await?;
    if !preview.is_valid {
        return Err(preview.error_message.unwrap_or_else(|| "Invalid backup".to_string()));
    }
    
    // 2. Create emergency backup of current state
    let emergency_path = current_db_path.with_file_name("irpos_emergency_prerestore.db");
    
    let _ = fs::remove_file(&emergency_path);
    
    let path_str = emergency_path.to_string_lossy().replace("'", "''");
    let vacuum_query = format!("VACUUM INTO '{}'", path_str);
    let static_query: &'static str = Box::leak(vacuum_query.into_boxed_str());
    
    current_pool.execute(static_query)
        .await
        .map_err(|e| format!("CRITICAL: Failed to create emergency backup before restore: {}. Restore aborted.", e))?;
        
    // 3. Close the current pool. 
    current_pool.close().await;
    
    // 4. Overwrite the main db file with the backup
    if let Err(e) = fs::copy(backup_path, current_db_path) {
        return Err(format!("CRITICAL: Failed to copy backup over live database: {}. Application must be restarted manually.", e));
    }
    
    Ok(())
}
