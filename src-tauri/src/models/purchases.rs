use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct PurchaseOrder {
    pub id: String,
    pub po_number: String,
    pub business_id: Option<String>,
    pub branch_id: Option<String>,
    pub supplier_id: String,
    pub created_by: String,
    pub expected_delivery_date: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub subtotal: i64,
    pub discount_total: i64,
    pub tax_total: i64,
    pub grand_total: i64,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct PurchaseOrderItem {
    pub id: String,
    pub purchase_order_id: String,
    pub product_id: String,
    pub quantity_ordered: i64,
    pub unit_cost: i64,
    pub discount_amount: i64,
    pub tax_amount: i64,
    pub subtotal: i64,
    pub total: i64,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct Purchase {
    pub id: String,
    pub supplier_id: String,
    pub purchase_order_number: Option<String>,
    pub invoice_number: Option<String>,
    pub branch_id: Option<String>,
    pub status: String,
    pub subtotal: i64,
    pub discount_total: i64,
    pub tax_total: i64,
    pub total_amount: i64,
    pub amount_paid: i64,
    pub outstanding_amount: i64,
    pub payment_status: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct PurchaseItem {
    pub id: String,
    pub purchase_id: String,
    pub product_id: String,
    pub quantity: i64,
    pub quantity_received: i64,
    pub quantity_returned: i64,
    pub unit_cost: i64,
    pub discount_amount: i64,
    pub tax_amount: i64,
    pub subtotal: i64,
    pub total_cost: i64,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct PurchaseReceiving {
    pub id: String,
    pub receiving_number: String,
    pub purchase_order_id: Option<String>,
    pub supplier_id: String,
    pub branch_id: Option<String>,
    pub received_by: String,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct SupplierPayment {
    pub id: String,
    pub payment_number: String,
    pub supplier_id: String,
    pub purchase_id: Option<String>,
    pub amount: i64,
    pub payment_method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct PurchaseReturn {
    pub id: String,
    pub return_number: String,
    pub original_purchase_id: String,
    pub supplier_id: String,
    pub reason: Option<String>,
    pub total_refund: i64,
    pub status: String,
    pub created_at: String,
}

// Payload structs

#[derive(Serialize, Deserialize, Debug)]
pub struct CreatePOPayload {
    pub supplier_id: String,
    pub expected_delivery_date: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<CreatePOItemPayload>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreatePOItemPayload {
    pub product_id: String,
    pub quantity_ordered: i64,
    pub unit_cost: i64,
    pub discount_amount: i64,
    pub tax_amount: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReceiveGoodsPayload {
    pub purchase_order_id: String,
    pub supplier_invoice_number: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<ReceiveGoodsItemPayload>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ReceiveGoodsItemPayload {
    pub po_item_id: String,
    pub product_id: String,
    pub quantity_received: i64,
    pub unit_cost: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SupplierPaymentPayload {
    pub supplier_id: String,
    pub purchase_id: Option<String>,
    pub amount: i64,
    pub payment_method: String,
    pub reference: Option<String>,
    pub notes: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PurchaseReturnPayload {
    pub original_purchase_id: String,
    pub reason: Option<String>,
    pub items: Vec<PurchaseReturnItemPayload>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PurchaseReturnItemPayload {
    pub purchase_item_id: String,
    pub product_id: String,
    pub quantity: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedPurchaseOrders {
    pub items: Vec<PurchaseOrder>,
    pub total: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PaginatedPurchases {
    pub items: Vec<Purchase>,
    pub total: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PurchaseFilter {
    pub search: Option<String>,
    pub supplier_id: Option<String>,
    pub status: Option<String>,
    pub payment_status: Option<String>,
    pub limit: i64,
    pub offset: i64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PurchaseOrderDetails {
    pub order: PurchaseOrder,
    pub items: Vec<PurchaseOrderItem>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PurchaseDetails {
    pub purchase: Purchase,
    pub items: Vec<PurchaseItem>,
}
