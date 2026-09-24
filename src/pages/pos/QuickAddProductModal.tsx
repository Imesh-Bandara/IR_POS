import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Save } from "lucide-react";
import { POSAPI } from "../../features/pos/pos.api";
import { ProductAPI, Unit } from "../../features/products/product.api";
import { useAuthStore } from "../../features/auth/auth.store";
import { InventoryProduct } from "../../features/inventory/inventory.api";
import toast from "react-hot-toast";

const QuickAddSchema = z.object({
  barcode: z.string().optional(),
  nameEn: z.string().min(1, "Product name is required"),
  sellingPrice: z.number().min(0, "Price must be >= 0"),
  unitId: z.string().min(1, "Unit is required"),
  costPrice: z.number().min(0, "Cost must be >= 0").optional(),
  openingQuantity: z.number().min(0, "Quantity must be >= 0").optional(),
});

type QuickAddFormValues = z.infer<typeof QuickAddSchema>;

interface QuickAddProductModalProps {
  initialBarcode: string;
  onClose: () => void;
  onSuccess: (product: InventoryProduct) => void;
}

export function QuickAddProductModal({ initialBarcode, onClose, onSuccess }: QuickAddProductModalProps) {
  const { token } = useAuthStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<QuickAddFormValues>({
    resolver: zodResolver(QuickAddSchema),
    defaultValues: {
      barcode: initialBarcode,
      nameEn: "",
      sellingPrice: 0,
      costPrice: 0,
      openingQuantity: 1, // Default to 1 to allow immediate sale
    }
  });

  useEffect(() => {
    async function fetchUnits() {
      if (!token) return;
      try {
        const res = await ProductAPI.getUnits(token);
        setUnits(res);
      } catch (err) {
        toast.error("Failed to load units");
      }
    }
    fetchUnits();
  }, [token]);

  const onSubmit = async (data: QuickAddFormValues) => {
    if (!token) return;
    setLoading(true);
    try {
      const product = await POSAPI.quickAddProduct(token, {
        nameEn: data.nameEn,
        barcode: data.barcode || undefined,
        sellingPrice: Math.round(data.sellingPrice * 100),
        unitId: data.unitId,
        costPrice: data.costPrice ? Math.round(data.costPrice * 100) : undefined,
        openingQuantity: data.openingQuantity || 0,
      });
      onSuccess(product);
    } catch (err: any) {
      toast.error(typeof err === "string" ? err : err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Product Not Found - Quick Add</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
            <input 
              {...register("barcode")} 
              className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500 font-mono outline-none" 
              readOnly 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input 
              {...register("nameEn")} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              autoFocus
            />
            {errors.nameEn && <span className="text-red-500 text-xs mt-1">{errors.nameEn.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (Rs) *</label>
              <input 
                type="number" 
                step="0.01" 
                {...register("sellingPrice", { valueAsNumber: true })} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
              />
              {errors.sellingPrice && <span className="text-red-500 text-xs mt-1">{errors.sellingPrice.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (Rs)</label>
              <input 
                type="number" 
                step="0.01" 
                {...register("costPrice", { valueAsNumber: true })} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select 
                {...register("unitId")} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">Select Unit</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name_en} {u.abbreviation ? `(${u.abbreviation})` : ""}</option>
                ))}
              </select>
              {errors.unitId && <span className="text-red-500 text-xs mt-1">{errors.unitId.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Quantity</label>
              <input 
                type="number"
                step="0.001"
                {...register("openingQuantity", { valueAsNumber: true })} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" 
              />
              {errors.openingQuantity && <span className="text-red-500 text-xs mt-1">{errors.openingQuantity.message}</span>}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 mt-6">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? "Saving..." : "Add & Sell"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
