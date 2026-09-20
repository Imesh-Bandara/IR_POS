use crate::models::purchases::{ReceiveGoodsPayload, PurchaseReturnPayload, SupplierPaymentPayload};
use crate::services::inventory::adjust_stock_tx;
use chrono::Local;
use sqlx::{Row, Sqlite, Transaction};
use uuid::Uuid;

pub async fn receive_goods_tx(
    tx: &mut Transaction<'_, Sqlite>,
    payload: ReceiveGoodsPayload,
    user_id: &str,
) -> Result<String, String> {
    // Generate Receiving Number
    let date_str = Local::now().format("%y%m%d").to_string();
    let prefix = format!("GRN-{}-", date_str);
    let latest = sqlx::query("SELECT receiving_number FROM purchase_receiving WHERE receiving_number LIKE ? ORDER BY receiving_number DESC LIMIT 1")
        .bind(format!("{}%", prefix))
        .fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?;

    let mut next_seq = 1;
    if let Some(row) = latest {
        let num: String = row.get("receiving_number");
        if let Some(seq_str) = num.split('-').last() {
            if let Ok(seq) = seq_str.parse::<i64>() {
                next_seq = seq + 1;
            }
        }
    }
    let receiving_number = format!("{}{:04}", prefix, next_seq);
    let receiving_id = Uuid::new_v4().to_string();

    // Insert Receiving
    sqlx::query("INSERT INTO purchase_receiving (id, receiving_number, purchase_order_id, supplier_id, received_by, notes) VALUES (?, ?, ?, (SELECT supplier_id FROM purchase_orders WHERE id = ?), ?, ?)")
        .bind(&receiving_id).bind(&receiving_number).bind(&payload.purchase_order_id).bind(&payload.purchase_order_id).bind(user_id).bind(&payload.notes)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    // Create Purchase Invoice Document
    let prefix_pur = format!("PUR-{}-", date_str);
    let latest_pur = sqlx::query("SELECT invoice_number FROM purchases WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1")
        .bind(format!("{}%", prefix_pur))
        .fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?;
    let mut next_seq_pur = 1;
    if let Some(row) = latest_pur {
        let num: String = row.get("invoice_number");
        if let Some(seq_str) = num.split('-').last() {
            if let Ok(seq) = seq_str.parse::<i64>() { next_seq_pur = seq + 1; }
        }
    }
    let pur_number = format!("{}{:04}", prefix_pur, next_seq_pur);
    let purchase_id = Uuid::new_v4().to_string();

    let mut total_amount = 0;

    for item in &payload.items {
        if item.quantity_received <= 0 { continue; }

        let po_item = sqlx::query("SELECT quantity_ordered, product_id, (SELECT COALESCE(SUM(quantity_received), 0) FROM purchase_receiving_items WHERE purchase_order_item_id = ?) as already_received FROM purchase_order_items WHERE id = ?")
            .bind(&item.po_item_id).bind(&item.po_item_id)
            .fetch_one(&mut **tx).await.map_err(|e| e.to_string())?;
        
        let ordered: i64 = po_item.get("quantity_ordered");
        let already_received: i64 = po_item.get("already_received");
        
        if item.quantity_received > (ordered - already_received) {
            return Err("Cannot receive more than remaining quantity".to_string());
        }

        let total_cost = item.quantity_received * item.unit_cost;
        total_amount += total_cost;

        // Receiving Item
        let ri_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO purchase_receiving_items (id, receiving_id, product_id, purchase_order_item_id, quantity_received, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(&ri_id).bind(&receiving_id).bind(&item.product_id).bind(&item.po_item_id).bind(item.quantity_received).bind(item.unit_cost).bind(total_cost)
            .execute(&mut **tx).await.map_err(|e| e.to_string())?;

        // Purchase Item (Invoice line)
        let pi_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_cost, total_cost, subtotal, quantity_received) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&pi_id).bind(&purchase_id).bind(&item.product_id).bind(item.quantity_received).bind(item.unit_cost).bind(total_cost).bind(total_cost).bind(item.quantity_received)
            .execute(&mut **tx).await.map_err(|e| e.to_string())?;

        // Adjust Stock Native
        adjust_stock_tx(
            tx,
            &item.product_id,
            item.quantity_received,
            "PURCHASE_RECEIPT",
            &format!("Received on GRN {}", receiving_number),
            user_id,
            None, // branch_id
            Some("RECEIVING"),
            Some(&receiving_number)
        ).await?;
    }

    // Insert Purchase Invoice
    sqlx::query("INSERT INTO purchases (id, supplier_id, purchase_order_number, invoice_number, status, total_amount, payment_status, subtotal, grand_total, outstanding_amount) VALUES (?, (SELECT supplier_id FROM purchase_orders WHERE id = ?), (SELECT po_number FROM purchase_orders WHERE id = ?), ?, 'RECEIVED', ?, 'UNPAID', ?, ?, ?)")
        .bind(&purchase_id).bind(&payload.purchase_order_id).bind(&payload.purchase_order_id).bind(&pur_number).bind(total_amount).bind(total_amount).bind(total_amount).bind(total_amount)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;
    
    // Update PO Status (Check if full or partial)
    let po_totals = sqlx::query("SELECT COALESCE(SUM(quantity_ordered), 0) as ordered, (SELECT COALESCE(SUM(quantity_received), 0) FROM purchase_receiving_items ri JOIN purchase_receiving r ON ri.receiving_id = r.id WHERE r.purchase_order_id = ?) as received FROM purchase_order_items WHERE purchase_order_id = ?")
        .bind(&payload.purchase_order_id).bind(&payload.purchase_order_id)
        .fetch_one(&mut **tx).await.map_err(|e| e.to_string())?;
    
    let ordered: i64 = po_totals.get("ordered");
    let received: i64 = po_totals.get("received");
    let new_status = if received >= ordered { "RECEIVED" } else { "PARTIALLY_RECEIVED" };

    sqlx::query("UPDATE purchase_orders SET status = ? WHERE id = ?")
        .bind(new_status).bind(&payload.purchase_order_id)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;
        
    // Update supplier outstanding balance
    sqlx::query("UPDATE suppliers SET outstanding_balance = outstanding_balance + ? WHERE id = (SELECT supplier_id FROM purchase_orders WHERE id = ?)")
        .bind(total_amount).bind(&payload.purchase_order_id)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    // Audit
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'RECEIVE_GOODS', 'PURCHASE_ORDER', ?)")
        .bind(&log_id).bind(user_id).bind(&payload.purchase_order_id).execute(&mut **tx).await.map_err(|e| e.to_string())?;

    Ok(receiving_id)
}

