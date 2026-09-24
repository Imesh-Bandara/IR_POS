use crate::database::db::AppState;
use crate::models::pos::{CheckoutPayload, InvoiceResult};
use crate::models::inventory::InventoryProduct;
use crate::security::auth::validate_permission;
use crate::services::pos::checkout_tx;
use crate::services::inventory::adjust_stock_tx;
use sqlx::Row;
use uuid::Uuid;

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

#[tauri::command]
pub async fn quick_add_product(
    token: String,
    name_en: String,
    barcode: Option<String>,
    selling_price: i64,
    unit_id: String,
    cost_price: Option<i64>,
    opening_quantity: Option<i64>,
    state: tauri::State<'_, AppState>,
) -> Result<InventoryProduct, String> {
    let user_id = validate_permission(&state.db, &token, "pos.quick_product_create").await?;
    
    let id = Uuid::new_v4().to_string();
    let actual_cost_price = cost_price.unwrap_or(0);
    
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // Check barcode uniqueness
    if let Some(bc) = &barcode {
        let count: (i64,) = sqlx::query_as("SELECT count(*) FROM products WHERE barcode = ?")
            .bind(bc)
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        
        if count.0 > 0 {
            return Err("This barcode is already assigned to another product.".into());
        }
    }

    // Insert product
    sqlx::query(
        "INSERT INTO products (
            id, barcode, name_en, unit_id, cost_price, selling_price, status, current_stock, tax_rate, discount_amount, minimum_stock
        ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 0, 0, 0, 0)"
    )
    .bind(&id)
    .bind(&barcode)
    .bind(&name_en)
    .bind(&unit_id)
    .bind(actual_cost_price)
    .bind(selling_price)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Add opening quantity if provided
    let mut final_stock = 0;
    if let Some(qty) = opening_quantity {
        if qty > 0 {
            final_stock = match adjust_stock_tx(&mut tx, &id, qty, "INITIAL_STOCK", "Quick Add Initial Stock", &user_id, None, None, None).await {
                Ok(new_qty) => new_qty,
                Err(e) => return Err(format!("Failed to set initial stock: {}", e))
            };
        }
    }

    // Audit log
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE', 'PRODUCT', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(InventoryProduct {
        id,
        sku: None,
        barcode,
        name_en,
        name_si: None,
        category_id: None,
        unit_id: Some(unit_id),
        cost_price: actual_cost_price,
        selling_price,
        minimum_stock: 0,
        current_stock: final_stock,
        status: "ACTIVE".to_string(),
    })
}
