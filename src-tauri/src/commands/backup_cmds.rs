use tauri::{State, AppHandle, Manager};
use crate::database::db::AppState;
use crate::security::auth::validate_permission;
use crate::services::backup::{create_backup, validate_backup, perform_restore};
use crate::models::backup::RestorePreview;
use std::path::PathBuf;

#[tauri::command]
pub async fn create_backup_cmd(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    token: String,
    dest_path: String,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "backup.create").await?;
    
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE_BACKUP', 'SYSTEM', ?)")
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&user_id)
        .bind("backup")
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    tx.commit().await.map_err(|e| e.to_string())?;
    
    let app_version = app_handle.package_info().version.to_string();
    create_backup(&state.db, &PathBuf::from(dest_path), &app_version).await
}

#[tauri::command]
pub async fn validate_backup_cmd(
    state: State<'_, AppState>,
    token: String,
    backup_path: String,
) -> Result<RestorePreview, String> {
    validate_permission(&state.db, &token, "backup.view").await?;
    validate_backup(&PathBuf::from(backup_path)).await
}

#[tauri::command]
pub async fn restore_backup_cmd(
    state: State<'_, AppState>,
    app_handle: AppHandle,
    token: String,
    backup_path: String,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "backup.restore").await?;
    
    let app_data_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("./"));
    let db_path = app_data_dir.join("irpos.db");
    
    let _ = sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'RESTORE_STARTED', 'SYSTEM', ?)")
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(&user_id)
        .bind("restore")
        .execute(&state.db)
        .await; 
    
    perform_restore(&state.db, &db_path, &PathBuf::from(backup_path)).await?;
    
    app_handle.restart();
    
    Ok(())
}
