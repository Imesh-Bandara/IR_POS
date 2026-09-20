import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, DollarSign, Undo2 } from 'lucide-react';
import { Purchase, PurchaseAPI } from '../../features/purchases/purchase.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function PurchasesPage() {
  const navigate = useNavigate();
  const { token, hasPermission } = useAuthStore();
  
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadPurchases = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await PurchaseAPI.getPurchases(token, {
        search,
        limit,
        offset: (page - 1) * limit
      });
      setPurchases(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load purchases', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchases & Invoices</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search invoice or PO..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPurchases()}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-medium text-gray-600">Invoice Number</th>
                <th className="p-4 font-medium text-gray-600">PO Number</th>
                <th className="p-4 font-medium text-gray-600">Date</th>
                <th className="p-4 font-medium text-gray-600">Total</th>
                <th className="p-4 font-medium text-gray-600">Paid</th>
                <th className="p-4 font-medium text-gray-600">Outstanding</th>
                <th className="p-4 font-medium text-gray-600">Status</th>
                <th className="p-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">No purchases found.</td>
                </tr>
              ) : (
                purchases.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{p.invoice_number}</td>
                    <td className="p-4 text-gray-600">{p.purchase_order_number || '-'}</td>
                    <td className="p-4">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="p-4">LKR {(p.total_amount / 100).toFixed(2)}</td>
                    <td className="p-4 text-green-600">LKR {(p.amount_paid / 100).toFixed(2)}</td>
                    <td className="p-4 text-red-600 font-medium">LKR {(p.outstanding_amount / 100).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.payment_status === 'PAID' ? 'bg-green-100 text-green-800' : 
                        p.payment_status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="p-4 flex space-x-2">
                      {hasPermission('supplier_payments.create') && p.outstanding_amount > 0 && (
                        <button 
                          onClick={() => navigate(`/purchases/${p.id}/payment`)}
                          className="text-green-600 hover:text-green-800 flex items-center space-x-1" 
                          title="Record Payment"
                        >
                          <DollarSign size={18} />
                        </button>
                      )}
                      {hasPermission('purchases.return') && (
                        <button 
                          onClick={() => navigate(`/purchases/${p.id}/return`)}
                          className="text-orange-500 hover:text-orange-700 flex items-center space-x-1" 
                          title="Purchase Return"
                        >
                          <Undo2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 flex items-center justify-between border-t">
          <span className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
          </span>
          <div className="flex space-x-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
