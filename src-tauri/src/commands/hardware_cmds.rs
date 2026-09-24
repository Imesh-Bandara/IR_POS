use crate::database::db::AppState;
use crate::security::auth::validate_permission;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use crate::services::hardware::printer::{print_receipt_by_invoice, test_print};
use crate::services::hardware::drawer::open_cash_drawer;
use crate::services::hardware::display::update_customer_display;

#[tauri::command]
pub async fn print_receipt_cmd(
    token: String,
    invoice_number: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    // Both sales.create and receipt.print can trigger this. 
    // We'll just validate receipt.print or sales.create
    if validate_permission(&state.db, &token, "receipt.print").await.is_err() {
        validate_permission(&state.db, &token, "sales.create").await?;
    }

    print_receipt_by_invoice(&state.db, &invoice_number).await
}

#[tauri::command]
pub async fn test_printer_cmd(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    validate_permission(&state.db, &token, "hardware.test").await?;
    test_print(&state.db).await
}

#[tauri::command]
pub async fn open_cash_drawer_cmd(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    if validate_permission(&state.db, &token, "cashdrawer.open").await.is_err() {
        validate_permission(&state.db, &token, "sales.create").await?; // Allow checkout to kick it
    }
    
    open_cash_drawer(&state.db).await
}

#[tauri::command]
pub async fn test_display_cmd(
    token: String,
    line1: String,
    line2: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    validate_permission(&state.db, &token, "hardware.test").await?;
    update_customer_display(&state.db, &line1, &line2).await
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HardwareSetting {
    pub key: String,
    pub value: String,
}

#[tauri::command]
pub async fn get_hardware_settings_cmd(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<HardwareSetting>, String> {
    validate_permission(&state.db, &token, "hardware.view").await?;
    
    let rows = sqlx::query(
        "SELECT key, coalesce(value, '') as value FROM settings WHERE section = 'hardware'"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let settings = rows
        .into_iter()
        .map(|row| HardwareSetting {
            key: row.get("key"),
            value: row.get("value"),
        })
        .collect();

    Ok(settings)
}

#[tauri::command]
pub async fn update_hardware_settings_cmd(
    token: String,
    settings: Vec<HardwareSetting>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    validate_permission(&state.db, &token, "hardware.configure").await?;
    
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    
    for setting in settings {
        sqlx::query(
            "INSERT INTO settings (section, key, value, updated_at) VALUES ('hardware', ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(section, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP"
        )
        .bind(&setting.key)
        .bind(&setting.value)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }
    
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(())
}
