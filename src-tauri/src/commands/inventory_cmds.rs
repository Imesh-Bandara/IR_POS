use crate::database::db::AppState;
use crate::models::inventory::{
    InventoryFilter, InventoryProduct, MovementFilter, PaginatedInventory, PaginatedMovements,
    StockAdjustmentPayload, StockMovement,
};
use crate::security::auth::validate_permission;
use crate::services::inventory::adjust_stock_tx;
use sqlx::Row;
use uuid::Uuid;

#[tauri::command]
pub async fn adjust_stock(
    token: String,
    payload: StockAdjustmentPayload,
    state: tauri::State<'_, AppState>,
) -> Result<i64, String> {
    // Check permission based on movement type
    let permission_required = if payload.movement_type == "OPENING_STOCK" {
        "inventory.opening_stock"
    } else {
        "inventory.adjust"
    };

    let user_id = validate_permission(&state.db, &token, permission_required).await?;

    // Begin atomic transaction
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    // Perform adjustment
    let new_stock = adjust_stock_tx(
        &mut tx,
        &payload.product_id,
        payload.quantity_change,
        &payload.movement_type,
        &payload.reason,
        &user_id,
        None, // branch_id not implemented yet in UI
        None,
        None,
    )
    .await?;

    // Insert audit log
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'PRODUCT_STOCK', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(format!("ADJUST_STOCK_{}", payload.movement_type))
        .bind(&payload.product_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    // Commit
    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(new_stock)
}

#[tauri::command]
pub async fn get_inventory(
    token: String,
    filter: InventoryFilter,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedInventory, String> {
    validate_permission(&state.db, &token, "inventory.view").await?;

    let mut qb = sqlx::QueryBuilder::new(
        "SELECT id, sku, barcode, name_en, name_si, category_id, unit_id, cost_price, selling_price, minimum_stock, current_stock, status FROM products WHERE 1=1 "
    );
    let mut count_qb = sqlx::QueryBuilder::new("SELECT count(*), sum(current_stock * cost_price) as total_value FROM products WHERE 1=1 ");

    if let Some(s) = &filter.search {
        let search_term = format!("%{}%", s);
        let search_clause = format!(" AND (name_en LIKE '{}' OR barcode LIKE '{}' OR sku LIKE '{}') ", search_term, search_term, search_term);
        qb.push(&search_clause);
        count_qb.push(&search_clause);
    }

    if let Some(cat) = &filter.category_id {
        qb.push(" AND category_id = ");
        qb.push_bind(cat);
        count_qb.push(" AND category_id = ");
        count_qb.push_bind(cat);
    }

    if let Some(status) = &filter.stock_status {
        match status.as_str() {
            "OUT_OF_STOCK" => {
                qb.push(" AND current_stock <= 0 ");
                count_qb.push(" AND current_stock <= 0 ");
            }
            "LOW_STOCK" => {
                qb.push(" AND current_stock > 0 AND current_stock <= minimum_stock ");
                count_qb.push(" AND current_stock > 0 AND current_stock <= minimum_stock ");
            }
            "IN_STOCK" => {
                qb.push(" AND current_stock > minimum_stock ");
                count_qb.push(" AND current_stock > minimum_stock ");
            }
            _ => {}
        }
    }

    qb.push(" ORDER BY name_en ASC LIMIT ");
    qb.push_bind(filter.limit);
    qb.push(" OFFSET ");
    qb.push_bind(filter.offset);

    let count_row = count_qb.build().fetch_one(&state.db).await.map_err(|e| e.to_string())?;
    let total: i64 = count_row.get(0);
    let total_value: i64 = count_row.try_get(1).unwrap_or(0);

    let products_records = qb.build_query_as::<InventoryProduct>().fetch_all(&state.db).await.map_err(|e| e.to_string())?;

    Ok(PaginatedInventory {
        items: products_records,
        total,
        total_value,
    })
}

#[tauri::command]
pub async fn get_stock_movements(
    token: String,
    filter: MovementFilter,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedMovements, String> {
    validate_permission(&state.db, &token, "inventory.view_movements").await?;

    let mut qb = sqlx::QueryBuilder::new(
        "SELECT id, product_id, branch_id, quantity_changed, movement_type, reference_type, reference_id, previous_quantity, new_quantity, unit_cost, notes, created_by, datetime(created_at, 'localtime') as created_at FROM stock_movements WHERE 1=1 "
    );
    let mut count_qb = sqlx::QueryBuilder::new("SELECT count(*) FROM stock_movements WHERE 1=1 ");

    if let Some(pid) = &filter.product_id {
        qb.push(" AND product_id = ");
        qb.push_bind(pid);
        count_qb.push(" AND product_id = ");
        count_qb.push_bind(pid);
    }

    if let Some(mtype) = &filter.movement_type {
        qb.push(" AND movement_type = ");
        qb.push_bind(mtype);
        count_qb.push(" AND movement_type = ");
        count_qb.push_bind(mtype);
    }

    qb.push(" ORDER BY created_at DESC LIMIT ");
    qb.push_bind(filter.limit);
    qb.push(" OFFSET ");
    qb.push_bind(filter.offset);

    let count: (i64,) = count_qb.build_query_as().fetch_one(&state.db).await.map_err(|e| e.to_string())?;
    
    // Manual mapping for stringified created_at
    let records = qb.build().fetch_all(&state.db).await.map_err(|e| e.to_string())?;
    let mut items = Vec::new();
    for r in records {
        items.push(StockMovement {
            id: r.get("id"),
            product_id: r.get("product_id"),
            branch_id: r.try_get("branch_id").ok().flatten(),
            quantity_changed: r.get("quantity_changed"),
            movement_type: r.get("movement_type"),
            reference_type: r.try_get("reference_type").ok().flatten(),
            reference_id: r.try_get("reference_id").ok().flatten(),
            previous_quantity: r.get("previous_quantity"),
            new_quantity: r.get("new_quantity"),
            unit_cost: r.try_get("unit_cost").ok().flatten(),
            notes: r.try_get("notes").ok().flatten(),
            created_by: r.try_get("created_by").ok().flatten(),
            created_at: r.try_get("created_at").ok(),
        });
    }

    Ok(PaginatedMovements {
        items,
        total: count.0,
    })
}
