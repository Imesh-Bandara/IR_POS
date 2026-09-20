use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct ReturnItemPayload {
    pub sale_item_id: String,
    pub quantity: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReturnPayload {
    pub sale_id: String,
    pub reason: String,
    pub refund_method: String,
    pub items: Vec<ReturnItemPayload>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct ReturnRecord {
    pub id: String,
    pub original_sale_id: String,
    pub return_invoice_number: String,
    pub cashier_id: String,
    pub reason: Option<String>,
    pub refund_method: String,
    pub total_refund: i64,
    pub status: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct RefundRecord {
    pub id: String,
    pub sale_id: String,
    pub return_id: Option<String>,
    pub refund_amount: i64,
    pub payment_method: String,
    pub user_id: String,
    pub created_at: String,
}
