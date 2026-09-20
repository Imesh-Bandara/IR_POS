use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardSummary {
    pub gross_sales: i64,
    pub returns: i64,
    pub net_sales: i64,
    pub order_count: i64,
    pub inventory_value: i64,
    pub low_stock_count: i64,
    pub net_purchases: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReportItem {
    pub invoice_number: String,
    pub date: String,
    pub cashier: String,
    pub gross_sales: i64,
    pub returns: i64,
    pub net_sales: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProductPerformanceItem {
    pub product_name: String,
    pub sku: Option<String>,
    pub category: Option<String>,
    pub qty_sold: i64,
    pub qty_returned: i64,
    pub net_qty: i64,
    pub gross_sales: i64,
    pub net_sales: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InventoryReportItem {
    pub product_name: String,
    pub sku: Option<String>,
    pub current_stock: i64,
    pub minimum_stock: i64,
    pub cost_price: i64,
    pub inventory_value: i64,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SupplierReportItem {
    pub supplier_name: String,
    pub total_purchases: i64,
    pub purchase_returns: i64,
    pub payments: i64,
    pub outstanding_balance: i64,
}

pub async fn get_dashboard_summary(
    db: &SqlitePool,
    _branch_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<DashboardSummary, String> {
    
    // We bind start_date and end_date if they exist, or bind "" and use a flag if they don't.
    // In SQLite, if we just use a static query, we can do:
    let has_dates = start_date.is_some() && end_date.is_some();
    let sd = start_date.unwrap_or_default();
    let ed = end_date.unwrap_or_default();

    // Gross Sales and Order Count
    let (gross_sales, order_count): (i64, i64) = sqlx::query_as(
        "SELECT COALESCE(SUM(grand_total), 0) as gross_sales, COUNT(*) as order_count 
         FROM sales 
         WHERE status = 'COMPLETED' AND (?1 = 0 OR (created_at >= ?2 AND created_at < ?3))"
    )
    .bind(if has_dates { 1 } else { 0 })
    .bind(&sd)
    .bind(&ed)
    .fetch_one(db)
    .await
    .unwrap_or((0, 0));

    // Returns
    let returns: (i64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_refund), 0) as total_returns 
         FROM returns 
         WHERE status = 'COMPLETED' AND (?1 = 0 OR (created_at >= ?2 AND created_at < ?3))"
    )
    .bind(if has_dates { 1 } else { 0 })
    .bind(&sd)
    .bind(&ed)
    .fetch_one(db)
    .await
    .unwrap_or((0,));

    let net_sales = gross_sales - returns.0;

    // Inventory Value and Low Stock Count
    let inv_row: (i64, i64) = sqlx::query_as(
        "SELECT COALESCE(SUM(current_stock * cost_price), 0), COUNT(CASE WHEN current_stock <= minimum_stock THEN 1 END) 
         FROM products WHERE status = 'ACTIVE'"
    )
    .fetch_one(db)
    .await
    .unwrap_or((0, 0));

    // Net Purchases
    let purchases: (i64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE status = 'RECEIVED' AND (?1 = 0 OR (created_at >= ?2 AND created_at < ?3))"
    )
    .bind(if has_dates { 1 } else { 0 })
    .bind(&sd)
    .bind(&ed)
    .fetch_one(db)
    .await
    .unwrap_or((0,));

    let purch_returns: (i64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(total_refund), 0) FROM purchase_returns WHERE status = 'COMPLETED' AND (?1 = 0 OR (created_at >= ?2 AND created_at < ?3))"
    )
    .bind(if has_dates { 1 } else { 0 })
    .bind(&sd)
    .bind(&ed)
    .fetch_one(db)
    .await
    .unwrap_or((0,));

    let net_purchases = purchases.0 - purch_returns.0;

    Ok(DashboardSummary {
        gross_sales,
        returns: returns.0,
        net_sales,
        order_count,
        inventory_value: inv_row.0,
        low_stock_count: inv_row.1,
        net_purchases,
    })
}

pub async fn get_sales_report(
    db: &SqlitePool,
    _branch_id: Option<String>,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<SalesReportItem>, String> {
    let has_dates = start_date.is_some() && end_date.is_some();
    let sd = start_date.unwrap_or_default();
    let ed = end_date.unwrap_or_default();

    let query = "
        SELECT 
            s.invoice_number,
            s.created_at as date,
            u.username as cashier,
            s.grand_total as gross_sales,
            COALESCE((SELECT SUM(r.total_refund) FROM returns r WHERE r.original_sale_id = s.id AND r.status = 'COMPLETED'), 0) as returns,
            s.grand_total - COALESCE((SELECT SUM(r.total_refund) FROM returns r WHERE r.original_sale_id = s.id AND r.status = 'COMPLETED'), 0) as net_sales
        FROM sales s
        LEFT JOIN users u ON s.cashier_id = u.id
        WHERE s.status = 'COMPLETED' AND (?1 = 0 OR (s.created_at >= ?2 AND s.created_at < ?3))
        ORDER BY s.created_at DESC
    ";

    let rows: Vec<(String, String, String, i64, i64, i64)> = sqlx::query_as(query)
        .bind(if has_dates { 1 } else { 0 })
        .bind(&sd)
        .bind(&ed)
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|r| SalesReportItem {
        invoice_number: r.0,
        date: r.1,
        cashier: r.2,
        gross_sales: r.3,
        returns: r.4,
        net_sales: r.5,
    }).collect();

    Ok(items)
}

pub async fn get_product_performance(
    db: &SqlitePool,
    start_date: Option<String>,
    end_date: Option<String>,
) -> Result<Vec<ProductPerformanceItem>, String> {
    let has_dates = start_date.is_some() && end_date.is_some();
    let sd = start_date.unwrap_or_default();
    let ed = end_date.unwrap_or_default();

    let query = "
        SELECT 
            p.name_en as product_name,
            p.sku,
            c.name_en as category,
            COALESCE(SUM(si.quantity), 0) as qty_sold,
            COALESCE((
                SELECT SUM(ri.quantity)
                FROM return_items ri
                JOIN returns r ON ri.return_id = r.id
                WHERE ri.sale_item_id = si.id AND r.status = 'COMPLETED'
            ), 0) as qty_returned,
            COALESCE(SUM(si.total), 0) as gross_sales,
            COALESCE(SUM(si.total), 0) - COALESCE((
                SELECT SUM(ri.refund_amount)
                FROM return_items ri
                JOIN returns r ON ri.return_id = r.id
                WHERE ri.sale_item_id = si.id AND r.status = 'COMPLETED'
            ), 0) as net_sales
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE s.status = 'COMPLETED' AND (?1 = 0 OR (s.created_at >= ?2 AND s.created_at < ?3))
        GROUP BY p.id
        ORDER BY net_sales DESC
    ";

    let rows: Vec<(String, Option<String>, Option<String>, i64, i64, i64, i64)> = sqlx::query_as(query)
        .bind(if has_dates { 1 } else { 0 })
        .bind(&sd)
        .bind(&ed)
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|r| ProductPerformanceItem {
        product_name: r.0,
        sku: r.1,
        category: r.2,
        qty_sold: r.3,
        qty_returned: r.4,
        net_qty: r.3 - r.4,
        gross_sales: r.5,
        net_sales: r.6,
    }).collect();

    Ok(items)
}

pub async fn get_inventory_report(
    db: &SqlitePool,
) -> Result<Vec<InventoryReportItem>, String> {
    let query = "
        SELECT 
            name_en as product_name,
            sku,
            current_stock,
            minimum_stock,
            cost_price,
            (current_stock * cost_price) as inventory_value,
            CASE 
                WHEN current_stock <= 0 THEN 'Out of Stock'
                WHEN current_stock <= minimum_stock THEN 'Low Stock'
                ELSE 'In Stock'
            END as status
        FROM products
        WHERE status = 'ACTIVE'
        ORDER BY current_stock ASC
    ";

    let rows: Vec<(String, Option<String>, i64, i64, i64, i64, String)> = sqlx::query_as(query)
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|r| InventoryReportItem {
        product_name: r.0,
        sku: r.1,
        current_stock: r.2,
        minimum_stock: r.3,
        cost_price: r.4,
        inventory_value: r.5,
        status: r.6,
    }).collect();

    Ok(items)
}

pub async fn get_supplier_report(
    db: &SqlitePool,
) -> Result<Vec<SupplierReportItem>, String> {
    let query = "
        SELECT 
            s.company_name,
            COALESCE((SELECT SUM(p.total_amount) FROM purchases p WHERE p.supplier_id = s.id AND p.status = 'RECEIVED'), 0) as total_purchases,
            COALESCE((SELECT SUM(pr.total_refund) FROM purchase_returns pr WHERE pr.supplier_id = s.id AND pr.status = 'COMPLETED'), 0) as purchase_returns,
            COALESCE((SELECT SUM(sp.amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id), 0) as payments
        FROM suppliers s
        WHERE s.status = 'ACTIVE'
        ORDER BY company_name ASC
    ";

    let rows: Vec<(String, i64, i64, i64)> = sqlx::query_as(query)
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

    let items = rows.into_iter().map(|r| SupplierReportItem {
        supplier_name: r.0,
        total_purchases: r.1,
        purchase_returns: r.2,
        payments: r.3,
        outstanding_balance: r.1 - r.2 - r.3,
    }).collect();

    Ok(items)
}

