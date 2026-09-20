use crate::database::db::AppState;
use crate::models::returns::{ReturnPayload, ReturnRecord, RefundRecord};
use crate::models::sales::{PaginatedSales, Payment, Sale, SaleDetails, SaleFilter, SaleItem};
use crate::security::auth::validate_permission;
use crate::services::returns::process_return_tx;
use crate::services::sales::void_sale_tx;
use sqlx::Row;

#[tauri::command]
pub async fn get_sales(
    token: String,
    filter: SaleFilter,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedSales, String> {
    validate_permission(&state.db, &token, "sales.view").await?;

    let mut qb = sqlx::QueryBuilder::new(
        "SELECT id, invoice_number, cashier_id, customer_id, status, subtotal, discount_total, tax_total, grand_total, datetime(created_at, 'localtime') as created_at FROM sales WHERE 1=1 "
    );
    let mut count_qb = sqlx::QueryBuilder::new("SELECT count(*) FROM sales WHERE 1=1 ");

    if let Some(s) = &filter.search {
        let search_term = format!("%{}%", s);
        let search_clause = format!(" AND (invoice_number LIKE '{}' OR cashier_id LIKE '{}' OR id IN (SELECT sale_id FROM sale_items JOIN products ON sale_items.product_id = products.id WHERE products.name_en LIKE '{}' OR products.barcode LIKE '{}')) ", search_term, search_term, search_term, search_term);
        qb.push(&search_clause);
        count_qb.push(&search_clause);
    }

    if let Some(d_from) = &filter.date_from {
        qb.push(" AND date(created_at, 'localtime') >= ");
        qb.push_bind(d_from);
        count_qb.push(" AND date(created_at, 'localtime') >= ");
        count_qb.push_bind(d_from);
    }

    if let Some(d_to) = &filter.date_to {
        qb.push(" AND date(created_at, 'localtime') <= ");
        qb.push_bind(d_to);
        count_qb.push(" AND date(created_at, 'localtime') <= ");
        count_qb.push_bind(d_to);
    }

    if let Some(st) = &filter.status {
        qb.push(" AND status = ");
        qb.push_bind(st);
        count_qb.push(" AND status = ");
        count_qb.push_bind(st);
    }

    qb.push(" ORDER BY created_at DESC LIMIT ");
    qb.push_bind(filter.limit);
    qb.push(" OFFSET ");
    qb.push_bind(filter.offset);

    let count: (i64,) = count_qb.build_query_as().fetch_one(&state.db).await.map_err(|e| e.to_string())?;

    let items = qb.build_query_as::<Sale>().fetch_all(&state.db).await.map_err(|e| e.to_string())?;

    Ok(PaginatedSales { items, total: count.0 })
}

#[tauri::command]
pub async fn get_sale_details(
    token: String,
    sale_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<SaleDetails, String> {
    validate_permission(&state.db, &token, "sales.view").await?;

    let sale = sqlx::query_as::<_, Sale>(
        "SELECT id, invoice_number, cashier_id, customer_id, status, subtotal, discount_total, tax_total, grand_total, datetime(created_at, 'localtime') as created_at FROM sales WHERE id = ?"
    )
    .bind(&sale_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Sale not found".to_string())?;

    let items = sqlx::query_as::<_, SaleItem>(
        "SELECT si.id, si.sale_id, si.product_id, p.name_en, p.sku, p.barcode, si.quantity, si.unit_price, si.discount_amount, si.tax_amount, si.subtotal, si.total, 
         COALESCE((SELECT SUM(quantity) FROM return_items WHERE sale_item_id = si.id), 0) as returned_quantity
         FROM sale_items si 
         JOIN products p ON si.product_id = p.id 
         WHERE si.sale_id = ?"
    )
    .bind(&sale_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    let payments = sqlx::query_as::<_, Payment>(
        "SELECT id, payment_method, amount_expected, amount_received, change_returned, status, datetime(created_at, 'localtime') as created_at FROM payments WHERE sale_id = ?"
    )
    .bind(&sale_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(SaleDetails { sale, items, payments })
}

#[tauri::command]
pub async fn void_sale(
    token: String,
    sale_id: String,
    reason: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "sales.void").await?;
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let result = void_sale_tx(&mut tx, &sale_id, &reason, &user_id).await;

    match result {
        Ok(_) => {
            tx.commit().await.map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            let _ = tx.rollback().await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn process_return(
    token: String,
    payload: ReturnPayload,
    state: tauri::State<'_, AppState>,
) -> Result<ReturnRecord, String> {
    let user_id = validate_permission(&state.db, &token, "sales.return").await?;
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    let result = process_return_tx(&mut tx, payload, &user_id).await;

    match result {
        Ok(res) => {
            tx.commit().await.map_err(|e| e.to_string())?;
            Ok(res)
        }
        Err(e) => {
            let _ = tx.rollback().await;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_sale_returns(
    token: String,
    sale_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<ReturnRecord>, String> {
    validate_permission(&state.db, &token, "sales.view").await?;

    let returns = sqlx::query_as::<_, ReturnRecord>(
        "SELECT id, original_sale_id, return_invoice_number, cashier_id, reason, refund_method, total_refund, status, datetime(created_at, 'localtime') as created_at 
         FROM returns WHERE original_sale_id = ? ORDER BY created_at DESC"
    )
    .bind(&sale_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(returns)
}

#[tauri::command]
pub async fn get_sale_refunds(
    token: String,
    sale_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<RefundRecord>, String> {
    validate_permission(&state.db, &token, "sales.view").await?;

    let refunds = sqlx::query_as::<_, RefundRecord>(
        "SELECT id, sale_id, return_id, refund_amount, payment_method, user_id, datetime(created_at, 'localtime') as created_at 
         FROM refunds WHERE sale_id = ? ORDER BY created_at DESC"
    )
    .bind(&sale_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(refunds)
}
