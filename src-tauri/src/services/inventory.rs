use sqlx::{Sqlite, Transaction, Row};
use uuid::Uuid;

pub async fn adjust_stock_tx(
    tx: &mut Transaction<'_, Sqlite>,
    product_id: &str,
    quantity_change: i64,
    movement_type: &str,
    reason: &str,
    user_id: &str,
    branch_id: Option<&str>,
    reference_type: Option<&str>,
    reference_id: Option<&str>,
) -> Result<i64, String> {
    // 1. Read current stock and cost price
    let row = sqlx::query("SELECT current_stock, cost_price FROM products WHERE id = ?")
        .bind(product_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    let row = row.ok_or_else(|| format!("Product {} not found", product_id))?;
    let previous_quantity: i64 = row.get("current_stock");
    let unit_cost: i64 = row.get("cost_price");

    // 2. Calculate new stock
    let new_quantity = previous_quantity + quantity_change;

    // 3. Validate business rule (no negative stock allowed by default)
    if new_quantity < 0 {
        return Err(format!("Insufficient stock for product {}. Current: {}, Attempted deduction: {}", product_id, previous_quantity, quantity_change.abs()));
    }

    // 4. Update products table
    sqlx::query("UPDATE products SET current_stock = ? WHERE id = ?")
        .bind(new_quantity)
        .bind(product_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    // 5. Insert movement log
    let movement_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO stock_movements (
            id, product_id, branch_id, quantity_changed, movement_type, reference_type, reference_id,
            previous_quantity, new_quantity, unit_cost, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&movement_id)
    .bind(product_id)
    .bind(branch_id)
    .bind(quantity_change)
    .bind(movement_type)
    .bind(reference_type)
    .bind(reference_id)
    .bind(previous_quantity)
    .bind(new_quantity)
    .bind(unit_cost)
    .bind(reason)
    .bind(user_id)
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    Ok(new_quantity)
}
