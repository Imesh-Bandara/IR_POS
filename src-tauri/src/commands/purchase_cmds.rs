use crate::database::db::AppState;
use crate::models::purchases::{CreatePOPayload, PaginatedPurchaseOrders, PaginatedPurchases, PurchaseFilter, ReceiveGoodsPayload, PurchaseReturnPayload, SupplierPaymentPayload, PurchaseOrder, Purchase, PurchaseOrderItem, PurchaseItem, PurchaseOrderDetails, PurchaseDetails};
use crate::security::auth::validate_permission;
use crate::services::purchases::{receive_goods_tx, process_purchase_return_tx, record_supplier_payment_tx};
use sqlx::Row;
use uuid::Uuid;
use chrono::Local;

#[tauri::command]
pub async fn create_purchase_order(
    token: String,
    payload: CreatePOPayload,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let user_id = validate_permission(&state.db, &token, "purchases.create").await?;
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let date_str = Local::now().format("%y%m%d").to_string();
    let prefix = format!("PO-{}-", date_str);
    let latest = sqlx::query("SELECT po_number FROM purchase_orders WHERE po_number LIKE ? ORDER BY po_number DESC LIMIT 1")
        .bind(format!("{}%", prefix)).fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;

    let mut next_seq = 1;
    if let Some(row) = latest {
        let num: String = row.get("po_number");
        if let Some(seq_str) = num.split('-').last() {
            if let Ok(seq) = seq_str.parse::<i64>() { next_seq = seq + 1; }
        }
    }
    let po_number = format!("{}{:04}", prefix, next_seq);
    let po_id = Uuid::new_v4().to_string();

    let mut subtotal = 0;
    let mut discount_total = 0;
    let mut tax_total = 0;
    let mut grand_total = 0;

    for item in &payload.items {
        let item_sub = item.quantity_ordered * item.unit_cost;
        let item_total = item_sub - item.discount_amount + item.tax_amount;

        subtotal += item_sub;
        discount_total += item.discount_amount;
        tax_total += item.tax_amount;
        grand_total += item_total;

        let po_item_id = Uuid::new_v4().to_string();
        sqlx::query("INSERT INTO purchase_order_items (id, purchase_order_id, product_id, quantity_ordered, unit_cost, discount_amount, tax_amount, subtotal, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(&po_item_id).bind(&po_id).bind(&item.product_id).bind(item.quantity_ordered).bind(item.unit_cost).bind(item.discount_amount).bind(item.tax_amount).bind(item_sub).bind(item_total)
            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }

    sqlx::query("INSERT INTO purchase_orders (id, po_number, supplier_id, created_by, expected_delivery_date, status, notes, subtotal, discount_total, tax_total, grand_total) VALUES (?, ?, ?, ?, ?, 'ORDERED', ?, ?, ?, ?, ?)")
        .bind(&po_id).bind(&po_number).bind(&payload.supplier_id).bind(&user_id).bind(&payload.expected_delivery_date).bind(&payload.notes).bind(subtotal).bind(discount_total).bind(tax_total).bind(grand_total)
        .execute(&mut *tx).await.map_err(|e| e.to_string())?;

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE_PO', 'PURCHASE_ORDER', ?)")
        .bind(&log_id).bind(&user_id).bind(&po_id).execute(&mut *tx).await.map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(po_id)
}

#[tauri::command]
pub async fn receive_goods(
    token: String,
    payload: ReceiveGoodsPayload,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let user_id = validate_permission(&state.db, &token, "purchases.receive").await?;
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let result = receive_goods_tx(&mut tx, payload, &user_id).await;
    match result {
        Ok(id) => { tx.commit().await.map_err(|e| e.to_string())?; Ok(id) }
        Err(e) => { let _ = tx.rollback().await; Err(e) }
    }
}

#[tauri::command]
pub async fn process_purchase_return(
    token: String,
    payload: PurchaseReturnPayload,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let user_id = validate_permission(&state.db, &token, "purchases.return").await?;
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let result = process_purchase_return_tx(&mut tx, payload, &user_id).await;
    match result {
        Ok(id) => { tx.commit().await.map_err(|e| e.to_string())?; Ok(id) }
        Err(e) => { let _ = tx.rollback().await; Err(e) }
    }
}

#[tauri::command]
pub async fn record_supplier_payment(
    token: String,
    payload: SupplierPaymentPayload,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let user_id = validate_permission(&state.db, &token, "supplier_payments.create").await?;
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let result = record_supplier_payment_tx(&mut tx, payload, &user_id).await;
    match result {
        Ok(id) => { tx.commit().await.map_err(|e| e.to_string())?; Ok(id) }
        Err(e) => { let _ = tx.rollback().await; Err(e) }
    }
}

#[tauri::command]
pub async fn get_purchase_orders(
    token: String,
    filter: PurchaseFilter,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedPurchaseOrders, String> {
    validate_permission(&state.db, &token, "purchases.view").await?;
    
    let mut qb = sqlx::QueryBuilder::new("SELECT id, po_number, business_id, branch_id, supplier_id, created_by, datetime(expected_delivery_date, 'localtime') as expected_delivery_date, status, notes, subtotal, discount_total, tax_total, grand_total, datetime(created_at, 'localtime') as created_at FROM purchase_orders WHERE 1=1 ");
    let mut count_qb = sqlx::QueryBuilder::new("SELECT count(*) FROM purchase_orders WHERE 1=1 ");

    if let Some(s) = &filter.search {
        let search_clause = format!(" AND po_number LIKE '%{}%' ", s);
        qb.push(&search_clause); count_qb.push(&search_clause);
    }
    if let Some(sup) = &filter.supplier_id {
        qb.push(" AND supplier_id = "); qb.push_bind(sup);
        count_qb.push(" AND supplier_id = "); count_qb.push_bind(sup);
    }
    if let Some(st) = &filter.status {
        qb.push(" AND status = "); qb.push_bind(st);
        count_qb.push(" AND status = "); count_qb.push_bind(st);
    }
    qb.push(" ORDER BY created_at DESC LIMIT "); qb.push_bind(filter.limit);
    qb.push(" OFFSET "); qb.push_bind(filter.offset);

    let count: (i64,) = count_qb.build_query_as().fetch_one(&state.db).await.map_err(|e| e.to_string())?;
    let items = qb.build_query_as::<PurchaseOrder>().fetch_all(&state.db).await.map_err(|e| e.to_string())?;

    Ok(PaginatedPurchaseOrders { items, total: count.0 })
}

#[tauri::command]
pub async fn get_purchases(
    token: String,
    filter: PurchaseFilter,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedPurchases, String> {
    validate_permission(&state.db, &token, "purchases.view").await?;
    
    let mut qb = sqlx::QueryBuilder::new("SELECT id, supplier_id, purchase_order_number, invoice_number, branch_id, status, subtotal, discount_total, tax_total, total_amount, amount_paid, outstanding_amount, payment_status, datetime(created_at, 'localtime') as created_at FROM purchases WHERE 1=1 ");
    let mut count_qb = sqlx::QueryBuilder::new("SELECT count(*) FROM purchases WHERE 1=1 ");

    if let Some(s) = &filter.search {
        let search_clause = format!(" AND (invoice_number LIKE '%{}%' OR purchase_order_number LIKE '%{}%') ", s, s);
        qb.push(&search_clause); count_qb.push(&search_clause);
    }
    if let Some(sup) = &filter.supplier_id {
        qb.push(" AND supplier_id = "); qb.push_bind(sup);
        count_qb.push(" AND supplier_id = "); count_qb.push_bind(sup);
    }
    if let Some(pst) = &filter.payment_status {
        qb.push(" AND payment_status = "); qb.push_bind(pst);
        count_qb.push(" AND payment_status = "); count_qb.push_bind(pst);
    }

    qb.push(" ORDER BY created_at DESC LIMIT "); qb.push_bind(filter.limit);
    qb.push(" OFFSET "); qb.push_bind(filter.offset);

    let count: (i64,) = count_qb.build_query_as().fetch_one(&state.db).await.map_err(|e| e.to_string())?;
    let items = qb.build_query_as::<Purchase>().fetch_all(&state.db).await.map_err(|e| e.to_string())?;

    Ok(PaginatedPurchases { items, total: count.0 })
}

#[tauri::command]
pub async fn get_purchase_order_details(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<PurchaseOrderDetails, String> {
    validate_permission(&state.db, &token, "purchases.view").await?;
    
    let order = sqlx::query_as::<_, PurchaseOrder>("SELECT id, po_number, business_id, branch_id, supplier_id, created_by, datetime(expected_delivery_date, 'localtime') as expected_delivery_date, status, notes, subtotal, discount_total, tax_total, grand_total, datetime(created_at, 'localtime') as created_at FROM purchase_orders WHERE id = ?")
        .bind(&id).fetch_one(&state.db).await.map_err(|e| e.to_string())?;
        
    let items = sqlx::query_as::<_, PurchaseOrderItem>("SELECT id, purchase_order_id, product_id, quantity_ordered, unit_cost, discount_amount, tax_amount, subtotal, total FROM purchase_order_items WHERE purchase_order_id = ?")
        .bind(&id).fetch_all(&state.db).await.map_err(|e| e.to_string())?;
        
    Ok(PurchaseOrderDetails { order, items })
}

#[tauri::command]
pub async fn get_purchase_details(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<PurchaseDetails, String> {
    validate_permission(&state.db, &token, "purchases.view").await?;
    
    let purchase = sqlx::query_as::<_, Purchase>("SELECT id, supplier_id, purchase_order_number, invoice_number, branch_id, status, subtotal, discount_total, tax_total, total_amount, amount_paid, outstanding_amount, payment_status, datetime(created_at, 'localtime') as created_at FROM purchases WHERE id = ?")
        .bind(&id).fetch_one(&state.db).await.map_err(|e| e.to_string())?;
        
    let items = sqlx::query_as::<_, PurchaseItem>("SELECT id, purchase_id, product_id, quantity, quantity_received, quantity_returned, unit_cost, discount_amount, tax_amount, subtotal, total_cost FROM purchase_items WHERE purchase_id = ?")
        .bind(&id).fetch_all(&state.db).await.map_err(|e| e.to_string())?;
        
    Ok(PurchaseDetails { purchase, items })
}
