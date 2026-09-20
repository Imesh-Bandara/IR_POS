use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct InventoryProduct {
    pub id: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name_en: String,
    pub name_si: Option<String>,
    pub category_id: Option<String>,
    pub unit_id: Option<String>,
    pub cost_price: i64,
    pub selling_price: i64,
    pub minimum_stock: i64,
    pub current_stock: i64,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct StockMovement {
    pub id: String,
    pub product_id: String,
    pub branch_id: Option<String>,
    pub quantity_changed: i64,
    pub movement_type: String, // e.g., 'OPENING_STOCK', 'ADJUSTMENT_IN', 'SALE'
    pub reference_type: Option<String>,
    pub reference_id: Option<String>,
    pub previous_quantity: i64,
    pub new_quantity: i64,
    pub unit_cost: Option<i64>,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>, // stringified datetime
}

#[derive(Serialize, Deserialize, Debug)]
pub struct InventoryFilter {
    pub search: Option<String>,
    pub category_id: Option<String>,
    pub stock_status: Option<String>, // "LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"
    pub limit: i64,
    pub offset: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct MovementFilter {
    pub product_id: Option<String>,
    pub movement_type: Option<String>,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedInventory {
    pub items: Vec<InventoryProduct>,
    pub total: i64,
    pub total_value: i64, // total inventory value
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedMovements {
    pub items: Vec<StockMovement>,
    pub total: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct StockAdjustmentPayload {
    pub product_id: String,
    pub quantity_change: i64, // Can be positive or negative
    pub movement_type: String,
    pub reason: String,
}
