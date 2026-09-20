import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Supplier, SupplierAPI } from '../../features/purchases/supplier.api';
import { Product, ProductAPI } from '../../features/products/product.api';
import { CreatePOPayload, PurchaseAPI } from '../../features/purchases/purchase.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { token, hasPermission } = useAuthStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<Array<{ product_id: string; quantity: number; cost: number; product?: Product }>>([]);

  useEffect(() => {
    if (token) {
      loadSuppliersAndProducts();
    }
  }, [token]);

  const loadSuppliersAndProducts = async () => {
    try {
      const sups = await SupplierAPI.getSuppliers(token!, { limit: 1000, offset: 0, status: 'ACTIVE' });
      setSuppliers(sups.items);
      const prods = await ProductAPI.getProducts(token!, { limit: 1000, offset: 0, status: 'ACTIVE' });
      setProducts(prods.items);
    } catch (e) {
      console.error(e);
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { product_id: '', quantity: 1, cost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-fill cost if product is selected
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          newItems[index].product = prod;
          newItems[index].cost = prod.cost_price / 100; // Assuming cost_price is in minor units, convert for UI
        }
      }
      return newItems;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!supplierId || items.length === 0 || items.some(i => !i.product_id || i.quantity <= 0)) {
      alert("Please select a supplier and add valid items.");
      return;
    }

    const payload: CreatePOPayload = {
      supplier_id: supplierId,
      expected_delivery_date: expectedDate || undefined,
      notes,
      items: items.map(i => ({
        product_id: i.product_id,
        quantity_ordered: i.quantity,
        unit_cost: Math.round(i.cost * 100), // Convert to minor units
        discount_amount: 0,
        tax_amount: 0
      }))
    };

    try {
      setLoading(true);
      await PurchaseAPI.createPurchaseOrder(token, payload);
      navigate('/purchase-orders');
    } catch (err) {
      console.error(err);
      alert('Failed to create purchase order: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const grandTotal = items.reduce((acc, item) => acc + (item.quantity * item.cost), 0);

  if (!hasPermission('purchases.create')) {
    return <div className="p-6 text-center text-red-500">No permission to access this page.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Create Purchase Order</h1>
        <button onClick={() => navigate('/purchase-orders')} className="text-gray-600 hover:text-gray-900">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Order Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <select 
                required
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery Date</label>
              <input 
                type="date"
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={2}
            ></textarea>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-semibold">Order Items</h2>
            <button type="button" onClick={addItem} className="text-blue-600 flex items-center space-x-1">
              <Plus size={16} /> <span>Add Item</span>
            </button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-600">
                <th className="pb-2">Product</th>
                <th className="pb-2 w-24">Quantity</th>
                <th className="pb-2 w-32">Unit Cost</th>
                <th className="pb-2 w-32">Total</th>
                <th className="pb-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="py-2 pr-2">
                    <select 
                      required
                      value={item.product_id}
                      onChange={e => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name_en}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input 
                      type="number" min="1" required
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input 
                      type="number" min="0" step="0.01" required
                      value={item.cost}
                      onChange={e => updateItem(index, 'cost', Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </td>
                  <td className="py-2 font-medium text-gray-800">
                    LKR {(item.quantity * item.cost).toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right py-4 font-semibold text-lg pr-4">Grand Total:</td>
                <td colSpan={2} className="py-4 font-bold text-lg text-blue-600">LKR {grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Confirming...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
