use crate::database::db::AppState;
use crate::models::suppliers::{PaginatedSuppliers, Supplier, SupplierFilter, SupplierPayload};
use crate::security::auth::validate_permission;
use sqlx::Row;
use uuid::Uuid;

#[tauri::command]
pub async fn get_suppliers(
    token: String,
    filter: SupplierFilter,
    state: tauri::State<'_, AppState>,
) -> Result<PaginatedSuppliers, String> {
    validate_permission(&state.db, &token, "suppliers.view").await?;

    let mut qb = sqlx::QueryBuilder::new(
        "SELECT id, supplier_code, company_name, contact_person, phone, email, address, tax_number, status, datetime(created_at, 'localtime') as created_at, datetime(updated_at, 'localtime') as updated_at FROM suppliers WHERE 1=1 "
    );
    let mut count_qb = sqlx::QueryBuilder::new("SELECT count(*) FROM suppliers WHERE 1=1 ");

    if let Some(s) = &filter.search {
        let search_term = format!("%{}%", s);
        let search_clause = format!(" AND (supplier_code LIKE '{}' OR company_name LIKE '{}' OR contact_person LIKE '{}' OR phone LIKE '{}' OR email LIKE '{}') ", search_term, search_term, search_term, search_term, search_term);
        qb.push(&search_clause);
        count_qb.push(&search_clause);
    }

    if let Some(st) = &filter.status {
        qb.push(" AND status = ");
        qb.push_bind(st);
        count_qb.push(" AND status = ");
        count_qb.push_bind(st);
    }

    qb.push(" ORDER BY company_name ASC LIMIT ");
    qb.push_bind(filter.limit);
    qb.push(" OFFSET ");
    qb.push_bind(filter.offset);

    let count: (i64,) = count_qb.build_query_as().fetch_one(&state.db).await.map_err(|e| e.to_string())?;

    let items = qb.build_query_as::<Supplier>().fetch_all(&state.db).await.map_err(|e| e.to_string())?;

    Ok(PaginatedSuppliers { items, total: count.0 })
}

#[tauri::command]
pub async fn get_supplier(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<Supplier, String> {
    validate_permission(&state.db, &token, "suppliers.view").await?;

    let supplier = sqlx::query_as::<_, Supplier>(
        "SELECT id, supplier_code, company_name, contact_person, phone, email, address, tax_number, status, datetime(created_at, 'localtime') as created_at, datetime(updated_at, 'localtime') as updated_at FROM suppliers WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Supplier not found".to_string())?;

    Ok(supplier)
}

#[tauri::command]
pub async fn create_supplier(
    token: String,
    payload: SupplierPayload,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let user_id = validate_permission(&state.db, &token, "suppliers.create").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    
    // Generate Supplier Code
    let latest_sup = sqlx::query("SELECT supplier_code FROM suppliers WHERE supplier_code LIKE 'SUP-%' ORDER BY supplier_code DESC LIMIT 1")
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let mut next_seq = 1;
    if let Some(row) = latest_sup {
        if let Ok(code) = row.try_get::<String, _>("supplier_code") {
            if let Some(seq_str) = code.split('-').last() {
                if let Ok(seq) = seq_str.parse::<i64>() {
                    next_seq = seq + 1;
                }
            }
        }
    }
    let supplier_code = format!("SUP-{:06}", next_seq);

    let id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO suppliers (id, supplier_code, company_name, contact_person, phone, email, address, tax_number, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')"
    )
    .bind(&id)
    .bind(&supplier_code)
    .bind(&payload.company_name)
    .bind(&payload.contact_person)
    .bind(&payload.phone)
    .bind(&payload.email)
    .bind(&payload.address)
    .bind(&payload.tax_number)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // Audit
    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'CREATE_SUPPLIER', 'SUPPLIER', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub async fn update_supplier(
    token: String,
    id: String,
    payload: SupplierPayload,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "suppliers.update").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query(
        "UPDATE suppliers SET company_name = ?, contact_person = ?, phone = ?, email = ?, address = ?, tax_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(&payload.company_name)
    .bind(&payload.contact_person)
    .bind(&payload.phone)
    .bind(&payload.email)
    .bind(&payload.address)
    .bind(&payload.tax_number)
    .bind(&id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'UPDATE_SUPPLIER', 'SUPPLIER', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn deactivate_supplier(
    token: String,
    id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let user_id = validate_permission(&state.db, &token, "suppliers.update").await?;

    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;

    sqlx::query("UPDATE suppliers SET status = 'INACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    let log_id = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id) VALUES (?, ?, 'DEACTIVATE_SUPPLIER', 'SUPPLIER', ?)")
        .bind(&log_id)
        .bind(&user_id)
        .bind(&id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    Ok(())
}
