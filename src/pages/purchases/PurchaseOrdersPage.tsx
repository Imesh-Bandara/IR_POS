import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, CheckCircle } from 'lucide-react';
import { PurchaseOrder, PurchaseAPI } from '../../features/purchases/purchase.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { token, hasPermission } = useAuthStore();
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadPurchaseOrders = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await PurchaseAPI.getPurchaseOrders(token, {
        search,
        limit,
        offset: (page - 1) * limit
      });
      setPurchaseOrders(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load purchase orders', err);
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        {hasPermission('purchases.create') && (
          <button
            onClick={() => navigate('/purchase-orders/new')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>Create PO</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search PO number..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadPurchaseOrders()}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-medium text-gray-600">PO Number</th>
                <th className="p-4 font-medium text-gray-600">Date</th>
                <th className="p-4 font-medium text-gray-600">Total</th>
                <th className="p-4 font-medium text-gray-600">Status</th>
                <th className="p-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">No purchase orders found.</td>
                </tr>
              ) : (
                purchaseOrders.map(po => (
                  <tr key={po.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{po.po_number}</td>
                    <td className="p-4">{new Date(po.created_at).toLocaleDateString()}</td>
                    <td className="p-4">LKR {(po.grand_total / 100).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        po.status === 'RECEIVED' ? 'bg-green-100 text-green-800' : 
                        po.status === 'PARTIALLY_RECEIVED' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4 flex space-x-2">
                      {hasPermission('purchases.receive') && (po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <button 
                          onClick={() => navigate(`/purchase-orders/${po.id}/receive`)}
                          className="text-green-600 hover:text-green-800 flex items-center space-x-1" 
                          title="Receive Goods"
                        >
                          <CheckCircle size={18} />
                          <span className="text-sm">Receive</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
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
