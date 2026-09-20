import { useState, useEffect } from "react";
import { useAuthStore } from "../../features/auth/auth.store";
import { reportService, InventoryReportItem } from "../../services/reportService";

export function InventoryReport() {
  const { token } = useAuthStore();
  const [data, setData] = useState<InventoryReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.getInventoryReport(token);
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const formatMoney = (amount: number) => {
    return `LKR ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return 'text-green-600 bg-green-50';
      case 'Low Stock': return 'text-orange-600 bg-orange-50';
      case 'Out of Stock': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Report</h1>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Current Stock</th>
                <th className="px-6 py-3 text-right">Cost Price</th>
                <th className="px-6 py-3 text-right">Inventory Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No inventory records found.</td></tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{row.product_name}</td>
                    <td className="px-6 py-4">{row.sku || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{row.current_stock}</td>
                    <td className="px-6 py-4 text-right">{formatMoney(row.cost_price)}</td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">{formatMoney(row.inventory_value)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && data.length > 0 && (
              <tfoot className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right">Total Value:</td>
                  <td className="px-6 py-4 text-right">{formatMoney(data.reduce((a, b) => a + b.inventory_value, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
