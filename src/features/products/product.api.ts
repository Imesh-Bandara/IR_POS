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
  createCategory: async (token: string, name_en: string, name_si?: string): Promise<Category> => {
    return invoke("create_category", { token, nameEn: name_en, nameSi: name_si });
  },
  updateCategory: async (token: string, id: string, name_en: string, name_si?: string): Promise<Category> => {
    return invoke("update_category", { token, id, nameEn: name_en, nameSi: name_si });
  },
  deleteCategory: async (token: string, id: string): Promise<void> => {
    return invoke("delete_category", { token, id });
  },

  getBrands: async (token: string): Promise<Brand[]> => {
    return invoke("get_brands", { token });
  },
  createBrand: async (token: string, name_en: string, name_si?: string): Promise<Brand> => {
    return invoke("create_brand", { token, nameEn: name_en, nameSi: name_si });
  },
  updateBrand: async (token: string, id: string, name_en: string, name_si?: string): Promise<Brand> => {
    return invoke("update_brand", { token, id, nameEn: name_en, nameSi: name_si });
  },
  deleteBrand: async (token: string, id: string): Promise<void> => {
    return invoke("delete_brand", { token, id });
  },

  getUnits: async (token: string): Promise<Unit[]> => {
    return invoke("get_units", { token });
  },
  createUnit: async (token: string, name_en: string, name_si?: string, abbreviation?: string): Promise<Unit> => {
    return invoke("create_unit", { token, nameEn: name_en, nameSi: name_si, abbreviation });
  },
  updateUnit: async (token: string, id: string, name_en: string, name_si?: string, abbreviation?: string): Promise<Unit> => {
    return invoke("update_unit", { token, id, nameEn: name_en, nameSi: name_si, abbreviation });
  },
  deleteUnit: async (token: string, id: string): Promise<void> => {
    return invoke("delete_unit", { token, id });
  },

  getProducts: async (
    token: string, 
    filter: { search?: string; category_id?: string; brand_id?: string; status?: string; limit: number; offset: number }
  ): Promise<PaginatedProducts> => {
    return invoke("get_products", { token, filter });
  },

  getProduct: async (token: string, id: string): Promise<Product> => {
    return invoke("get_product", { token, id });
  },

  createProduct: async (token: string, product: Product): Promise<Product> => {
    return invoke("create_product", { token, product });
  },

  updateProduct: async (token: string, product: Product): Promise<Product> => {
    return invoke("update_product", { token, product });
  }
};
