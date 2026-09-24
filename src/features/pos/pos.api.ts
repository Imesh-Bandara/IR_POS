import { invoke } from "@tauri-apps/api/core";
import { InventoryProduct } from "../inventory/inventory.api";

export interface CartItem {
  product_id: string;
  name: string;
  barcode?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  subtotal: number;
  total: number;
  stock: number; // For frontend validation
}

export interface PaymentPayload {
  payment_method: string;
  amount_received: number;
}

export interface CheckoutPayload {
  items: CartItem[];
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  payment: PaymentPayload;
  customer_id?: string;
}

export interface InvoiceResult {
  sale_id: string;
  invoice_number: string;
  status: string;
  grand_total: number;
  change_returned: number;
}

// Held Carts
export interface HeldSaleDetails {
  sale: {
    id: string;
    name?: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    created_at: string;
  };
  items: {
    id: string;
    held_sale_id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    tax_amount: number;
    subtotal: number;
    total: number;
  }[];
}

export const POSAPI = {
  searchProducts: async (token: string, query: string): Promise<InventoryProduct[]> => {
    return invoke("search_products_pos", { token, query });
  },

  quickAddProduct: async (token: string, payload: {
    nameEn: string;
    barcode?: string;
    sellingPrice: number;
    unitId: string;
    costPrice?: number;
    openingQuantity?: number;
  }): Promise<InventoryProduct> => {
    return invoke("quick_add_product", { token, ...payload });
  },

  checkout: async (token: string, payload: CheckoutPayload): Promise<InvoiceResult> => {
    return invoke("checkout", { token, payload });
  },

  saveHeldSale: async (token: string, payload: {
    name?: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    items: {
      product_id: string;
      quantity: number;
      unit_price: number;
      discount_amount: number;
      tax_amount: number;
      subtotal: number;
      total: number;
    }[];
  }): Promise<string> => {
    return invoke("save_held_sale", { token, payload });
  },

  getHeldSales: async (token: string): Promise<HeldSaleDetails[]> => {
    return invoke("get_held_sales", { token });
  },

  deleteHeldSale: async (token: string, heldId: string): Promise<void> => {
    return invoke("delete_held_sale", { token, heldId });
  }
};
