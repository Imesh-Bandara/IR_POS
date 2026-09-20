import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "../features/auth/auth.store";
import { reportService, DashboardSummary } from "../services/reportService";
import { DateRangeFilter } from "../components/reports/DateRangeFilter";

export function Dashboard() {
  const { token } = useAuthStore();
  const [dbStatus, setDbStatus] = useState<string>("Checking database...");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start?: string, end?: string}>({});

  useEffect(() => {
    async function checkDb() {
      try {
        const result: string = await invoke("check_db_status");
        setDbStatus(result);
      } catch (err) {
        setDbStatus(`Error: ${err}`);
      }
    }
    checkDb();
  }, []);

  const loadSummary = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getDashboardSummary(token, dateRange.start, dateRange.end);
      setSummary(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [token, dateRange]);

  const handleRangeChange = (start?: string, end?: string) => {
    setDateRange({ start, end });
  };

  // Helper for currency formatting if utility is missing
  const formatMoney = (amount: number) => {
    return `LKR ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">Business Overview</h2>
        <div className="flex items-center space-x-4">
          <DateRangeFilter onRangeChange={handleRangeChange} />
          <button 
            onClick={loadSummary}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          Unable to load the dashboard summary. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric Cards */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Gross Sales</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loading ? "..." : formatMoney(summary?.gross_sales || 0)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Net Sales</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {loading ? "..." : formatMoney(summary?.net_sales || 0)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Returns/Refunds</h3>
          <p className="text-2xl font-bold text-red-500 mt-2">
            {loading ? "..." : formatMoney(summary?.returns || 0)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Transactions</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loading ? "..." : summary?.order_count || 0}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Net Purchases</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loading ? "..." : formatMoney(summary?.net_purchases || 0)}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Inventory Value</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {loading ? "..." : formatMoney(summary?.inventory_value || 0)}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Low Stock Items</h3>
          <p className={`text-2xl font-bold mt-2 ${summary && summary.low_stock_count > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
            {loading ? "..." : summary?.low_stock_count || 0}
          </p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Welcome to IR POS</h2>
        <p className="text-gray-600">Phase 8 Analytics Dashboard is active. Use the date filters above to analyze sales performance.</p>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">System Status</h3>
          <p className="text-sm font-mono text-gray-600">{dbStatus}</p>
        </div>
      </div>
    </div>
  );
}
