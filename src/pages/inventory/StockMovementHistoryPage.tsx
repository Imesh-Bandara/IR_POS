import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { InventoryAPI, StockMovement } from "../../features/inventory/inventory.api";
import { useAuthStore } from "../../features/auth/auth.store";

export function StockMovementHistoryPage() {
  const { token } = useAuthStore();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadData = async () => {
    if (!token) return;
    try {
      const res = await InventoryAPI.getStockMovements(token, {
        limit,
        offset: (page - 1) * limit
      });
      setMovements(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error("Failed to load stock movements", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/inventory" className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">Stock Movement History</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold text-right">Previous</th>
                <th className="px-6 py-3 font-semibold text-right">Change</th>
                <th className="px-6 py-3 font-semibold text-right">New Stock</th>
                <th className="px-6 py-3 font-semibold">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {m.created_at ? new Date(m.created_at).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                      {m.movement_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500">{m.previous_quantity}</td>
                  <td className="px-6 py-4 text-right font-medium">
                    <span className={m.quantity_changed > 0 ? 'text-green-600' : 'text-red-600'}>
                      {m.quantity_changed > 0 ? '+' : ''}{m.quantity_changed}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">{m.new_quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{m.notes || '-'}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No historical movements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Prev</button>
            <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
