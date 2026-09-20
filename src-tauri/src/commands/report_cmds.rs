use tauri::State;
use crate::database::db::AppState;
use crate::services::reports::{get_dashboard_summary as svc_get_dashboard_summary, get_sales_report as svc_get_sales_report, get_product_performance as svc_get_product_performance, get_inventory_report as svc_get_inventory_report, get_supplier_report as svc_get_supplier_report, DashboardSummary, SalesReportItem, ProductPerformanceItem, InventoryReportItem, SupplierReportItem};
use crate::security::auth::validate_permission;

#[tauri::command]
pub async fn get_dashboard_summary(
    token: String,
    start_date: Option<String>,
    end_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<DashboardSummary, String> {
    // Optionally validate permission. For now, since it's dashboard, we might use "sales.view" or "dashboard.view".
    // I will use "sales.view" since it's already in the pos_schema.sql.
    let _user_id = validate_permission(&state.db, &token, "sales.view")
        .await
        .map_err(|e| format!("Authentication failed: {}", e))?;

    svc_get_dashboard_summary(&state.db, None, start_date, end_date)
        .await
        .map_err(|e| format!("Failed to get dashboard summary: {}", e))
}

#[tauri::command]
pub async fn get_sales_report(
    token: String,
    start_date: Option<String>,
    end_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SalesReportItem>, String> {
    let _user_id = validate_permission(&state.db, &token, "sales.view")
        .await
        .map_err(|e| format!("Authentication failed: {}", e))?;

    svc_get_sales_report(&state.db, None, start_date, end_date)
        .await
        .map_err(|e| format!("Failed to get sales report: {}", e))
}

#[tauri::command]
pub async fn get_product_performance(
    token: String,
    start_date: Option<String>,
    end_date: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ProductPerformanceItem>, String> {
    let _user_id = validate_permission(&state.db, &token, "sales.view")
        .await
        .map_err(|e| format!("Authentication failed: {}", e))?;

    svc_get_product_performance(&state.db, start_date, end_date)
        .await
        .map_err(|e| format!("Failed to get product performance: {}", e))
}

#[tauri::command]
pub async fn get_inventory_report(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<InventoryReportItem>, String> {
    let _user_id = validate_permission(&state.db, &token, "inventory.view")
        .await
        .map_err(|e| format!("Authentication failed: {}", e))?;

    svc_get_inventory_report(&state.db)
        .await
        .map_err(|e| format!("Failed to get inventory report: {}", e))
}

#[tauri::command]
pub async fn get_supplier_report(
    token: String,
    state: State<'_, AppState>,
) -> Result<Vec<SupplierReportItem>, String> {
    let _user_id = validate_permission(&state.db, &token, "suppliers.view")
        .await
        .map_err(|e| format!("Authentication failed: {}", e))?;

    svc_get_supplier_report(&state.db)
        .await
        .map_err(|e| format!("Failed to get supplier report: {}", e))
}

