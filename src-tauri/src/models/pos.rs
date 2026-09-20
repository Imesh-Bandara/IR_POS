use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct CartItem {
    pub product_id: String,
    pub quantity: i64,
    pub unit_price: i64,      // Final unit price applied (maybe discounted line price or actual product price)
    pub discount_amount: i64, // per item discount
    pub tax_amount: i64,      // per item tax
    pub subtotal: i64,        // unit_price * quantity
    pub total: i64,           // (unit_price * quantity) - (discount_amount * quantity) + (tax_amount * quantity)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaymentPayload {
    pub payment_method: String, // CASH, CARD
    pub amount_received: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CheckoutPayload {
    pub items: Vec<CartItem>,
    pub subtotal: i64,
    pub discount_total: i64,
    pub tax_total: i64,
    pub grand_total: i64,
    pub payment: PaymentPayload,
    pub customer_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct InvoiceResult {
    pub sale_id: String,
    pub invoice_number: String,
    pub status: String,
    pub grand_total: i64,
    pub change_returned: i64,
}
