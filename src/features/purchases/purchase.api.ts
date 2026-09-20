import { invoke } from "@tauri-apps/api/core";

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
  discount_amount: number;
  tax_amount: number;
  subtotal: number;
  total: number;
}

export interface PurchaseOrderDetails {
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  quantity_received: number;
  quantity_returned: number;
  unit_cost: number;
  discount_amount: number;
  tax_amount: number;
  subtotal: number;
  total_cost: number;
}

export interface PurchaseDetails {
  purchase: Purchase;
  items: PurchaseItem[];
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  business_id?: string;
  branch_id?: string;
  supplier_id: string;
  created_by: string;
  expected_delivery_date?: string;
  status: string;
  notes?: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  purchase_order_number?: string;
  invoice_number?: string;
  branch_id?: string;
  status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  amount_paid: number;
  outstanding_amount: number;
  payment_status: string;
  created_at: string;
}

export interface CreatePOItemPayload {
  product_id: string;
  quantity_ordered: number;
  unit_cost: number;
  discount_amount: number;
  tax_amount: number;
}

export interface CreatePOPayload {
  supplier_id: string;
  expected_delivery_date?: string;
  notes?: string;
  items: CreatePOItemPayload[];
}

export interface ReceiveGoodsItemPayload {
  po_item_id: string;
  product_id: string;
  quantity_received: number;
  unit_cost: number;
}

export interface ReceiveGoodsPayload {
  purchase_order_id: string;
  supplier_invoice_number?: string;
  notes?: string;
  items: ReceiveGoodsItemPayload[];
}

export interface SupplierPaymentPayload {
  supplier_id: string;
  purchase_id?: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
}

export interface PurchaseReturnItemPayload {
  purchase_item_id: string;
  product_id: string;
  quantity: number;
}

export interface PurchaseReturnPayload {
  original_purchase_id: string;
  reason?: string;
  items: PurchaseReturnItemPayload[];
}

export interface PaginatedPurchaseOrders {
  items: PurchaseOrder[];
  total: number;
}

export interface PaginatedPurchases {
  items: Purchase[];
  total: number;
}

export interface PurchaseFilter {
  search?: string;
  supplier_id?: string;
  status?: string;
  payment_status?: string;
  limit: number;
  offset: number;
}

export const PurchaseAPI = {
  createPurchaseOrder: async (token: string, payload: CreatePOPayload): Promise<string> => {
    return invoke("create_purchase_order", { token, payload });
  },

  receiveGoods: async (token: string, payload: ReceiveGoodsPayload): Promise<string> => {
    return invoke("receive_goods", { token, payload });
  },

  processPurchaseReturn: async (token: string, payload: PurchaseReturnPayload): Promise<string> => {
    return invoke("process_purchase_return", { token, payload });
  },

  recordSupplierPayment: async (token: string, payload: SupplierPaymentPayload): Promise<string> => {
    return invoke("record_supplier_payment", { token, payload });
  },

  getPurchaseOrders: async (token: string, filter: PurchaseFilter): Promise<PaginatedPurchaseOrders> => {
    return invoke("get_purchase_orders", { token, filter });
  },

  getPurchases: async (token: string, filter: PurchaseFilter): Promise<PaginatedPurchases> => {
    return invoke("get_purchases", { token, filter });
  },

  getPurchaseOrderDetails: async (token: string, id: string): Promise<PurchaseOrderDetails> => {
    return invoke("get_purchase_order_details", { token, id });
  },

  getPurchaseDetails: async (token: string, id: string): Promise<PurchaseDetails> => {
    return invoke("get_purchase_details", { token, id });
  },
};
