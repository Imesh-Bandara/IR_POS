import { useState, useEffect } from "react";
import { Search, Eye, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { SalesAPI, Sale } from "../../features/sales/sales.api";
import { SaleDetailsModal } from "./SaleDetailsModal";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

export function SalesHistoryPage() {
  const { token } = useAuthStore();
  const { t } = useTranslation();
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchSales = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await SalesAPI.getSales(token, {
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        status: status || undefined,
        limit,
        offset: (page - 1) * limit
      });
      setSales(res.items);
      setTotal(res.total);
    } catch (e: any) {
      toast.error("Failed to load sales: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSales();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, dateFrom, dateTo, status, page, token]);

  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED": return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">{t('completed').toUpperCase()}</span>;
      case "VOIDED": return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">{t('voided').toUpperCase()}</span>;
      case "PARTIALLY_RETURNED": return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">{t('partiallyReturned').toUpperCase()}</span>;
      case "RETURNED": return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">{t('returned').toUpperCase()}</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{t('salesHistory')}</h1>
        <button 
          onClick={fetchSales}
          className="p-2 bg-white text-gray-600 hover:text-blue-600 rounded-lg shadow-sm border border-gray-200"
          title="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder={t('invoiceCustomerItem')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="">{t('allStatuses')}</option>
            <option value="COMPLETED">{t('completed')}</option>
            <option value="VOIDED">{t('voided')}</option>
            <option value="PARTIALLY_RETURNED">{t('partiallyReturned')}</option>
            <option value="RETURNED">{t('returned')}</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-sm font-bold text-gray-700">{t('invoice')}</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">{t('dateTime')}</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700">{t('status')}</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-right">{t('total')}</th>
                <th className="px-6 py-4 text-sm font-bold text-gray-700 text-right">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('loadingSales')}</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">{t('noSalesFound')}</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sale.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{sale.created_at}</td>
                    <td className="px-6 py-4">{getStatusBadge(sale.status)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">Rs. {(sale.grand_total / 100).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedSaleId(sale.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg inline-flex items-center gap-1 text-sm font-medium transition-colors"
                      >
                        <Eye size={16} /> {t('view')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {t('showing')} <span className="font-bold">{sales.length > 0 ? (page - 1) * limit + 1 : 0}</span> {t('to')} <span className="font-bold">{Math.min(page * limit, total)}</span> {t('of')} <span className="font-bold">{total}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-4 py-2 text-sm font-medium text-gray-700">
              {t('page')} {page} {t('of')} {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedSaleId && (
        <SaleDetailsModal 
          saleId={selectedSaleId} 
          onClose={() => {
            setSelectedSaleId(null);
            fetchSales(); // Refresh in case status changed
          }} 
        />
      )}
    </div>
  );
}
