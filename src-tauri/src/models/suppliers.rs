use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Supplier {
    pub id: String,
    pub supplier_code: Option<String>,
    pub company_name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SupplierPayload {
    pub company_name: String,
    pub contact_person: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub tax_number: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedSuppliers {
    pub items: Vec<Supplier>,
    pub total: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SupplierFilter {
    pub search: Option<String>,
    pub status: Option<String>,
    pub limit: i64,
    pub offset: i64,
}
