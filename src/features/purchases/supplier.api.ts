import { invoke } from "@tauri-apps/api/core";

export interface Supplier {
  id: string;
  supplier_code?: string;
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
  outstanding_balance?: number; // Added from db schema
}

export interface SupplierPayload {
  company_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
}

export interface PaginatedSuppliers {
  items: Supplier[];
  total: number;
}

export interface SupplierFilter {
  search?: string;
  status?: string;
  limit: number;
  offset: number;
}

export const SupplierAPI = {
  getSuppliers: async (token: string, filter: SupplierFilter): Promise<PaginatedSuppliers> => {
    return invoke("get_suppliers", { token, filter });
  },

  getSupplier: async (token: string, id: string): Promise<Supplier> => {
    return invoke("get_supplier", { token, id });
  },

  createSupplier: async (token: string, payload: SupplierPayload): Promise<string> => {
    return invoke("create_supplier", { token, payload });
  },

  updateSupplier: async (token: string, id: string, payload: SupplierPayload): Promise<void> => {
    return invoke("update_supplier", { token, id, payload });
  },

  deactivateSupplier: async (token: string, id: string): Promise<void> => {
    return invoke("deactivate_supplier", { token, id });
  },
};
