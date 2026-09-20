import { invoke } from "@tauri-apps/api/core";
import { Product } from "../products/product.api";

export interface InventoryProduct extends Product {
  // Inherits from product, but represents the snapshot for inventory
}

export interface StockMovement {
  id: string;
  product_id: string;
  branch_id?: string;
  quantity_changed: number;
  movement_type: string;
  reference_type?: string;
  reference_id?: string;
  previous_quantity: number;
  new_quantity: number;
  unit_cost?: number;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface PaginatedInventory {
  items: InventoryProduct[];
  total: number;
  total_value: number;
}

export interface PaginatedMovements {
  items: StockMovement[];
  total: number;
}

export const InventoryAPI = {
  getInventory: async (
    token: string,
    filter: { search?: string; category_id?: string; stock_status?: string; limit: number; offset: number }
  ): Promise<PaginatedInventory> => {
    return invoke("get_inventory", { token, filter });
  },

  adjustStock: async (
    token: string,
    payload: { product_id: string; quantity_change: number; movement_type: string; reason: string }
  ): Promise<number> => {
    return invoke("adjust_stock", { token, payload });
  },

  getStockMovements: async (
    token: string,
    filter: { product_id?: string; movement_type?: string; limit: number; offset: number }
  ): Promise<PaginatedMovements> => {
    return invoke("get_stock_movements", { token, filter });
  }
};
