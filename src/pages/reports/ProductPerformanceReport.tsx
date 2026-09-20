import { useState, useEffect } from "react";
import { useAuthStore } from "../../features/auth/auth.store";
import { reportService, ProductPerformanceItem } from "../../services/reportService";
import { DateRangeFilter } from "../../components/reports/DateRangeFilter";

export function ProductPerformanceReport() {
  const { token } = useAuthStore();
  const [data, setData] = useState<ProductPerformanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start?: string, end?: string}>({});

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.getProductPerformance(token, dateRange.start, dateRange.end);
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, dateRange]);

  const formatMoney = (amount: number) => {
    return `LKR ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Performance</h1>
        <div className="flex items-center space-x-4">
          <DateRangeFilter onRangeChange={(start, end) => setDateRange({start, end})} />
          <button 
            onClick={loadData}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium"
          >
            Refresh
          </button>
        </div>
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
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3 text-right">Sold Qty</th>
                <th className="px-6 py-3 text-right">Returned Qty</th>
                <th className="px-6 py-3 text-right">Net Qty</th>
                <th className="px-6 py-3 text-right">Gross Sales</th>
                <th className="px-6 py-3 text-right">Net Sales</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">No product sales records found for this period.</td></tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{row.product_name}</td>
                    <td className="px-6 py-4">{row.sku || '-'}</td>
                    <td className="px-6 py-4">{row.category || '-'}</td>
                    <td className="px-6 py-4 text-right">{row.qty_sold}</td>
                    <td className="px-6 py-4 text-right text-red-500">{row.qty_returned}</td>
                    <td className="px-6 py-4 text-right font-medium">{row.net_qty}</td>
                    <td className="px-6 py-4 text-right">{formatMoney(row.gross_sales)}</td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">{formatMoney(row.net_sales)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
