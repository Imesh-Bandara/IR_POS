import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { InventoryAPI } from "../../features/inventory/inventory.api";
import { StockAdjustmentSchema, StockAdjustmentFormValues } from "../../features/inventory/inventory.schema";
import { useAuthStore } from "../../features/auth/auth.store";

interface Props {
  productId: string;
  productName: string;
  currentStock: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustmentModal({ productId, productName, currentStock, onClose, onSuccess }: Props) {
  const { token, hasPermission } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(StockAdjustmentSchema),
    defaultValues: {
      quantity_change: 0,
      movement_type: "ADJUSTMENT_IN",
      reason: ""
    }
  });

  const qtyChange = watch("quantity_change") || 0;
  const newExpected = currentStock + qtyChange;

  const onSubmit = async (data: StockAdjustmentFormValues) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      await InventoryAPI.adjustStock(token, {
        product_id: productId,
        quantity_change: data.quantity_change,
        movement_type: data.movement_type,
        reason: data.reason
      });
      onSuccess();
    } catch (err: any) {
      setError(typeof err === "string" ? err : err.message || "Adjustment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800">Adjust Stock</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
          
          <div>
            <div className="text-sm text-gray-500">Product</div>
            <div className="font-medium">{productName}</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <div className="text-sm text-gray-500">Current Stock</div>
              <div className="font-mono text-lg">{currentStock}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Expected Stock</div>
              <div className={`font-mono text-lg ${newExpected < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {newExpected}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Movement Type</label>
            <select {...register("movement_type")} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white outline-none">
              <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
              <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
              <option value="DAMAGE">Damaged (-)</option>
              <option value="LOSS">Lost (-)</option>
              {hasPermission("inventory.opening_stock") && <option value="OPENING_STOCK">Opening Stock (+)</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Change (e.g., -5 or 10)</label>
            <input type="number" {...register("quantity_change", { valueAsNumber: true })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
            {errors.quantity_change && <span className="text-red-500 text-xs">{errors.quantity_change.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Required)</label>
            <input type="text" {...register("reason")} placeholder="e.g. Found extra in warehouse" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            {errors.reason && <span className="text-red-500 text-xs">{errors.reason.message}</span>}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Saving..." : "Confirm Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
