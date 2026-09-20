use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Category {
    pub id: String,
    pub name_en: String,
    pub name_si: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Brand {
    pub id: String,
    pub name_en: String,
    pub name_si: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Unit {
    pub id: String,
    pub name_en: String,
    pub name_si: Option<String>,
    pub abbreviation: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Product {
    pub id: String,
    pub sku: Option<String>,
    pub barcode: Option<String>,
    pub name_en: String,
    pub name_si: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit_id: Option<String>,
    pub cost_price: i64,
    pub selling_price: i64,
    pub wholesale_price: Option<i64>,
    pub tax_rate: i64,
    pub discount_amount: i64,
    pub minimum_stock: i64,
    pub current_stock: i64,
    pub status: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ProductFilter {
    pub search: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub status: Option<String>,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedProducts {
    pub items: Vec<Product>,
    pub total: i64,
}
