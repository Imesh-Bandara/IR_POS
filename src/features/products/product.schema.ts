import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string().optional(),
  name_en: z.string().min(1, "Product name (English) is required"),
  name_si: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category_id: z.string().min(1, "Category is required"),
  brand_id: z.string().optional(),
  unit_id: z.string().min(1, "Unit is required"),
  cost_price: z.number().min(0, "Cost price cannot be negative"),
  selling_price: z.number().min(0, "Selling price cannot be negative"),
  wholesale_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0, "Tax rate cannot be negative"),
  discount_amount: z.number().min(0, "Discount cannot be negative"),
  minimum_stock: z.number().min(0, "Minimum stock cannot be negative"),
  current_stock: z.number(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
}).refine(data => data.selling_price >= data.cost_price, {
  message: "Selling price should not be lower than cost price",
  path: ["selling_price"]
});

export type ProductFormValues = z.infer<typeof ProductSchema>;
