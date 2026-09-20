import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Eye, Archive } from 'lucide-react';
import { Supplier, SupplierAPI } from '../../features/purchases/supplier.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function SuppliersPage() {
  const navigate = useNavigate();
  const { token, hasPermission } = useAuthStore();
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const loadSuppliers = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await SupplierAPI.getSuppliers(token, {
        search,
        limit,
        offset: (page - 1) * limit
      });
      setSuppliers(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load suppliers', err);
      // alert could be replaced with toast in a real system
    } finally {
      setLoading(false);
    }
  }, [token, search, page]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleDeactivate = async (id: string) => {
    if (!token) return;
    if (window.confirm('Are you sure you want to deactivate this supplier?')) {
      try {
        await SupplierAPI.deactivateSupplier(token, id);
        loadSuppliers();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        {hasPermission('suppliers.create') && (
          <button
            onClick={() => navigate('/suppliers/new')}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search suppliers..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSuppliers()}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-medium text-gray-600">Code</th>
                <th className="p-4 font-medium text-gray-600">Company</th>
                <th className="p-4 font-medium text-gray-600">Contact</th>
                <th className="p-4 font-medium text-gray-600">Phone</th>
                <th className="p-4 font-medium text-gray-600">Status</th>
                <th className="p-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">No suppliers found.</td>
                </tr>
              ) : (
                suppliers.map(supplier => (
                  <tr key={supplier.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{supplier.supplier_code}</td>
                    <td className="p-4 font-medium">{supplier.company_name}</td>
                    <td className="p-4">{supplier.contact_person || '-'}</td>
                    <td className="p-4">{supplier.phone || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        supplier.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="p-4 flex space-x-2">
                      {hasPermission('suppliers.view') && (
                        <button className="text-blue-600 hover:text-blue-800" title="View">
                          <Eye size={18} />
                        </button>
                      )}
                      {hasPermission('suppliers.update') && (
                        <button 
                          onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                          className="text-gray-600 hover:text-gray-800" title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {hasPermission('suppliers.update') && supplier.status === 'ACTIVE' && (
                        <button 
                          onClick={() => handleDeactivate(supplier.id)}
                          className="text-red-600 hover:text-red-800" title="Deactivate"
                        >
                          <Archive size={18} />
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
