import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { ProductAPI, Category, Brand, Unit } from "../../features/products/product.api";
import { ProductSchema, ProductFormValues } from "../../features/products/product.schema";
import { useAuthStore } from "../../features/auth/auth.store";

export function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const { token } = useAuthStore();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      status: "ACTIVE",
      cost_price: 0,
      selling_price: 0,
      tax_rate: 0,
      discount_amount: 0,
      minimum_stock: 0,
      current_stock: 0,
    }
  });

  useEffect(() => {
    async function loadData() {
      if (!token) return;
      try {
        const [cats, brnds, unts] = await Promise.all([
          ProductAPI.getCategories(token),
          ProductAPI.getBrands(token),
          ProductAPI.getUnits(token)
        ]);
        setCategories(cats);
        setBrands(brnds);
        setUnits(unts);

        if (isEditMode && id) {
          const product = await ProductAPI.getProduct(token, id);
          reset({
            ...product,
            status: product.status as "ACTIVE" | "INACTIVE",
            cost_price: product.cost_price / 100,
            selling_price: product.selling_price / 100,
            wholesale_price: product.wholesale_price ? product.wholesale_price / 100 : undefined,
            discount_amount: product.discount_amount / 100,
            tax_rate: product.tax_rate / 100,
          });
        }
      } catch (e: any) {
        console.error("Failed to load data", e);
        setError("Failed to load product data.");
      }
    }
    loadData();
  }, [token, id, isEditMode, reset]);

  const onSubmit = async (data: ProductFormValues) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Convert float prices to minor units (cents)
      const payload = {
        ...data,
        cost_price: Math.round(data.cost_price * 100),
        selling_price: Math.round(data.selling_price * 100),
        wholesale_price: data.wholesale_price ? Math.round(data.wholesale_price * 100) : undefined,
        discount_amount: Math.round(data.discount_amount * 100),
        tax_rate: Math.round(data.tax_rate * 100),
        id: id || "",
      };
      
      if (isEditMode) {
        await ProductAPI.updateProduct(token, payload);
      } else {
        await ProductAPI.createProduct(token, payload);
      }
      navigate("/products");
    } catch (err: any) {
      setError(typeof err === "string" ? err : err.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/products")} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? "Edit Product" : "New Product"}</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
        
        {/* Core Info */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Core Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name (English) *</label>
              <input {...register("name_en")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              {errors.name_en && <span className="text-red-500 text-xs mt-1">{errors.name_en.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name (Sinhala)</label>
              <input {...register("name_si")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode (Scan or Type)</label>
              <input {...register("barcode")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input {...register("sku")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase" />
            </div>
          </div>
        </section>

        {/* Categorization */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Categorization</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select {...register("category_id")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
              </select>
              {errors.category_id && <span className="text-red-500 text-xs mt-1">{errors.category_id.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select {...register("brand_id")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="">Select Brand</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name_en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select {...register("unit_id")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="">Select Unit</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name_en} {u.abbreviation ? `(${u.abbreviation})` : ""}</option>)}
              </select>
              {errors.unit_id && <span className="text-red-500 text-xs mt-1">{errors.unit_id.message}</span>}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Pricing (Rs.)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
              <input type="number" step="0.01" {...register("cost_price", { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
              {errors.cost_price && <span className="text-red-500 text-xs mt-1">{errors.cost_price.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
              <input type="number" step="0.01" {...register("selling_price", { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
              {errors.selling_price && <span className="text-red-500 text-xs mt-1">{errors.selling_price.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wholesale Price</label>
              <input type="number" step="0.01" {...register("wholesale_price", { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
              <input type="number" step="0.01" {...register("discount_amount", { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input type="number" step="0.01" {...register("tax_rate", { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
            </div>
          </div>
        </section>

        {/* Inventory Management */}
        <section>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Inventory Rules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock (Reorder Level)</label>
              <input type="number" {...register("minimum_stock", { valueAsNumber: true })} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select {...register("status")} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </section>

        <div className="pt-6 flex justify-end gap-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate("/products")} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50">
            <Save size={20} />
            {loading ? "Saving..." : "Save Product"}
          </button>
        </div>

      </form>
    </div>
  );
}
