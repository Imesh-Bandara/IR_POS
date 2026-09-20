use crate::database::db::AppState;
use crate::models::sales::{HeldSale, HeldSaleDetails, HeldSaleItem};
use crate::security::auth::validate_permission;
use sqlx::Row;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct HeldCartPayload {
    pub name: Option<String>,
    pub subtotal: i64,
    pub discount_total: i64,
    pub tax_total: i64,
    pub grand_total: i64,
    pub items: Vec<HeldCartItemPayload>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HeldCartItemPayload {
    pub product_id: String,
    pub quantity: i64,
    pub unit_price: i64,
    pub discount_amount: i64,
    pub tax_amount: i64,
    pub subtotal: i64,
    pub total: i64,
}

#[tauri::command]
pub async fn save_held_sale(
    token: String,
    payload: HeldCartPayload,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let user_id = validate_permission(&state.db, &token, "sales.hold").await?;
    
    let held_id = Uuid::new_v4().to_string();
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "INSERT INTO held_sales (id, user_id, name, subtotal, discount_total, tax_total, grand_total) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&held_id)
    .bind(&user_id)
    .bind(&payload.name)
    .bind(payload.subtotal)
    .bind(payload.discount_total)
    .bind(payload.tax_total)
    .bind(payload.grand_total)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    for item in payload.items {
        let item_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO held_sale_items (id, held_sale_id, product_id, quantity, unit_price, discount_amount, tax_amount, subtotal, total) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&item_id)
        .bind(&held_id)
        .bind(&item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item.discount_amount)
        .bind(item.tax_amount)
        .bind(item.subtotal)
        .bind(item.total)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(held_id)
}

#[tauri::command]
pub async fn get_held_sales(
    token: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<HeldSaleDetails>, String> {
    let user_id = validate_permission(&state.db, &token, "sales.resume").await?;

    let held_sales = sqlx::query_as::<_, HeldSale>(
        "SELECT id, name, subtotal, discount_total, tax_total, grand_total, datetime(created_at, 'localtime') as created_at 
         FROM held_sales WHERE user_id = ? ORDER BY created_at ASC"
    )
    .bind(&user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let mut result = Vec::new();

    for sale in held_sales {
        let items = sqlx::query_as::<_, HeldSaleItem>(
            "SELECT id, held_sale_id, product_id, quantity, unit_price, discount_amount, tax_amount, subtotal, total 
             FROM held_sale_items WHERE held_sale_id = ?"
        )
        .bind(&sale.id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

        result.push(HeldSaleDetails { sale, items });
    }

    Ok(result)
}

#[tauri::command]
pub async fn delete_held_sale(
    token: String,
    held_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    validate_permission(&state.db, &token, "sales.resume").await?;

    // Cascade delete is configured in DB, but just to be safe
    sqlx::query("DELETE FROM held_sales WHERE id = ?")
        .bind(&held_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
