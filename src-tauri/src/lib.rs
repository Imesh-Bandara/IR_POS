pub mod database;
pub mod models;
pub mod security;
pub mod commands;
pub mod services;

use database::db::{init_db, AppState};
use tauri::Manager;
use commands::auth_cmds::{check_is_first_run, setup_first_run, login, check_session, logout};
use commands::product_cmds::{get_categories, create_category, get_brands, create_brand, get_units, create_product, get_products};
use commands::inventory_cmds::{get_inventory, adjust_stock, get_stock_movements};
use commands::pos_cmds::{checkout, search_products_pos};
use commands::sales_cmds::{get_sales, get_sale_details, void_sale, process_return, get_sale_returns, get_sale_refunds};
use commands::held_sales_cmds::{save_held_sale, get_held_sales, delete_held_sale};
use commands::supplier_cmds::{get_suppliers, get_supplier, create_supplier, update_supplier, deactivate_supplier};
use commands::purchase_cmds::{create_purchase_order, receive_goods, process_purchase_return, record_supplier_payment, get_purchase_orders, get_purchases, get_purchase_order_details, get_purchase_details};
use commands::report_cmds::{get_dashboard_summary, get_sales_report, get_product_performance, get_inventory_report, get_supplier_report};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn check_db_status(state: tauri::State<'_, AppState>) -> Result<String, String> {
    // Attempt a simple query to verify the database is accessible and migrations applied
    let row: (i64,) = sqlx::query_as("SELECT count(*) FROM products")
        .fetch_one(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(format!("Database is online. Products count: {}", row.0))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
                std::path::PathBuf::from("./")
            });
            
            // Block on async init_db
            let pool = tauri::async_runtime::block_on(async {
                init_db(app_data_dir).await.expect("Failed to initialize database")
            });
            
            app.manage(AppState { db: pool });
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            check_db_status,
            check_is_first_run,
            setup_first_run,
            login,
            check_session,
            logout,
            get_categories,
            create_category,
            get_brands,
            create_brand,
            get_units,
            create_product,
            get_products,
            get_inventory,
            adjust_stock,
            get_stock_movements,
            checkout,
            search_products_pos,
            get_sales,
            get_sale_details,
            void_sale,
            process_return,
            get_sale_returns,
            get_sale_refunds,
            save_held_sale,
            get_held_sales,
            delete_held_sale,
            get_suppliers,
            get_supplier,
            create_supplier,
            update_supplier,
            deactivate_supplier,
            create_purchase_order,
            receive_goods,
            process_purchase_return,
            record_supplier_payment,
            get_purchase_orders,
            get_purchases,
            get_purchase_order_details,
            get_purchase_details,
            get_dashboard_summary,
            get_sales_report,
            get_product_performance,
            get_inventory_report,
            get_supplier_report
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