pub async fn process_purchase_return_tx(
    tx: &mut Transaction<'_, Sqlite>,
    payload: PurchaseReturnPayload,
    user_id: &str,
) -> Result<String, String> {
    // Generate Return Number
    let date_str = Local::now().format("%y%m%d").to_string();
    let prefix = format!("PRT-{}-", date_str);
    let latest = sqlx::query("SELECT return_number FROM purchase_returns WHERE return_number LIKE ? ORDER BY return_number DESC LIMIT 1")
        .bind(format!("{}%", prefix)).fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?;

    let mut next_seq = 1;
    if let Some(row) = latest {
        let num: String = row.get("return_number");
        if let Some(seq_str) = num.split('-').last() {
            if let Ok(seq) = seq_str.parse::<i64>() { next_seq = seq + 1; }
        }
    }
    let return_number = format!("{}{:04}", prefix, next_seq);
    let return_id = Uuid::new_v4().to_string();

    let mut total_refund = 0;

    for item in &payload.items {
        if item.quantity <= 0 { continue; }

        let pi_item = sqlx::query("SELECT quantity_received, quantity_returned, product_id, unit_cost FROM purchase_items WHERE id = ?")
            .bind(&item.purchase_item_id)
            .fetch_one(&mut **tx).await.map_err(|e| e.to_string())?;
        
        let received: i64 = pi_item.get("quantity_received");
        let returned: i64 = pi_item.get("quantity_returned");
        let unit_cost: i64 = pi_item.get("unit_cost");
        let product_id: String = pi_item.get("product_id");
        
        let returnable = received - returned;
        if item.quantity > returnable {
            return Err("Cannot return more than previously received".to_string());
        }

        let refund_amount = item.quantity * unit_cost;
        total_refund += refund_amount;

        // Insert Return Item
        let ri_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO purchase_return_items (id, purchase_return_id, purchase_item_id, product_id, quantity, refund_amount) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(&ri_id).bind(&return_id).bind(&item.purchase_item_id).bind(&product_id).bind(item.quantity).bind(refund_amount)
            .execute(&mut **tx).await.map_err(|e| e.to_string())?;

        // Update Purchase Item returned quantity
        sqlx::query("UPDATE purchase_items SET quantity_returned = quantity_returned + ? WHERE id = ?")
            .bind(item.quantity).bind(&item.purchase_item_id)
            .execute(&mut **tx).await.map_err(|e| e.to_string())?;

        // Reduce Stock
        adjust_stock_tx(
            tx,
            &product_id,
            -item.quantity, // Negative for return
            "PURCHASE_RETURN",
            &format!("Returned on PRT {}", return_number),
            user_id,
            None,
            Some("PURCHASE_RETURN"),
            Some(&return_number)
        ).await?;
    }

    // Insert Return Record
    sqlx::query("INSERT INTO purchase_returns (id, return_number, original_purchase_id, supplier_id, user_id, reason, total_refund, status) VALUES (?, ?, ?, (SELECT supplier_id FROM purchases WHERE id = ?), ?, ?, ?, 'COMPLETED')")
        .bind(&return_id).bind(&return_number).bind(&payload.original_purchase_id).bind(&payload.original_purchase_id).bind(user_id).bind(&payload.reason).bind(total_refund)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    // Update Purchase Outstanding & Total Amount
    sqlx::query("UPDATE purchases SET outstanding_amount = outstanding_amount - ?, total_amount = total_amount - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(total_refund).bind(total_refund).bind(&payload.original_purchase_id)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    // Update Supplier Balance
    sqlx::query("UPDATE suppliers SET outstanding_balance = outstanding_balance - ? WHERE id = (SELECT supplier_id FROM purchases WHERE id = ?)")
        .bind(total_refund).bind(&payload.original_purchase_id)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    // Audit
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'PROCESS_PURCHASE_RETURN', 'PURCHASE', ?)")
        .bind(&log_id).bind(user_id).bind(&payload.original_purchase_id).execute(&mut **tx).await.map_err(|e| e.to_string())?;

    Ok(return_id)
}

