import { invoke } from "@tauri-apps/api/core";

export interface DashboardSummary {
  gross_sales: number;
  returns: number;
  net_sales: number;
  order_count: number;
  inventory_value: number;
  low_stock_count: number;
  net_purchases: number;
}

export interface SalesReportItem {
  invoice_number: string;
  date: string;
  cashier: string;
  gross_sales: number;
  returns: number;
  net_sales: number;
}

export interface ProductPerformanceItem {
  product_name: string;
  sku: string | null;
  category: string | null;
  qty_sold: number;
  qty_returned: number;
  net_qty: number;
  gross_sales: number;
  net_sales: number;
}

export interface InventoryReportItem {
  product_name: string;
  sku: string | null;
  current_stock: number;
  minimum_stock: number;
  cost_price: number;
  inventory_value: number;
  status: string;
}

export interface SupplierReportItem {
  supplier_name: string;
  total_purchases: number;
  purchase_returns: number;
  payments: number;
  outstanding_balance: number;
}

export const reportService = {
  getDashboardSummary: async (token: string, startDate?: string, endDate?: string): Promise<DashboardSummary> => {
    return invoke("get_dashboard_summary", { token, startDate, endDate });
  },
  getSalesReport: async (token: string, startDate?: string, endDate?: string): Promise<SalesReportItem[]> => {
    return invoke("get_sales_report", { token, startDate, endDate });
  },
  getProductPerformance: async (token: string, startDate?: string, endDate?: string): Promise<ProductPerformanceItem[]> => {
    return invoke("get_product_performance", { token, startDate, endDate });
  },
  getInventoryReport: async (token: string): Promise<InventoryReportItem[]> => {
    return invoke("get_inventory_report", { token });
  },
  getSupplierReport: async (token: string): Promise<SupplierReportItem[]> => {
    return invoke("get_supplier_report", { token });
  },
};
