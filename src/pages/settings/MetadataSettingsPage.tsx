import { useState, useEffect } from "react";
import { useAuthStore } from "../../features/auth/auth.store";
import { ProductAPI } from "../../features/products/product.api";
import { MetadataModal, MetadataType, MetadataItem } from "./MetadataModal";
import { Plus, Edit2, Trash2 } from "lucide-react";

export function MetadataSettingsPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MetadataType>("category");
  
  const [categories, setCategories] = useState<MetadataItem[]>([]);
  const [brands, setBrands] = useState<MetadataItem[]>([]);
  const [units, setUnits] = useState<MetadataItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MetadataItem | null>(null);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [cats, brnds, unts] = await Promise.all([
        ProductAPI.getCategories(token),
        ProductAPI.getBrands(token),
        ProductAPI.getUnits(token)
      ]);
      setCategories(cats);
      setBrands(brnds);
      setUnits(unts);
    } catch (err: any) {
      setError("Failed to load metadata. Please check permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: MetadataItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, type: MetadataType) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    if (!token) return;

    try {
      if (type === "category") await ProductAPI.deleteCategory(token, id);
      else if (type === "brand") await ProductAPI.deleteBrand(token, id);
      else if (type === "unit") await ProductAPI.deleteUnit(token, id);
      
      await loadData();
    } catch (err: any) {
      alert(typeof err === "string" ? err : "Failed to delete item.");
    }
  };

  const handleSave = async (data: MetadataItem) => {
    if (!token) return;
    
    if (data.id) {
      // Update
      if (activeTab === "category") await ProductAPI.updateCategory(token, data.id, data.name_en, data.name_si);
      else if (activeTab === "brand") await ProductAPI.updateBrand(token, data.id, data.name_en, data.name_si);
      else if (activeTab === "unit") await ProductAPI.updateUnit(token, data.id, data.name_en, data.name_si, data.abbreviation);
    } else {
      // Create
      if (activeTab === "category") await ProductAPI.createCategory(token, data.name_en, data.name_si);
      else if (activeTab === "brand") await ProductAPI.createBrand(token, data.name_en, data.name_si);
      else if (activeTab === "unit") await ProductAPI.createUnit(token, data.name_en, data.name_si, data.abbreviation);
    }
    
    await loadData();
  };

  const renderTable = (items: MetadataItem[], type: MetadataType) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
          <tr>
            <th className="px-6 py-4 font-medium">Name (English)</th>
            <th className="px-6 py-4 font-medium">Name (Sinhala)</th>
            {type === "unit" && <th className="px-6 py-4 font-medium">Abbreviation</th>}
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">{item.name_en}</td>
              <td className="px-6 py-4">{item.name_si || "-"}</td>
              {type === "unit" && <td className="px-6 py-4">{item.abbreviation || "-"}</td>}
              <td className="px-6 py-4 text-right space-x-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => item.id && handleDelete(item.id, type)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={type === "unit" ? 4 : 3} className="px-6 py-8 text-center text-gray-500">
                No items found. Click "Create New" to add one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const getActiveItems = () => {
    switch (activeTab) {
      case "category": return categories;
      case "brand": return brands;
      case "unit": return units;
      default: return [];
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Metadata Settings</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Create New</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
        {(["category", "brand", "unit"] as MetadataType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}s
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        renderTable(getActiveItems(), activeTab)
      )}

      <MetadataModal
        isOpen={isModalOpen}
        type={activeTab}
        item={editingItem}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