pub async fn record_supplier_payment_tx(
    tx: &mut Transaction<'_, Sqlite>,
    payload: SupplierPaymentPayload,
    user_id: &str,
) -> Result<String, String> {
    // Generate Payment Number
    let date_str = Local::now().format("%y%m%d").to_string();
    let prefix = format!("PAY-{}-", date_str);
    let latest = sqlx::query("SELECT payment_number FROM supplier_payments WHERE payment_number LIKE ? ORDER BY payment_number DESC LIMIT 1")
        .bind(format!("{}%", prefix)).fetch_optional(&mut **tx).await.map_err(|e| e.to_string())?;

    let mut next_seq = 1;
    if let Some(row) = latest {
        let num: String = row.get("payment_number");
        if let Some(seq_str) = num.split('-').last() {
            if let Ok(seq) = seq_str.parse::<i64>() { next_seq = seq + 1; }
        }
    }
    let payment_number = format!("{}{:04}", prefix, next_seq);
    let payment_id = Uuid::new_v4().to_string();

    // Validate Outstanding Balance
    let sup_row = sqlx::query("SELECT outstanding_balance FROM suppliers WHERE id = ?")
        .bind(&payload.supplier_id).fetch_one(&mut **tx).await.map_err(|e| e.to_string())?;
    
    let outstanding: i64 = sup_row.get("outstanding_balance");
    if payload.amount > outstanding {
        return Err("Payment amount cannot exceed supplier outstanding balance".to_string());
    }

    if let Some(purchase_id) = &payload.purchase_id {
        let pur_row = sqlx::query("SELECT outstanding_amount FROM purchases WHERE id = ?")
            .bind(purchase_id).fetch_one(&mut **tx).await.map_err(|e| e.to_string())?;
        let pur_outstanding: i64 = pur_row.get("outstanding_amount");
        
        if payload.amount > pur_outstanding {
            return Err("Payment amount cannot exceed purchase outstanding balance".to_string());
        }

        // Update purchase
        sqlx::query("UPDATE purchases SET amount_paid = amount_paid + ?, outstanding_amount = outstanding_amount - ?, payment_status = CASE WHEN outstanding_amount - ? <= 0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(payload.amount).bind(payload.amount).bind(payload.amount).bind(purchase_id)
            .execute(&mut **tx).await.map_err(|e| e.to_string())?;
    }

    // Insert Payment
    sqlx::query("INSERT INTO supplier_payments (id, payment_number, supplier_id, purchase_id, amount, payment_method, reference, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&payment_id).bind(&payment_number).bind(&payload.supplier_id).bind(&payload.purchase_id).bind(payload.amount).bind(&payload.payment_method).bind(&payload.reference).bind(&payload.notes).bind(user_id)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    // Update supplier balance
    sqlx::query("UPDATE suppliers SET outstanding_balance = outstanding_balance - ? WHERE id = ?")
        .bind(payload.amount).bind(&payload.supplier_id)
        .execute(&mut **tx).await.map_err(|e| e.to_string())?;

    // Audit
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'RECORD_SUPPLIER_PAYMENT', 'SUPPLIER', ?)")
        .bind(&log_id).bind(user_id).bind(&payload.supplier_id).execute(&mut **tx).await.map_err(|e| e.to_string())?;

    Ok(payment_id)
}
