import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { ProductAPI, Product, Category, Brand } from "../../features/products/product.api";
import { useAuthStore } from "../../features/auth/auth.store";

export function ProductsPage() {
  const { token, hasPermission } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const loadData = async () => {
    if (!token) return;
    try {
      const [cats, brnds, prods] = await Promise.all([
        ProductAPI.getCategories(token),
        ProductAPI.getBrands(token),
        ProductAPI.getProducts(token, {
          search: search || undefined,
          category_id: categoryFilter || undefined,
          brand_id: brandFilter || undefined,
          limit,
          offset: (page - 1) * limit
        })
      ]);
      setCategories(cats);
      setBrands(brnds);
      setProducts(prods.items);
      setTotal(prods.total);
    } catch (e) {
      console.error("Failed to load products", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, categoryFilter, brandFilter]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      loadData();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        {hasPermission("products.create") && (
          <Link to="/products/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Plus size={20} />
            <span>New Product</span>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by Barcode, SKU, or Name..."
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
              value={brandFilter} 
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Brands</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name_en}</option>)}
            </select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">SKU / Barcode</th>
                <th className="px-6 py-3 font-semibold text-right">Price (Rs.)</th>
                <th className="px-6 py-3 font-semibold text-right">Stock</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{p.name_en}</div>
                      {p.name_si && <div className="text-sm text-gray-500">{p.name_si}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{p.barcode || '-'}</div>
                      <div className="text-xs text-gray-400">{p.sku || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {(p.selling_price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.current_stock <= p.minimum_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {p.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {hasPermission("products.edit") && (
                        <Link to={`/products/${p.id}/edit`} className="text-blue-600 hover:text-blue-900">Edit</Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
          <span className="text-sm text-gray-600">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} products
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={page * limit >= total} 
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
