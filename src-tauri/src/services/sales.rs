use crate::services::inventory::adjust_stock_tx;
use sqlx::{Row, Sqlite, Transaction};
use uuid::Uuid;

pub async fn void_sale_tx(
    tx: &mut Transaction<'_, Sqlite>,
    sale_id: &str,
    reason: &str,
    user_id: &str,
) -> Result<(), String> {
    // 1. Load original sale
    let sale_row = sqlx::query("SELECT invoice_number, status FROM sales WHERE id = ?")
        .bind(sale_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    let sale_row = sale_row.ok_or_else(|| "Sale not found".to_string())?;
    let status: String = sale_row.get("status");
    let invoice_number: String = sale_row.get("invoice_number");

    if status != "COMPLETED" {
        return Err(format!("Cannot void sale with status {}", status));
    }

    // 2. Update sale status
    sqlx::query("UPDATE sales SET status = 'VOIDED', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(sale_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    // 3. Load sale items and restore inventory
    let items = sqlx::query("SELECT product_id, quantity FROM sale_items WHERE sale_id = ?")
        .bind(sale_id)
        .fetch_all(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    for item_row in items {
        let product_id: String = item_row.get("product_id");
        let quantity: i64 = item_row.get("quantity");

        // Restore stock natively
        adjust_stock_tx(
            tx,
            &product_id,
            quantity, // Positive adjustment restores stock
            "SALE_VOID",
            &format!("Void Sale {}", invoice_number),
            user_id,
            None,
            Some("INVOICE"),
            Some(&invoice_number),
        )
        .await?;
    }

    // 4. Audit Log
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, 'VOID_SALE', 'SALE', ?, ?)")
        .bind(&log_id)
        .bind(user_id)
        .bind(sale_id)
        .bind(reason)
        .execute(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
