use crate::database::db::AppState;
use crate::models::pos::{CheckoutPayload, InvoiceResult};
use crate::models::inventory::InventoryProduct;
use crate::security::auth::validate_permission;
use crate::services::pos::checkout_tx;
use sqlx::Row;

#[tauri::command]
pub async fn checkout(
    token: String,
    payload: CheckoutPayload,
    state: tauri::State<'_, AppState>,
) -> Result<InvoiceResult, String> {
    let user_id = validate_permission(&state.db, &token, "sales.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let result = match checkout_tx(&mut tx, payload, &user_id).await {
        Ok(res) => {
            tx.commit().await.map_err(|e| e.to_string())?;
            res
        }
        Err(e) => {
            let _ = tx.rollback().await; // Ignore rollback error
            return Err(e);
        }
    };

    Ok(result)
}

#[tauri::command]
pub async fn search_products_pos(
    token: String,
    query: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<InventoryProduct>, String> {
    validate_permission(&state.db, &token, "sales.create").await?;

    let search_term = format!("%{}%", query);

    // Optimized for barcode or quick name lookup. Limit 20.
    let records = sqlx::query_as::<_, InventoryProduct>(
        "SELECT id, sku, barcode, name_en, name_si, category_id, unit_id, cost_price, selling_price, minimum_stock, current_stock, status 
         FROM products 
         WHERE (barcode = ? OR sku = ? OR name_en LIKE ? OR name_si LIKE ?) AND status = 'ACTIVE' 
         ORDER BY (barcode = ?) DESC, name_en ASC 
         LIMIT 20"
    )
    .bind(&query) // Exact barcode match prioritized
    .bind(&query)
    .bind(&search_term)
    .bind(&search_term)
    .bind(&query)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(records)
}
