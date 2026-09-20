import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PurchaseOrderDetails, PurchaseAPI, ReceiveGoodsPayload } from '../../features/purchases/purchase.api';
import { Product, ProductAPI } from '../../features/products/product.api';
import { Supplier, SupplierAPI } from '../../features/purchases/supplier.api';
import { useAuthStore } from '../../features/auth/auth.store';

export function ReceiveGoodsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token, hasPermission } = useAuthStore();

  const [details, setDetails] = useState<PurchaseOrderDetails | null>(null);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  
  // receiving qty state: item id -> qty to receive
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (token && id) {
      loadData();
    }
  }, [token, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const poData = await PurchaseAPI.getPurchaseOrderDetails(token!, id!);
      setDetails(poData);

      if (poData.order.supplier_id) {
        const sup = await SupplierAPI.getSupplier(token!, poData.order.supplier_id);
        setSupplier(sup);
      }

      // Load products for names
      const prods = await ProductAPI.getProducts(token!, { limit: 1000, offset: 0 });
      const prodMap = prods.items.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Product>);
      setProducts(prodMap);

      // Initialize receive qtys
      const initialQtys: Record<string, number> = {};
      poData.items.forEach(item => {
        initialQtys[item.id] = 0; // Default to 0, user inputs what they received
      });
      setReceiveQtys(initialQtys);

    } catch (e) {
      console.error(e);
      alert('Failed to load purchase order details');
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (itemId: string, qty: number, maxAllowed: number) => {
    setReceiveQtys(prev => ({
      ...prev,
      [itemId]: Math.min(Math.max(0, qty), maxAllowed)
    }));
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !details) return;

    const itemsToReceive = details.items
      .filter(item => receiveQtys[item.id] > 0)
      .map(item => ({
        po_item_id: item.id,
        product_id: item.product_id,
        quantity_received: receiveQtys[item.id],
        unit_cost: item.unit_cost
      }));

    if (itemsToReceive.length === 0) {
      alert("Please enter a quantity greater than 0 for at least one item.");
      return;
    }

    if (!window.confirm("Receiving these goods will increase branch inventory. Continue?")) {
      return;
    }

    const payload: ReceiveGoodsPayload = {
      purchase_order_id: details.order.id,
      supplier_invoice_number: invoiceNumber || undefined,
      notes: notes || undefined,
      items: itemsToReceive
    };

    try {
      setSaving(true);
      await PurchaseAPI.receiveGoods(token, payload);
      navigate('/purchases');
    } catch (err) {
      console.error(err);
      alert('Failed to receive goods: ' + err);
    } finally {
      setSaving(false);
    }
  };

  if (!hasPermission('purchases.receive')) {
    return <div className="p-6 text-center text-red-500">No permission to access this page.</div>;
  }

  if (loading || !details) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Receive Goods</h1>
        <button onClick={() => navigate('/purchase-orders')} className="text-gray-600 hover:text-gray-900">Cancel</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Purchase Order</h2>
          <p className="font-bold text-lg">{details.order.po_number}</p>
          <p className="text-sm text-gray-600">Status: {details.order.status}</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Supplier</h2>
          <p className="font-bold">{supplier?.company_name}</p>
          <p className="text-sm text-gray-600">{supplier?.contact_person}</p>
        </div>
      </div>

      <form onSubmit={handleReceive} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Invoice Number</label>
            <input 
              type="text"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. INV-12345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiving Notes</label>
            <input 
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="p-3">Product</th>
                <th className="p-3 w-24">Ordered</th>
                <th className="p-3 w-32">Unit Cost</th>
                <th className="p-3 w-32">Receive Qty</th>
                <th className="p-3 w-32">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {details.items.map(item => {
                const prodName = products[item.product_id]?.name_en || 'Unknown';
                // Without knowing exactly how many were already received in this UI, we assume user knows or we can derive it if backend provided it.
                // For a robust implementation, the backend would return `already_received` in PurchaseOrderItem. 
                // We'll allow up to ordered_quantity for now. The backend WILL enforce the limit robustly.
                const receiveVal = receiveQtys[item.id] || 0;
                
                return (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-medium">{prodName}</td>
                    <td className="p-3">{item.quantity_ordered}</td>
                    <td className="p-3">LKR {(item.unit_cost / 100).toFixed(2)}</td>
                    <td className="p-3">
                      <input 
                        type="number" min="0" max={item.quantity_ordered}
                        value={receiveVal}
                        onChange={e => handleQtyChange(item.id, Number(e.target.value), item.quantity_ordered)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="p-3 font-medium text-gray-800">
                      LKR {((receiveVal * item.unit_cost) / 100).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Processing...' : 'Receive Goods'}
          </button>
        </div>
      </form>
    </div>
  );
}
