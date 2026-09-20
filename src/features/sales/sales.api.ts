import { invoke } from "@tauri-apps/api/core";

export interface Sale {
  id: string;
  invoice_number: string;
  cashier_id: string;
  customer_id?: string;
  status: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  name_en: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  returned_quantity: number;
}

export interface Payment {
  id: string;
  payment_method: string;
  amount_expected: number;
  amount_received: number;
  change_returned: number;
  status: string;
  created_at: string;
}

export interface SaleDetails {
  sale: Sale;
  items: SaleItem[];
  payments: Payment[];
}

export interface ReturnRecord {
  id: string;
  original_sale_id: string;
  return_invoice_number: string;
  cashier_id: string;
  reason?: string;
  refund_method: string;
  total_refund: number;
  status: string;
  created_at: string;
}

export interface RefundRecord {
  id: string;
  sale_id: string;
  return_id?: string;
  refund_amount: number;
  payment_method: string;
  user_id: string;
  created_at: string;
}

export interface SaleFilter {
  search?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  limit: number;
  offset: number;
}

export interface PaginatedSales {
  items: Sale[];
  total: number;
}

export interface ReturnItemPayload {
  sale_item_id: string;
  quantity: number;
}

export interface ReturnPayload {
  sale_id: string;
  reason: string;
  refund_method: string;
  items: ReturnItemPayload[];
}

export const SalesAPI = {
  getSales: async (token: string, filter: SaleFilter): Promise<PaginatedSales> => {
    return invoke("get_sales", { token, filter });
  },

  getSaleDetails: async (token: string, saleId: string): Promise<SaleDetails> => {
    return invoke("get_sale_details", { token, saleId });
  },

  voidSale: async (token: string, saleId: string, reason: string): Promise<void> => {
    return invoke("void_sale", { token, saleId, reason });
  },

  processReturn: async (token: string, payload: ReturnPayload): Promise<ReturnRecord> => {
    return invoke("process_return", { token, payload });
  },

  getSaleReturns: async (token: string, saleId: string): Promise<ReturnRecord[]> => {
    return invoke("get_sale_returns", { token, saleId });
  },

  getSaleRefunds: async (token: string, saleId: string): Promise<RefundRecord[]> => {
    return invoke("get_sale_refunds", { token, saleId });
  }
};
