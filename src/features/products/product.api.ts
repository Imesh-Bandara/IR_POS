import { invoke } from "@tauri-apps/api/core";

export interface Category {
  id: string;
  name_en: string;
  name_si?: string;
}

export interface Brand {
  id: string;
  name_en: string;
  name_si?: string;
}

export interface Unit {
  id: string;
  name_en: string;
  name_si?: string;
  abbreviation?: string;
}

export interface Product {
  id: string;
  sku?: string;
  barcode?: string;
  name_en: string;
  name_si?: string;
  category_id?: string;
  brand_id?: string;
  unit_id?: string;
  cost_price: number;
  selling_price: number;
  wholesale_price?: number;
  tax_rate: number;
  discount_amount: number;
  minimum_stock: number;
  current_stock: number;
  status: string;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
}

export const ProductAPI = {
  getCategories: async (token: string): Promise<Category[]> => {
    return invoke("get_categories", { token });
  },

  getBrands: async (token: string): Promise<Brand[]> => {
    return invoke("get_brands", { token });
  },

  getUnits: async (token: string): Promise<Unit[]> => {
    return invoke("get_units", { token });
  },

  getProducts: async (
    token: string, 
    filter: { search?: string; category_id?: string; brand_id?: string; status?: string; limit: number; offset: number }
  ): Promise<PaginatedProducts> => {
    return invoke("get_products", { token, filter });
  },

  createProduct: async (token: string, product: Product): Promise<Product> => {
    return invoke("create_product", { token, product });
  }
};
