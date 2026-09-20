use crate::models::returns::{ReturnPayload, ReturnRecord};
use crate::services::inventory::adjust_stock_tx;
use chrono::Local;
use sqlx::{Row, Sqlite, Transaction};
use uuid::Uuid;

pub async fn process_return_tx(
    tx: &mut Transaction<'_, Sqlite>,
    payload: ReturnPayload,
    user_id: &str,
) -> Result<ReturnRecord, String> {
    // 1. Validate Sale Status
    let sale_row = sqlx::query("SELECT invoice_number, status FROM sales WHERE id = ?")
        .bind(&payload.sale_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    let sale_row = sale_row.ok_or_else(|| "Sale not found".to_string())?;
    let sale_status: String = sale_row.get("status");
    let invoice_number: String = sale_row.get("invoice_number");

    if sale_status == "VOIDED" || sale_status == "RETURNED" {
        return Err(format!("Cannot return items from a sale with status {}", sale_status));
    }

    // Generate Return Invoice Number
    let date_str = Local::now().format("%y%m%d").to_string();
    let prefix = format!("RET-{}-", date_str);
    let latest_ret = sqlx::query("SELECT return_invoice_number FROM returns WHERE return_invoice_number LIKE ? ORDER BY return_invoice_number DESC LIMIT 1")
        .bind(format!("{}%", prefix))
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    let mut next_seq = 1;
    if let Some(row) = latest_ret {
        let ret_num: String = row.get("return_invoice_number");
        if let Some(seq_str) = ret_num.split('-').last() {
            if let Ok(seq) = seq_str.parse::<i64>() {
                next_seq = seq + 1;
            }
        }
    }
    let return_invoice_number = format!("{}{:04}", prefix, next_seq);

    let return_id = Uuid::new_v4().to_string();
    let mut total_refund = 0;
    
    // Check if the sale has existing return items to calculate already returned qtys
    // For each item in payload:
    for req_item in &payload.items {
        if req_item.quantity <= 0 {
            continue;
        }

        // Fetch original sale item
        let item_row = sqlx::query("SELECT product_id, quantity, unit_price FROM sale_items WHERE id = ? AND sale_id = ?")
            .bind(&req_item.sale_item_id)
            .bind(&payload.sale_id)
            .fetch_optional(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

        let item_row = item_row.ok_or_else(|| "Sale item not found".to_string())?;
        let product_id: String = item_row.get("product_id");
        let original_qty: i64 = item_row.get("quantity");
        let unit_price: i64 = item_row.get("unit_price");

        // Fetch already returned quantity for this item
        let ret_qty_row = sqlx::query("SELECT COALESCE(SUM(quantity), 0) as returned FROM return_items WHERE sale_item_id = ?")
            .bind(&req_item.sale_item_id)
            .fetch_one(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

        let already_returned: i64 = ret_qty_row.get("returned");
        let returnable = original_qty - already_returned;

        if req_item.quantity > returnable {
            return Err(format!("Requested return quantity {} exceeds returnable amount {} for product", req_item.quantity, returnable));
        }

        let item_refund = req_item.quantity * unit_price;
        total_refund += item_refund;

        // Insert return_items
        let return_item_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO return_items (id, return_id, sale_item_id, quantity, refund_amount) VALUES (?, ?, ?, ?, ?)")
            .bind(&return_item_id)
            .bind(&return_id)
            .bind(&req_item.sale_item_id)
            .bind(req_item.quantity)
            .bind(item_refund)
            .execute(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;

        // Restore Stock
        adjust_stock_tx(
            tx,
            &product_id,
            req_item.quantity, // Positive restores
            "SALE_RETURN",
            &format!("Return {}", return_invoice_number),
            user_id,
            None,
            Some("RETURN_INVOICE"),
            Some(&return_invoice_number),
        ).await?;
    }

    if total_refund == 0 {
        return Err("No valid items provided to return".to_string());
    }

    // Insert returns
    sqlx::query(
        "INSERT INTO returns (id, original_sale_id, return_invoice_number, cashier_id, reason, refund_method, total_refund, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'COMPLETED')"
    )
    .bind(&return_id)
    .bind(&payload.sale_id)
    .bind(&return_invoice_number)
    .bind(user_id)
    .bind(&payload.reason)
    .bind(&payload.refund_method)
    .bind(total_refund)
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    // Insert refund record
    let refund_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO refunds (id, sale_id, return_id, refund_amount, payment_method, user_id)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&refund_id)
    .bind(&payload.sale_id)
    .bind(&return_id)
    .bind(total_refund)
    .bind(&payload.refund_method)
    .bind(user_id)
    .execute(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;

    // Check if fully returned or partially returned
    let total_sold_row = sqlx::query("SELECT COALESCE(SUM(quantity), 0) as total FROM sale_items WHERE sale_id = ?")
        .bind(&payload.sale_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;
    let total_sold: i64 = total_sold_row.get("total");

    let total_ret_row = sqlx::query(
        "SELECT COALESCE(SUM(ri.quantity), 0) as total 
         FROM return_items ri 
         JOIN returns r ON ri.return_id = r.id 
         WHERE r.original_sale_id = ?"
    )
    .bind(&payload.sale_id)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| e.to_string())?;
    let total_ret: i64 = total_ret_row.get("total");

    let new_status = if total_ret >= total_sold { "RETURNED" } else { "PARTIALLY_RETURNED" };

    // Update sale status
    sqlx::query("UPDATE sales SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(new_status)
        .bind(&payload.sale_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    // Audit Log
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, 'RETURN_SALE', 'SALE', ?, ?)")
        .bind(&log_id)
        .bind(user_id)
        .bind(&payload.sale_id)
        .bind(&payload.reason)
        .execute(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ReturnRecord {
        id: return_id,
        original_sale_id: payload.sale_id,
        return_invoice_number,
        cashier_id: user_id.to_string(),
        reason: Some(payload.reason),
        refund_method: payload.refund_method,
        total_refund,
        status: "COMPLETED".to_string(),
        created_at: Local::now().to_string(), // approximation for return payload
    })
}
