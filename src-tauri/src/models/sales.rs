use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Sale {
    pub id: String,
    pub invoice_number: String,
    pub cashier_id: String,
    pub customer_id: Option<String>,
    pub status: String,
    pub subtotal: i64,
    pub discount_total: i64,
    pub tax_total: i64,
    pub grand_total: i64,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct SaleItem {
    pub id: String,
    pub sale_id: String,
    pub product_id: String,
    pub name_en: String, // JOINed
    pub sku: Option<String>, // JOINed
    pub barcode: Option<String>, // JOINed
    pub quantity: i64,
    pub unit_price: i64,
    pub discount_amount: i64,
    pub tax_amount: i64,
    pub subtotal: i64,
    pub total: i64,
    pub returned_quantity: i64, // Calculated from return_items
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Payment {
    pub id: String,
    pub payment_method: String,
    pub amount_expected: i64,
    pub amount_received: i64,
    pub change_returned: i64,
    pub status: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SaleDetails {
    pub sale: Sale,
    pub items: Vec<SaleItem>,
    pub payments: Vec<Payment>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SaleFilter {
    pub search: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub status: Option<String>,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedSales {
    pub items: Vec<Sale>,
    pub total: i64,
}

// Held Sales

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct HeldSale {
    pub id: String,
    pub name: Option<String>,
    pub subtotal: i64,
    pub discount_total: i64,
    pub tax_total: i64,
    pub grand_total: i64,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct HeldSaleItem {
    pub id: String,
    pub held_sale_id: String,
    pub product_id: String,
    pub quantity: i64,
    pub unit_price: i64,
    pub discount_amount: i64,
    pub tax_amount: i64,
    pub subtotal: i64,
    pub total: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct HeldSaleDetails {
    pub sale: HeldSale,
    pub items: Vec<HeldSaleItem>,
}
