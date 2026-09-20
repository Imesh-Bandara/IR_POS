import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { InventoryAPI, InventoryProduct } from "../../features/inventory/inventory.api";
import { ProductAPI, Category } from "../../features/products/product.api";
import { useAuthStore } from "../../features/auth/auth.store";
import { StockAdjustmentModal } from "./StockAdjustmentModal";
import { Link } from "react-router-dom";

export function InventoryPage() {
  const { token, hasPermission } = useAuthStore();
  
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [adjustProduct, setAdjustProduct] = useState<InventoryProduct | null>(null);

  const loadData = async () => {
    if (!token) return;
    try {
      const [cats, inv] = await Promise.all([
        ProductAPI.getCategories(token),
        InventoryAPI.getInventory(token, {
          search: search || undefined,
          category_id: categoryFilter || undefined,
          stock_status: statusFilter || undefined,
          limit,
          offset: (page - 1) * limit
        })
      ]);
      setCategories(cats);
      setProducts(inv.items);
      setTotal(inv.total);
      setTotalValue(inv.total_value);
    } catch (e) {
      console.error("Failed to load inventory", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, categoryFilter, statusFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      loadData();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  return (
    <div className="space-y-6">
      
      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-gray-500 text-sm font-medium">Total Products</div>
          <div className="text-2xl font-bold text-gray-800">{total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-gray-500 text-sm font-medium">Total Inventory Value (Rs.)</div>
          <div className="text-2xl font-bold text-green-600">{(totalValue / 100).toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col justify-center">
          {hasPermission("inventory.view_movements") && (
            <Link to="/inventory/movements" className="text-blue-600 font-medium hover:underline text-center">
              View Movement History &rarr;
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search Inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-3 font-semibold">Product</th>
                <th className="px-6 py-3 font-semibold text-right">Current Stock</th>
                <th className="px-6 py-3 font-semibold text-right">Reorder Level</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Unit Cost</th>
                <th className="px-6 py-3 font-semibold text-right">Total Value</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((p) => {
                let statusBadge = "bg-green-100 text-green-700";
                let statusText = "IN STOCK";
                if (p.current_stock <= 0) {
                  statusBadge = "bg-red-100 text-red-700";
                  statusText = "OUT OF STOCK";
                } else if (p.current_stock <= p.minimum_stock) {
                  statusBadge = "bg-yellow-100 text-yellow-800";
                  statusText = "LOW STOCK";
                }

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{p.name_en}</div>
                      <div className="text-xs text-gray-400">{p.barcode || p.sku || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-lg text-gray-700">
                      {p.current_stock}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      {p.minimum_stock}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      {(p.cost_price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                      {((p.current_stock * p.cost_price) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {(hasPermission("inventory.adjust") || hasPermission("inventory.opening_stock")) && (
                        <button 
                          onClick={() => setAdjustProduct(p)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Adjust
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} items
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Prev</button>
            <button disabled={page * limit >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {adjustProduct && (
        <StockAdjustmentModal
          productId={adjustProduct.id}
          productName={adjustProduct.name_en}
          currentStock={adjustProduct.current_stock}
          onClose={() => setAdjustProduct(null)}
          onSuccess={() => {
            setAdjustProduct(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
