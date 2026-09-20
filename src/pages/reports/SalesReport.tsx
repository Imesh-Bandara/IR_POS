import { useState, useEffect } from "react";
import { useAuthStore } from "../../features/auth/auth.store";
import { reportService, SalesReportItem } from "../../services/reportService";
import { DateRangeFilter } from "../../components/reports/DateRangeFilter";

export function SalesReport() {
  const { token } = useAuthStore();
  const [data, setData] = useState<SalesReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start?: string, end?: string}>({});

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.getSalesReport(token, dateRange.start, dateRange.end);
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

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleString();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
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
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Invoice</th>
                <th className="px-6 py-3">Cashier</th>
                <th className="px-6 py-3 text-right">Gross Sales</th>
                <th className="px-6 py-3 text-right">Returns</th>
                <th className="px-6 py-3 text-right">Net Sales</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No sales records found for this period.</td></tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-4">{formatDate(row.date)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{row.invoice_number}</td>
                    <td className="px-6 py-4">{row.cashier}</td>
                    <td className="px-6 py-4 text-right">{formatMoney(row.gross_sales)}</td>
                    <td className="px-6 py-4 text-right text-red-500">{formatMoney(row.returns)}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{formatMoney(row.net_sales)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && data.length > 0 && (
              <tfoot className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right">Totals:</td>
                  <td className="px-6 py-4 text-right">{formatMoney(data.reduce((a, b) => a + b.gross_sales, 0))}</td>
                  <td className="px-6 py-4 text-right text-red-500">{formatMoney(data.reduce((a, b) => a + b.returns, 0))}</td>
                  <td className="px-6 py-4 text-right">{formatMoney(data.reduce((a, b) => a + b.net_sales, 0))}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
